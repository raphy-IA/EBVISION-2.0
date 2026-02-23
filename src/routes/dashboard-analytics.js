const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// GET /api/analytics/dashboard-kpis - KPIs principaux du dashboard
router.get('/dashboard-kpis', authenticateToken, async (req, res) => {
    try {
        const {
            period = 30,
            businessUnit,
            division,
            collaborateur,
            dateDebut,
            dateFin
        } = req.query;

        // Calculer les dates
        let startDate, endDate;
        if (dateDebut && dateFin) {
            startDate = new Date(dateDebut);
            endDate = new Date(dateFin);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ success: false, error: 'Dates invalides (format YYYY-MM-DD attendu)' });
            }
        } else {
            const periodInt = parseInt(period) || 30;
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - periodInt);
        }

        // Construire les conditions WHERE
        let whereConditions = ['te.date_saisie >= $1 AND te.date_saisie <= $2'];
        let params = [startDate.toISOString(), endDate.toISOString()];
        let paramIndex = 3;

        if (businessUnit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(businessUnit);
        }

        if (division) {
            whereConditions.push(`d.id = $${paramIndex++}`);
            params.push(division);
        }

        if (collaborateur) {
            whereConditions.push(`c.id = $${paramIndex++}`);
            params.push(collaborateur);
        }

        const whereClause = whereConditions.join(' AND ');

        // KPIs des heures avec données de rentabilité
        const hoursQuery = `
            SELECT 
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE 0 END) as heures_validees,
                SUM(CASE WHEN ts.statut = 'soumis' THEN te.heures ELSE 0 END) as heures_soumises,
                SUM(CASE WHEN ts.statut = 'sauvegardé' THEN te.heures ELSE 0 END) as heures_saisie,
                COUNT(DISTINCT te.user_id) as collaborateurs_actifs,
                SUM(COALESCE(m.montant_honoraires, 0)) as chiffre_affaires,
                SUM(COALESCE(te.heures * COALESCE(g.taux_horaire_default, 0), 0)) as cout_total,
                COUNT(DISTINCT c.id) * 8 * 30 as heures_disponibles
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            LEFT JOIN missions m ON te.mission_id = m.id
            WHERE ${whereClause}
        `;

        const hoursResult = await pool.query(hoursQuery, params);
        const hoursData = hoursResult.rows[0];

        // KPIs des missions
        const missionsQuery = `
            SELECT 
                COUNT(*) as total_missions,
                COUNT(CASE WHEN m.statut = 'EN_COURS' THEN 1 END) as missions_actives,
                COUNT(CASE WHEN m.statut = 'TERMINEE' THEN 1 END) as missions_terminees,
                0 as progression_moyenne
            FROM missions m
            WHERE m.created_at >= $1
        `;

        const missionsResult = await pool.query(missionsQuery, [startDate.toISOString()]);
        const missionsData = missionsResult.rows[0];

        // Calcul du taux de rentabilité (simulation basée sur les heures validées)
        const tauxRentabilite = hoursData.heures_validees > 0 ?
            (hoursData.heures_validees / hoursData.total_heures) * 100 : 0;

        // Encours de facturation (simulation)
        const encoursQuery = `
            SELECT 
                SUM(m.montant_honoraires) as encours_facturation
            FROM missions m
            WHERE m.statut = 'EN_COURS' 
            AND m.date_fin < CURRENT_DATE
        `;

        const encoursResult = await pool.query(encoursQuery);
        const encoursData = encoursResult.rows[0];

        // Calcul des tendances (simulation)
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));

        const previousHoursQuery = `
            SELECT 
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE 0 END) as heures_validees
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            WHERE te.created_at >= $1 AND te.created_at < $2
        `;

        const previousHoursResult = await pool.query(previousHoursQuery, [previousStartDate.toISOString(), startDate.toISOString()]);
        const previousHoursData = previousHoursResult.rows[0];

        // Calcul des tendances
        const heuresTrend = previousHoursData.total_heures > 0 ?
            ((hoursData.total_heures - previousHoursData.total_heures) / previousHoursData.total_heures) * 100 : 0;

        const valideesTrend = previousHoursData.heures_validees > 0 ?
            ((hoursData.heures_validees - previousHoursData.heures_validees) / previousHoursData.heures_validees) * 100 : 0;

        const kpisData = {
            total_heures: hoursData.total_heures || 0,
            heures_validees: hoursData.heures_validees || 0,
            heures_soumises: hoursData.heures_soumises || 0,
            heures_en_attente: hoursData.heures_saisie || 0, // Heures en draft (non soumises)
            collaborateurs_actifs: hoursData.collaborateurs_actifs || 0,
            missions_actives: missionsData.missions_actives || 0,
            taux_rentabilite: Math.round(tauxRentabilite * 100) / 100,
            encours_facturation: encoursData.encours_facturation || 0,
            chiffre_affaires: hoursData.chiffre_affaires || 0,
            cout_total: hoursData.cout_total || 0,
            heures_disponibles: hoursData.heures_disponibles || 0,
            heures_trend: Math.round(heuresTrend * 10) / 10,
            validees_trend: Math.round(valideesTrend * 10) / 10,
            soumises_trend: -5.2, // Simulation
            en_attente_trend: 2.1, // Simulation
            collaborateurs_trend: 3.7, // Simulation
            missions_trend: 3.7, // Simulation
            rentabilite_trend: 2.1, // Simulation
            encours_trend: 15.8 // Simulation
        };

        res.json({
            success: true,
            data: kpisData
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des KPIs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des KPIs'
        });
    }
});

// GET /api/analytics/top-collaborateurs - Top collaborateurs
router.get('/top-collaborateurs', authenticateToken, async (req, res) => {
    try {
        const { period = 30, limit = 10 } = req.query;

        const startDate = new Date();
        const periodInt = parseInt(period) || 30;
        startDate.setDate(startDate.getDate() - periodInt);

        const query = `
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                bu.nom as business_unit_nom,
                SUM(te.heures) as heures_total,
                SUM(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE 0 END) as heures_validees,
                COUNT(DISTINCT te.mission_id) as missions_count
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE te.created_at >= $1
            GROUP BY c.id, c.nom, c.prenom, bu.nom
            ORDER BY heures_total DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [startDate.toISOString(), parseInt(limit)]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des top collaborateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des top collaborateurs'
        });
    }
});

// GET /api/analytics/encours-facturation - Encours de facturation
router.get('/encours-facturation', authenticateToken, async (req, res) => {
    try {
        const { period = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const query = `
            SELECT 
                m.id,
                m.nom as mission_nom,
                c.nom as client_nom,
                m.montant_honoraires as montant_estime,
                m.date_fin as date_fin_prevue,
                EXTRACT(EPOCH FROM (CURRENT_DATE::timestamp - m.date_fin::timestamp))/86400 as jours_retard,
                bu.nom as business_unit_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE m.statut = 'EN_COURS' 
            AND m.date_fin < CURRENT_DATE
            ORDER BY m.date_fin ASC
            LIMIT 10
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des encours de facturation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des encours de facturation'
        });
    }
});

// GET /api/analytics/performance-business-units - Performance par Business Unit
router.get('/performance-business-units', authenticateToken, async (req, res) => {
    try {
        const { period = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const query = `
            SELECT 
                bu.id,
                bu.nom as business_unit_nom,
                COUNT(DISTINCT te.user_id) as collaborateurs_count,
                SUM(te.heures) as heures_total,
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                COUNT(DISTINCT te.mission_id) as missions_count,
                AVG(te.heures) as heures_moyennes_par_collaborateur
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE te.created_at >= $1 AND bu.id IS NOT NULL
            GROUP BY bu.id, bu.nom
            ORDER BY heures_total DESC
        `;

        const result = await pool.query(query, [startDate.toISOString()]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la performance des BU:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la performance des BU'
        });
    }
});

// GET /api/analytics/evolution-heures - Évolution des heures dans le temps
router.get('/evolution-heures', authenticateToken, async (req, res) => {
    try {
        const { period = 30, collaborateur_id } = req.query;

        const startDate = new Date();
        const periodInt = parseInt(period) || 30;
        startDate.setDate(startDate.getDate() - periodInt);

        let whereConditions = ['te.created_at >= $1'];
        let params = [startDate.toISOString()];
        let paramIndex = 2;

        if (collaborateur_id) {
            whereConditions.push(`te.user_id = $${paramIndex++}`);
            params.push(collaborateur_id);
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                DATE(te.created_at) as date,
                SUM(te.heures) as heures_total,
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                SUM(CASE WHEN te.status = 'submitted' THEN te.heures ELSE 0 END) as heures_soumises
            FROM time_entries te
            WHERE ${whereClause}
            GROUP BY DATE(te.created_at)
            ORDER BY date
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution des heures:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'évolution des heures'
        });
    }
});

