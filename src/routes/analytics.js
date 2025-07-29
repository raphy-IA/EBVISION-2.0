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
        
        const result = await pool.query(query, [startDate.toISOString()]);
        
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

module.exports = router; 