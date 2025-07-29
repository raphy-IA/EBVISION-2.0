const express = require('express');
const router = express.Router();
const EvolutionOrganisation = require('../models/EvolutionOrganisation');
const Collaborateur = require('../models/Collaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/evolution-organisations
 * Créer une nouvelle évolution organisationnelle
 */
router.post('/', async (req, res) => {
    try {
        const evolution = await EvolutionOrganisation.create(req.body);
        
        // Mettre à jour les informations actuelles du collaborateur
        await Collaborateur.updateCurrentInfoFromEvolutions(req.body.collaborateur_id);
        
        res.status(201).json({
            success: true,
            data: evolution,
            message: 'Évolution organisationnelle créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'évolution organisationnelle:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de l\'évolution organisationnelle',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-organisations/collaborateur/:collaborateurId
 * Récupérer l'historique des évolutions organisationnelles d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId', async (req, res) => {
    try {
        const evolutions = await EvolutionOrganisation.findByCollaborateur(req.params.collaborateurId);
        
        res.json({
            success: true,
            data: evolutions
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des évolutions organisationnelles:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des évolutions organisationnelles',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-organisations/collaborateur/:collaborateurId/current
 * Récupérer l'évolution organisationnelle actuelle d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId/current', async (req, res) => {
    try {
        const dateReference = req.query.date ? new Date(req.query.date) : new Date();
        const evolution = await EvolutionOrganisation.findCurrentByCollaborateur(req.params.collaborateurId, dateReference);
        
        res.json({
            success: true,
            data: evolution
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution organisationnelle actuelle:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'évolution organisationnelle actuelle',
            details: error.message
        });
    }
});

/**
 * PUT /api/evolution-organisations/:id
 * Mettre à jour une évolution organisationnelle
 */
router.put('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionOrganisation.findById(req.params.id);
        
        if (!evolution) {
            return res.status(404).json({
                success: false,
                error: 'Évolution organisationnelle non trouvée'
            });
        }

        const updatedEvolution = await evolution.update(req.body);
        
        res.json({
            success: true,
            data: updatedEvolution,
            message: 'Évolution organisationnelle mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évolution organisationnelle:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'évolution organisationnelle',
            details: error.message
        });
    }
});

/**
 * DELETE /api/evolution-organisations/:id
 * Supprimer une évolution organisationnelle
 */
router.delete('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionOrganisation.delete(req.params.id);
        
        res.json({
            success: true,
            data: evolution,
            message: 'Évolution organisationnelle supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'évolution organisationnelle:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'évolution organisationnelle',
            details: error.message
        });
    }
});

module.exports = router;