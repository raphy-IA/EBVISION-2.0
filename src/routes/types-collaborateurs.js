const express = require('express');
const router = express.Router();
const TypeCollaborateur = require('../models/TypeCollaborateur');

// GET /api/types-collaborateurs - Liste des types de collaborateurs
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, statut } = req.query;
        const result = await TypeCollaborateur.findAll({ 
            page: parseInt(page), 
            limit: parseInt(limit), 
            statut 
        });
        
        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la récupération des types de collaborateurs:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des types de collaborateurs',
            details: error.message 
        });
    }
});

// GET /api/types-collaborateurs/statistics - Statistiques des types de collaborateurs
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await TypeCollaborateur.getStatistics();
        res.json(statistics);
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message 
        });
    }
});

// GET /api/types-collaborateurs/:id - Détails d'un type de collaborateur
router.get('/:id', async (req, res) => {
    try {
        const typeCollaborateur = await TypeCollaborateur.findById(req.params.id);
        if (!typeCollaborateur) {
            return res.status(404).json({ error: 'Type de collaborateur non trouvé' });
        }
        res.json(typeCollaborateur);
    } catch (error) {
        console.error('Erreur lors de la récupération du type de collaborateur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du type de collaborateur',
            details: error.message 
        });
    }
});

// POST /api/types-collaborateurs - Créer un nouveau type de collaborateur
router.post('/', async (req, res) => {
    try {
        const typeCollaborateur = new TypeCollaborateur(req.body);
        const created = await TypeCollaborateur.create(typeCollaborateur);
        res.status(201).json(created);
    } catch (error) {
        console.error('Erreur lors de la création du type de collaborateur:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la création du type de collaborateur',
            details: error.message 
        });
    }
});

// PUT /api/types-collaborateurs/:id - Modifier un type de collaborateur
router.put('/:id', async (req, res) => {
    try {
        const typeCollaborateur = await TypeCollaborateur.findById(req.params.id);
        if (!typeCollaborateur) {
            return res.status(404).json({ error: 'Type de collaborateur non trouvé' });
        }

        // Mettre à jour les propriétés
        Object.assign(typeCollaborateur, req.body);
        const updated = await typeCollaborateur.update();
        res.json(updated);
    } catch (error) {
        console.error('Erreur lors de la modification du type de collaborateur:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la modification du type de collaborateur',
            details: error.message 
        });
    }
});

// DELETE /api/types-collaborateurs/:id - Supprimer un type de collaborateur
router.delete('/:id', async (req, res) => {
    try {
        await TypeCollaborateur.delete(req.params.id);
        res.json({ message: 'Type de collaborateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du type de collaborateur:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la suppression du type de collaborateur',
            details: error.message 
        });
    }
});

module.exports = router; 