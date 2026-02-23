const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// GET /api/analytics/opportunities - Analytics des opportunités
router.get('/opportunities', authenticateToken, async (req, res) => {
    try {
        const { period = 30, business_unit_id, opportunity_type_id, collaborateur_id } = req.query;

        // Calculer la date de début basée sur la période
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Construire les conditions WHERE
        let whereConditions = ['o.created_at >= $1'];
        let params = [startDate.toISOString()];
        let paramIndex = 2;

        if (business_unit_id) {
            whereConditions.push(`o.business_unit_id = $${paramIndex++}`);
            params.push(business_unit_id);
        }

        if (opportunity_type_id) {
            whereConditions.push(`o.opportunity_type_id = $${paramIndex++}`);
            params.push(opportunity_type_id);
        }

        if (collaborateur_id) {
            whereConditions.push(`o.collaborateur_id = $${paramIndex++}`);
            params.push(collaborateur_id);
        }

        const whereClause = whereConditions.join(' AND ');

        // KPIs principaux
        const kpisQuery = `
            SELECT 
                COUNT(*) as total_opportunities,
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as won_opportunities,
                COUNT(CASE WHEN o.statut = 'PERDUE' THEN 1 END) as lost_opportunities,
                COUNT(CASE WHEN o.statut IN ('NOUVELLE', 'EN_COURS') THEN 1 END) as active_opportunities,
                AVG(o.probabilite) as avg_probability,
                SUM(CASE WHEN o.statut = 'GAGNEE' THEN o.montant_estime ELSE 0 END) as total_revenue,
                AVG(EXTRACT(EPOCH FROM (o.date_fermeture_reelle - o.created_at))/86400) as avg_duration
            FROM opportunities o
            WHERE ${whereClause}
        `;

        const kpisResult = await pool.query(kpisQuery, params);
        const kpis = kpisResult.rows[0];

        // Calculer les tendances (simulation pour l'instant)
        const kpisData = {
            conversion_rate: kpis.total_opportunities > 0 ? (kpis.won_opportunities / kpis.total_opportunities) * 100 : 0,
            total_revenue: kpis.total_revenue || 0,
            avg_duration: kpis.avg_duration || 0,
            active_opportunities: kpis.active_opportunities || 0,
            conversion_trend: 5.2, // Simulation
            revenue_trend: 12.8, // Simulation
            duration_trend: -3.1, // Simulation
            active_trend: 8.5 // Simulation
        };

        // Timeline des opportunités
        const timelineQuery = `
            SELECT 
                DATE(o.created_at) as date,
                COUNT(*) as new_opportunities,
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as won_opportunities
            FROM opportunities o
            WHERE ${whereClause}
            GROUP BY DATE(o.created_at)
            ORDER BY date
        `;

        const timelineResult = await pool.query(timelineQuery, params);

        // Répartition par statut
        const statusQuery = `
            SELECT 
                o.statut,
                COUNT(*) as count
            FROM opportunities o
            WHERE ${whereClause}
            GROUP BY o.statut
            ORDER BY count DESC
        `;

        const statusResult = await pool.query(statusQuery, params);

        // Performance par business unit
        const businessUnitQuery = `
            SELECT 
                bu.nom as business_unit_name,
                COUNT(*) as total_opportunities,
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as won_opportunities,
                SUM(CASE WHEN o.statut = 'GAGNEE' THEN o.montant_estime ELSE 0 END) as revenue
            FROM opportunities o
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            WHERE ${whereClause}
            GROUP BY bu.id, bu.nom
            ORDER BY revenue DESC
        `;

        const businessUnitResult = await pool.query(businessUnitQuery, params);

        // Top collaborateurs
        const collaborateursQuery = `
            SELECT 
                u.nom as collaborateur_name,
                COUNT(*) as total_opportunities,
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as won_opportunities,
                AVG(o.probabilite) as avg_probability
            FROM opportunities o
            LEFT JOIN users u ON o.collaborateur_id = u.id
            WHERE ${whereClause}
            GROUP BY u.id, u.nom
            ORDER BY won_opportunities DESC
            LIMIT 10
        `;

        const collaborateursResult = await pool.query(collaborateursQuery, params);

        // Métriques détaillées
        const detailedMetrics = {
            total_opportunities: kpis.total_opportunities || 0,
            won_opportunities: kpis.won_opportunities || 0,
            lost_opportunities: kpis.lost_opportunities || 0,
            avg_probability: kpis.avg_probability || 0
        };

        res.json({
            success: true,
            data: {
                kpis: kpisData,
                opportunities_timeline: timelineResult.rows,
                status_distribution: statusResult.rows,
                business_unit_performance: businessUnitResult.rows,
                top_collaborateurs: collaborateursResult.rows,
                detailed_metrics: detailedMetrics
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des analytics'
        });
    }
});

// GET /api/analytics/overdue-stages - Étapes en retard
router.get('/overdue-stages', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                os.id as stage_id,
                os.nom as stage_name,
                os.due_date,
                os.risk_level,
                o.id as opportunity_id,
                o.nom as opportunity_name,
                bu.nom as business_unit_name,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - os.due_date))/86400 as days_overdue
            FROM opportunity_stages os
            JOIN opportunities o ON os.opportunity_id = o.id
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            WHERE os.status IN ('PENDING', 'IN_PROGRESS')
            AND os.due_date < CURRENT_TIMESTAMP
            ORDER BY os.due_date ASC
            LIMIT 10
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: {
                overdue_stages: result.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des étapes en retard:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des étapes en retard'
        });
    }
});

