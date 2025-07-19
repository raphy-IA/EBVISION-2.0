const express = require('express');
const router = express.Router();
const Collaborateur = require('../models/Collaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/collaborateurs
 * Récupérer tous les collaborateurs avec pagination et filtres
 */
router.get('/', async (req, res) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            grade: req.query.grade,
            statut: req.query.statut,
            division_id: req.query.division_id,
            search: req.query.search
        };

        const result = await Collaborateur.findAll(options);
        
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des collaborateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des collaborateurs',
            details: error.message
        });
    }
});

/**
 * GET /api/collaborateurs/:id
 * Récupérer un collaborateur par ID
 */
router.get('/:id', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: collaborateur
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du collaborateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du collaborateur',
            details: error.message
        });
    }
});

/**
 * POST /api/collaborateurs
 * Créer un nouveau collaborateur
 */
router.post('/', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.create(req.body);
        
        res.status(201).json({
            success: true,
            data: collaborateur,
            message: 'Collaborateur créé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création du collaborateur',
            details: error.message
        });
    }
});

/**
 * PUT /api/collaborateurs/:id
 * Mettre à jour un collaborateur
 */
router.put('/:id', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        const updatedCollaborateur = await collaborateur.update(req.body);
        
        res.json({
            success: true,
            data: updatedCollaborateur,
            message: 'Collaborateur mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour du collaborateur',
            details: error.message
        });
    }
});

/**
 * DELETE /api/collaborateurs/:id
 * Supprimer un collaborateur
 */
router.delete('/:id', async (req, res) => {
    try {
        await Collaborateur.delete(req.params.id);
        
        res.json({
            success: true,
            message: 'Collaborateur supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression du collaborateur',
            details: error.message
        });
    }
});

/**
 * GET /api/collaborateurs/statistics
 * Récupérer les statistiques des collaborateurs
 */
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await Collaborateur.getStatistics();
        
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message
        });
    }
});

module.exports = router; 