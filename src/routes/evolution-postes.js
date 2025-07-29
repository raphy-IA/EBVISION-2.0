const express = require('express');
const router = express.Router();
const EvolutionPoste = require('../models/EvolutionPoste');
const Collaborateur = require('../models/Collaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/evolution-postes
 * Créer une nouvelle évolution de poste
 */
router.post('/', async (req, res) => {
    try {
        const evolution = await EvolutionPoste.create(req.body);
        
        // Mettre à jour les informations actuelles du collaborateur
        await Collaborateur.updateCurrentInfoFromEvolutions(req.body.collaborateur_id);
        
        res.status(201).json({
            success: true,
            data: evolution,
            message: 'Évolution de poste créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'évolution de poste:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de l\'évolution de poste',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-postes/collaborateur/:collaborateurId
 * Récupérer l'historique des évolutions de poste d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId', async (req, res) => {
    try {
        const evolutions = await EvolutionPoste.findByCollaborateur(req.params.collaborateurId);
        
        res.json({
            success: true,
            data: evolutions
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des évolutions de poste:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des évolutions de poste',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-postes/collaborateur/:collaborateurId/current
 * Récupérer l'évolution de poste actuelle d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId/current', async (req, res) => {
    try {
        const dateReference = req.query.date ? new Date(req.query.date) : new Date();
        const evolution = await EvolutionPoste.findCurrentByCollaborateur(req.params.collaborateurId, dateReference);
        
        res.json({
            success: true,
            data: evolution
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution de poste actuelle:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'évolution de poste actuelle',
            details: error.message
        });
    }
});

/**
 * PUT /api/evolution-postes/:id
 * Mettre à jour une évolution de poste
 */
router.put('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionPoste.findById(req.params.id);
        
        if (!evolution) {
            return res.status(404).json({
                success: false,
                error: 'Évolution de poste non trouvée'
            });
        }

        const updatedEvolution = await evolution.update(req.body);
        
        res.json({
            success: true,
            data: updatedEvolution,
            message: 'Évolution de poste mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évolution de poste:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'évolution de poste',
            details: error.message
        });
    }
});

/**
 * DELETE /api/evolution-postes/:id
 * Supprimer une évolution de poste
 */
router.delete('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionPoste.delete(req.params.id);
        
        res.json({
            success: true,
            data: evolution,
            message: 'Évolution de poste supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'évolution de poste:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'évolution de poste',
            details: error.message
        });
    }
});

module.exports = router;