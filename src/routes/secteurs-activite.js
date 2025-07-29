const express = require('express');
const router = express.Router();
const SecteurActivite = require('../models/SecteurActivite');

// GET /api/secteurs-activite - Récupérer tous les secteurs avec pagination et filtres
router.get('/', async (req, res) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            search: req.query.search || '',
            actif: req.query.actif !== undefined ? req.query.actif === 'true' : null,
            sortBy: req.query.sortBy || 'ordre',
            sortOrder: req.query.sortOrder || 'ASC'
        };

        const result = await SecteurActivite.findAll(options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des secteurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des secteurs',
            error: error.message
        });
    }
});

// GET /api/secteurs-activite/actifs - Récupérer tous les secteurs actifs
router.get('/actifs', async (req, res) => {
    try {
        const secteurs = await SecteurActivite.getActifs();
        res.json({
            success: true,
            data: { secteurs }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des secteurs actifs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des secteurs actifs',
            error: error.message
        });
    }
});

// GET /api/secteurs-activite/:id - Récupérer un secteur par ID
router.get('/:id', async (req, res) => {
    try {
        const secteur = await SecteurActivite.findById(req.params.id);
        
        if (!secteur) {
            return res.status(404).json({
                success: false,
                message: 'Secteur non trouvé'
            });
        }

        res.json({
            success: true,
            data: { secteur }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du secteur',
            error: error.message
        });
    }
});

// GET /api/secteurs-activite/code/:code - Récupérer un secteur par code
router.get('/code/:code', async (req, res) => {
    try {
        const secteur = await SecteurActivite.findByCode(req.params.code);
        
        if (!secteur) {
            return res.status(404).json({
                success: false,
                message: 'Secteur non trouvé'
            });
        }

        res.json({
            success: true,
            data: { secteur }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du secteur',
            error: error.message
        });
    }
});

// POST /api/secteurs-activite - Créer un nouveau secteur
router.post('/', async (req, res) => {
    try {
        const secteurData = new SecteurActivite(req.body);
        const errors = secteurData.validate();

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const secteur = await SecteurActivite.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Secteur créé avec succès',
            data: { secteur }
        });
    } catch (error) {
        console.error('Erreur lors de la création du secteur:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Un secteur avec ce code existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du secteur',
            error: error.message
        });
    }
});

// PUT /api/secteurs-activite/:id - Mettre à jour un secteur
router.put('/:id', async (req, res) => {
    try {
        const secteurData = new SecteurActivite(req.body);
        const errors = secteurData.validate();

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const secteur = await SecteurActivite.update(req.params.id, req.body);
        
        if (!secteur) {
            return res.status(404).json({
                success: false,
                message: 'Secteur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Secteur mis à jour avec succès',
            data: { secteur }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du secteur:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Un secteur avec ce code existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du secteur',
            error: error.message
        });
    }
});

// DELETE /api/secteurs-activite/:id - Supprimer un secteur
router.delete('/:id', async (req, res) => {
    try {
        const secteur = await SecteurActivite.delete(req.params.id);
        
        if (!secteur) {
            return res.status(404).json({
                success: false,
                message: 'Secteur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Secteur supprimé avec succès',
            data: { secteur }
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du secteur',
            error: error.message
        });
    }
});

// Routes pour les sous-secteurs
// POST /api/secteurs-activite/:secteurId/sous-secteurs - Créer un sous-secteur
router.post('/:secteurId/sous-secteurs', async (req, res) => {
    try {
        const sousSecteurData = {
            ...req.body,
            secteur_id: req.params.secteurId
        };

        const sousSecteur = await SecteurActivite.createSousSecteur(sousSecteurData);
        
        res.status(201).json({
            success: true,
            message: 'Sous-secteur créé avec succès',
            data: { sousSecteur }
        });
    } catch (error) {
        console.error('Erreur lors de la création du sous-secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du sous-secteur',
            error: error.message
        });
    }
});

// PUT /api/secteurs-activite/sous-secteurs/:id - Mettre à jour un sous-secteur
router.put('/sous-secteurs/:id', async (req, res) => {
    try {
        const sousSecteur = await SecteurActivite.updateSousSecteur(req.params.id, req.body);
        
        if (!sousSecteur) {
            return res.status(404).json({
                success: false,
                message: 'Sous-secteur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Sous-secteur mis à jour avec succès',
            data: { sousSecteur }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du sous-secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du sous-secteur',
            error: error.message
        });
    }
});

// DELETE /api/secteurs-activite/sous-secteurs/:id - Supprimer un sous-secteur
router.delete('/sous-secteurs/:id', async (req, res) => {
    try {
        const sousSecteur = await SecteurActivite.deleteSousSecteur(req.params.id);
        
        if (!sousSecteur) {
            return res.status(404).json({
                success: false,
                message: 'Sous-secteur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Sous-secteur supprimé avec succès',
            data: { sousSecteur }
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du sous-secteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du sous-secteur',
            error: error.message
        });
    }
});

module.exports = router;