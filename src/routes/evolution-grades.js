const express = require('express');
const router = express.Router();
const EvolutionGrade = require('../models/EvolutionGrade');
const Collaborateur = require('../models/Collaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/evolution-grades
 * Créer une nouvelle évolution de grade
 */
router.post('/', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
    try {
        const evolution = await EvolutionGrade.create(req.body);
        
        // Mettre à jour les informations actuelles du collaborateur
        await Collaborateur.updateCurrentInfoFromEvolutions(req.body.collaborateur_id);
        
        res.status(201).json({
            success: true,
            data: evolution,
            message: 'Évolution de grade créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'évolution de grade:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de l\'évolution de grade',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-grades/collaborateur/:collaborateurId
 * Récupérer l'historique des évolutions de grade d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId', async (req, res) => {
    try {
        const evolutions = await EvolutionGrade.findByCollaborateur(req.params.collaborateurId);
        
        res.json({
            success: true,
            data: evolutions
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des évolutions de grade:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des évolutions de grade',
            details: error.message
        });
    }
});

/**
 * GET /api/evolution-grades/collaborateur/:collaborateurId/current
 * Récupérer l'évolution de grade actuelle d'un collaborateur
 */
router.get('/collaborateur/:collaborateurId/current', async (req, res) => {
    try {
        const dateReference = req.query.date ? new Date(req.query.date) : new Date();
        const evolution = await EvolutionGrade.findCurrentByCollaborateur(req.params.collaborateurId, dateReference);
        
        res.json({
            success: true,
            data: evolution
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution de grade actuelle:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'évolution de grade actuelle',
            details: error.message
        });
    }
});

/**
 * PUT /api/evolution-grades/:id
 * Mettre à jour une évolution de grade
 */
router.put('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionGrade.findById(req.params.id);
        
        if (!evolution) {
            return res.status(404).json({
                success: false,
                error: 'Évolution de grade non trouvée'
            });
        }

        const updatedEvolution = await evolution.update(req.body);
        
        res.json({
            success: true,
            data: updatedEvolution,
            message: 'Évolution de grade mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évolution de grade:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'évolution de grade',
            details: error.message
        });
    }
});

/**
 * DELETE /api/evolution-grades/:id
 * Supprimer une évolution de grade
 */
router.delete('/:id', async (req, res) => {
    try {
        const evolution = await EvolutionGrade.delete(req.params.id);
        
        res.json({
            success: true,
            data: evolution,
            message: 'Évolution de grade supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'évolution de grade:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'évolution de grade',
            details: error.message
        });
    }
});

module.exports = router;