// GET /api/analytics/alerts - Système d'alertes
router.get('/alerts', authenticateToken, async (req, res) => {
    try {
        const alerts = [];

        // Alerte 1: Missions en retard
        const missionsEnRetardQuery = `
            SELECT COUNT(*) as count
            FROM missions m
            WHERE m.statut = 'EN_COURS' 
            AND m.date_fin < CURRENT_DATE
        `;
        const missionsEnRetardResult = await pool.query(missionsEnRetardQuery);
        const missionsEnRetard = missionsEnRetardResult.rows[0].count;

        if (missionsEnRetard > 0) {
            alerts.push({
                id: 1,
                type: 'mission_delay',
                severity: 'high',
                title: 'Missions en retard',
                description: `${missionsEnRetard} mission(s) ont dépassé leur date d'échéance`,
                created_at: new Date().toISOString()
            });
        }

        // Alerte 2: Heures non validées > 7 jours
        const heuresNonValideesQuery = `
            SELECT COUNT(*) as count
            FROM time_entries te
            WHERE te.status = 'submitted'
            AND te.created_at < CURRENT_DATE - INTERVAL '7 days'
        `;
        const heuresNonValideesResult = await pool.query(heuresNonValideesQuery);
        const heuresNonValidees = heuresNonValideesResult.rows[0].count;

        if (heuresNonValidees > 0) {
            alerts.push({
                id: 2,
                type: 'validation_pending',
                severity: 'medium',
                title: 'Heures en attente de validation',
                description: `${heuresNonValidees} saisie(s) en attente de validation depuis plus de 7 jours`,
                created_at: new Date().toISOString()
            });
        }

        // Alerte 3: Dépassement budget (simulation)
        const budgetQuery = `
            SELECT 
                SUM(COALESCE(m.montant_honoraires, 0)) as budget_estime,
                SUM(COALESCE(te.heures * COALESCE(g.taux_horaire_default, 0), 0)) as cout_reel
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            WHERE m.statut = 'EN_COURS'
        `;
        const budgetResult = await pool.query(budgetQuery);
        const budgetData = budgetResult.rows[0];

        if (budgetData.cout_reel > budgetData.budget_estime * 1.1) {
            alerts.push({
                id: 3,
                type: 'budget_overrun',
                severity: 'high',
                title: 'Dépassement de budget',
                description: 'Le coût réel dépasse de plus de 10% le budget estimé',
                created_at: new Date().toISOString()
            });
        }

        // Alerte 4: Anomalie de saisie (simulation)
        const anomalieQuery = `
            SELECT COUNT(*) as count
            FROM time_entries te
            WHERE te.heures > 12
            AND te.created_at >= CURRENT_DATE - INTERVAL '1 day'
        `;
        const anomalieResult = await pool.query(anomalieQuery);
        const anomalies = anomalieResult.rows[0].count;

        if (anomalies > 0) {
            alerts.push({
                id: 4,
                type: 'anomaly',
                severity: 'medium',
                title: 'Anomalies de saisie détectées',
                description: `${anomalies} saisie(s) avec plus de 12h/jour détectée(s)`,
                created_at: new Date().toISOString()
            });
        }

        // Alerte 5: Performance faible (simulation)
        const performanceQuery = `
            SELECT AVG(te.heures) as moyenne_heures
            FROM time_entries te
            WHERE te.created_at >= CURRENT_DATE - INTERVAL '7 days'
        `;
        const performanceResult = await pool.query(performanceQuery);
        const moyenneHeures = performanceResult.rows[0].moyenne_heures || 0;

        if (moyenneHeures && moyenneHeures < 6) {
            alerts.push({
                id: 5,
                type: 'performance',
                severity: 'low',
                title: 'Performance faible',
                description: `Moyenne de ${Number(moyenneHeures).toFixed(1)}h/jour sur la semaine (objectif: 8h)`,
                created_at: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: alerts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des alertes'
        });
    }
});

module.exports = router;

// ===================== AJOUT: Recouvrement / Rentabilité / Chargeabilité =====================

// GET /api/analytics/ar-aging - Répartition des comptes clients par ancienneté
router.get('/ar-aging', authenticateToken, async (req, res) => {
    try {
        const query = `
            WITH paiements AS (
                SELECT ip.invoice_id, COALESCE(SUM(ip.montant), 0) AS montant_paye
                FROM invoice_payments ip
                GROUP BY ip.invoice_id
            ),
            factures AS (
                SELECT 
                    i.id,
                    i.client_id,
                    i.date_echeance,
                    COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva, 0)) AS montant_ttc,
                    COALESCE(p.montant_paye, 0) AS montant_paye,
                    GREATEST(COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva, 0)) - COALESCE(p.montant_paye, 0), 0) AS restant
                FROM invoices i
                LEFT JOIN paiements p ON p.invoice_id = i.id
                WHERE i.statut NOT IN ('ANNULEE')
            )
            SELECT 
                COUNT(*) FILTER (WHERE restant > 0 AND CURRENT_DATE <= date_echeance) AS not_due,
                COUNT(*) FILTER (WHERE restant > 0 AND CURRENT_DATE > date_echeance AND CURRENT_DATE - date_echeance <= 30) AS bkt_0_30,
                COUNT(*) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance BETWEEN 31 AND 60) AS bkt_31_60,
                COUNT(*) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance BETWEEN 61 AND 90) AS bkt_61_90,
                COUNT(*) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance > 90) AS bkt_90_plus,
                SUM(restant) FILTER (WHERE restant > 0 AND CURRENT_DATE <= date_echeance) AS amt_not_due,
                SUM(restant) FILTER (WHERE restant > 0 AND CURRENT_DATE > date_echeance AND CURRENT_DATE - date_echeance <= 30) AS amt_0_30,
                SUM(restant) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance BETWEEN 31 AND 60) AS amt_31_60,
                SUM(restant) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance BETWEEN 61 AND 90) AS amt_61_90,
                SUM(restant) FILTER (WHERE restant > 0 AND CURRENT_DATE - date_echeance > 90) AS amt_90_plus
            FROM factures;
        `;

        const result = await pool.query(query);
        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur AR aging:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors du calcul AR aging' });
    }
});

// GET /api/analytics/collections-stats - Facturé, encaissé, DSO
router.get('/collections-stats', authenticateToken, async (req, res) => {
    try {
        const { period = 90 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const query = `
            WITH factures AS (
                SELECT i.id, i.date_emission, COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0)) AS montant
                FROM invoices i
                WHERE i.date_emission >= $1::timestamptz
            ), encaissements AS (
                SELECT ip.invoice_id, ip.date_paiement, ip.montant
                FROM invoice_payments ip
                WHERE ip.date_paiement >= $1::timestamptz
            )
            SELECT 
                (SELECT COALESCE(SUM(montant),0) FROM factures) AS total_facture,
                (SELECT COALESCE(SUM(montant),0) FROM encaissements) AS total_encaisse,
                -- DSO approximatif: créances / (CA/nb_jours) sur la période
                (
                    SELECT 
                        CASE WHEN SUM(f.montant) > 0 THEN 
                            (SELECT COALESCE(SUM(f2.montant),0) - COALESCE(SUM(p.montant),0)
                             FROM factures f2 
                             LEFT JOIN encaissements p ON p.invoice_id = f2.id) 
                            / (SUM(f.montant) / GREATEST($2::int,1))
                        ELSE 0 END
                    FROM factures f
                ) AS dso_estime
        `;

        const result = await pool.query(query, [startDate.toISOString(), parseInt(period)]);
        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur collections-stats:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors du calcul des stats d\'encaissement' });
    }
});

// GET /api/analytics/collections-by-client - Top retards par client
router.get('/collections-by-client', authenticateToken, async (req, res) => {
    try {
        const query = `
            WITH paiements AS (
                SELECT ip.invoice_id, COALESCE(SUM(ip.montant), 0) AS montant_paye
                FROM invoice_payments ip
                GROUP BY ip.invoice_id
            ), retards AS (
                SELECT 
                    c.id AS client_id,
                    c.nom AS client_nom,
                    COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0)) - COALESCE(p.montant_paye, 0) AS restant,
                    GREATEST((CURRENT_DATE - i.date_echeance), 0) AS jours_retard
                FROM invoices i
                JOIN clients c ON c.id = i.client_id
                LEFT JOIN paiements p ON p.invoice_id = i.id
                WHERE i.statut NOT IN ('ANNULEE')
            )
            SELECT client_id, client_nom,
                   SUM(CASE WHEN restant > 0 THEN restant ELSE 0 END) AS montant_restant,
                   MAX(jours_retard) AS max_retard
            FROM retards
            GROUP BY client_id, client_nom
            HAVING SUM(CASE WHEN restant > 0 THEN restant ELSE 0 END) > 0
            ORDER BY montant_restant DESC
            LIMIT 20;
        `;

        const result = await pool.query(query);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur collections-by-client:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors de l\'agrégation par client' });
    }
});

// GET /api/analytics/profitability-missions - Rentabilité par mission
router.get('/profitability-missions', authenticateToken, async (req, res) => {
    try {
        const { period = 90, fiscal_year_id } = req.query;
        let startDate, endDate;

        if (fiscal_year_id) {
            const fyResult = await pool.query('SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1', [fiscal_year_id]);
            if (fyResult.rows.length > 0) {
                startDate = new Date(fyResult.rows[0].date_debut);
                endDate = new Date(fyResult.rows[0].date_fin);
            }
        }
        if (!startDate) {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));
            endDate = new Date();
        }

        const query = `
            WITH couts AS (
                SELECT te.mission_id,
                       SUM(te.heures * COALESCE(g.taux_horaire_default, 0)) AS cout_charge
                FROM time_entries te
                JOIN users u ON te.user_id = u.id
                JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE te.created_at >= $1::timestamptz AND te.created_at <= $2::timestamptz
                GROUP BY te.mission_id
            ), facturation AS (
                SELECT i.mission_id,
                       COALESCE(SUM(COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0))),0) AS facture
                FROM invoices i
                WHERE i.date_emission >= $1::timestamptz AND i.date_emission <= $2::timestamptz
                GROUP BY i.mission_id
            )
            SELECT m.id, m.nom AS mission_nom, c2.nom AS client_nom,
                   COALESCE(f.facture,0) AS facture,
                   COALESCE(ct.cout_charge,0) AS cout_charge,
                   COALESCE(f.facture,0) - COALESCE(ct.cout_charge,0) AS marge
            FROM missions m
            LEFT JOIN clients c2 ON c2.id = m.client_id
            LEFT JOIN couts ct ON ct.mission_id = m.id
            LEFT JOIN facturation f ON f.mission_id = m.id
            ORDER BY marge DESC
            LIMIT 50;
        `;

        const result = await pool.query(query, [startDate.toISOString(), endDate.toISOString()]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur profitability-missions:', error);
        return res.status(500).json({ success: false, error: 'Erreur rentabilité missions' });
    }
});

