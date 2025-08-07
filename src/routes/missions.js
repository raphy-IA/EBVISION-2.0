const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/missions
 * Récupérer toutes les missions avec pagination et filtres
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            client_id: req.query.client_id,
            statut: req.query.statut,
            type_mission: req.query.type_mission,
            search: req.query.search
        };

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (options.client_id) {
            whereConditions.push(`m.client_id = $${paramIndex++}`);
            queryParams.push(options.client_id);
        }

        if (options.statut) {
            whereConditions.push(`m.statut = $${paramIndex++}`);
            queryParams.push(options.statut);
        }

        if (options.type_mission) {
            whereConditions.push(`m.type_mission = $${paramIndex++}`);
            queryParams.push(options.type_mission);
        }

        if (options.search) {
            whereConditions.push(`(
                m.nom ILIKE $${paramIndex} OR 
                m.description ILIKE $${paramIndex} OR
                c.nom ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${options.search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (options.page - 1) * options.limit;
        const dataQuery = `
            SELECT 
                m.*,
                c.nom as client_nom,
                bu.nom as business_unit_nom,
                d.nom as division_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            ${whereClause}
            ORDER BY m.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(options.limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages: Math.ceil(total / options.limit)
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des missions',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id
 * Récupérer une mission par ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                m.*,
                c.nom as client_nom,
                mt.libelle as mission_type_nom,
                u.nom as responsable_nom,
                u.prenom as responsable_prenom,
                associe.nom as associe_nom,
                associe.prenom as associe_prenom,
                bu.nom as business_unit_nom,
                d.nom as division_nom,
                creator.nom as created_by_nom,
                creator.prenom as created_by_prenom,
                fy.annee as fiscal_year_annee
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            LEFT JOIN collaborateurs u ON m.collaborateur_id = u.id
            LEFT JOIN collaborateurs associe ON m.associe_id = associe.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN users creator ON m.created_by = creator.id
            LEFT JOIN fiscal_years fy ON m.fiscal_year_id = fy.id
            WHERE m.id = $1
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la mission',
            details: error.message
        });
    }
});

/**
 * POST /api/missions
 * Créer une nouvelle mission avec toutes les données du wizard
 */
