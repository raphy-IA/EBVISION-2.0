const express = require('express');
const router = express.Router();
const BusinessUnit = require('../models/BusinessUnit');
const { businessUnitValidation } = require('../utils/validators');
const { authenticateToken } = require('../middleware/auth');

// GET /api/business-units - Récupérer toutes les business units (PUBLIC)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            statut: status
        };

        const result = await BusinessUnit.findAll(options);
        
        res.json({
            success: true,
            message: 'Business units récupérées avec succès',
            data: result.businessUnits,
            pagination: result.pagination
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

// GET /api/business-units/active - Récupérer les business units actives (PUBLIC)
router.get('/active', async (req, res) => {
    try {
        const businessUnits = await BusinessUnit.findActive();
        
        res.json({
            success: true,
            message: 'Business units actives récupérées avec succès',
            data: businessUnits
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des business units actives:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des business units actives',
            error: error.message
        });
    }
});

// GET /api/business-units/:id - Récupérer une business unit par ID (PUBLIC)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessUnit = await BusinessUnit.findById(id);
        
        if (!businessUnit) {
            return res.status(404).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Business unit récupérée avec succès',
            data: businessUnit
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la business unit',
            error: error.message
        });
    }
});

// POST /api/business-units - Créer une nouvelle business unit (PUBLIC)
router.post('/', async (req, res) => {
    try {
        // Validation des données
        const { error, value } = businessUnitValidation.create.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier si le code existe déjà
        const existingBusinessUnit = await BusinessUnit.findByCode(value.code);
        if (existingBusinessUnit) {
            return res.status(400).json({
                success: false,
                message: 'Une business unit avec ce code existe déjà'
            });
        }

        const businessUnit = await BusinessUnit.create(value);
        
        res.status(201).json({
            success: true,
            message: 'Business unit créée avec succès',
            data: businessUnit
        });
    } catch (error) {
        console.error('Erreur lors de la création de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la business unit',
            error: error.message
        });
    }
});

// PUT /api/business-units/:id - Mettre à jour une business unit (PROTECTED)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validation des données
        const { error, value } = businessUnitValidation.update.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier si la business unit existe
        const existingBusinessUnit = await BusinessUnit.findById(id);
        if (!existingBusinessUnit) {
            return res.status(404).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }

        // Si le code est modifié, vérifier qu'il n'existe pas déjà
        if (value.code && value.code !== existingBusinessUnit.code) {
            const businessUnitWithCode = await BusinessUnit.findByCode(value.code);
            if (businessUnitWithCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Une business unit avec ce code existe déjà'
                });
            }
        }

        const updatedBusinessUnit = await BusinessUnit.update(id, value);
        
        res.json({
            success: true,
            message: 'Business unit mise à jour avec succès',
            data: updatedBusinessUnit
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de la business unit',
            error: error.message
        });
    }
});

// DELETE /api/business-units/:id - Supprimer une business unit (PROTECTED)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { force = false } = req.query; // Paramètre pour forcer la suppression
        
        // Vérifier si la business unit existe
        const existingBusinessUnit = await BusinessUnit.findById(id);
        if (!existingBusinessUnit) {
            return res.status(404).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }

        // Vérifier les dépendances
        const dependencies = await BusinessUnit.checkDependencies(id);
        
        if (!dependencies.canDelete && !force) {
            // Construire le message d'erreur détaillé
            const deps = dependencies.dependencies;
            const reasons = [];
            
            if (deps.active_divisions > 0) reasons.push(`${deps.active_divisions} division(s) active(s)`);
            if (deps.active_collaborateurs > 0) reasons.push(`${deps.active_collaborateurs} collaborateur(s) actif(s)`);
            if (deps.opportunities > 0) reasons.push(`${deps.opportunities} opportunité(s)`);
            if (deps.prospecting_campaigns > 0) reasons.push(`${deps.prospecting_campaigns} campagne(s) de prospection`);
            if (deps.time_entries > 0) reasons.push(`${deps.time_entries} saisie(s) de temps`);
            
            return res.status(400).json({
                success: false,
                message: `Impossible de supprimer cette business unit car elle contient des données liées`,
                details: {
                    reasons: reasons,
                    dependencies: deps,
                    suggestion: 'Utilisez la désactivation au lieu de la suppression'
                }
            });
        }

        let result;
        if (dependencies.canDelete) {
            // Suppression définitive
            result = await BusinessUnit.delete(id);
            res.json({
                success: true,
                message: 'Business unit supprimée définitivement avec succès',
                data: result,
                action: 'deleted'
            });
        } else {
            // Désactivation (force = true)
            result = await BusinessUnit.deactivate(id);
            res.json({
                success: true,
                message: 'Business unit désactivée avec succès (des données liées existent)',
                data: result,
                action: 'deactivated'
            });
        }
        
    } catch (error) {
        console.error('Erreur lors de la suppression de la business unit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la business unit',
            error: error.message
        });
    }
});

// GET /api/business-units/:id/divisions - Récupérer les divisions d'une business unit
router.get('/:id/divisions', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status = '' } = req.query;
        
        // Vérifier si la business unit existe
        const existingBusinessUnit = await BusinessUnit.findById(id);
        if (!existingBusinessUnit) {
            return res.status(404).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            statut: status
        };

        const result = await BusinessUnit.getDivisions(id, options);
        
        res.json({
            success: true,
            message: 'Divisions récupérées avec succès',
            data: result
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des divisions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des divisions',
            error: error.message
        });
    }
});

// GET /api/business-units/:id/stats - Récupérer les statistiques d'une business unit
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vérifier si la business unit existe
        const existingBusinessUnit = await BusinessUnit.findById(id);
        if (!existingBusinessUnit) {
            return res.status(404).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }

        const stats = await BusinessUnit.getStats(id);
        
        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: stats
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

// GET /api/business-units/statistics/global - Récupérer les statistiques globales
router.get('/statistics/global', async (req, res) => {
    try {
        const stats = await BusinessUnit.getGlobalStats();
        
        res.json({
            success: true,
            message: 'Statistiques globales récupérées avec succès',
            data: stats
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques globales:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques globales',
            error: error.message
        });
    }
});

module.exports = router; 