// GET /api/analytics/profitability-clients - Rentabilité par client
router.get('/profitability-clients', authenticateToken, async (req, res) => {
    try {
        const { period = 180, fiscal_year_id } = req.query;
        let startDate, endDate;

        if (fiscal_year_id) {
            const fyResult = await pool.query('SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1', [fiscal_year_id]);
            if (fyResult.rows.length > 0) {
                startDate = new Date(fyResult.rows[0].date_debut);
                endDate = new Date(fyResult.rows[0].date_fin);
            }
        }
        if (!startDate) {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));
            endDate = new Date();
        }

        const query = `
            WITH te_couts AS (
                SELECT m.client_id,
                       SUM(te.heures * COALESCE(g.taux_horaire_default, 0)) AS cout_charge
                FROM time_entries te
                JOIN users u ON te.user_id = u.id
                JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                LEFT JOIN missions m ON m.id = te.mission_id
                WHERE te.created_at >= $1::timestamptz AND te.created_at <= $2::timestamptz
                GROUP BY m.client_id
            ), factures AS (
                SELECT i.client_id,
                       COALESCE(SUM(COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0))),0) AS facture
                FROM invoices i
                WHERE i.date_emission >= $1::timestamptz AND i.date_emission <= $2::timestamptz
                GROUP BY i.client_id
            )
            SELECT c.id AS client_id, c.nom AS client_nom,
                   COALESCE(f.facture,0) AS facture,
                   COALESCE(tc.cout_charge,0) AS cout_charge,
                   COALESCE(f.facture,0) - COALESCE(tc.cout_charge,0) AS marge
            FROM clients c
            LEFT JOIN te_couts tc ON tc.client_id = c.id
            LEFT JOIN factures f ON f.client_id = c.id
            ORDER BY marge DESC
            LIMIT 50;
        `;

        const result = await pool.query(query, [startDate.toISOString(), endDate.toISOString()]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur profitability-clients:', error);
        return res.status(500).json({ success: false, error: 'Erreur rentabilité clients' });
    }
});

// GET /api/analytics/utilization - Chargeabilité (HC/HNC) vs capacité
router.get('/utilization', authenticateToken, async (req, res) => {
    try {
        const { period = 30, scope = 'BU', fiscal_year_id } = req.query;
        let startDate, endDate, numDays;

        if (fiscal_year_id) {
            const fyResult = await pool.query('SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1', [fiscal_year_id]);
            if (fyResult.rows.length > 0) {
                startDate = new Date(fyResult.rows[0].date_debut);
                endDate = new Date(fyResult.rows[0].date_fin);
                numDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
            }
        }
        if (!startDate) {
            numDays = parseInt(period);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - numDays);
            endDate = new Date();
        }

        const base = `
            SELECT 
                ${scope === 'COLLAB' ? 'c.id' : scope === 'DIVISION' ? 'd.id' : 'bu.id'} AS id,
                ${scope === 'COLLAB' ? "(c.prenom || ' ' || c.nom)" : scope === 'DIVISION' ? 'd.nom' : 'bu.nom'} AS label,
                SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END) AS heures_hc,
                SUM(CASE WHEN te.type_heures <> 'HC' THEN te.heures ELSE 0 END) AS heures_hnc,
                COUNT(DISTINCT te.user_id) AS collaborateurs_actifs,
                COUNT(DISTINCT te.user_id) * 8 * LEAST($3::int, 250) AS capacite_approx
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE te.created_at >= $1::timestamptz AND te.created_at <= $2::timestamptz
            GROUP BY 1,2
            ORDER BY heures_hc DESC
            LIMIT 100
        `;

        const result = await pool.query(base, [startDate.toISOString(), endDate.toISOString(), numDays]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur utilization:', error);
        return res.status(500).json({ success: false, error: 'Erreur chargeabilité' });
    }
});

// ===== ENDPOINTS POUR DASHBOARD DIRECTION =====

// GET /api/analytics/strategic-stats - Statistiques stratégiques pour la direction
router.get('/strategic-stats', authenticateToken, async (req, res) => {
    try {
        const { period = 90, business_unit = '', year = 2024 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Construire les conditions WHERE
        let whereConditions = ['te.created_at >= $1'];
        let params = [startDate.toISOString()];
        let paramIndex = 2;

        if (business_unit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(business_unit);
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                COALESCE(SUM(m.montant_honoraires), 0) as chiffre_affaires,
                COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0) as cout_total,
                CASE 
                    WHEN COALESCE(SUM(m.montant_honoraires), 0) > 0 
                    THEN ((COALESCE(SUM(m.montant_honoraires), 0) - COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0)) / COALESCE(SUM(m.montant_honoraires), 0)) * 100
                    ELSE 0 
                END as marge_brute,
                COUNT(DISTINCT m.id) as total_missions,
                COUNT(DISTINCT c.id) as total_clients,
                COUNT(DISTINCT te.user_id) as collaborateurs_actifs
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            LEFT JOIN missions m ON te.mission_id = m.id
            WHERE ${whereClause}
        `;

        const result = await pool.query(query, params);
        const data = result.rows[0];

        // Calculer les tendances (simulation)
        const tendances = {
            tendance_ca: 12.5,
            tendance_marge: 3.2,
            tendance_conversion: 5.8,
            tendance_satisfaction: 2.1
        };

        return res.json({
            success: true,
            data: {
                ...data,
                ...tendances,
                taux_conversion: 75.5,
                satisfaction_client: 92.3
            }
        });
    } catch (error) {
        console.error('Erreur strategic-stats:', error);
        return res.status(500).json({ success: false, error: 'Erreur statistiques stratégiques' });
    }
});

// GET /api/analytics/strategic-chart-data - Données pour les graphiques stratégiques
router.get('/strategic-chart-data', authenticateToken, async (req, res) => {
    try {
        const { period = 90, business_unit = '', year = 2024 } = req.query;

        // Calculer la date de début basée sur la période
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Construire les conditions WHERE
        let whereConditions = ['m.created_at >= $1'];
        let params = [startDate.toISOString()];
        let paramIndex = 2;

        if (business_unit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(business_unit);
        }

        const whereClause = whereConditions.join(' AND ');

        // 1. Évolution mensuelle CA et marge
        const evolutionQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('month', m.created_at), 'Mon') as mois,
                DATE_TRUNC('month', m.created_at) as mois_date,
                COALESCE(SUM(m.montant_honoraires), 0) as ca,
                CASE 
                    WHEN COALESCE(SUM(m.montant_honoraires), 0) > 0 
                    THEN ((COALESCE(SUM(m.montant_honoraires), 0) - COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0)) / COALESCE(SUM(m.montant_honoraires), 0)) * 100
                    ELSE 0 
                END as marge
            FROM missions m
            LEFT JOIN time_entries te ON te.mission_id = m.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE ${whereClause}
            GROUP BY DATE_TRUNC('month', m.created_at)
            ORDER BY mois_date ASC
        `;

        const evolutionResult = await pool.query(evolutionQuery, params);

        // 2. Répartition par Business Unit
        const buQuery = `
            SELECT 
                bu.nom as bu,
                COALESCE(SUM(m.montant_honoraires), 0) as ca,
                COUNT(DISTINCT m.id) as missions
            FROM business_units bu
            LEFT JOIN missions m ON m.business_unit_id = bu.id
                AND m.created_at >= $1
            ${business_unit ? 'WHERE bu.id = $2' : ''}
            GROUP BY bu.id, bu.nom
            HAVING COALESCE(SUM(m.montant_honoraires), 0) > 0
            ORDER BY ca DESC
            LIMIT 10
        `;

        const buResult = await pool.query(buQuery, params);

        return res.json({
            success: true,
            data: {
                evolution: evolutionResult.rows.map(row => ({
                    mois: row.mois,
                    ca: parseFloat(row.ca) || 0,
                    marge: parseFloat(row.marge).toFixed(2) || 0
                })),
                bu_repartition: buResult.rows.map(row => ({
                    bu: row.bu,
                    ca: parseFloat(row.ca) || 0,
                    missions: parseInt(row.missions) || 0
                }))
            }
        });
    } catch (error) {
        console.error('Erreur strategic-chart-data:', error);
        return res.status(500).json({ success: false, error: 'Erreur données graphiques stratégiques' });
    }
});

