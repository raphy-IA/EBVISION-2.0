const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/activities
 * @desc    Récupérer toutes les activités avec filtres
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        const {
            business_unit_id,
            type_activite,
            actif,
            page = 1,
            limit = 50,
            search
        } = req.query;

        const options = {
            business_unit_id,
            type_activite,
            actif: actif === 'true',
            page: parseInt(page),
            limit: parseInt(limit),
            search
        };

        const result = await Activity.findAll(options);

        res.json({
            success: true,
            data: result.activities,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des activités',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/activities/:id
 * @desc    Récupérer une activité par ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await Activity.findById(id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activité non trouvée'
            });
        }

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'activité:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'activité',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/activities
 * @desc    Créer une nouvelle activité
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    try {
        const activityData = {
            nom: req.body.nom,
            description: req.body.description,
            business_unit_id: req.body.business_unit_id,
            type_activite: req.body.type_activite || 'ADMINISTRATIF',
            obligatoire: req.body.obligatoire || false,
            actif: req.body.actif !== false
        };

        const activity = await Activity.create(activityData);

        res.status(201).json({
            success: true,
            message: 'Activité créée avec succès',
            data: activity
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'activité:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la création de l\'activité',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/activities/:id
 * @desc    Mettre à jour une activité
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await Activity.findById(id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activité non trouvée'
            });
        }

        const updateData = {
            nom: req.body.nom,
            description: req.body.description,
            business_unit_id: req.body.business_unit_id,
            type_activite: req.body.type_activite,
            obligatoire: req.body.obligatoire,
            actif: req.body.actif
        };

        // Supprimer les champs undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updatedActivity = await activity.update(updateData);

        res.json({
            success: true,
            message: 'Activité mise à jour avec succès',
            data: updatedActivity
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'activité:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'activité',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/activities/:id
 * @desc    Supprimer une activité
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Activity.delete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Activité non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Activité supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'activité:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'activité',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/activities/business-unit/:businessUnitId
 * @desc    Récupérer les activités d'une business unit
 * @access  Private
 */
router.get('/business-unit/:businessUnitId', auth, async (req, res) => {
    try {
        const { businessUnitId } = req.params;
        const { actif } = req.query;

        const activities = await Activity.findByBusinessUnit(businessUnitId, {
            actif: actif === 'true'
        });

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des activités',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/activities/type/:typeActivite
 * @desc    Récupérer les activités par type
 * @access  Private
 */
router.get('/type/:typeActivite', auth, async (req, res) => {
    try {
        const { typeActivite } = req.params;
        const { actif } = req.query;

        const activities = await Activity.findByType(typeActivite, {
            actif: actif === 'true'
        });

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités par type:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des activités',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/activities/statistics
 * @desc    Obtenir les statistiques des activités
 * @access  Private
 */
router.get('/statistics', auth, async (req, res) => {
    try {
        const statistics = await Activity.getStatistics();

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
});

module.exports = router; 