// GET /api/analytics/risky-opportunities - Opportunités à risque
router.get('/risky-opportunities', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.id,
                o.nom,
                o.probabilite,
                o.montant_estime,
                o.devise,
                bu.nom as business_unit_nom,
                ot.nom as opportunity_type_nom,
                CASE 
                    WHEN o.probabilite < 20 THEN 'CRITICAL'
                    WHEN o.probabilite < 40 THEN 'HIGH'
                    WHEN o.probabilite < 60 THEN 'MEDIUM'
                    ELSE 'LOW'
                END as risk_level
            FROM opportunities o
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
            WHERE o.statut IN ('NOUVELLE', 'EN_COURS')
            AND o.probabilite < 60
            ORDER BY o.probabilite ASC, o.montant_estime DESC
            LIMIT 10
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: {
                risky_opportunities: result.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opportunités à risque:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des opportunités à risque'
        });
    }
});

// GET /api/analytics/stage-performance - Performance des étapes
router.get('/stage-performance', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                ost.nom as stage_name,
                COUNT(os.id) as total_stages,
                COUNT(CASE WHEN os.status = 'COMPLETED' THEN 1 END) as completed_stages,
                AVG(EXTRACT(EPOCH FROM (os.completed_date - os.start_date))/86400) as avg_duration_days,
                COUNT(CASE WHEN os.due_date < os.completed_date THEN 1 END) as overdue_completions
            FROM opportunity_stage_templates ost
            LEFT JOIN opportunity_stages os ON ost.nom = os.nom
            GROUP BY ost.id, ost.nom, ost.stage_order
            ORDER BY ost.stage_order
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: {
                stage_performance: result.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la performance des étapes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la performance des étapes'
        });
    }
});