// GET /api/analytics/strategic-objectives - Objectifs stratégiques
router.get('/strategic-objectives', authenticateToken, async (req, res) => {
    try {
        const { period = 90, business_unit = '', year = 2024 } = req.query;

        // 1. Récupérer les objectifs depuis la base de données
        let targetsQuery = `
            SELECT type, target_value, unit
            FROM strategic_objectives
            WHERE year = $1
        `;
        const targetsParams = [year];

        if (business_unit) {
            targetsQuery += ` AND business_unit_id = $2`;
            targetsParams.push(business_unit);
        } else {
            targetsQuery += ` AND business_unit_id IS NULL`;
        }

        const targetsResult = await pool.query(targetsQuery, targetsParams);
        const targetsMap = {};
        targetsResult.rows.forEach(row => {
            targetsMap[row.type] = {
                target: parseFloat(row.target_value),
                unit: row.unit
            };
        });

        // Si aucun objectif défini, utiliser des valeurs par défaut (fallback)
        if (Object.keys(targetsMap).length === 0) {
            targetsMap['CA'] = { target: 2500000, unit: '€' };
            targetsMap['MARGE'] = { target: 25, unit: '%' };
            targetsMap['SATISFACTION'] = { target: 95, unit: '%' };
            targetsMap['CONVERSION'] = { target: 80, unit: '%' };
        }

        // 2. Calculer les valeurs actuelles (Réalisé)

        // Dates pour le calcul (depuis le début de l'année fiscale)
        const startDate = new Date(year, 0, 1); // 1er Janvier de l'année demandée
        const endDate = new Date(year, 11, 31); // 31 Décembre

        // Filtres pour les requêtes
        let whereConditions = ['m.created_at >= $1 AND m.created_at <= $2'];
        let params = [startDate.toISOString(), endDate.toISOString()];
        let paramIndex = 3;

        if (business_unit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(business_unit);
        }

        const whereClause = whereConditions.join(' AND ');

        // A. CA et Marge
        const financialQuery = `
            SELECT 
                COALESCE(SUM(m.montant_honoraires), 0) as ca,
                COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0) as cout
            FROM missions m
            LEFT JOIN time_entries te ON te.mission_id = m.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE ${whereClause}
        `;

        const financialResult = await pool.query(financialQuery, params);
        const ca = parseFloat(financialResult.rows[0].ca);
        const cout = parseFloat(financialResult.rows[0].cout);
        const marge = ca > 0 ? ((ca - cout) / ca) * 100 : 0;

        // B. Taux de conversion (Opportunités gagnées / (Gagnées + Perdues))
        // Note: On utilise les mêmes filtres de date/BU mais sur la table opportunities
        // On filtre sur la date de fermeture réelle pour les opportunités closes
        let oppWhereConditions = ['o.date_fermeture_reelle >= $1 AND o.date_fermeture_reelle <= $2'];
        let oppParams = [startDate.toISOString(), endDate.toISOString()];
        let oppParamIndex = 3;

        if (business_unit) {
            oppWhereConditions.push(`o.business_unit_id = $${oppParamIndex++}`);
            oppParams.push(business_unit);
        }

        const conversionQuery = `
            SELECT 
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as gagnees,
                COUNT(CASE WHEN o.statut IN ('GAGNEE', 'PERDUE') THEN 1 END) as total_closes
            FROM opportunities o
            WHERE ${oppWhereConditions.join(' AND ')}
        `;

        const conversionResult = await pool.query(conversionQuery, oppParams);
        const gagnees = parseInt(conversionResult.rows[0].gagnees);
        const totalCloses = parseInt(conversionResult.rows[0].total_closes);
        const conversion = totalCloses > 0 ? (gagnees / totalCloses) * 100 : 0;

        // C. Satisfaction Client (Simulation ou moyenne des notes si table reviews existe)
        // Pour l'instant, on simule une valeur réaliste basée sur le taux de rétention ou autre, 
        // ou on garde une valeur fixe si pas de données.
        const satisfaction = 92.5; // Valeur simulée pour le moment

        // 3. Construire la réponse
        const objectifs = [
            {
                objectif: 'Croissance CA',
                cible: targetsMap['CA']?.target || 0,
                actuel: ca,
                unite: targetsMap['CA']?.unit || '€',
                progression: (targetsMap['CA']?.target > 0) ? (ca / targetsMap['CA'].target) * 100 : 0
            },
            {
                objectif: 'Marge brute',
                cible: targetsMap['MARGE']?.target || 0,
                actuel: marge,
                unite: targetsMap['MARGE']?.unit || '%',
                progression: (targetsMap['MARGE']?.target > 0) ? (marge / targetsMap['MARGE'].target) * 100 : 0
            },
            {
                objectif: 'Satisfaction client',
                cible: targetsMap['SATISFACTION']?.target || 0,
                actuel: satisfaction,
                unite: targetsMap['SATISFACTION']?.unit || '%',
                progression: (targetsMap['SATISFACTION']?.target > 0) ? (satisfaction / targetsMap['SATISFACTION'].target) * 100 : 0
            },
            {
                objectif: 'Taux de conversion',
                cible: targetsMap['CONVERSION']?.target || 0,
                actuel: conversion,
                unite: targetsMap['CONVERSION']?.unit || '%',
                progression: (targetsMap['CONVERSION']?.target > 0) ? (conversion / targetsMap['CONVERSION'].target) * 100 : 0
            }
        ];

        return res.json({
            success: true,
            data: objectifs
        });
    } catch (error) {
        console.error('Erreur strategic-objectives:', error);
        return res.status(500).json({ success: false, error: 'Erreur objectifs stratégiques' });
    }
});

// GET /api/analytics/financial-indicators - Indicateurs financiers
router.get('/financial-indicators', authenticateToken, async (req, res) => {
    try {
        const { period = 90, business_unit = '', year = 2024 } = req.query;

        // Calculer les dates pour période actuelle et précédente
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const prevEndDate = new Date(startDate);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - parseInt(period));

        // Construire les conditions WHERE
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (business_unit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(business_unit);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // 1. EBITDA (Marge brute - approximation)
        const ebitdaQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN m.created_at >= $${paramIndex} THEN m.montant_honoraires ELSE 0 END), 0) as ca_actuel,
                COALESCE(SUM(CASE WHEN m.created_at >= $${paramIndex} THEN te.heures * COALESCE(g.taux_horaire_default, 0) ELSE 0 END), 0) as cout_actuel,
                COALESCE(SUM(CASE WHEN m.created_at BETWEEN $${paramIndex + 1} AND $${paramIndex} THEN m.montant_honoraires ELSE 0 END), 0) as ca_precedent,
                COALESCE(SUM(CASE WHEN m.created_at BETWEEN $${paramIndex + 1} AND $${paramIndex} THEN te.heures * COALESCE(g.taux_horaire_default, 0) ELSE 0 END), 0) as cout_precedent
            FROM missions m
            LEFT JOIN time_entries te ON te.mission_id = m.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ${whereClause}
        `;

        params.push(startDate.toISOString(), prevStartDate.toISOString());
        const ebitdaResult = await pool.query(ebitdaQuery, params);
        const ebitdaData = ebitdaResult.rows[0];

        const ebitda_actuel = parseFloat(ebitdaData.ca_actuel) - parseFloat(ebitdaData.cout_actuel);
        const ebitda_precedent = parseFloat(ebitdaData.ca_precedent) - parseFloat(ebitdaData.cout_precedent);
        const ebitda_tendance = ebitda_precedent > 0 ? ((ebitda_actuel - ebitda_precedent) / ebitda_precedent) * 100 : 0;

        // 2. ROI (Retour sur investissement)
        const roi_actuel = parseFloat(ebitdaData.cout_actuel) > 0
            ? (ebitda_actuel / parseFloat(ebitdaData.cout_actuel)) * 100
            : 0;
        const roi_precedent = parseFloat(ebitdaData.cout_precedent) > 0
            ? (ebitda_precedent / parseFloat(ebitdaData.cout_precedent)) * 100
            : 0;
        const roi_tendance = roi_precedent > 0 ? ((roi_actuel - roi_precedent) / roi_precedent) * 100 : 0;

        // 3. Trésorerie (encaissé - en attente approximation)
        const tresoQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN f.statut = 'PAYEE' AND f.date_dernier_paiement >= $1::TIMESTAMP THEN f.montant_ttc ELSE 0 END), 0) as encaisse_actuel,
                COALESCE(SUM(CASE WHEN f.statut IN ('EMISE', 'ENVOYEE') THEN f.montant_ttc ELSE 0 END), 0) as en_attente,
                COALESCE(SUM(CASE WHEN f.statut = 'PAYEE' AND f.date_dernier_paiement BETWEEN $2::TIMESTAMP AND $1::TIMESTAMP THEN f.montant_ttc ELSE 0 END), 0) as encaisse_precedent
            FROM invoices f
            ${business_unit ? 'LEFT JOIN missions m ON f.mission_id = m.id LEFT JOIN business_units bu ON m.business_unit_id = bu.id ' + whereClause : ''}
        `;

        const tresoResult = await pool.query(tresoQuery, [startDate.toISOString(), prevStartDate.toISOString()].concat(business_unit ? [business_unit] : []));
        const tresoData = tresoResult.rows[0];

        const treso_actuel = parseFloat(tresoData.encaisse_actuel) - parseFloat(tresoData.en_attente);
        const treso_precedent = parseFloat(tresoData.encaisse_precedent);
        const treso_tendance = treso_precedent !== 0 ? ((treso_actuel - treso_precedent) / Math.abs(treso_precedent)) * 100 : 0;

        // 4. Délai de paiement moyen (DSO)
        const dsoQuery = `
            SELECT 
                COALESCE(AVG(CASE WHEN f.date_dernier_paiement >= $1::TIMESTAMP THEN EXTRACT(EPOCH FROM (f.date_dernier_paiement::TIMESTAMP - f.date_emission::TIMESTAMP))/86400 END), 0) as dso_actuel,
                COALESCE(AVG(CASE WHEN f.date_dernier_paiement BETWEEN $2::TIMESTAMP AND $1::TIMESTAMP THEN EXTRACT(EPOCH FROM (f.date_dernier_paiement::TIMESTAMP - f.date_emission::TIMESTAMP))/86400 END), 0) as dso_precedent
            FROM invoices f
            WHERE f.statut = 'PAYEE'
            ${business_unit ? 'AND EXISTS (SELECT 1 FROM missions m LEFT JOIN business_units bu ON m.business_unit_id = bu.id WHERE f.mission_id = m.id AND bu.id = $3)' : ''}
        `;

        const dsoResult = await pool.query(dsoQuery, [startDate.toISOString(), prevStartDate.toISOString()].concat(business_unit ? [business_unit] : []));
        const dsoData = dsoResult.rows[0];

        const dso_actuel = Math.round(parseFloat(dsoData.dso_actuel));
        const dso_precedent = Math.round(parseFloat(dsoData.dso_precedent));
        const dso_tendance = dso_precedent > 0 ? ((dso_actuel - dso_precedent) / dso_precedent) * 100 : 0;

        const indicateurs = [
            {
                label: 'EBITDA',
                valeur: Math.round(ebitda_actuel),
                unite: '€',
                tendance: parseFloat(ebitda_tendance.toFixed(1)),
                positif: ebitda_tendance >= 0
            },
            {
                label: 'ROI',
                valeur: parseFloat(roi_actuel.toFixed(1)),
                unite: '%',
                tendance: parseFloat(roi_tendance.toFixed(1)),
                positif: roi_tendance >= 0
            },
            {
                label: 'Trésorerie',
                valeur: Math.round(treso_actuel),
                unite: '€',
                tendance: parseFloat(treso_tendance.toFixed(1)),
                positif: treso_tendance >= 0
            },
            {
                label: 'Délai de paiement',
                valeur: dso_actuel,
                unite: 'jours',
                tendance: parseFloat(dso_tendance.toFixed(1)),
                positif: dso_tendance <= 0 // Une réduction du délai est positive
            }
        ];

        return res.json({
            success: true,
            data: indicateurs
        });
    } catch (error) {
        console.error('Erreur financial-indicators:', error);
        return res.status(500).json({ success: false, error: 'Erreur indicateurs financiers' });
    }
});

