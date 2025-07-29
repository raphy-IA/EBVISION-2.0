const express = require('express');
const router = express.Router();
const OpportunityStage = require('../models/OpportunityStage');
const { authenticateToken } = require('../middleware/auth');

// GET /api/stage-actions/stage/:stageId - Récupérer les actions d'une étape
router.get('/stage/:stageId', authenticateToken, async (req, res) => {
    try {
        const stage = await OpportunityStage.findById(req.params.stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        const actions = await stage.getActions();
        
        res.json({
            success: true,
            data: {
                actions: actions
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des actions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des actions'
        });
    }
});

// POST /api/stage-actions - Ajouter une action à une étape
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            stage_id,
            action_type,
            action_title,
            action_description,
            duration_minutes,
            outcome,
            notes
        } = req.body;

        if (!stage_id || !action_type || !action_title) {
            return res.status(400).json({
                success: false,
                error: 'stage_id, action_type et action_title sont obligatoires'
            });
        }

        const stage = await OpportunityStage.findById(stage_id);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        const action = await stage.addAction({
            action_type,
            action_title,
            action_description,
            performed_by: req.user.id,
            duration_minutes,
            outcome,
            notes
        });

        res.status(201).json({
            success: true,
            data: {
                action: action
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'action:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'ajout de l\'action'
        });
    }
});

// PUT /api/stage-actions/:id - Mettre à jour une action
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const {
            action_type,
            action_title,
            action_description,
            duration_minutes,
            outcome,
            notes
        } = req.body;

        const query = `
            UPDATE stage_actions SET
                action_type = COALESCE($1, action_type),
                action_title = COALESCE($2, action_title),
                action_description = COALESCE($3, action_description),
                duration_minutes = COALESCE($4, duration_minutes),
                outcome = COALESCE($5, outcome),
                notes = COALESCE($6, notes)
            WHERE id = $7
            RETURNING *
        `;

        const values = [
            action_type,
            action_title,
            action_description,
            duration_minutes,
            outcome,
            notes,
            req.params.id
        ];

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Action non trouvée'
            });
        }

        res.json({
            success: true,
            data: {
                action: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'action:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'action'
        });
    }
});

// DELETE /api/stage-actions/:id - Supprimer une action
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = 'DELETE FROM stage_actions WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Action non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Action supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'action:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'action'
        });
    }
});

// GET /api/stage-actions/opportunity/:opportunityId - Récupérer toutes les actions d'une opportunité
router.get('/opportunity/:opportunityId', authenticateToken, async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                sa.id,
                sa.stage_id,
                sa.action_type,
                sa.action_title,
                sa.action_description,
                sa.action_date,
                sa.created_at,
                sa.updated_at,
                u.nom as created_by_name
            FROM stage_actions sa
            LEFT JOIN users u ON sa.performed_by = u.id
            WHERE sa.stage_id IN (
                SELECT id FROM opportunity_stages 
                WHERE opportunity_id = $1
            )
            ORDER BY sa.created_at DESC
        `;
        
        const { rows } = await pool.query(query, [opportunityId]);
        
        res.json({
            success: true,
            data: {
                actions: rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des actions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des actions'
        });
    }
});

// GET /api/stage-actions/types - Récupérer les types d'actions disponibles
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const actionTypes = [
            { value: 'CALL', label: 'Appel téléphonique' },
            { value: 'MEETING', label: 'Réunion' },
            { value: 'EMAIL', label: 'Email' },
            { value: 'PROPOSAL', label: 'Proposition' },
            { value: 'FOLLOW_UP', label: 'Suivi' },
            { value: 'PRESENTATION', label: 'Présentation' },
            { value: 'NEGOTIATION', label: 'Négociation' },
            { value: 'CLOSURE', label: 'Clôture' },
            { value: 'OTHER', label: 'Autre' }
        ];

        res.json({
            success: true,
            data: {
                actionTypes: actionTypes
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des types d\'actions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des types d\'actions'
        });
    }
});

module.exports = router; 