const express = require('express');
const router = express.Router();
const Objective = require('../models/Objective');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ObjectiveTrackingService = require('../services/ObjectiveTrackingService');

// === TYPES D'OBJECTIFS ===

// GET /api/objectives/types - Récupérer tous les types d'objectifs
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const types = await Objective.getAllTypes();
        res.json(types);
    } catch (error) {
        console.error('Erreur lors de la récupération des types d\'objectifs:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === OBJECTIFS GLOBAUX ===

// GET /api/objectives/global/:fiscalYearId - Récupérer les objectifs globaux
router.get('/global/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const objectives = await Objective.getGlobalObjectives(req.params.fiscalYearId);
        res.json(objectives);
    } catch (error) {
        console.error('Erreur lors de la récupération des objectifs globaux:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/global - Créer un objectif global
router.post('/global', authenticateToken, requireRole(['ADMIN', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const objective = await Objective.createGlobalObjective({
            ...req.body,
            created_by: req.user.id
        });
        res.status(201).json(objective);
    } catch (error) {
        console.error('Erreur lors de la création de l\'objectif global:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/objectives/global/:id - Modifier un objectif global
router.put('/global/:id', authenticateToken, requireRole(['ADMIN', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const objective = await Objective.updateGlobalObjective(req.params.id, req.body);
        res.json(objective);
    } catch (error) {
        console.error('Erreur lors de la modification de l\'objectif global:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/objectives/global/:id - Supprimer un objectif global
router.delete('/global/:id', authenticateToken, requireRole(['ADMIN', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        await Objective.deleteGlobalObjective(req.params.id);
        res.json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objectif global:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === OBJECTIFS BUSINESS UNIT ===

// GET /api/objectives/business-unit/:businessUnitId/:fiscalYearId
router.get('/business-unit/:businessUnitId/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const objectives = await Objective.getBusinessUnitObjectives(req.params.businessUnitId, req.params.fiscalYearId);
        res.json(objectives);
    } catch (error) {
        console.error('Erreur lors de la récupération des objectifs BU:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/business-unit - Distribuer un objectif à une BU
router.post('/business-unit', authenticateToken, requireRole(['ADMIN', 'SENIOR_PARTNER', 'ASSOCIATE_DIRECTOR']), async (req, res) => {
    try {
        const objective = await Objective.distributeToBusinessUnit({
            ...req.body,
            assigned_by: req.user.id
        });
        res.status(201).json(objective);
    } catch (error) {
        console.error('Erreur lors de la distribution de l\'objectif BU:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === OBJECTIFS DIVISION ===

// GET /api/objectives/division/:divisionId/:fiscalYearId
router.get('/division/:divisionId/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const objectives = await Objective.getDivisionObjectives(req.params.divisionId, req.params.fiscalYearId);
        res.json(objectives);
    } catch (error) {
        console.error('Erreur lors de la récupération des objectifs Division:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/division - Distribuer un objectif à une Division
router.post('/division', authenticateToken, requireRole(['ADMIN', 'ASSOCIATE_DIRECTOR', 'MANAGER']), async (req, res) => {
    try {
        const objective = await Objective.distributeToDivision({
            ...req.body,
            assigned_by: req.user.id
        });
        res.status(201).json(objective);
    } catch (error) {
        console.error('Erreur lors de la distribution de l\'objectif Division:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === OBJECTIFS INDIVIDUELS ===

// GET /api/objectives/individual/:collaboratorId/:fiscalYearId
router.get('/individual/:collaboratorId/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const objectives = await Objective.getIndividualObjectives(req.params.collaboratorId, req.params.fiscalYearId);
        res.json(objectives);
    } catch (error) {
        console.error('Erreur lors de la récupération des objectifs individuels:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/individual - Assigner un objectif à un collaborateur
router.post('/individual', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const objective = await Objective.assignToIndividual({
            ...req.body,
            assigned_by: req.user.id
        });
        res.status(201).json(objective);
    } catch (error) {
        console.error('Erreur lors de l\'assignation de l\'objectif individuel:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/grade - Assigner un objectif à un grade (groupe de collaborateurs)
router.post('/grade', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'ASSOCIATE_DIRECTOR', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const objectives = await Objective.assignToGrade({
            ...req.body,
            assigned_by: req.user.id
        });
        res.status(201).json({
            message: `${objectives.length} objectifs créés avec succès`,
            objectives
        });
    } catch (error) {
        console.error('Erreur lors de l\'assignation de l\'objectif par grade:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === PROGRESSION ===

// PUT /api/objectives/progress - Mettre à jour la progression
router.put('/progress', authenticateToken, async (req, res) => {
    try {
        const { objectiveType, objectiveId, currentValue, notes } = req.body;
        const progress = await Objective.updateProgress(objectiveType, objectiveId, currentValue, notes, req.user.id);
        res.json(progress);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la progression:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/objectives/available-parents - Récupérer les objectifs parents disponibles
router.get('/available-parents/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const filters = req.query; // business_unit_id, division_id, etc.
        const parents = await Objective.getAvailableParents(type, filters);

        // Pour chaque parent, calculer le montant restant
        const parentsWithRemaining = await Promise.all(
            parents.map(async (parent) => {
                try {
                    // Déterminer le type parent basé sur le type demandé
                    const parentTypeMap = {
                        'BUSINESS_UNIT': 'GLOBAL',
                        'DIVISION': 'BUSINESS_UNIT',
                        'INDIVIDUAL': 'DIVISION'
                    };
                    const parentType = parentTypeMap[type];

                    if (parentType) {
                        const remaining = await Objective.getRemainingAmount(parentType, parent.id);
                        return { ...parent, remaining_amount: remaining };
                    }
                    return parent;
                } catch (error) {
                    console.error(`Erreur calcul montant restant pour ${parent.id}:`, error);
                    return parent;
                }
            })
        );

        res.json(parentsWithRemaining);
    } catch (error) {
        console.error('Erreur lors de la récupération des parents disponibles:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/track - Déclencher la mise à jour automatique (Test/Cron)
router.post('/track', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { metricCode } = req.body;
        const result = await ObjectiveTrackingService.updateProgress(metricCode, req.user.id);
        res.json(result);
    } catch (error) {
        console.error('Erreur lors du tracking automatique:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