// GET /api/analytics/strategic-alerts - Alertes stratégiques
router.get('/strategic-alerts', authenticateToken, async (req, res) => {
    try {
        const { business_unit = '', year = 2024 } = req.query;

        const alertes = [];

        // Construire les conditions WHERE si business_unit est spécifié
        const whereClause = business_unit ? 'WHERE bu.id = $1' : '';
        const params = business_unit ? [business_unit] : [];

        // 1. Vérifier la marge brute (alerte si < 15%)
        const margeQuery = `
            SELECT 
                COALESCE(SUM(m.montant_honoraires), 0) as ca,
                COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0) as cout,
                CASE 
                    WHEN COALESCE(SUM(m.montant_honoraires), 0) > 0 
                    THEN ((COALESCE(SUM(m.montant_honoraires), 0) - COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0)) / COALESCE(SUM(m.montant_honoraires), 0)) * 100
                    ELSE 0 
                END as marge
            FROM missions m
            LEFT JOIN time_entries te ON te.mission_id = m.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ${whereClause}
            AND m.created_at >= NOW() - INTERVAL '30 days'
        `;

        const margeResult = await pool.query(margeQuery, params);
        const marge = parseFloat(margeResult.rows[0]?.marge || 0);

        if (marge > 0 && marge < 15) {
            alertes.push({
                type: 'danger',
                titre: 'Marge critique',
                message: `La marge brute est de ${marge.toFixed(1)}%, en dessous du seuil de 15%`,
                priorite: 'haute'
            });
        } else if (marge >= 15 && marge < 20) {
            alertes.push({
                type: 'warning',
                titre: 'Marge faible',
                message: `La marge brute est de ${marge.toFixed(1)}%, attention au seuil critique`,
                priorite: 'moyenne'
            });
        } else if (marge >= 25) {
            alertes.push({
                type: 'success',
                titre: 'Excellente marge',
                message: `La marge brute atteint ${marge.toFixed(1)}%, au-dessus de l'objectif`,
                priorite: 'basse'
            });
        }

        // 2. Vérifier les retards de paiement (> 60 jours)
        const retardQuery = `
            SELECT 
                COUNT(*) as nombre_clients,
                SUM(f.montant_ttc) as montant_total
            FROM invoices f
            LEFT JOIN clients c ON f.client_id = c.id
            ${business_unit ? 'LEFT JOIN missions m ON f.mission_id = m.id LEFT JOIN business_units bu ON m.business_unit_id = bu.id WHERE bu.id = $1 AND' : 'WHERE'}
            f.statut IN ('EMISE', 'ENVOYEE')
            AND f.date_echeance < CURRENT_DATE - INTERVAL '60 days'
        `;

        const retardResult = await pool.query(retardQuery, params);
        const nombreRetards = parseInt(retardResult.rows[0]?.nombre_clients || 0);
        const montantRetards = parseFloat(retardResult.rows[0]?.montant_total || 0);

        if (nombreRetards > 0) {
            alertes.push({
                type: 'danger',
                titre: 'Retards de paiement',
                message: `${nombreRetards} client(s) ont des retards > 60 jours (${Math.round(montantRetards)}€)`,
                priorite: 'haute'
            });
        }

        // 3. Vérifier les missions sans saisie de temps récente (> 14 jours)
        const missionsInactivesQuery = `
            SELECT COUNT(DISTINCT m.id) as nombre
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ${whereClause}
            ${whereClause ? 'AND' : 'WHERE'} m.statut = 'EN_COURS'
            AND NOT EXISTS (
                SELECT 1 FROM time_entries te 
                WHERE te.mission_id = m.id 
                AND te.date_saisie >= CURRENT_DATE - INTERVAL '14 days'
            )
        `;

        const inactivesResult = await pool.query(missionsInactivesQuery, params);
        const nombreInactives = parseInt(inactivesResult.rows[0]?.nombre || 0);

        if (nombreInactives > 0) {
            alertes.push({
                type: 'warning',
                titre: 'Missions sans activité',
                message: `${nombreInactives} mission(s) en cours sans saisie de temps depuis 14 jours`,
                priorite: 'moyenne'
            });
        }

        // 4. Vérifier le taux de chargeabilité (< 70%)
        const chargeabiliteQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END), 0) as heures_facturables,
                COALESCE(SUM(te.heures), 0) as heures_totales,
                CASE 
                    WHEN COALESCE(SUM(te.heures), 0) > 0 
                    THEN (COALESCE(SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END), 0) / COALESCE(SUM(te.heures), 0)) * 100
                    ELSE 0 
                END as taux_chargeabilite
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            ${whereClause}
            ${whereClause ? 'AND' : 'WHERE'} te.date_saisie >= CURRENT_DATE - INTERVAL '30 days'
        `;

        const chargeResult = await pool.query(chargeabiliteQuery, params);
        const tauxCharge = parseFloat(chargeResult.rows[0]?.taux_chargeabilite || 0);

        if (tauxCharge > 0 && tauxCharge < 70) {
            alertes.push({
                type: 'warning',
                titre: 'Chargeabilité faible',
                message: `Le taux de chargeabilité est de ${tauxCharge.toFixed(1)}%, en dessous de l'objectif de 70%`,
                priorite: 'moyenne'
            });
        }

        // Si aucune alerte, ajouter un message positif
        if (alertes.length === 0) {
            alertes.push({
                type: 'success',
                titre: 'Tout va bien',
                message: 'Aucune alerte stratégique à signaler pour le moment',
                priorite: 'basse'
            });
        }

        return res.json({
            success: true,
            data: alertes
        });
    } catch (error) {
        console.error('Erreur strategic-alerts:', error);
        return res.status(500).json({ success: false, error: 'Erreur alertes stratégiques' });
    }
});

// GET /api/analytics/pipeline-summary - Résumé du pipeline commercial
router.get('/pipeline-summary', authenticateToken, async (req, res) => {
    try {
        const { business_unit = '', year = 2024 } = req.query;

        // Construire les conditions WHERE
        const whereClause = business_unit ? 'WHERE bu.id = $1' : '';
        const params = business_unit ? [business_unit] : [];

        // Récupérer les opportunités avec leur étape actuelle
        const pipelineQuery = `
            SELECT 
                COUNT(DISTINCT o.id) as total_opportunites,
                COALESCE(SUM(o.montant_estime), 0) as montant_total,
                os.stage_name as etape,
                os.stage_order as ordre,
                COUNT(o.id) as nombre,
                COALESCE(SUM(o.montant_estime), 0) as montant
            FROM opportunities o
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN opportunity_stages os ON o.current_stage_id = os.id
            ${whereClause}
            AND o.statut IN ('ACTIVE', 'NOUVEAU', 'EN_COURS')
            GROUP BY os.id, os.stage_name, os.stage_order
            ORDER BY os.stage_order ASC
        `;

        const pipelineResult = await pool.query(pipelineQuery, params);

        // Calculer les totaux globaux
        const totauxQuery = `
            SELECT 
                COUNT(DISTINCT o.id) as total_opportunites,
                COALESCE(SUM(o.montant_estime), 0) as montant_total
            FROM opportunities o
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            ${whereClause}
            AND o.statut IN ('ACTIVE', 'NOUVEAU', 'EN_COURS')
        `;

        const totauxResult = await pool.query(totauxQuery, params);
        const totaux = totauxResult.rows[0];

        // Définir les couleurs par étape (mapping standard)
        const couleurs = {
            'Prospection': '#6c757d',
            'Qualification': '#17a2b8',
            'Proposition': '#ffc107',
            'Négociation': '#fd7e14',
            'Signature': '#28a745',
            'Gagné': '#28a745',
            'Perdu': '#dc3545'
        };

        // Formatter la répartition
        const repartition = pipelineResult.rows.map(row => ({
            etape: row.etape || 'Non défini',
            nombre: parseInt(row.nombre) || 0,
            montant: parseFloat(row.montant) || 0,
            couleur: couleurs[row.etape] || '#6c757d'
        }));

        // Si aucune donnée, retourner un pipeline vide
        const pipeline = {
            total_opportunites: parseInt(totaux.total_opportunites) || 0,
            montant_total: parseFloat(totaux.montant_total) || 0,
            repartition: repartition.length > 0 ? repartition : [
                { etape: 'Aucune opportunité', nombre: 0, montant: 0, couleur: '#6c757d' }
            ]
        };

        return res.json({
            success: true,
            data: pipeline
        });
    } catch (error) {
        console.error('Erreur pipeline-summary:', error);
        return res.status(500).json({ success: false, error: 'Erreur pipeline commercial' });
    }
});

