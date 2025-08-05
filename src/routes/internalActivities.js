const express = require('express');
const router = express.Router();
const InternalActivity = require('../models/InternalActivity');
const BusinessUnit = require('../models/BusinessUnit');

// Middleware d'authentification
const auth = require('../middleware/auth');

// GET /api/internal-activities - Récupérer toutes les activités internes
router.get('/', auth, async (req, res) => {
    try {
        const activities = await InternalActivity.findAll();
        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités internes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des activités internes',
            error: error.message
        });
    }
});

// GET /api/internal-activities/:id - Récupérer une activité interne par ID
router.get('/:id', auth, async (req, res) => {
    try {
        const activity = await InternalActivity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activité interne non trouvée'
            });
        }
        
        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'activité interne:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'activité interne',
            error: error.message
        });
    }
});

// POST /api/internal-activities - Créer une nouvelle activité interne
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, estimated_hours, business_unit_ids } = req.body;
        
        // Validation des données
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Le nom de l\'activité interne est requis'
            });
        }
        
        const activityData = {
            name: name.trim(),
            description: description || '',
            estimated_hours: estimated_hours || 0,
            business_unit_ids: business_unit_ids || []
        };
        
        const newActivity = await InternalActivity.create(activityData);
        
        res.status(201).json({
            success: true,
            message: 'Activité interne créée avec succès',
            data: newActivity
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'activité interne:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'activité interne',
            error: error.message
        });
    }
});

// PUT /api/internal-activities/:id - Mettre à jour une activité interne
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, description, estimated_hours, business_unit_ids } = req.body;
        
        // Validation des données
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Le nom de l\'activité interne est requis'
            });
        }
        
        const activityData = {
            name: name.trim(),
            description: description || '',
            estimated_hours: estimated_hours || 0,
            business_unit_ids: business_unit_ids || []
        };
        
        const updatedActivity = await InternalActivity.update(req.params.id, activityData);
        
        if (!updatedActivity) {
            return res.status(404).json({
                success: false,
                message: 'Activité interne non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Activité interne mise à jour avec succès',
            data: updatedActivity
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'activité interne:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'activité interne',
            error: error.message
        });
    }
});

// DELETE /api/internal-activities/:id - Supprimer une activité interne
router.delete('/:id', auth, async (req, res) => {
    try {
        const deletedActivity = await InternalActivity.delete(req.params.id);
        
        if (!deletedActivity) {
            return res.status(404).json({
                success: false,
                message: 'Activité interne non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Activité interne supprimée avec succès',
            data: deletedActivity
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'activité interne:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'activité interne',
            error: error.message
        });
    }
});

// GET /api/internal-activities/business-unit/:businessUnitId - Récupérer les activités internes par business unit
router.get('/business-unit/:businessUnitId', auth, async (req, res) => {
    try {
        const activities = await InternalActivity.findByBusinessUnit(req.params.businessUnitId);
        
        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités internes par business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des activités internes par business unit',
            error: error.message
        });
    }
});

// GET /api/internal-activities/:id/business-units - Récupérer les business units d'une activité interne
router.get('/:id/business-units', auth, async (req, res) => {
    try {
        const businessUnits = await InternalActivity.getBusinessUnitsByActivity(req.params.id);
        
        res.json({
            success: true,
            data: businessUnits
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des business units de l\'activité interne:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des business units de l\'activité interne',
            error: error.message
        });
    }
});

// GET /api/internal-activities/business-units/list - Récupérer la liste des business units pour les affectations
router.get('/business-units/list', auth, async (req, res) => {
    try {
        const businessUnits = await BusinessUnit.findAll();
        
        res.json({
            success: true,
            data: businessUnits
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des business units:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des business units',
            error: error.message
        });
    }
});

module.exports = router; 