router.post('/', authenticateToken, async (req, res) => {
    const { pool } = require('../utils/database');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const {
            // Données de base de la mission
            code, nom, description, client_id, opportunity_id, mission_type_id,
            date_debut, date_fin_prevue, budget_prevue, taux_horaire_moyen,
            division_id, responsable_id, associe_id, priorite, statut, notes,
            
            // Configuration financière
            montant_honoraires, devise, description_honoraires,
            montant_debours, description_debours,
            conditions_paiement, pourcentage_avance,
            
            // Business Unit et Division (viennent du type de mission)
            business_unit_id,
            
            // Tâches et affectations
            tasks
        } = req.body;
        
        // 1. Créer la mission
        const missionQuery = `
            INSERT INTO missions (
                code, nom, description, client_id, collaborateur_id, statut, type_mission,
                priorite, date_debut, date_fin, budget_estime, devise, notes, created_by,
                fiscal_year_id, opportunity_id, mission_type_id, montant_honoraires,
                description_honoraires, montant_debours, description_debours,
                conditions_paiement, pourcentage_avance, business_unit_id, associe_id,
                division_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
            ) RETURNING *
        `;
        
        // Récupérer l'année fiscale en cours
        const fiscalYearQuery = `
            SELECT id FROM fiscal_years 
            WHERE date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE 
            AND statut = 'ACTIF' 
            LIMIT 1
        `;
        const fiscalYearResult = await client.query(fiscalYearQuery);
        const fiscal_year_id = fiscalYearResult.rows.length > 0 ? fiscalYearResult.rows[0].id : null;
        
        const missionResult = await client.query(missionQuery, [
            code, nom, description, client_id, responsable_id, statut || 'PLANIFIEE', 'MISSION',
            priorite, date_debut, date_fin_prevue, budget_prevue, devise || 'XAF', notes, req.user.id,
            fiscal_year_id, opportunity_id, mission_type_id, montant_honoraires,
            description_honoraires, montant_debours, description_debours,
            conditions_paiement, pourcentage_avance, business_unit_id, associe_id,
            division_id
        ]);
        
        const mission = missionResult.rows[0];
        
        // 2. Créer les tâches de mission et les affectations
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                // Créer la tâche de mission
                const missionTaskQuery = `
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut, date_debut, date_fin,
                        duree_planifiee, notes, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                `;
                
                const missionTaskResult = await client.query(missionTaskQuery, [
                    mission.id, task.task_id, 'PLANIFIEE',
                    task.date_debut_prevue, task.date_fin_prevue, task.heures_prevues,
                    task.description || ''
                ]);
                
                const missionTask = missionTaskResult.rows[0];
                
                // Créer les affectations de collaborateurs
                if (task.assignments && Array.isArray(task.assignments)) {
                    for (const assignment of task.assignments) {
                        const assignmentQuery = `
                            INSERT INTO task_assignments (
                                mission_task_id, collaborateur_id, heures_planifiees,
                                taux_horaire, statut, created_at, updated_at
                            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        `;
                        
                        await client.query(assignmentQuery, [
                            missionTask.id, assignment.collaborateur_id,
                            assignment.heures_prevues, assignment.taux_horaire,
                            'PLANIFIE'
                        ]);
                    }
                }
            }
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            data: {
                mission: mission,
                message: 'Mission créée avec succès avec toutes ses tâches et affectations'
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la création de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de la mission',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/missions/:id
 * Mettre à jour une mission
 */
router.put('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const { titre, description, client_id, statut, type_mission, date_debut, date_fin_prevue, budget_prevue } = req.body;
        
        const query = `
            UPDATE missions SET
                titre = $1,
                description = $2,
                client_id = $3,
                statut = $4,
                type_mission = $5,
                date_debut = $6,
                date_fin_prevue = $7,
                budget_prevue = $8,
                date_modification = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, client_id, statut, type_mission,
            date_debut, date_fin_prevue, budget_prevue, req.params.id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Mission mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la mission',
            details: error.message
        });
    }
});

/**
 * DELETE /api/missions/:id
 * Supprimer une mission
 */
router.delete('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const result = await pool.query('DELETE FROM missions WHERE id = $1', [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Mission supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de la mission',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/available-tasks
 * Récupérer les tâches disponibles pour une mission (basées sur le type de mission)
 */
router.get('/:id/available-tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        // 1. Récupérer le type de mission de cette mission
        const missionQuery = `
            SELECT mission_type_id 
            FROM missions 
            WHERE id = $1
        `;
        
        const missionResult = await pool.query(missionQuery, [req.params.id]);
        
        if (missionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }
        
        const missionTypeId = missionResult.rows[0].mission_type_id;
        
        if (!missionTypeId) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        // 2. Récupérer les tâches disponibles pour ce type de mission
        const tasksQuery = `
            SELECT 
                t.id,
                t.code,
                t.libelle,
                t.description,
                t.duree_estimee,
                t.priorite,
                tmt.ordre,
                tmt.obligatoire
            FROM tasks t
            INNER JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE tmt.mission_type_id = $1 AND t.actif = true
            ORDER BY tmt.ordre, t.libelle
        `;
        
        const tasksResult = await pool.query(tasksQuery, [missionTypeId]);
        
        res.json({
            success: true,
            data: tasksResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches disponibles:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des tâches disponibles',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/tasks
 * Récupérer les tâches configurées d'une mission
 */
router.get('/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                mt.id as mission_task_id,
                mt.task_id,
                mt.statut,
                mt.date_debut,
                mt.date_fin,
                mt.duree_planifiee,
                mt.duree_reelle,
                mt.notes,
                t.id,
                t.code,
                t.libelle as task_libelle,
                t.description as task_description,
                t.duree_estimee,
                t.priorite
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.date_debut, t.libelle
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des tâches',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/assignments
 * Récupérer les affectations de collaborateurs d'une mission
 */
router.get('/:id/assignments', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                ta.id,
                ta.heures_planifiees,
                ta.heures_effectuees,
                ta.taux_horaire,
                ta.statut as assignment_statut,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                c.email as collaborateur_email,
                t.libelle as task_libelle,
                mt.statut as task_statut
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            LEFT JOIN tasks t ON mt.task_id = t.id
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            WHERE mt.mission_id = $1
            ORDER BY c.nom, t.libelle
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des affectations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des affectations',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/team
 * Récupérer l'équipe complète d'une mission
 */
router.get('/:id/team', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT DISTINCT
                c.id,
                c.nom,
                c.prenom,
                c.email,
                c.telephone,
                g.nom as grade_nom,
                COUNT(ta.id) as nb_assignments,
                SUM(ta.heures_planifiees) as total_heures_planifiees,
                SUM(ta.heures_effectuees) as total_heures_effectuees
            FROM collaborateurs c
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN task_assignments ta ON c.id = ta.collaborateur_id
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            WHERE mt.mission_id = $1
            GROUP BY c.id, c.nom, c.prenom, c.email, c.telephone, g.nom
            ORDER BY c.nom, c.prenom
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'équipe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'équipe',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/planning
 * Récupérer le planning complet d'une mission (tâches + affectations)
 */
router.get('/:id/planning', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        // 1. Récupérer les tâches de la mission
        const tasksQuery = `
            SELECT 
                mt.id as mission_task_id,
                t.code,
                t.libelle,
                t.description,
                mt.statut,
                mt.duree_planifiee,
                mt.date_debut,
                mt.date_fin,
                mt.notes
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.created_at
        `;
        
        const tasksResult = await pool.query(tasksQuery, [req.params.id]);
        
        // 2. Pour chaque tâche, récupérer les affectations
        const tasksWithAssignments = [];
        
        for (const task of tasksResult.rows) {
            const assignmentsQuery = `
                SELECT 
                    ta.id,
                    c.nom,
                    c.prenom,
                    g.nom as grade_nom,
                    g.taux_horaire_default,
                    ta.heures_planifiees,
                    ta.heures_effectuees,
                    ta.taux_horaire,
                    ta.statut
                FROM task_assignments ta
                LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE ta.mission_task_id = $1
            `;
            
            const assignmentsResult = await pool.query(assignmentsQuery, [task.mission_task_id]);
            
            tasksWithAssignments.push({
                ...task,
                assignments: assignmentsResult.rows
            });
        }
        
        // 3. Calculer les totaux
        const summaryQuery = `
            SELECT 
                SUM(ta.heures_planifiees) as total_heures_planifiees,
                SUM(ta.heures_effectuees) as total_heures_effectuees,
                COUNT(DISTINCT ta.collaborateur_id) as nombre_collaborateurs,
                COUNT(DISTINCT mt.id) as nombre_taches
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            WHERE mt.mission_id = $1
        `;
        
        const summaryResult = await pool.query(summaryQuery, [req.params.id]);
        
        res.json({
            success: true,
            tasks: tasksWithAssignments,
            summary: summaryResult.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du planning:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du planning',
            details: error.message
        });
    }
});



/**
 * PUT /api/missions/:id/planning
 * Mettre à jour le planning d'une mission
 */
router.put('/:id/planning', authenticateToken, async (req, res) => {
    const { pool } = require('../utils/database');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { tasks } = req.body;
        const missionId = req.params.id;
        
        // 1. Supprimer toutes les affectations existantes
        const deleteAssignmentsQuery = `
            DELETE FROM task_assignments 
            WHERE mission_task_id IN (
                SELECT id FROM mission_tasks WHERE mission_id = $1
            )
        `;
        await client.query(deleteAssignmentsQuery, [missionId]);
        
        // 2. Supprimer toutes les tâches de mission existantes
        const deleteTasksQuery = `
            DELETE FROM mission_tasks WHERE mission_id = $1
        `;
        await client.query(deleteTasksQuery, [missionId]);
        
        // 3. Créer les nouvelles tâches et affectations
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                // Créer la tâche de mission
                const missionTaskQuery = `
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut, date_debut, date_fin,
                        duree_planifiee, notes, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                `;
                
                const missionTaskResult = await client.query(missionTaskQuery, [
                    missionId, task.task_id, task.statut || 'PLANIFIEE',
                    task.date_debut, task.date_fin, task.duree_planifiee || 0,
                    task.notes || ''
                ]);
                
                const missionTask = missionTaskResult.rows[0];
                
                // Créer les affectations de collaborateurs
                if (task.assignments && Array.isArray(task.assignments)) {
                    for (const assignment of task.assignments) {
                        if (assignment.collaborateur_id) {
                            const assignmentQuery = `
                                INSERT INTO task_assignments (
                                    mission_task_id, collaborateur_id, heures_planifiees,
                                    taux_horaire, statut, created_at, updated_at
                                ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            `;
                            
                            await client.query(assignmentQuery, [
                                missionTask.id, assignment.collaborateur_id,
                                assignment.heures_planifiees || 0, assignment.taux_horaire || 0,
                                assignment.statut || 'PLANIFIE'
                            ]);
                        }
                    }
                }
            }
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Planning mis à jour avec succès'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la mise à jour du planning:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du planning',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/missions/:id/collaborateurs-taux
 * Récupérer les taux horaires des collaborateurs assignés à une mission
 */
router.get('/:id/collaborateurs-taux', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                c.nom,
                c.prenom,
                g.taux_horaire_default
            FROM missions m
            LEFT JOIN collaborateurs c ON m.collaborateur_id = c.id OR m.associe_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            WHERE m.id = $1 AND c.id IS NOT NULL AND g.taux_horaire_default IS NOT NULL
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        const tauxHoraires = result.rows.map(row => parseFloat(row.taux_horaire_default || 0)).filter(t => t > 0);
        
        res.json({
            success: true,
            collaborateurs: result.rows,
            taux_horaires: tauxHoraires,
            moyenne: tauxHoraires.length > 0 ? tauxHoraires.reduce((a, b) => a + b, 0) / tauxHoraires.length : 0
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des taux horaires',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/progress
 * Récupérer la progression d'une mission
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        // Statistiques des tâches
        const tasksStatsQuery = `
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN statut = 'TERMINEE' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN statut = 'EN_COURS' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN statut = 'PLANIFIEE' THEN 1 END) as planned_tasks,
                SUM(duree_planifiee) as total_planned_hours,
                SUM(duree_reelle) as total_actual_hours
            FROM mission_tasks
            WHERE mission_id = $1
        `;
        
        const tasksStatsResult = await pool.query(tasksStatsQuery, [req.params.id]);
        const tasksStats = tasksStatsResult.rows[0];
        
        // Progression par tâche
        const tasksProgressQuery = `
            SELECT 
                mt.id,
                mt.statut,
                mt.duree_planifiee,
                mt.duree_reelle,
                t.libelle as task_libelle,
                ROUND(
                    CASE 
                        WHEN mt.duree_planifiee > 0 
                        THEN (COALESCE(mt.duree_reelle, 0) / mt.duree_planifiee) * 100
                        ELSE 0 
                    END, 2
                ) as progress_percentage
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.date_debut
        `;
        
        const tasksProgressResult = await pool.query(tasksProgressQuery, [req.params.id]);
        
        res.json({
            success: true,
            data: {
                stats: tasksStats,
                tasks: tasksProgressResult.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la progression:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la progression',
            details: error.message
        });
    }
});

module.exports = router; 