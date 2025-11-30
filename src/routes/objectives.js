const express = require('express');
const router = express.Router();
const Objective = require('../models/Objective');
const ObjectiveUnit = require('../models/ObjectiveUnit');
const ObjectiveMetric = require('../models/ObjectiveMetric');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
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

// === UNITÉS DE MESURE ===

// GET /api/objectives/units - Récupérer toutes les unités
router.get('/units', authenticateToken, async (req, res) => {
    try {
        const units = await ObjectiveUnit.getAll();
        res.json(units);
    } catch (error) {
        console.error('Erreur lors de la récupération des unités:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === MÉTRIQUES ===

// GET /api/objectives/metrics - Récupérer toutes les métriques
router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const metrics = await ObjectiveMetric.getAll();
        res.json(metrics);
    } catch (error) {
        console.error('Erreur lors de la récupération des métriques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/objectives/metrics/:id - Récupérer une métrique par ID
router.get('/metrics/:id', authenticateToken, async (req, res) => {
    try {
        const metric = await ObjectiveMetric.getById(req.params.id);
        if (!metric) {
            return res.status(404).json({ message: 'Métrique non trouvée' });
        }
        res.json(metric);
    } catch (error) {
        console.error('Erreur lors de la récupération de la métrique:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/objectives/metrics/:id/sources - Récupérer les sources d'une métrique
router.get('/metrics/:id/sources', authenticateToken, async (req, res) => {
    try {
        const sources = await ObjectiveMetric.getSources(req.params.id);
        res.json(sources);
    } catch (error) {
        console.error('Erreur lors de la récupération des sources:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/objectives/types/:typeId/impacted-metrics - Métriques impactées par un type
router.get('/types/:typeId/impacted-metrics', authenticateToken, async (req, res) => {
    try {
        const { unitId } = req.query;
        const metrics = await ObjectiveMetric.getImpactedByType(req.params.typeId, unitId);
        res.json(metrics);
    } catch (error) {
        console.error('Erreur lors de la récupération des métriques impactées:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === TOUS LES OBJECTIFS ===

// GET /api/objectives/all/:fiscalYearId - Récupérer tous les objectifs (Global, BU, Division)
router.get('/all/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const objectives = await Objective.getAllObjectives(req.params.fiscalYearId);
        res.json(objectives);
    } catch (error) {
        console.error('Erreur lors de la récupération de tous les objectifs:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message, stack: error.stack });
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
router.post('/global', authenticateToken, requirePermission('OBJECTIVES_GLOBAL_CREATE'), async (req, res) => {
    try {
        const objective = await Objective.createGlobalObjective({
            ...req.body,
            created_by: req.user.id
        });
        res.status(201).json(objective);
    } catch (error) {
        console.error('Erreur lors de la création de l\'objectif global:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ message: 'Un objectif de ce type existe déjà pour cet exercice fiscal.' });
        }
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

// PUT /api/objectives/global/:id - Modifier un objectif global
router.put('/global/:id', authenticateToken, requirePermission('OBJECTIVES_GLOBAL_EDIT'), async (req, res) => {
    try {
        const objective = await Objective.updateGlobalObjective(req.params.id, req.body);
        res.json(objective);
    } catch (error) {
        console.error('Erreur lors de la modification de l\'objectif global:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/objectives/global/:id - Supprimer un objectif global
router.delete('/global/:id', authenticateToken, requirePermission('OBJECTIVES_GLOBAL_DELETE'), async (req, res) => {
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

// POST /api/objectives/business-unit - Créer/Distribuer un objectif à une BU
router.post('/business-unit', authenticateToken, requirePermission('OBJECTIVES_BU_CREATE'), async (req, res) => {
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

// DELETE /api/objectives/business-unit/:id - Supprimer un objectif BU
router.delete('/business-unit/:id', authenticateToken, requirePermission('OBJECTIVES_BU_DELETE'), async (req, res) => {
    try {
        await Objective.deleteBusinessUnitObjective(req.params.id);
        res.json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objectif BU:', error);
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

// POST /api/objectives/division - Créer/Distribuer un objectif à une Division
router.post('/division', authenticateToken, requirePermission('OBJECTIVES_DIVISION_CREATE'), async (req, res) => {
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

// DELETE /api/objectives/division/:id - Supprimer un objectif Division
router.delete('/division/:id', authenticateToken, requirePermission('OBJECTIVES_DIVISION_DELETE'), async (req, res) => {
    try {
        await Objective.deleteDivisionObjective(req.params.id);
        res.json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objectif Division:', error);
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
router.post('/individual', authenticateToken, requirePermission('OBJECTIVES_INDIVIDUAL_CREATE'), async (req, res) => {
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

// DELETE /api/objectives/individual/:id - Supprimer un objectif individuel
router.delete('/individual/:id', authenticateToken, requirePermission('OBJECTIVES_INDIVIDUAL_DELETE'), async (req, res) => {
    try {
        await Objective.deleteIndividualObjective(req.params.id);
        res.json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objectif individuel:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/grade - Assigner un objectif à un grade (groupe de collaborateurs)
router.post('/grade', authenticateToken, requirePermission('OBJECTIVES_GRADE_CREATE'), async (req, res) => {
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

// DELETE /api/objectives/grade/:id - Supprimer un objectif de grade
router.delete('/grade/:id', authenticateToken, requirePermission('OBJECTIVES_GRADE_DELETE'), async (req, res) => {
    try {
        await Objective.deleteGradeObjective(req.params.id);
        res.json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'objectif de grade:', error);
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

// GET /api/objectives/grades - Récupérer la liste des grades (pour sélection par grade)
router.get('/grades', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const result = await pool.query('SELECT id, name FROM grades ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des grades:', error);
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

// === DISTRIBUTION MULTI-ENFANTS ===

// GET /api/objectives/:parentId/distribution-summary - Résumé de distribution d'un objectif parent
router.get('/:parentId/distribution-summary', authenticateToken, async (req, res) => {
    try {
        const summary = await Objective.getDistributionSummary(req.params.parentId);
        res.json(summary);
    } catch (error) {
        console.error('Erreur lors de la récupération du résumé de distribution:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/objectives/:parentId/available-children - Entités disponibles pour distribution
router.get('/:parentId/available-children', authenticateToken, async (req, res) => {
    try {
        const { childType, gradeId } = req.query;
        const children = await Objective.getAvailableChildren(req.params.parentId, childType, gradeId);
        res.json(children);
    } catch (error) {
        console.error('Erreur lors de la récupération des enfants disponibles:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/objectives/distribute - Distribuer un objectif à plusieurs enfants
router.post('/distribute', authenticateToken, async (req, res) => {
    try {
        const { parent_objective_id, children } = req.body;

        if (!parent_objective_id || !children || !Array.isArray(children) || children.length === 0) {
            return res.status(400).json({ message: 'Données invalides' });
        }

        // 1. Déterminer le type de l'objectif parent
        const parentType = await Objective.getObjectiveTypeById(parent_objective_id);
        if (!parentType) {
            return res.status(404).json({ message: 'Objectif parent non trouvé' });
        }

        // 2. Déterminer la permission requise
        let requiredPermission = '';
        switch (parentType) {
            case 'GLOBAL':
                requiredPermission = 'OBJECTIVES_GLOBAL_DISTRIBUTE';
                break;
            case 'BUSINESS_UNIT':
                requiredPermission = 'OBJECTIVES_BU_DISTRIBUTE';
                break;
            case 'DIVISION':
                requiredPermission = 'OBJECTIVES_DIVISION_DISTRIBUTE';
                break;
            case 'GRADE':
                requiredPermission = 'OBJECTIVES_GRADE_DISTRIBUTE';
                break;
            default:
                return res.status(400).json({ message: 'Type d\'objectif parent non supporté pour la distribution' });
        }

        // 3. Vérifier la permission (via DB pour sécurité maximale)
        const { pool } = require('../utils/database');

        // Vérifier si SUPER_ADMIN
        const userRolesQuery = `
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `;
        const rolesResult = await pool.query(userRolesQuery, [req.user.id]);
        const userRoles = rolesResult.rows.map(r => r.name);

        if (!userRoles.includes('SUPER_ADMIN')) {
            // Vérifier la permission spécifique
            const permissionQuery = `
                SELECT 1
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1 AND p.code = $2
            `;
            const permissionResult = await pool.query(permissionQuery, [req.user.id, requiredPermission]);

            if (permissionResult.rows.length === 0) {
                return res.status(403).json({
                    message: `Permission insuffisante. Requiert : ${requiredPermission}`
                });
            }
        }

        // 4. Procéder à la distribution
        const result = await Objective.distributeToMultipleChildren(
            parent_objective_id,
            children,
            req.user.id
        );

        res.status(201).json(result);
    } catch (error) {
        console.error('Erreur lors de la distribution multi-enfants:', error);
        if (error.message.includes('montant restant')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

module.exports = router;

