const express = require('express');
const router = express.Router();
const Pays = require('../models/Pays');

// GET /api/pays - Récupérer tous les pays avec pagination et filtres
router.get('/', async (req, res) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            search: req.query.search || '',
            actif: req.query.actif !== undefined ? req.query.actif === 'true' : null,
            sortBy: req.query.sortBy || 'nom',
            sortOrder: req.query.sortOrder || 'ASC'
        };

        const result = await Pays.findAll(options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des pays:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des pays',
            error: error.message
        });
    }
});

// GET /api/pays/actifs - Récupérer tous les pays actifs
router.get('/actifs', async (req, res) => {
    try {
        const pays = await Pays.getActifs();
        res.json({
            success: true,
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des pays actifs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des pays actifs',
            error: error.message
        });
    }
});

// GET /api/pays/:id - Récupérer un pays par ID
router.get('/:id', async (req, res) => {
    try {
        const pays = await Pays.findById(req.params.id);
        
        if (!pays) {
            return res.status(404).json({
                success: false,
                message: 'Pays non trouvé'
            });
        }

        res.json({
            success: true,
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du pays:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du pays',
            error: error.message
        });
    }
});

// GET /api/pays/code/:code - Récupérer un pays par code
router.get('/code/:code', async (req, res) => {
    try {
        const pays = await Pays.findByCode(req.params.code);
        
        if (!pays) {
            return res.status(404).json({
                success: false,
                message: 'Pays non trouvé'
            });
        }

        res.json({
            success: true,
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du pays:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du pays',
            error: error.message
        });
    }
});

// POST /api/pays - Créer un nouveau pays
router.post('/', async (req, res) => {
    try {
        const paysData = new Pays(req.body);
        const errors = paysData.validate();

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const pays = await Pays.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Pays créé avec succès',
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la création du pays:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Un pays avec ce code existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du pays',
            error: error.message
        });
    }
});

// PUT /api/pays/:id - Mettre à jour un pays
router.put('/:id', async (req, res) => {
    try {
        const paysData = new Pays(req.body);
        const errors = paysData.validate();

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const pays = await Pays.update(req.params.id, req.body);
        
        if (!pays) {
            return res.status(404).json({
                success: false,
                message: 'Pays non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Pays mis à jour avec succès',
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du pays:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Un pays avec ce code existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du pays',
            error: error.message
        });
    }
});

// DELETE /api/pays/:id - Supprimer un pays
router.delete('/:id', async (req, res) => {
    try {
        const pays = await Pays.delete(req.params.id);
        
        if (!pays) {
            return res.status(404).json({
                success: false,
                message: 'Pays non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Pays supprimé avec succès',
            data: { pays }
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du pays:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du pays',
            error: error.message
        });
    }
});

module.exports = router;