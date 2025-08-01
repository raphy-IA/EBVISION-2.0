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
            SELECT m.*, c.nom as client_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
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
            SELECT m.*, c.nom as client_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
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
            code, titre, description, client_id, opportunity_id, mission_type_id,
            date_debut, date_fin_prevue, budget_prevue, taux_horaire_moyen,
            division_id, responsable_id, priorite, statut, notes,
            
            // Configuration financière
            montant_honoraires, devise_honoraires, description_honoraires,
            montant_debours, devise_debours, description_debours,
            conditions_paiement, pourcentage_avance,
            
            // Tâches et affectations
            tasks
        } = req.body;
        
        // 1. Créer la mission
        const missionQuery = `
            INSERT INTO missions (
                code, titre, description, client_id, opportunity_id, mission_type_id,
                date_debut, date_fin_prevue, budget_prevue, taux_horaire_moyen,
                division_id, responsable_id, priorite, statut, notes,
                montant_honoraires, devise_honoraires, description_honoraires,
                montant_debours, devise_debours, description_debours,
                conditions_paiement, pourcentage_avance,
                created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24
            ) RETURNING *
        `;
        
        const missionResult = await client.query(missionQuery, [
            code, titre, description, client_id, opportunity_id, mission_type_id,
            date_debut, date_fin_prevue, budget_prevue, taux_horaire_moyen,
            division_id, responsable_id, priorite, statut || 'en_cours', notes,
            montant_honoraires, devise_honoraires, description_honoraires,
            montant_debours, devise_debours, description_debours,
            conditions_paiement, pourcentage_avance,
            req.user.id
        ]);
        
        const mission = missionResult.rows[0];
        
        // 2. Créer les tâches de mission et les affectations
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                // Créer la tâche de mission
                const missionTaskQuery = `
                    INSERT INTO mission_tasks (
                        mission_id, task_id, nom, description, priorite,
                        date_debut_prevue, date_fin_prevue, heures_prevues,
                        statut, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *
                `;
                
                const missionTaskResult = await client.query(missionTaskQuery, [
                    mission.id, task.task_id, task.nom, task.description, task.priorite,
                    task.date_debut_prevue, task.date_fin_prevue, task.heures_prevues,
                    task.statut || 'en_cours', req.user.id
                ]);
                
                const missionTask = missionTaskResult.rows[0];
                
                // Créer les affectations de collaborateurs
                if (task.assignments && Array.isArray(task.assignments)) {
                    for (const assignment of task.assignments) {
                        const assignmentQuery = `
                            INSERT INTO equipes_mission (
                                mission_id, mission_task_id, collaborateur_id,
                                heures_prevues, taux_horaire, montant_prevue,
                                date_debut, date_fin, statut, created_by
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        `;
                        
                        await client.query(assignmentQuery, [
                            mission.id, missionTask.id, assignment.collaborateur_id,
                            assignment.heures_prevues, assignment.taux_horaire,
                            assignment.montant_prevue, assignment.date_debut,
                            assignment.date_fin, assignment.statut || 'planifie', req.user.id
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

module.exports = router; 