// GET /api/analytics/export - Export des données
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const { format = 'json', period = 30 } = req.query;

        // Calculer la date de début
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        if (!dateDebut || !dateFin || isNaN(new Date(dateDebut).getTime()) || isNaN(new Date(dateFin).getTime())) {
            console.error('❌ Paramètres de date invalides pour export:', { dateDebut, dateFin });
            return res.status(400).json({
                success: false,
                error: 'Format de date invalide pour dateDebut ou dateFin'
            });
        }

        // Récupérer toutes les opportunités pour la période
        const query = `
            SELECT 
                o.*,
                bu.nom as business_unit_nom,
                ot.nom as opportunity_type_nom,
                c.nom as client_nom,
                u.nom as collaborateur_nom
            FROM opportunities o
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN users u ON o.collaborateur_id = u.id
            WHERE o.created_at >= $1
            ORDER BY o.created_at DESC
        `;

        const finalStartDate = new Date(dateDebut);
        const result = await pool.query(query, [finalStartDate.toISOString()]);

        if (format === 'csv') {
            // TODO: Implémenter l'export CSV
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=opportunities_${period}days.csv`);
            res.send('Export CSV en cours de développement');
        } else {
            res.json({
                success: true,
                data: {
                    opportunities: result.rows,
                    export_date: new Date().toISOString(),
                    period_days: period
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'export des données:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'export des données'
        });
    }
});

// GET /api/analytics/collections - Analytics de recouvrement
router.get('/collections', authenticateToken, async (req, res) => {
    try {
        const { period = 90, business_unit_id, division_id } = req.query;

        // Calculer la date de début basée sur la période
        const periodInt = parseInt(period) || 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodInt);

        if (isNaN(startDate.getTime())) {
            console.error('❌ Période invalide pour collections:', { period });
            return res.status(400).json({ success: false, error: 'Période invalide' });
        }

        console.log(`📊 Analytics recouvrement - Période: ${periodInt} jours`);

        // Construire les conditions WHERE pour les filtres
        let invoiceWhereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (business_unit_id) {
            invoiceWhereConditions.push(`m.business_unit_id = $${paramIndex++}`);
            params.push(business_unit_id);
        }

        if (division_id) {
            invoiceWhereConditions.push(`m.division_id = $${paramIndex++}`);
            params.push(division_id);
        }

        const invoiceWhereClause = invoiceWhereConditions.length > 0
            ? 'AND ' + invoiceWhereConditions.join(' AND ')
            : '';

        // ===== KPI 1: Facturé période =====
        const factureQuery = `
            SELECT COALESCE(SUM(i.montant_ttc), 0) as facture_periode
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT', 'PAYEE')
              AND i.date_emission >= $${paramIndex}
              AND i.date_emission <= CURRENT_DATE
              ${invoiceWhereClause}
        `;
        params.push(startDate.toISOString());
        const factureResult = await pool.query(factureQuery, params);

        // ===== KPI 2: Encaissé période =====
        const encaisseQuery = `
            SELECT COALESCE(SUM(pa.allocated_amount), 0) as encaisse_periode
            FROM payment_allocations pa
            JOIN payments p ON pa.payment_id = p.id
            JOIN invoices i ON pa.invoice_id = i.id
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE p.payment_date >= $${paramIndex}
              AND p.payment_date <= CURRENT_DATE
              ${invoiceWhereClause}
        `;
        const encaisseResult = await pool.query(encaisseQuery, params);

        // ===== KPI 3: Montant en retard =====
        const retardQuery = `
            SELECT COALESCE(SUM(i.montant_restant), 0) as montant_retard
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT')
              AND i.date_echeance < CURRENT_DATE
              AND i.montant_restant > 0
              ${invoiceWhereClause}
        `;
        const retardResult = await pool.query(retardQuery, params.slice(0, params.length - 1));

        // ===== KPI 4: DSO (Days Sales Outstanding) =====
        // Créances en cours
        const creancesQuery = `
            SELECT COALESCE(SUM(i.montant_restant), 0) as creances_en_cours
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT')
              AND i.montant_restant > 0
              ${invoiceWhereClause}
        `;
        const creancesResult = await pool.query(creancesQuery, params.slice(0, params.length - 1));

        // CA journalier moyen
        const caJournalier = parseFloat(factureResult.rows[0].facture_periode) / parseInt(period);
        const dsoMoyen = caJournalier > 0
            ? Math.round(parseFloat(creancesResult.rows[0].creances_en_cours) / caJournalier)
            : 0;

        // ===== KPI 5: Taux de recouvrement =====
        const tauxRecouvrement = parseFloat(factureResult.rows[0].facture_periode) > 0
            ? Math.round((parseFloat(encaisseResult.rows[0].encaisse_periode) / parseFloat(factureResult.rows[0].facture_periode)) * 100)
            : 0;

        // ===== Aging Analysis (Analyse par ancienneté) =====
        const agingQuery = `
            SELECT 
                CASE 
                    WHEN CURRENT_DATE - i.date_echeance <= 30 THEN '0-30 jours'
                    WHEN CURRENT_DATE - i.date_echeance <= 60 THEN '31-60 jours'
                    WHEN CURRENT_DATE - i.date_echeance <= 90 THEN '61-90 jours'
                    ELSE '90+ jours'
                END as tranche,
                COALESCE(SUM(i.montant_restant), 0) as montant_total,
                COUNT(*) as nb_factures
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT')
              AND i.date_echeance < CURRENT_DATE
              AND i.montant_restant > 0
              ${invoiceWhereClause}
            GROUP BY tranche
            ORDER BY 
                CASE tranche
                    WHEN '0-30 jours' THEN 1
                    WHEN '31-60 jours' THEN 2
                    WHEN '61-90 jours' THEN 3
                    ELSE 4
                END
        `;
        const agingResult = await pool.query(agingQuery, params.slice(0, params.length - 1));

        // ===== Top Clients par Retard =====
        const topClientsQuery = `
            SELECT 
                c.id as client_id,
                c.nom as client_nom,
                c.sigle as client_sigle,
                COALESCE(SUM(i.montant_restant), 0) as montant_retard,
                COUNT(i.id) as nb_factures,
                COALESCE(AVG(CURRENT_DATE - i.date_echeance), 0)::INTEGER as retard_moyen
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT')
              AND i.date_echeance < CURRENT_DATE
              AND i.montant_restant > 0
              ${invoiceWhereClause}
            GROUP BY c.id, c.nom, c.sigle
            ORDER BY montant_retard DESC
            LIMIT 10
        `;
        const topClientsResult = await pool.query(topClientsQuery, params.slice(0, params.length - 1));

        // ===== Factures en Retard (Détails) =====
        const facturesRetardQuery = `
            SELECT 
                i.id,
                i.numero_facture,
                c.nom as client_nom,
                c.sigle as client_sigle,
                i.montant_ttc,
                i.montant_restant,
                i.date_echeance,
                CURRENT_DATE - i.date_echeance as jours_retard,
                i.statut
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            LEFT JOIN missions m ON i.mission_id = m.id
            WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT')
              AND i.date_echeance < CURRENT_DATE
              AND i.montant_restant > 0
              ${invoiceWhereClause}
            ORDER BY jours_retard DESC
            LIMIT 50
        `;
        const facturesRetardResult = await pool.query(facturesRetardQuery, params.slice(0, params.length - 1));

        // ===== Évolution Mensuelle (12 derniers mois) =====
        const evolutionQuery = `
            WITH mois_serie AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - (n || ' months')::INTERVAL), 'YYYY-MM') as mois
                FROM generate_series(0, 11) n
            ),
            facture_mois AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', i.date_emission), 'YYYY-MM') as mois,
                    COALESCE(SUM(i.montant_ttc), 0) as facture
                FROM invoices i
                LEFT JOIN missions m ON i.mission_id = m.id
                WHERE i.statut IN ('EMISE', 'PAYEE_PARTIELLEMENT', 'PAYEE')
                  AND i.date_emission >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
                  ${invoiceWhereClause}
                GROUP BY TO_CHAR(DATE_TRUNC('month', i.date_emission), 'YYYY-MM')
            ),
            encaisse_mois AS (
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', p.payment_date), 'YYYY-MM') as mois,
                    COALESCE(SUM(pa.allocated_amount), 0) as encaisse
                FROM payment_allocations pa
                JOIN payments p ON pa.payment_id = p.id
                JOIN invoices i ON pa.invoice_id = i.id
                LEFT JOIN missions m ON i.mission_id = m.id
                WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
                  ${invoiceWhereClause}
                GROUP BY TO_CHAR(DATE_TRUNC('month', p.payment_date), 'YYYY-MM')
            )
            SELECT 
                ms.mois,
                COALESCE(fm.facture, 0) as facture,
                COALESCE(em.encaisse, 0) as encaisse
            FROM mois_serie ms
            LEFT JOIN facture_mois fm ON ms.mois = fm.mois
            LEFT JOIN encaisse_mois em ON ms.mois = em.mois
            ORDER BY ms.mois
        `;
        const evolutionResult = await pool.query(evolutionQuery, params.slice(0, params.length - 1));

        // Construire la réponse
        const response = {
            success: true,
            data: {
                kpis: {
                    facture_periode: parseFloat(factureResult.rows[0].facture_periode),
                    encaisse_periode: parseFloat(encaisseResult.rows[0].encaisse_periode),
                    dso_moyen: dsoMoyen,
                    montant_retard: parseFloat(retardResult.rows[0].montant_retard),
                    taux_recouvrement: tauxRecouvrement
                },
                aging_analysis: agingResult.rows,
                top_clients_retard: topClientsResult.rows,
                factures_retard: facturesRetardResult.rows,
                evolution_mensuelle: evolutionResult.rows
            }
        };

        console.log('✅ Analytics recouvrement calculés:', {
            facture: response.data.kpis.facture_periode,
            encaisse: response.data.kpis.encaisse_periode,
            dso: response.data.kpis.dso_moyen,
            retard: response.data.kpis.montant_retard
        });

        res.json(response);

    } catch (error) {
        console.error('❌ Erreur analytics recouvrement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des analytics de recouvrement',
            details: error.message
        });
    }
});

module.exports = router; 