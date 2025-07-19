const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');

// GET /api/reports/summary - Résumé des rapports
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = '';
        let params = [];
        
        if (startDate && endDate) {
            dateFilter = 'WHERE date_saisie BETWEEN $1 AND $2';
            params = [startDate, endDate];
        }

        // Statistiques générales
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN statut = 'VALIDEE' THEN 1 END) as validated_entries,
                COUNT(CASE WHEN statut = 'SOUMISE' THEN 1 END) as pending_entries,
                COUNT(CASE WHEN statut = 'REJETEE' THEN 1 END) as rejected_entries,
                COALESCE(SUM(CASE WHEN statut = 'VALIDEE' THEN heures ELSE 0 END), 0) as total_hours,
                COALESCE(AVG(CASE WHEN statut = 'VALIDEE' THEN heures ELSE NULL END), 0) as avg_hours_per_entry
            FROM time_entries
            ${dateFilter}
        `;

        const statsResult = await pool.query(statsQuery, params);
        const stats = statsResult.rows[0];

        // Top collaborateurs
        const topCollaborateursQuery = `
            SELECT 
                c.nom,
                c.prenom,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM collaborateurs c
            LEFT JOIN time_entries te ON c.id = te.user_id
            ${dateFilter ? dateFilter.replace('date_saisie', 'te.date_saisie') : ''}
            GROUP BY c.id, c.nom, c.prenom
            ORDER BY total_hours DESC
            LIMIT 5
        `;

        const topCollaborateursResult = await pool.query(topCollaborateursQuery, params);

        // Top missions
        const topMissionsQuery = `
            SELECT 
                m.titre as mission_name,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            ${dateFilter ? dateFilter.replace('date_saisie', 'te.date_saisie') : ''}
            GROUP BY m.id, m.titre
            ORDER BY total_hours DESC
            LIMIT 5
        `;

        const topMissionsResult = await pool.query(topMissionsQuery, params);

        // Répartition par statut
        const statusDistributionQuery = `
            SELECT 
                statut,
                COUNT(*) as count,
                COALESCE(SUM(heures), 0) as total_hours
            FROM time_entries
            ${dateFilter}
            GROUP BY statut
            ORDER BY count DESC
        `;

        const statusDistributionResult = await pool.query(statusDistributionQuery, params);

        // Évolution mensuelle
        const monthlyEvolutionQuery = `
            SELECT 
                DATE_TRUNC('month', date_saisie) as month,
                COUNT(*) as entries_count,
                COALESCE(SUM(heures), 0) as total_hours
            FROM time_entries
            ${dateFilter}
            GROUP BY DATE_TRUNC('month', date_saisie)
            ORDER BY month DESC
            LIMIT 12
        `;

        const monthlyEvolutionResult = await pool.query(monthlyEvolutionQuery, params);

        res.json({
            success: true,
            data: {
                summary: {
                    total_entries: parseInt(stats.total_entries) || 0,
                    validated_entries: parseInt(stats.validated_entries) || 0,
                    pending_entries: parseInt(stats.pending_entries) || 0,
                    rejected_entries: parseInt(stats.rejected_entries) || 0,
                    total_hours: parseFloat(stats.total_hours) || 0,
                    avg_hours_per_entry: parseFloat(stats.avg_hours_per_entry) || 0
                },
                top_collaborateurs: topCollaborateursResult.rows,
                top_missions: topMissionsResult.rows,
                status_distribution: statusDistributionResult.rows,
                monthly_evolution: monthlyEvolutionResult.rows
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du résumé des rapports:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// GET /api/reports/statistics - Statistiques détaillées
router.get('/statistics', async (req, res) => {
    try {
        const { startDate, endDate, collaborateur_id, mission_id } = req.query;
        
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (startDate && endDate) {
            whereConditions.push(`te.date_saisie BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        if (collaborateur_id) {
            whereConditions.push(`te.user_id = $${paramIndex}`);
            params.push(collaborateur_id);
            paramIndex++;
        }

        if (mission_id) {
            whereConditions.push(`te.mission_id = $${paramIndex}`);
            params.push(mission_id);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Statistiques par collaborateur
        const collaborateurStatsQuery = `
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours,
                COALESCE(AVG(te.heures), 0) as avg_hours_per_entry,
                COUNT(CASE WHEN te.statut = 'VALIDEE' THEN 1 END) as validated_count,
                COUNT(CASE WHEN te.statut = 'SOUMISE' THEN 1 END) as pending_count
            FROM collaborateurs c
            LEFT JOIN time_entries te ON c.id = te.user_id
            ${whereClause}
            GROUP BY c.id, c.nom, c.prenom
            ORDER BY total_hours DESC
        `;

        const collaborateurStatsResult = await pool.query(collaborateurStatsQuery, params);

        // Statistiques par mission
        const missionStatsQuery = `
            SELECT 
                m.id,
                m.titre as mission_name,
                m.code as mission_code,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours,
                COALESCE(AVG(te.heures), 0) as avg_hours_per_entry,
                COUNT(CASE WHEN te.statut = 'VALIDEE' THEN 1 END) as validated_count,
                COUNT(CASE WHEN te.statut = 'SOUMISE' THEN 1 END) as pending_count
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            ${whereClause}
            GROUP BY m.id, m.titre, m.code
            ORDER BY total_hours DESC
        `;

        const missionStatsResult = await pool.query(missionStatsQuery, params);

        // Évolution hebdomadaire
        const weeklyEvolutionQuery = `
            SELECT 
                DATE_TRUNC('week', date_saisie) as week,
                COUNT(*) as entries_count,
                COALESCE(SUM(heures), 0) as total_hours
            FROM time_entries
            ${whereClause.replace('te.', '')}
            GROUP BY DATE_TRUNC('week', date_saisie)
            ORDER BY week DESC
            LIMIT 12
        `;

        const weeklyEvolutionResult = await pool.query(weeklyEvolutionQuery, params);

        res.json({
            success: true,
            data: {
                collaborateur_statistics: collaborateurStatsResult.rows,
                mission_statistics: missionStatsResult.rows,
                weekly_evolution: weeklyEvolutionResult.rows
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// GET /api/reports/export - Export des données
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', startDate, endDate } = req.query;
        
        let whereClause = '';
        let params = [];
        
        if (startDate && endDate) {
            whereClause = 'WHERE te.date_saisie BETWEEN $1 AND $2';
            params = [startDate, endDate];
        }

        const exportQuery = `
            SELECT 
                te.id,
                te.date_saisie,
                te.heures,
                te.statut,
                te.commentaire,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                m.titre as mission_nom,
                m.code as mission_code,
                cl.nom as client_nom
            FROM time_entries te
            JOIN collaborateurs c ON te.user_id = c.id
            JOIN missions m ON te.mission_id = m.id
            JOIN clients cl ON m.client_id = cl.id
            ${whereClause}
            ORDER BY te.date_saisie DESC
        `;

        const result = await pool.query(exportQuery, params);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="time_entries_export.csv"');
            
            // En-têtes CSV
            const headers = ['ID', 'Date', 'Heures', 'Statut', 'Commentaire', 'Collaborateur', 'Mission', 'Code Mission', 'Client'];
            res.write(headers.join(',') + '\n');
            
            // Données CSV
            result.rows.forEach(row => {
                const line = [
                    row.id,
                    row.date_saisie,
                    row.heures,
                    row.statut,
                    `"${row.commentaire || ''}"`,
                    `${row.collaborateur_prenom} ${row.collaborateur_nom}`,
                    row.mission_nom,
                    row.mission_code,
                    row.client_nom
                ].join(',');
                res.write(line + '\n');
            });
            
            res.end();
        } else {
            res.json({
                success: true,
                data: result.rows
            });
        }

    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

module.exports = router; 