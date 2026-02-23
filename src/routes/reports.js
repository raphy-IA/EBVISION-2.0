const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/timeEntries - Rapport des entrées de temps
router.get('/timeEntries', authenticateToken, async (req, res) => {
    try {
        let { startDate, endDate, collaboratorId, clientId, fiscalYearId } = req.query;

        // Si une année fiscale est spécifiée et que les dates ne le sont pas, on récupère les dates de l'exercice
        if (fiscalYearId && (!startDate || !endDate)) {
            const fiscalYearResult = await pool.query(
                'SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1',
                [fiscalYearId]
            );
            if (fiscalYearResult.rows.length > 0) {
                startDate = fiscalYearResult.rows[0].date_debut;
                endDate = fiscalYearResult.rows[0].date_fin;
            }
        }

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (startDate && endDate) {
            whereConditions.push(`te.date_saisie BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        if (collaboratorId) {
            whereConditions.push(`te.user_id = $${paramIndex}`);
            params.push(collaboratorId);
            paramIndex++;
        }

        if (clientId) {
            whereConditions.push(`m.client_id = $${paramIndex}`);
            params.push(clientId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour les entrées de temps avec détails
        const timeEntriesQuery = `
            SELECT 
                te.id,
                te.date_saisie,
                te.heures,
                te.type_heures,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                m.nom as mission_titre,
                cl.id as client_id,
                COALESCE(cl.sigle, cl.nom) as client_nom,
                ts.statut as time_sheet_status,
                bu.id as business_unit_id,
                bu.nom as business_unit_nom,
                d.id as division_id,
                d.nom as division_nom,
                g.id as grade_id,
                g.nom as grade_nom,
                p.nom as poste_nom,
                ia.name as internal_activity_nom
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON c.user_id = u.id
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN clients cl ON m.client_id = cl.id
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN postes p ON c.poste_actuel_id = p.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            ${whereClause}
            ORDER BY te.date_saisie DESC
            LIMIT 1000
        `;

        const result = await pool.query(timeEntriesQuery, params);

        // Préparer les données pour le rapport
        const reportData = result.rows.map(row => ({
            id: row.id,
            date: row.date_saisie,
            heures: parseFloat(row.heures) || 0,
            type_heures: row.type_heures,
            description: `${row.type_heures} - ${row.mission_titre || row.internal_activity_nom || 'Activité interne'}`,
            collaborateur_id: row.collaborateur_id || null,
            collaborateur: row.collaborateur_prenom && row.collaborateur_nom
                ? `${row.collaborateur_prenom} ${row.collaborateur_nom}`
                : 'Non assigné',
            mission: row.mission_titre || row.internal_activity_nom || '-',
            client_id: row.client_id || null,
            client: row.client_nom || '-',
            statut: row.time_sheet_status || 'N/A',
            business_unit_id: row.business_unit_id || null,
            business_unit_nom: row.business_unit_nom || '-',
            division_id: row.division_id || null,
            division_nom: row.division_nom || '-',
            grade_id: row.grade_id || null,
            grade_nom: row.grade_nom || '-',
            poste_nom: row.poste_nom || '-',
            internal_activity_nom: row.internal_activity_nom || null
        }));

        res.json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du rapport timeEntries:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// GET /api/reports/summary - Résumé des rapports
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        let { startDate, endDate, fiscalYearId } = req.query;
        let dateFilter = '';
        let params = [];
        let paramIndex = 1;

        // Si une année fiscale est spécifiée et que les dates ne le sont pas
        if (fiscalYearId && (!startDate || !endDate)) {
            const fiscalYearResult = await pool.query(
                'SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1',
                [fiscalYearId]
            );
            if (fiscalYearResult.rows.length > 0) {
                startDate = fiscalYearResult.rows[0].date_debut;
                endDate = fiscalYearResult.rows[0].date_fin;
            }
        }

        if (startDate && endDate) {
            dateFilter = `WHERE date_saisie BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params = [startDate, endDate];
            paramIndex += 2;
        }


        // Statistiques générales
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN ts.statut = 'validé' THEN 1 END) as validated_entries,
                COUNT(CASE WHEN ts.statut = 'soumis' THEN 1 END) as pending_entries,
                COUNT(CASE WHEN ts.statut = 'rejeté' THEN 1 END) as rejected_entries,
                COALESCE(SUM(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE 0 END), 0) as total_hours,
                COALESCE(AVG(CASE WHEN ts.statut = 'validé' THEN te.heures ELSE NULL END), 0) as avg_hours_per_entry
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            ${dateFilter ? dateFilter.replace('date_saisie', 'te.date_saisie') : ''}
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
                m.nom as mission_name,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            ${dateFilter ? dateFilter.replace('date_saisie', 'te.date_saisie') : ''}
            GROUP BY m.id, m.nom
            ORDER BY total_hours DESC
            LIMIT 5
        `;

        const topMissionsResult = await pool.query(topMissionsQuery, params);

        // Répartition par statut
        const statusDistributionQuery = `
            SELECT 
                ts.statut,
                COUNT(*) as count,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            ${dateFilter ? dateFilter.replace('date_saisie', 'te.date_saisie') : ''}
            GROUP BY ts.statut
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
        let { startDate, endDate, collaborateur_id, mission_id, fiscalYearId } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Si une année fiscale est spécifiée
        if (fiscalYearId && (!startDate || !endDate)) {
            const fiscalYearResult = await pool.query(
                'SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1',
                [fiscalYearId]
            );
            if (fiscalYearResult.rows.length > 0) {
                startDate = fiscalYearResult.rows[0].date_debut;
                endDate = fiscalYearResult.rows[0].date_fin;
            }
        }

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
                COUNT(CASE WHEN ts.statut = 'validé' THEN 1 END) as validated_count,
                COUNT(CASE WHEN ts.statut = 'soumis' THEN 1 END) as pending_count
            FROM collaborateurs c
            LEFT JOIN time_entries te ON c.id = te.user_id
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            ${whereClause}
            GROUP BY c.id, c.nom, c.prenom
            ORDER BY total_hours DESC
        `;

        const collaborateurStatsResult = await pool.query(collaborateurStatsQuery, params);

        // Statistiques par mission
        const missionStatsQuery = `
            SELECT 
                m.id,
                m.nom as mission_name,
                COUNT(te.id) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours,
                COALESCE(AVG(te.heures), 0) as avg_hours_per_entry,
                COUNT(CASE WHEN ts.statut = 'validé' THEN 1 END) as validated_count,
                COUNT(CASE WHEN ts.statut = 'soumis' THEN 1 END) as pending_count
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            ${whereClause}
            GROUP BY m.id, m.nom
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
                ts.statut,
                te.description,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                m.nom as mission_nom,
                COALESCE(cl.sigle, cl.nom) as client_nom
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
            JOIN collaborateurs c ON te.user_id = c.id
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN clients cl ON m.client_id = cl.id
            ${whereClause}
            ORDER BY te.date_saisie DESC
        `;

        const result = await pool.query(exportQuery, params);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="time_entries_export.csv"');

            // En-têtes CSV
            const headers = ['ID', 'Date', 'Heures', 'Statut', 'Commentaire', 'Collaborateur', 'Mission', 'Client'];
            res.write(headers.join(',') + '\n');

            // Données CSV
            result.rows.forEach(row => {
                const line = [
                    row.id,
                    row.date_saisie,
                    row.heures,
                    row.statut,
                    `"${row.description || ''}"`,
                    `${row.collaborateur_prenom} ${row.collaborateur_nom}`,
                    row.mission_nom,
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

// GET /api/reports/hr - Rapport RH complet
router.get('/hr', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, businessUnitId, divisionId, gradeId } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (businessUnitId) {
            whereConditions.push(`c.business_unit_id = $${paramIndex}`);
            params.push(businessUnitId);
            paramIndex++;
        }

        if (divisionId) {
            whereConditions.push(`c.division_id = $${paramIndex}`);
            params.push(divisionId);
            paramIndex++;
        }

        if (gradeId) {
            whereConditions.push(`c.grade_actuel_id = $${paramIndex}`);
            params.push(gradeId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // 1. Statistiques globales des collaborateurs
        const globalStatsQuery = `
            SELECT 
                COUNT(*) as total_collaborateurs,
                COUNT(CASE WHEN c.statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN c.statut = 'INACTIF' THEN 1 END) as inactifs,
                COUNT(CASE WHEN c.date_depart IS NOT NULL THEN 1 END) as departs
            FROM collaborateurs c
            ${whereClause}
        `;

        // 2. Répartition par grade
        const gradeDistributionQuery = `
            SELECT 
                g.nom as grade_nom,
                g.niveau,
                COUNT(c.id) as nb_collaborateurs,
                ROUND(COUNT(c.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM collaborateurs c ${whereClause}), 0), 2) as pourcentage
            FROM grades g
            LEFT JOIN collaborateurs c ON g.id = c.grade_actuel_id ${whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : ''}
            GROUP BY g.id, g.nom, g.niveau
            ORDER BY g.niveau ASC
        `;

        // 3. Répartition par poste
        const posteDistributionQuery = `
            SELECT 
                p.nom as poste_nom,
                COUNT(c.id) as nb_collaborateurs,
                ROUND(COUNT(c.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM collaborateurs c ${whereClause}), 0), 2) as pourcentage
            FROM postes p
            LEFT JOIN collaborateurs c ON p.id = c.poste_actuel_id ${whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : ''}
            GROUP BY p.id, p.nom
            ORDER BY nb_collaborateurs DESC
        `;

        // 4. Répartition par Business Unit
        const buDistributionQuery = `
            SELECT 
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                COUNT(c.id) as nb_collaborateurs,
                ROUND(COUNT(c.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM collaborateurs c ${whereClause}), 0), 2) as pourcentage
            FROM business_units bu
            LEFT JOIN collaborateurs c ON bu.id = c.business_unit_id ${whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : ''}
            GROUP BY bu.id, bu.nom, bu.code
            ORDER BY nb_collaborateurs DESC
        `;

        // 5. Évolutions de grade (derniers 12 mois)
        const gradeEvolutionsQuery = `
            SELECT 
                DATE_TRUNC('month', eg.date_debut) as mois,
                COUNT(*) as nb_evolutions,
                g.nom as nouveau_grade
            FROM evolution_grades eg
            JOIN grades g ON eg.grade_id = g.id
            JOIN collaborateurs c ON eg.collaborateur_id = c.id
            WHERE eg.date_debut >= NOW() - INTERVAL '12 months'
            ${whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : ''}
            GROUP BY DATE_TRUNC('month', eg.date_debut), g.nom
            ORDER BY mois DESC
        `;

        // 6. Ancienneté moyenne par grade
        const ancienneteQuery = `
            SELECT 
                g.nom as grade_nom,
                AVG(EXTRACT(YEAR FROM AGE(COALESCE(c.date_depart, NOW()), c.date_embauche))) as anciennete_moyenne,
                MIN(c.date_embauche) as plus_ancien,
                MAX(c.date_embauche) as plus_recent
            FROM collaborateurs c
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            ${whereClause}
            GROUP BY g.id, g.nom
            ORDER BY g.nom
        `;

        // 7. Taux de turnover (6 derniers mois)
        const turnoverQuery = `
            SELECT 
                DATE_TRUNC('month', d.date_depart) as mois,
                COUNT(*) as nb_departs,
                (SELECT COUNT(*) FROM collaborateurs WHERE statut = 'ACTIF') as effectif_actuel
            FROM depart_collaborateurs d
            JOIN collaborateurs c ON d.collaborateur_id = c.id
            WHERE d.date_depart >= NOW() - INTERVAL '6 months'
            ${whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : ''}
            GROUP BY DATE_TRUNC('month', d.date_depart)
            ORDER BY mois DESC
        `;

        // Exécuter toutes les requêtes
        const [
            globalStats,
            gradeDistribution,
            posteDistribution,
            buDistribution,
            gradeEvolutions,
            anciennete,
            turnover
        ] = await Promise.all([
            pool.query(globalStatsQuery, params),
            pool.query(gradeDistributionQuery, params),
            pool.query(posteDistributionQuery, params),
            pool.query(buDistributionQuery, params),
            pool.query(gradeEvolutionsQuery, params),
            pool.query(ancienneteQuery, params),
            pool.query(turnoverQuery, params).catch(() => ({ rows: [] })) // Table peut ne pas exister
        ]);

        res.json({
            success: true,
            data: {
                global_statistics: globalStats.rows[0],
                grade_distribution: gradeDistribution.rows,
                poste_distribution: posteDistribution.rows,
                business_unit_distribution: buDistribution.rows,
                grade_evolutions: gradeEvolutions.rows,
                anciennete_par_grade: anciennete.rows,
                turnover: turnover.rows
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du rapport RH:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// GET /api/reports/hr/collaborateurs - Liste détaillée des collaborateurs pour le rapport RH
router.get('/hr/collaborateurs', authenticateToken, async (req, res) => {
    try {
        let { businessUnitId, divisionId, gradeId, statut, fiscalYearId } = req.query;
        let startDate, endDate;

        // Si une année fiscale est spécifiée
        if (fiscalYearId) {
            const fiscalYearResult = await pool.query(
                'SELECT date_debut, date_fin FROM fiscal_years WHERE id = $1',
                [fiscalYearId]
            );
            if (fiscalYearResult.rows.length > 0) {
                startDate = fiscalYearResult.rows[0].date_debut;
                endDate = fiscalYearResult.rows[0].date_fin;
            }
        }


        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (businessUnitId) {
            whereConditions.push(`c.business_unit_id = $${paramIndex}`);
            params.push(businessUnitId);
            paramIndex++;
        }

        if (divisionId) {
            whereConditions.push(`c.division_id = $${paramIndex}`);
            params.push(divisionId);
            paramIndex++;
        }

        if (gradeId) {
            whereConditions.push(`c.grade_actuel_id = $${paramIndex}`);
            params.push(gradeId);
            paramIndex++;
        }

        if (statut) {
            whereConditions.push(`c.statut = $${paramIndex}`);
            params.push(statut);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                c.id,
                c.matricule,
                c.nom,
                c.prenom,
                c.email,
                c.telephone,
                c.date_embauche,
                c.date_depart,
                c.statut,
                bu.nom as business_unit_nom,
                d.nom as division_nom,
                g.nom as grade_nom,
                g.niveau as grade_niveau,
                p.nom as poste_nom,
                u.email as user_email,
                EXTRACT(YEAR FROM AGE(COALESCE(c.date_depart, NOW()), c.date_embauche)) as anciennete_annees
            FROM collaborateurs c
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN postes p ON c.poste_actuel_id = p.id
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.nom, c.prenom
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la liste des collaborateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

module.exports = router; 