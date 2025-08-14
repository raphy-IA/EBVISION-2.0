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
        } else {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));
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
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                SUM(CASE WHEN te.status = 'submitted' THEN te.heures ELSE 0 END) as heures_soumises,
                SUM(CASE WHEN te.status = 'draft' THEN te.heures ELSE 0 END) as heures_saisie,
                COUNT(DISTINCT te.user_id) as collaborateurs_actifs,
                SUM(COALESCE(m.montant_honoraires, 0)) as chiffre_affaires,
                SUM(COALESCE(te.heures * COALESCE(g.taux_horaire_default, 0), 0)) as cout_total,
                COUNT(DISTINCT c.id) * 8 * 30 as heures_disponibles
            FROM time_entries te
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
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees
            FROM time_entries te
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
        startDate.setDate(startDate.getDate() - parseInt(period));
        
        const query = `
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                bu.nom as business_unit_nom,
                SUM(te.heures) as heures_total,
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                COUNT(DISTINCT te.mission_id) as missions_count
            FROM time_entries te
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
        startDate.setDate(startDate.getDate() - parseInt(period));
        
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
        const { period = 90 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const query = `
            WITH couts AS (
                SELECT te.mission_id,
                       SUM(te.heures * COALESCE(g.taux_horaire_default, 0)) AS cout_charge
                FROM time_entries te
                JOIN users u ON te.user_id = u.id
                JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE te.created_at >= $1::timestamptz
                GROUP BY te.mission_id
            ), facturation AS (
                SELECT i.mission_id,
                       COALESCE(SUM(COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0))),0) AS facture
                FROM invoices i
                WHERE i.date_emission >= $1::timestamptz
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

        const result = await pool.query(query, [startDate.toISOString()]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur profitability-missions:', error);
        return res.status(500).json({ success: false, error: 'Erreur rentabilité missions' });
    }
});

// GET /api/analytics/profitability-clients - Rentabilité par client
router.get('/profitability-clients', authenticateToken, async (req, res) => {
    try {
        const { period = 180 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const query = `
            WITH te_couts AS (
                SELECT m.client_id,
                       SUM(te.heures * COALESCE(g.taux_horaire_default, 0)) AS cout_charge
                FROM time_entries te
                JOIN users u ON te.user_id = u.id
                JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                LEFT JOIN missions m ON m.id = te.mission_id
                WHERE te.created_at >= $1::timestamptz
                GROUP BY m.client_id
            ), factures AS (
                SELECT i.client_id,
                       COALESCE(SUM(COALESCE(i.montant_ttc, i.montant_ht + COALESCE(i.montant_tva,0))),0) AS facture
                FROM invoices i
                WHERE i.date_emission >= $1::timestamptz
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

        const result = await pool.query(query, [startDate.toISOString()]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur profitability-clients:', error);
        return res.status(500).json({ success: false, error: 'Erreur rentabilité clients' });
    }
});

// GET /api/analytics/utilization - Chargeabilité (HC/HNC) vs capacité
router.get('/utilization', authenticateToken, async (req, res) => {
    try {
        const { period = 30, scope = 'BU' } = req.query; // scope: BU|DIVISION|COLLAB
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const base = `
            SELECT 
                ${scope === 'COLLAB' ? 'c.id' : scope === 'DIVISION' ? 'd.id' : 'bu.id'} AS id,
                ${scope === 'COLLAB' ? "(c.prenom || ' ' || c.nom)" : scope === 'DIVISION' ? 'd.nom' : 'bu.nom'} AS label,
                SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END) AS heures_hc,
                SUM(CASE WHEN te.type_heures <> 'HC' THEN te.heures ELSE 0 END) AS heures_hnc,
                COUNT(DISTINCT te.user_id) AS collaborateurs_actifs,
                COUNT(DISTINCT te.user_id) * 8 * LEAST($2::int, 22) AS capacite_approx
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE te.created_at >= $1::timestamptz
            GROUP BY 1,2
            ORDER BY heures_hc DESC
            LIMIT 100
        `;

        const result = await pool.query(base, [startDate.toISOString(), parseInt(period)]);
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

        // Données d'évolution CA et marge (simulation)
        const evolutionData = [];
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        for (let i = 0; i < 12; i++) {
            evolutionData.push({
                mois: months[i],
                ca: Math.floor(Math.random() * 500000) + 200000,
                marge: Math.floor(Math.random() * 20) + 15
            });
        }

        // Répartition par BU
        const buData = [
            { bu: 'BU Consulting', ca: 35, missions: 45 },
            { bu: 'BU Audit', ca: 25, missions: 30 },
            { bu: 'BU Formation', ca: 20, missions: 15 },
            { bu: 'BU Développement', ca: 20, missions: 10 }
        ];

        return res.json({
            success: true,
            data: {
                evolution: evolutionData,
                bu_repartition: buData
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

        // Objectifs stratégiques (simulation)
        const objectifs = [
            {
                objectif: 'Croissance CA',
                cible: 2500000,
                actuel: 2100000,
                unite: '€',
                progression: 84
            },
            {
                objectif: 'Marge brute',
                cible: 25,
                actuel: 22.5,
                unite: '%',
                progression: 90
            },
            {
                objectif: 'Satisfaction client',
                cible: 95,
                actuel: 92.3,
                unite: '%',
                progression: 97
            },
            {
                objectif: 'Taux de conversion',
                cible: 80,
                actuel: 75.5,
                unite: '%',
                progression: 94
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

        // Indicateurs financiers (simulation)
        const indicateurs = [
            {
                label: 'EBITDA',
                valeur: 450000,
                unite: '€',
                tendance: 8.5,
                positif: true
            },
            {
                label: 'ROI',
                valeur: 18.5,
                unite: '%',
                tendance: 2.3,
                positif: true
            },
            {
                label: 'Trésorerie',
                valeur: 850000,
                unite: '€',
                tendance: -5.2,
                positif: false
            },
            {
                label: 'Délai de paiement',
                valeur: 45,
                unite: 'jours',
                tendance: -3.1,
                positif: true
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

        // Alertes stratégiques (simulation)
        const alertes = [
            {
                type: 'warning',
                titre: 'Marge en baisse',
                message: 'La marge brute a diminué de 2.3% ce mois',
                priorite: 'moyenne'
            },
            {
                type: 'success',
                titre: 'Objectif atteint',
                message: 'Le taux de satisfaction client dépasse 90%',
                priorite: 'basse'
            },
            {
                type: 'danger',
                titre: 'Retard de paiement',
                message: '3 clients ont des retards de paiement > 60 jours',
                priorite: 'haute'
            }
        ];

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

        // Pipeline commercial (simulation)
        const pipeline = {
            total_opportunites: 45,
            montant_total: 3200000,
            repartition: [
                { etape: 'Prospection', nombre: 15, montant: 800000, couleur: '#6c757d' },
                { etape: 'Qualification', nombre: 12, montant: 600000, couleur: '#17a2b8' },
                { etape: 'Proposition', nombre: 10, montant: 900000, couleur: '#ffc107' },
                { etape: 'Négociation', nombre: 6, montant: 600000, couleur: '#fd7e14' },
                { etape: 'Signature', nombre: 2, montant: 300000, couleur: '#28a745' }
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

module.exports = router;