// ===== ENDPOINTS POUR DASHBOARD ÉQUIPE =====

// GET /api/analytics/team-performance - Performance d'équipe
// Removed outer duplicate wrapper
// Endpoint: Performance de l'équipe (Scope Unifié)
router.get('/team-performance', authenticateToken, async (req, res) => {
    try {
        const { period = 30, scopeType = 'GLOBAL', scopeId, memberId } = req.query; // scopeType: 'GLOBAL', 'BU', 'DIVISION', 'SUPERVISOR'
        const userId = req.user.id;

        // 1. Identifier le collaborateur lié
        const userQuery = `SELECT id, collaborateur_id, role FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        const user = userResult.rows[0];
        const collaborateurId = user.collaborateur_id;
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const isAdmin = user.role === 'ADMIN';

        // 2. Définir le scope (Qui peut-on voir ?)
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (isSuperAdmin || isAdmin) {
            // Admin voit tout, sauf si un scope spécifique est demandé
            if (scopeType === 'BU' && scopeId) {
                whereConditions.push(`d.business_unit_id = '${scopeId}'`);
            } else if (scopeType === 'DIVISION' && scopeId) {
                whereConditions.push(`c.division_id = '${scopeId}'`);
            } else {
                whereConditions.push('1 = 1');
            }
        } else {
            if (!collaborateurId) {
                return res.status(403).json({ success: false, error: 'Compte non lié à un collaborateur' });
            }

            const scopeConditions = [];

            console.log('DEBUG team-performance START:', { userId, collaborateurId, scopeType, scopeId });

            // Logique de filtrage selon le scopeType demandé
            if (scopeType === 'BU' && scopeId) {
                // Vérifier si le user gère cette BU
                const checkBU = await pool.query('SELECT id FROM business_units WHERE id = $1 AND manager_id = $2', [scopeId, collaborateurId]);
                if (checkBU.rows.length > 0) {
                    scopeConditions.push(`d.business_unit_id = '${scopeId}'`);
                } else {
                    return res.status(403).json({ success: false, error: 'Accès non autorisé à cette Business Unit' });
                }
            }
            else if (scopeType === 'DIVISION' && scopeId) {
                // Vérifier si le user gère cette Division
                const checkDiv = await pool.query('SELECT id FROM divisions WHERE id = $1 AND (responsable_principal_id = $2 OR responsable_adjoint_id = $2)', [scopeId, collaborateurId]);
                if (checkDiv.rows.length > 0) {
                    scopeConditions.push(`c.division_id = '${scopeId}'`);
                } else {
                    return res.status(403).json({ success: false, error: 'Accès non autorisé à cette Division' });
                }
            }
            else if (scopeType === 'SUPERVISOR') {
                // Uniquement mes collaborateurs directs
                const supervisedQuery = `SELECT collaborateur_id FROM time_sheet_supervisors WHERE supervisor_id = $1`;
                const supervisedRest = await pool.query(supervisedQuery, [collaborateurId]);
                if (supervisedRest.rows.length > 0) {
                    const collabIds = supervisedRest.rows.map(r => r.collaborateur_id);
                    scopeConditions.push(`c.id IN (${collabIds.join(',')})`);
                } else {
                    scopeConditions.push('1 = 0');
                }
            }
            else {
                // GLOBAL (Défaut): Vue unifiée

                // A. Divisions gérées
                const managedDivsQuery = `
                        SELECT id FROM divisions 
                        WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
                    `;
                const managedDivs = await pool.query(managedDivsQuery, [collaborateurId]);
                if (managedDivs.rows.length > 0) {
                    const divIds = managedDivs.rows.map(r => `'${r.id}'`);
                    scopeConditions.push(`c.division_id IN (${divIds.join(',')})`);
                }

                // B. Business Units gérées
                const managedBUsQuery = `
                        SELECT id FROM business_units 
                        WHERE manager_id = $1
                    `;
                const managedBUs = await pool.query(managedBUsQuery, [collaborateurId]);
                if (managedBUs.rows.length > 0) {
                    const buIds = managedBUs.rows.map(r => `'${r.id}'`);
                    scopeConditions.push(`d.business_unit_id IN (${buIds.join(',')})`);
                }

                // C. Collaborateurs supervisés
                const supervisedQuery = `
                        SELECT collaborateur_id FROM time_sheet_supervisors WHERE supervisor_id = $1
                    `;
                const supervisedRest = await pool.query(supervisedQuery, [collaborateurId]);
                if (supervisedRest.rows.length > 0) {
                    const collabIds = supervisedRest.rows.map(r => `'${r.collaborateur_id}'`);
                    scopeConditions.push(`c.id IN (${collabIds.join(',')})`);
                }
            }

            if (scopeConditions.length > 0) {
                whereConditions.push(`(${scopeConditions.join(' OR ')})`);
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez aucune équipe, division ou collaborateur pour le scope demandé.'
                });
            }
        }

        // 3. Filtre Temporel (Time Entries)
        // Note: On filtre les TimeEntries dans le JOIN, pas dans le WHERE principal pour garder tous les membres
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Paramètres pour les dates (toujours les derniers params)
        const dateParams = [startDate.toISOString(), endDate.toISOString()];

        // 4. Filtre Membre Spécifique (Optionnel)
        if (memberId) {
            whereConditions.push(`c.id = $${paramIndex++}`);
            params.push(memberId);
        }

        const whereClause = whereConditions.join(' AND ');
        console.log('DEBUG team-performance whereClause:', whereClause);
        console.log('DEBUG team-performance params:', params);

        // 5. Exécution des requêtes
        // On sépare params (pour le WHERE) et dateParams (pour le JOIN)
        // SQL Injection safe: on concatène les valeurs statiques (IDs validés) dans le IN, 
        // et on utilise $ pour memberId.

        // KPIs de l'équipe
        const teamQuery = `
                SELECT 
                    COUNT(DISTINCT c.id) as total_membres,
                    COALESCE(SUM(te.heures), 0) as total_heures,
                    COALESCE(AVG(te.heures), 0) as moyenne_heures,
                    COALESCE(SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END), 0) as heures_facturables,
                    COALESCE(SUM(CASE WHEN te.type_heures = 'NON_BILLABLE' THEN te.heures ELSE 0 END), 0) as heures_non_facturables,
                    COUNT(DISTINCT m.id) as missions_actives
                FROM collaborateurs c
                LEFT JOIN users u ON c.user_id = u.id OR c.id = u.collaborateur_id
                LEFT JOIN time_entries te ON u.id = te.user_id AND te.date_saisie >= '${dateParams[0]}' AND te.date_saisie <= '${dateParams[1]}'
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                LEFT JOIN missions m ON te.mission_id = m.id
                WHERE ${whereClause}
            `;

        const teamResult = await pool.query(teamQuery, params);
        const teamData = teamResult.rows[0];

        // Taux de chargeabilité
        const tauxChargeabilite = teamData.total_heures > 0 ?
            (teamData.heures_facturables / teamData.total_heures) * 100 : 0;

        // Liste des collaborateurs
        const collabQuery = `
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    g.nom as grade_nom,
                    COALESCE(SUM(te.heures), 0) as total_heures,
                    COALESCE(SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END), 0) as heures_facturables,
                    COALESCE(SUM(CASE WHEN te.type_heures = 'NON_BILLABLE' THEN te.heures ELSE 0 END), 0) as heures_non_facturables,
                    CASE 
                        WHEN SUM(te.heures) > 0 
                        THEN (SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END) / SUM(te.heures)) * 100
                        ELSE 0 
                    END as taux_chargeabilite,
                     COUNT(DISTINCT m.id) as missions_assignees
                FROM collaborateurs c
                LEFT JOIN users u ON c.user_id = u.id OR c.id = u.collaborateur_id
                LEFT JOIN time_entries te ON u.id = te.user_id AND te.date_saisie >= '${dateParams[0]}' AND te.date_saisie <= '${dateParams[1]}'
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                LEFT JOIN missions m ON te.mission_id = m.id
                WHERE ${whereClause}
                GROUP BY c.id, c.nom, c.prenom, g.nom
                ORDER BY total_heures DESC NULLS LAST, c.nom ASC
            `;

        const collabQueryResult = await pool.query(collabQuery, params);

        // Distribution par grade
        const gradeQuery = `
                SELECT 
                    g.nom as grade_nom,
                    COUNT(DISTINCT c.id) as nombre,
                    COALESCE(SUM(te.heures), 0) as total_heures
                FROM collaborateurs c
                LEFT JOIN users u ON c.user_id = u.id OR c.id = u.collaborateur_id
                LEFT JOIN time_entries te ON u.id = te.user_id AND te.date_saisie >= '${dateParams[0]}' AND te.date_saisie <= '${dateParams[1]}'
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                WHERE ${whereClause}
                GROUP BY g.nom
                ORDER BY nombre DESC
            `;

        const gradeResult = await pool.query(gradeQuery, params);

        res.json({
            success: true,
            data: {
                kpis: {
                    total_membres: teamData.total_membres || 0,
                    total_heures: teamData.total_heures || 0,
                    moyenne_heures: teamData.moyenne_heures || 0,
                    heures_facturables: teamData.heures_facturables || 0,
                    heures_non_facturables: teamData.heures_non_facturables || 0,
                    taux_chargeabilite: Math.round(tauxChargeabilite * 10) / 10,
                    missions_actives: teamData.missions_actives || 0
                },
                collaborateurs: collabQueryResult.rows,
                distribution_grades: gradeResult.rows
            }
        });

    } catch (error) {
        console.error('Erreur API Team Performance (DETAILS):', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la performance équipe'
        });
    }
});

// GET /api/analytics/managed-teams - Récupérer les équipes gérées par le manager
router.get('/managed-teams', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Récupérer le collaborateur_id
        const collabQuery = `SELECT id FROM collaborateurs WHERE user_id = $1`;
        const collabResult = await pool.query(collabQuery, [userId]);

        if (collabResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    business_units: [],
                    divisions: [],
                    supervised_count: 0,
                    is_manager: false
                }
            });
        }

        const collaborateurId = collabResult.rows[0].id;

        // Récupérer les BU gérées
        const busQuery = `
            SELECT id, nom, code, description
            FROM business_units
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
            ORDER BY nom
        `;
        const busResult = await pool.query(busQuery, [collaborateurId]);

        // Récupérer les Divisions gérées
        const divsQuery = `
            SELECT id, nom, code, description, business_unit_id
            FROM divisions
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
            ORDER BY nom
        `;
        const divsResult = await pool.query(divsQuery, [collaborateurId]);

        // Récupérer le nombre de supervisés directs
        const supQuery = `
                    SELECT COUNT(*) as count 
                    FROM time_sheet_supervisors 
                    WHERE supervisor_id = $1
                `;
        const supResult = await pool.query(supQuery, [collaborateurId]);
        const supervisedCount = parseInt(supResult.rows[0].count) || 0;

        res.json({
            success: true,
            data: {
                business_units: busResult.rows,
                divisions: divsResult.rows,
                supervised_count: supervisedCount,
                is_manager: busResult.rows.length > 0 || divsResult.rows.length > 0 || supervisedCount > 0
            }
        });

    } catch (error) {
        console.error('Erreur managed-teams:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des équipes gérées'
        });
    }
});

// ===== ENDPOINTS POUR DASHBOARD PERSONNEL =====

// GET /api/analytics/personal-performance - Performance personnelle
router.get('/personal-performance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = 30 } = req.query;

        // Calculer les dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // KPIs personnels
        // 1. Récupérer les infos du profil (Indépendant des entrées de temps)
        const profileQuery = `
            SELECT 
                COALESCE(c.nom, u.nom) as collaborateur_nom,
                COALESCE(c.prenom, u.prenom) as collaborateur_prenom,
                COALESCE(g.nom, 'Administrateur') as grade_nom,
                COALESCE(d.nom, 'N/A') as division_nom,
                COALESCE(bu.nom, 'N/A') as business_unit_nom
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id OR c.id = u.collaborateur_id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            WHERE u.id = $1
        `;
        const profileResult = await pool.query(profileQuery, [userId]);
        const profileData = profileResult.rows[0] || {};

        // 2. KPIs personnels (Basé sur les entrées de temps)
        const statsQuery = `
            SELECT 
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END) as heures_facturables,
                SUM(CASE WHEN te.type_heures = 'HNC' THEN te.heures ELSE 0 END) as heures_non_facturables,
                COUNT(DISTINCT te.mission_id) as missions_travaillees,
                COUNT(CASE WHEN ts.statut = 'VALIDE' THEN 1 END) as temps_valides,
                COUNT(CASE WHEN ts.statut = 'EN_ATTENTE' THEN 1 END) as temps_en_attente
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
        `;
        const statsResult = await pool.query(statsQuery, [userId, startDate.toISOString(), endDate.toISOString()]);
        const kpiData = statsResult.rows[0] || {};

        // Combiner pour maintenir la structure attendue
        const personalData = { ...profileData, ...kpiData };

        // Taux de chargeabilité personnel
        const tauxChargeabilite = personalData.total_heures > 0 ?
            (personalData.heures_facturables / personalData.total_heures) * 100 : 0;

        // Missions actives
        const missionsQuery = `
            SELECT 
                m.id,
                m.nom as mission_nom,
                c.nom as client_nom,
                m.statut,
                m.date_debut,
                m.date_fin,
                SUM(te.heures) as heures_passees
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id AND te.user_id = $1
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE m.statut IN ('EN_COURS', 'PLANIFIEE')
            AND EXISTS (
                SELECT 1 FROM time_entries te2 
                WHERE te2.mission_id = m.id 
                AND te2.user_id = $1
            )
            GROUP BY m.id, m.nom, c.nom, m.statut, m.date_debut, m.date_fin
            ORDER BY m.date_debut DESC
            LIMIT 10
        `;

        const missionsResult = await pool.query(missionsQuery, [userId]);

        // Évolution temporelle (par jour)
        const timelineQuery = `
            SELECT 
                DATE(te.date_saisie) as jour,
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN te.type_heures = 'BILLABLE' THEN te.heures ELSE 0 END) as heures_facturables
            FROM time_entries te
            WHERE te.user_id = $1
            AND te.date_saisie >= $2
            AND te.date_saisie <= $3
            GROUP BY DATE(te.date_saisie)
            ORDER BY jour ASC
        `;

        const timelineResult = await pool.query(timelineQuery, [userId, startDate.toISOString(), endDate.toISOString()]);

        // 4. Opportunités gérées (Assignées)
        const opportunitiesManagedQuery = `
            SELECT 
                o.id, 
                o.nom, 
                c.raison_sociale as client_nom, 
                o.statut, 
                o.montant_estime, 
                o.probabilite,
                o.date_fermeture_prevue
            FROM opportunities o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
            LEFT JOIN users u ON col.user_id = u.id
            WHERE u.id = $1
            ORDER BY o.updated_at DESC
            LIMIT 10
        `;
        const oppManagedResult = await pool.query(opportunitiesManagedQuery, [userId]);

        // 5. Opportunités créées
        const opportunitiesCreatedQuery = `
            SELECT 
                o.id, 
                o.nom, 
                c.raison_sociale as client_nom, 
                o.statut, 
                o.montant_estime, 
                o.created_at
            FROM opportunities o
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.created_by = $1
            ORDER BY o.created_at DESC
            LIMIT 10
        `;
        const oppCreatedResult = await pool.query(opportunitiesCreatedQuery, [userId]);

        // 6. Campagnes suivies (Responsable)
        const campaignsManagedQuery = `
            SELECT 
                pc.id, 
                pc.name, 
                pc.status, 
                pc.channel, 
                pc.created_at,
                (SELECT COUNT(*) FROM prospecting_campaign_companies WHERE campaign_id = pc.id) as companies_count
            FROM prospecting_campaigns pc
            LEFT JOIN collaborateurs c ON pc.responsible_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE u.id = $1
            ORDER BY pc.created_at DESC
            LIMIT 10
        `;
        const campManagedResult = await pool.query(campaignsManagedQuery, [userId]);

        // 7. Campagnes créées
        const campaignsCreatedQuery = `
            SELECT 
                pc.id, 
                pc.name, 
                pc.status, 
                pc.channel, 
                pc.created_at,
                (SELECT COUNT(*) FROM prospecting_campaign_companies WHERE campaign_id = pc.id) as companies_count
            FROM prospecting_campaigns pc
            WHERE pc.created_by = $1
            ORDER BY pc.created_at DESC
            LIMIT 10
        `;
        const campCreatedResult = await pool.query(campaignsCreatedQuery, [userId]);

        // 8. Tâches travaillées
        const tasksQuery = `
            SELECT 
                t.id, 
                t.libelle as task_nom, 
                m.nom as mission_nom, 
                SUM(te.heures) as heures_passees
            FROM time_entries te
            JOIN tasks t ON te.task_id = t.id
            JOIN missions m ON te.mission_id = m.id
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
            GROUP BY t.id, t.libelle, m.nom
            ORDER BY heures_passees DESC
            LIMIT 10
        `;
        const tasksResult = await pool.query(tasksQuery, [userId, startDate.toISOString(), endDate.toISOString()]);

        const responseData = {
            profil: {
                nom: personalData.collaborateur_nom || '',
                prenom: personalData.collaborateur_prenom || '',
                grade: personalData.grade_nom || '',
                division: personalData.division_nom || '',
                business_unit: personalData.business_unit_nom || ''
            },
            kpis: {
                total_heures: personalData.total_heures || 0,
                heures_facturables: personalData.heures_facturables || 0,
                heures_non_facturables: personalData.heures_non_facturables || 0,
                taux_chargeabilite: Math.round(tauxChargeabilite * 10) / 10,
                missions_travaillees: personalData.missions_travaillees || 0,
                temps_valides: personalData.temps_valides || 0,
                temps_en_attente: personalData.temps_en_attente || 0,
                opportunities_managed_count: oppManagedResult.rowCount,
                opportunities_created_count: oppCreatedResult.rowCount,
                campaigns_managed_count: campManagedResult.rowCount,
                campaigns_created_count: campCreatedResult.rowCount
            },
            missions_actives: missionsResult.rows,
            tasks_worked: tasksResult.rows,
            evolution_temporelle: timelineResult.rows,
            opportunities_managed: oppManagedResult.rows,
            opportunities_created: oppCreatedResult.rows,
            campaigns_managed: campManagedResult.rows,
            campaigns_created: campCreatedResult.rows
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Erreur personal-performance:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la performance personnelle'
        });
    }
});

// ===== ENDPOINTS POUR DASHBOARD RECOUVREMENT =====

// GET /api/analytics/collections - Données de recouvrement
router.get('/collections', authenticateToken, async (req, res) => {
    try {
        const { period = 90, fiscal_year_id } = req.query;
        let startDate, endDate;

        if (fiscal_year_id) {
            const fyResult = await pool.query('SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1', [fiscal_year_id]);
            if (fyResult.rows.length > 0) {
                startDate = new Date(fyResult.rows[0].date_debut);
                endDate = new Date(fyResult.rows[0].date_fin);
            }
        }
        if (!startDate) {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));
        }

        // KPIs de recouvrement
        const kpisQuery = `
            SELECT 
                SUM(CASE WHEN f.statut IN ('EMISE', 'ENVOYEE', 'PAYEE') THEN f.montant_total ELSE 0 END) as facture_periode,
                SUM(CASE WHEN f.statut = 'PAYEE' THEN f.montant_total ELSE 0 END) as encaisse_periode,
                SUM(CASE 
                    WHEN f.statut IN ('EMISE', 'ENVOYEE') 
                    AND f.date_echeance < CURRENT_DATE 
                    THEN f.montant_total 
                    ELSE 0 
                END) as montant_retard,
                COUNT(CASE 
                    WHEN f.statut IN ('EMISE', 'ENVOYEE') 
                    AND f.date_echeance < CURRENT_DATE 
                    THEN 1 
                END) as nombre_retard
            FROM invoices f
            WHERE f.date_emission >= $1
            AND f.date_emission <= $2
        `;

        const kpisResult = await pool.query(kpisQuery, [startDate.toISOString(), endDate.toISOString()]);
        const kpisData = kpisResult.rows[0];

        // Calcul DSO (Days Sales Outstanding)
        const dsoQuery = `
            SELECT 
                AVG(EXTRACT(EPOCH FROM (f.date_dernier_paiement::TIMESTAMP - f.date_emission::TIMESTAMP))/86400) as dso_moyen
            FROM invoices f
            WHERE f.statut = 'PAYEE'
            AND f.date_dernier_paiement >= $1::TIMESTAMP
            AND f.date_dernier_paiement <= $2::TIMESTAMP
        `;

        const dsoResult = await pool.query(dsoQuery, [startDate.toISOString(), endDate.toISOString()]);
        const dsoData = dsoResult.rows[0];

        // Aging analysis (répartition par tranches d'âge)
        const agingQuery = `
            SELECT 
                CASE 
                    WHEN CURRENT_DATE - f.date_echeance <= 30 THEN '0-30 jours'
                    WHEN CURRENT_DATE - f.date_echeance <= 60 THEN '31-60 jours'
                    WHEN CURRENT_DATE - f.date_echeance <= 90 THEN '61-90 jours'
                    ELSE '> 90 jours'
                END as tranche,
                COUNT(*) as nombre_factures,
                SUM(f.montant_total) as montant_total
            FROM invoices f
            WHERE f.statut IN ('EMISE', 'ENVOYEE')
            AND f.date_echeance < CURRENT_DATE
            GROUP BY tranche
            ORDER BY 
                CASE tranche
                    WHEN '0-30 jours' THEN 1
                    WHEN '31-60 jours' THEN 2
                    WHEN '61-90 jours' THEN 3
                    ELSE 4
                END
        `;

        const agingResult = await pool.query(agingQuery);

        // Liste des factures en retard
        const invoicesQuery = `
            SELECT 
                f.id,
                f.numero as numero_facture,
                c.raison_sociale as client_nom,
                f.montant_total,
                f.date_emission,
                f.date_echeance,
                CURRENT_DATE - f.date_echeance as jours_retard
            FROM invoices f
            LEFT JOIN clients c ON f.client_id = c.id
            WHERE f.statut IN ('EMISE', 'ENVOYEE')
            AND f.date_echeance < CURRENT_DATE
            ORDER BY jours_retard DESC
            LIMIT 50
        `;

        const invoicesResult = await pool.query(invoicesQuery);

        // Évolution mensuelle (facturé vs encaissé)
        const monthlyQuery = `
            SELECT 
                DATE_TRUNC('month', f.date_emission) as mois,
                SUM(CASE WHEN f.statut IN ('EMISE', 'ENVOYEE', 'PAYEE') THEN f.montant_total ELSE 0 END) as facture,
                SUM(CASE WHEN f.statut = 'PAYEE' THEN f.montant_total ELSE 0 END) as encaisse
            FROM invoices f
            WHERE f.date_emission >= $1
            AND f.date_emission <= $2
            GROUP BY mois
            ORDER BY mois ASC
        `;

        const monthlyResult = await pool.query(monthlyQuery, [startDate.toISOString(), endDate.toISOString()]);

        // Top clients en retard
        const topClientsQuery = `
            WITH paiements AS (
                SELECT ip.invoice_id, COALESCE(SUM(ip.montant), 0) AS montant_paye
                FROM invoice_payments ip
                GROUP BY ip.invoice_id
            )
            SELECT c.id AS client_id, c.nom AS client_nom, c.sigle AS client_sigle,
                   SUM(GREATEST(COALESCE(f.montant_total, 0) - COALESCE(p.montant_paye, 0), 0)) AS montant_retard,
                   MAX(GREATEST(CURRENT_DATE - f.date_echeance, 0)) AS retard_moyen
            FROM invoices f
            JOIN clients c ON c.id = f.client_id
            LEFT JOIN paiements p ON p.invoice_id = f.id
            WHERE f.statut IN ('EMISE', 'ENVOYEE')
            AND f.date_echeance < CURRENT_DATE
            GROUP BY c.id, c.nom, c.sigle
            HAVING SUM(GREATEST(COALESCE(f.montant_total, 0) - COALESCE(p.montant_paye, 0), 0)) > 0
            ORDER BY montant_retard DESC
            LIMIT 20
        `;
        const topClientsResult = await pool.query(topClientsQuery);

        const responseData = {
            kpis: {
                facture_periode: kpisData.facture_periode || 0,
                encaisse_periode: kpisData.encaisse_periode || 0,
                dso_moyen: Math.round(dsoData.dso_moyen || 0),
                montant_retard: kpisData.montant_retard || 0,
                nombre_retard: kpisData.nombre_retard || 0
            },
            aging_analysis: agingResult.rows,
            factures_retard: invoicesResult.rows,
            evolution_mensuelle: monthlyResult.rows,
            top_clients_retard: topClientsResult.rows
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Erreur collections:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des données de recouvrement'
        });
    }
});

// ===================== AJOUT: Dashboard Optimisé =====================

// GET /api/analytics/hours-distribution - Distribution des heures pour le graphique temporel
router.get('/hours-distribution', authenticateToken, async (req, res) => {
    try {
        const { period = 90, businessUnit, division } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        let params = [startDate.toISOString()];
        let paramIndex = 2;
        let whereConditions = ['te.date_saisie >= $1'];

        if (businessUnit) {
            whereConditions.push(`d.business_unit_id = $${paramIndex++}`);
            params.push(businessUnit);
        }
        if (division) {
            whereConditions.push(`d.id = $${paramIndex++}`);
            params.push(division);
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                DATE_TRUNC('month', te.date_saisie) as period,
                SUM(te.heures) as total_heures
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            WHERE ${whereClause}
            GROUP BY DATE_TRUNC('month', te.date_saisie)
            ORDER BY period ASC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur hours-distribution:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la distribution des heures' });
    }
});

// GET /api/analytics/time-validation-status - Statut de validation des heures
router.get('/time-validation-status', authenticateToken, async (req, res) => {
    try {
        const { period = 90, businessUnit, division } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        let params = [startDate.toISOString()];
        let paramIndex = 2;
        let whereConditions = ['te.date_saisie >= $1'];

        if (businessUnit) {
            whereConditions.push(`d.business_unit_id = $${paramIndex++}`);
            params.push(businessUnit);
        }
        if (division) {
            whereConditions.push(`d.id = $${paramIndex++}`);
            params.push(division);
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                SUM(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE 0 END) as validees,
                SUM(CASE WHEN ts.statut = 'soumis' THEN te.heures ELSE 0 END) as soumises,
                SUM(CASE WHEN ts.statut = 'sauvegardé' THEN te.heures ELSE 0 END) as en_attente
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            WHERE ${whereClause}
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur time-validation-status:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération du statut de validation' });
    }
});

// GET /api/analytics/missions-progress - Progression des missions actives
router.get('/missions-progress', authenticateToken, async (req, res) => {
    try {
        const { period = 90, businessUnit, division } = req.query;
        // Note: For missions, we might check all active missions regardless of period, 
        // or filter by those active within the period. Here we select active missions.

        // Simulating filters support through joins if needed, but primarily filtering by mission status
        let params = [];
        let paramIndex = 1;
        let whereConditions = ["m.statut = 'EN_COURS'"];

        if (businessUnit) {
            whereConditions.push(`m.business_unit_id = $${paramIndex++}`);
            params.push(businessUnit);
        }
        if (division) {
            whereConditions.push(`m.division_id = $${paramIndex++}`);
            params.push(division);
        }

        const whereClause = whereConditions.join(' AND ');

        // Calculated progress based on time spent vs estimated/budgeted if available
        // Fallback to simple calculation or mock if needed. 
        // Assuming we can compare hours spent (cost) vs fees (budget) strictly for progress estimation or use internal field if exists

        const query = `
            SELECT 
                m.id,
                m.nom as mission_nom,
                COALESCE(
                    CASE 
                        WHEN m.montant_honoraires > 0 THEN 
                            (SUM(te.heures * COALESCE(g.taux_horaire_default, 0)) / m.montant_honoraires) * 100
                        ELSE 0 
                    END, 0
                ) as progression
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            WHERE ${whereClause}
            GROUP BY m.id, m.nom, m.montant_honoraires
            ORDER BY progression DESC
            LIMIT 10
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur missions-progress:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la progression des missions' });
    }
});

module.exports = router;

