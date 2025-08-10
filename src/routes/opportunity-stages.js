const express = require('express');
const router = express.Router();
const OpportunityStage = require('../models/OpportunityStage');
const Opportunity = require('../models/Opportunity');
const { authenticateToken } = require('../middleware/auth');

// GET /api/opportunity-stages - Récupérer toutes les étapes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const stages = await OpportunityStage.findAll();
        res.json({ success: true, data: stages });
    } catch (error) {
        console.error('Erreur lors de la récupération des étapes:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des étapes' });
    }
});

// Récupérer toutes les étapes d'une opportunité
router.get('/opportunity/:opportunityId', authenticateToken, async (req, res) => {
    try {
        const { opportunityId } = req.params;
        
        // Vérifier que l'opportunité existe
        const opportunity = await Opportunity.findById(opportunityId);
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        const stages = await OpportunityStage.findByOpportunityId(opportunityId);
        const stats = await OpportunityStage.getStageStats(opportunityId);

        res.json({
            success: true,
            data: {
                stages: stages,
                stats: stats,
                opportunity: opportunity
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des étapes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des étapes'
        });
    }
});

// Récupérer les alertes (retards/risques élevés) d'une opportunité
router.get('/opportunity/:opportunityId/alerts', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const { opportunityId } = req.params;

        const query = `
            SELECT id, stage_name, stage_order, status, due_date, risk_level, priority_level
            FROM opportunity_stages
            WHERE opportunity_id = $1
            ORDER BY stage_order ASC
        `;
        const { rows } = await pool.query(query, [opportunityId]);

        const now = new Date();
        const alerts = rows.filter(st => (
            (st.status !== 'COMPLETED' && st.due_date && new Date(st.due_date) < now) ||
            (st.risk_level === 'HIGH' || st.risk_level === 'CRITICAL')
        ));

        res.json({ success: true, data: { alerts } });
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des alertes' });
    }
});

// Récupérer une étape spécifique
router.get('/:stageId', authenticateToken, async (req, res) => {
    try {
        const { stageId } = req.params;
        
        const stage = await OpportunityStage.findById(stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        // Récupérer les actions de l'étape
        const actions = await stage.getActions();

        res.json({
            success: true,
            data: {
                stage: stage,
                actions: actions
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'étape'
        });
    }
});

// Créer une nouvelle étape
router.post('/', authenticateToken, async (req, res) => {
    try {
        const stageData = {
            ...req.body,
            created_by: req.user.id
        };

        const stage = await OpportunityStage.create(stageData);

        res.status(201).json({
            success: true,
            data: {
                stage: stage
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de l\'étape'
        });
    }
});

// Mettre à jour une étape
router.put('/:stageId', authenticateToken, async (req, res) => {
    try {
        const { stageId } = req.params;
        
        const stage = await OpportunityStage.findById(stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        const updatedStage = await stage.update({
            ...req.body,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            data: {
                stage: updatedStage
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'étape'
        });
    }
});

// Supprimer une étape
router.delete('/:stageId', authenticateToken, async (req, res) => {
    try {
        const { stageId } = req.params;
        
        const stage = await OpportunityStage.findById(stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        await stage.delete();

        res.json({
            success: true,
            message: 'Étape supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'étape'
        });
    }
});

// (Supprimé) Routes directes sur le modèle pour start/complete afin d'unifier via le service de workflow

// Démarrer une étape
router.post('/:stageId/start', authenticateToken, async (req, res) => {
    try {
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        
        const updatedStage = await OpportunityWorkflowService.startStage(req.params.stageId, req.user.id);
        
        res.json({
            success: true,
            data: {
                stage: updatedStage
            }
        });
    } catch (error) {
        console.error('Erreur lors du démarrage de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors du démarrage de l\'étape'
        });
    }
});

// Terminer une étape
router.post('/:stageId/complete', authenticateToken, async (req, res) => {
    try {
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        const { outcome, reason, details } = req.body;
        
        const updatedStage = await OpportunityWorkflowService.completeStage(req.params.stageId, req.user.id, outcome, reason, details);
        
        res.json({
            success: true,
            data: {
                stage: updatedStage
            }
        });
    } catch (error) {
        console.error('Erreur lors de la finalisation de l\'étape:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la finalisation de l\'étape'
        });
    }
});

// Passer à l'étape suivante
router.post('/:stageId/next', authenticateToken, async (req, res) => {
    try {
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        
        const nextStage = await OpportunityWorkflowService.moveToNextStage(req.params.stageId, req.user.id);

        res.json({
            success: true,
            data: {
                nextStage: nextStage
            }
        });
    } catch (error) {
        console.error('Erreur lors du passage à l\'étape suivante:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors du passage à l\'étape suivante'
        });
    }
});

// Mettre à jour les niveaux de risque et priorité
router.post('/:stageId/update-risk-priority', authenticateToken, async (req, res) => {
    try {
        const { stageId } = req.params;
        
        const stage = await OpportunityStage.findById(stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Étape non trouvée'
            });
        }

        const updatedStage = await stage.updateRiskAndPriority();

        res.json({
            success: true,
            data: {
                stage: updatedStage
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des niveaux:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour des niveaux'
        });
    }
});

// Récupérer les statistiques des étapes pour une opportunité
router.get('/opportunity/:opportunityId/stats', authenticateToken, async (req, res) => {
    try {
        const { opportunityId } = req.params;
        
        const stats = await OpportunityStage.getStageStats(opportunityId);

        res.json({
            success: true,
            data: {
                stats: stats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// Mettre à jour l'échéance (due_date) et les notes d'une étape
router.put('/:stageId/schedule', authenticateToken, async (req, res) => {
    try {
        const { stageId } = req.params;
        const { due_date, notes } = req.body;

        const stage = await OpportunityStage.findById(stageId);
        if (!stage) {
            return res.status(404).json({ success: false, error: 'Étape non trouvée' });
        }

        const updated = await stage.update({
            due_date: due_date ? new Date(due_date) : stage.due_date,
            notes: notes !== undefined ? notes : stage.notes
        });

        res.json({ success: true, data: { stage: updated } });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'échéance:", error);
        res.status(500).json({ success: false, error: "Erreur lors de la mise à jour de l'échéance" });
    }
});

// Recalculer le risque/priorité d'une étape
router.post('/:stageId/recompute-risk', authenticateToken, async (req, res) => {
    try {
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        const updatedStage = await OpportunityWorkflowService.updateStageRiskAndPriority(req.params.stageId);
        res.json({ success: true, data: { stage: updatedStage } });
    } catch (error) {
        console.error('Erreur lors du recalcul du risque/priorité:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du recalcul du risque/priorité' });
    }
});

// Déclencher un scan des étapes en retard (global)
router.post('/check-overdue/run', authenticateToken, async (req, res) => {
    try {
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        const overdueStages = await OpportunityWorkflowService.checkOverdueStages();
        res.json({ success: true, data: { overdueStages } });
    } catch (error) {
        console.error('Erreur lors du scan des étapes en retard:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du scan des étapes en retard' });
    }
});

module.exports = router; 