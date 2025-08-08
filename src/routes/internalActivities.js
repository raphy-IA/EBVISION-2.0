const express = require('express');
const router = express.Router();
const InternalActivity = require('../models/InternalActivity');
const BusinessUnit = require('../models/BusinessUnit');

// Middleware d'authentification
const { authenticateToken } = require('../middleware/auth');

// GET /api/internal-activities - Récupérer toutes les activités internes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { business_unit_id } = req.query;
        
        let activities;
        if (business_unit_id) {
            // Filtrer par business unit
            activities = await InternalActivity.findByBusinessUnit(business_unit_id);
        } else {
            // Récupérer toutes les activités
            activities = await InternalActivity.findAll();
        }
        
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
router.get('/:id', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        // Validation des données
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Le nom de l\'activité interne est requis'
            });
        }
        
        const activityData = {
            name: name.trim(),
            description: description || ''
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
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        // Validation des données
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Le nom de l\'activité interne est requis'
            });
        }
        
        const activityData = {
            name: name.trim(),
            description: description || ''
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
router.get('/business-unit/:businessUnitId', authenticateToken, async (req, res) => {
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
router.get('/:id/business-units', authenticateToken, async (req, res) => {
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
router.get('/business-units/list', authenticateToken, async (req, res) => {
    try {
        const businessUnits = await BusinessUnit.findActive();
        
        res.json({
            success: true,
            data: {
                businessUnits: businessUnits
            }
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

// POST /api/internal-activities/:id/assign - Affecter une activité interne à des business units
router.post('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { business_unit_ids } = req.body;
        
        if (!business_unit_ids || !Array.isArray(business_unit_ids)) {
            return res.status(400).json({
                success: false,
                message: 'La liste des business units est requise'
            });
        }
        
        await InternalActivity.assignToBusinessUnits(req.params.id, business_unit_ids);
        
        res.json({
            success: true,
            message: 'Activité interne affectée aux business units avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'affectation aux business units:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'affectation aux business units',
            error: error.message
        });
    }
});

// DELETE /api/internal-activities/clear-business-unit/:businessUnitId - Supprimer toutes les affectations d'une business unit
router.delete('/clear-business-unit/:businessUnitId', authenticateToken, async (req, res) => {
    try {
        await InternalActivity.clearBusinessUnitAssignments(req.params.businessUnitId);
        
        res.json({
            success: true,
            message: 'Toutes les affectations de la business unit ont été supprimées avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des affectations de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression des affectations de la business unit',
            error: error.message
        });
    }
});

module.exports = router; 