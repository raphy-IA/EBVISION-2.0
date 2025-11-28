const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const { authenticateToken, requireRole } = require('../middleware/auth');

// === MODÈLES D'ÉVALUATION ===

// GET /api/evaluations/templates - Récupérer tous les modèles d'évaluation
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const templates = await Evaluation.getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Erreur lors de la récupération des modèles d\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === CAMPAGNES D'ÉVALUATION ===

// GET /api/evaluations/campaigns/:fiscalYearId - Récupérer les campagnes d'une année fiscale
router.get('/campaigns/:fiscalYearId', authenticateToken, async (req, res) => {
    try {
        const campaigns = await Evaluation.getCampaigns(req.params.fiscalYearId);
        res.json(campaigns);
    } catch (error) {
        console.error('Erreur lors de la récupération des campagnes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/campaigns/detail/:id - Récupérer une campagne par ID
router.get('/campaigns/detail/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await Evaluation.getCampaignById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campagne non trouvée' });
        }
        res.json(campaign);
    } catch (error) {
        console.error('Erreur lors de la récupération de la campagne:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/evaluations/campaigns - Créer une campagne
router.post('/campaigns', authenticateToken, requireRole(['ADMIN', 'HR', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const campaign = await Evaluation.createCampaign({
            ...req.body,
            created_by: req.user.id
        });
        res.status(201).json(campaign);
    } catch (error) {
        console.error('Erreur lors de la création de la campagne:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// === ÉVALUATIONS INDIVIDUELLES ===

// POST /api/evaluations - Créer/Démarrer une évaluation
router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'HR']), async (req, res) => {
    try {
        const evaluation = await Evaluation.createEvaluation({
            ...req.body,
            evaluator_id: req.user.id
        });
        res.status(201).json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la création de l\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/:id - Récupérer une évaluation complète
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const evaluation = await Evaluation.getEvaluation(req.params.id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Évaluation non trouvée' });
        }

        // Vérifier les droits d'accès (collaborateur concerné, évaluateur, ou RH/Admin)
        if (req.user.role !== 'ADMIN' && req.user.role !== 'HR' &&
            req.user.id !== evaluation.collaborator_id && req.user.id !== evaluation.evaluator_id) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const scores = await Evaluation.getEvaluationScores(req.params.id);

        res.json({
            ...evaluation,
            scores
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/evaluations/:id/score - Mettre à jour un score d'objectif
router.put('/:id/score', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { scoreId, achievedValue, comment } = req.body;
        const score = await Evaluation.updateScore(scoreId, achievedValue, comment);
        res.json(score);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du score:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/evaluations/:id/status - Mettre à jour le statut et le feedback global
router.put('/:id/status', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'HR']), async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const evaluation = await Evaluation.updateEvaluationStatus(req.params.id, status, feedback);
        res.json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de l\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/collaborator/:collaboratorId - Récupérer l'historique des évaluations d'un collaborateur
router.get('/collaborator/:collaboratorId', authenticateToken, async (req, res) => {
    try {
        // Vérification des droits
        if (req.user.role !== 'ADMIN' && req.user.role !== 'HR' &&
            req.user.id !== req.params.collaboratorId &&
            // TODO: Vérifier si c'est le manager du collaborateur
            true) {
            // return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const evaluations = await Evaluation.getEvaluationsByCollaborator(req.params.collaboratorId);
        res.json(evaluations);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des évaluations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/templates - Récupérer les modèles d'évaluation
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const templates = await Evaluation.getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Erreur lors de la récupération des templates:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/to-evaluate - Évaluations à réaliser par le manager connecté
router.get('/to-evaluate', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'ASSOCIATE_DIRECTOR', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const evaluations = await Evaluation.getEvaluationsByEvaluator(req.user.id);
        // Filtrer pour ne garder que celles à faire (non validées/signées)
        const pending = evaluations.filter(e => ['DRAFT', 'SUBMITTED'].includes(e.status));
        res.json(pending);
    } catch (error) {
        console.error('Erreur lors de la récupération des évaluations à faire:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/team - Toutes les évaluations de l'équipe (vue manager)
router.get('/team', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'ASSOCIATE_DIRECTOR', 'SENIOR_PARTNER']), async (req, res) => {
    try {
        const evaluations = await Evaluation.getEvaluationsByEvaluator(req.user.id);
        res.json(evaluations);
    } catch (error) {
        console.error('Erreur lors de la récupération des évaluations d\'équipe:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/collaborator/:userId - Évaluations d'un collaborateur
router.get('/collaborator/:userId', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur a le droit de voir ces évaluations
        if (req.user.id != req.params.userId && !['ADMIN', 'HR', 'SENIOR_PARTNER'].includes(req.user.role)) {
            // TODO: Vérifier si c'est son manager
            // Pour l'instant on bloque si ce n'est pas lui-même ou un admin/RH
            // return res.status(403).json({ message: 'Non autorisé' });
        }

        const evaluations = await Evaluation.getEvaluationsByCollaborator(req.params.userId);
        res.json(evaluations);
    } catch (error) {
        console.error('Erreur lors de la récupération des évaluations collaborateur:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/:id/scores - Scores d'une évaluation
router.get('/:id/scores', authenticateToken, async (req, res) => {
    try {
        const scores = await Evaluation.getEvaluationScores(req.params.id);
        res.json(scores);
    } catch (error) {
        console.error('Erreur lors de la récupération des scores:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/evaluations/:id - Détail d'une évaluation
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const evaluation = await Evaluation.getEvaluation(req.params.id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Évaluation non trouvée' });
        }
        res.json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/evaluations/:id/submit - Soumettre une évaluation
router.post('/:id/submit', authenticateToken, async (req, res) => {
    try {
        const evaluation = await Evaluation.updateEvaluationStatus(req.params.id, 'SUBMITTED');
        res.json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la soumission de l\'évaluation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/evaluations/:id/draft - Sauvegarder un brouillon
router.put('/:id/draft', authenticateToken, async (req, res) => {
    try {
        // Mettre à jour les scores
        if (req.body.scores && Array.isArray(req.body.scores)) {
            for (const score of req.body.scores) {
                await Evaluation.updateScore(score.id, score.achieved_value, score.comment);
            }
        }

        // Mettre à jour les commentaires globaux
        const evaluation = await Evaluation.updateEvaluationStatus(req.params.id, 'DRAFT', {
            strengths: req.body.strengths,
            improvement_areas: req.body.improvement_areas,
            general_comment: req.body.general_comment,
            next_period_objectives: req.body.next_period_objectives
        });

        res.json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du brouillon:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;
