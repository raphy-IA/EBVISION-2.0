const express = require('express');
const router = express.Router();
const Poste = require('../models/Poste');

// GET /api/postes - Liste des postes
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, statut, type_collaborateur_id } = req.query;
        const result = await Poste.findAll({ 
            page: parseInt(page), 
            limit: parseInt(limit), 
            statut,
            type_collaborateur_id
        });
        
        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la récupération des postes:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des postes',
            details: error.message 
        });
    }
});

// GET /api/postes/statistics - Statistiques des postes
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await Poste.getStatistics();
        res.json(statistics);
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message 
        });
    }
});

// GET /api/postes/type/:typeCollaborateurId - Postes par type de collaborateur
router.get('/type/:typeCollaborateurId', async (req, res) => {
    try {
        const postes = await Poste.findByTypeCollaborateur(req.params.typeCollaborateurId);
        res.json(postes);
    } catch (error) {
        console.error('Erreur lors de la récupération des postes par type:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des postes par type',
            details: error.message 
        });
    }
});

// GET /api/postes/:id - Détails d'un poste
router.get('/:id', async (req, res) => {
    try {
        const poste = await Poste.findById(req.params.id);
        if (!poste) {
            return res.status(404).json({ error: 'Poste non trouvé' });
        }
        res.json(poste);
    } catch (error) {
        console.error('Erreur lors de la récupération du poste:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du poste',
            details: error.message 
        });
    }
});

// POST /api/postes - Créer un nouveau poste
router.post('/', async (req, res) => {
    try {
        const poste = new Poste(req.body);
        const created = await Poste.create(poste);
        res.status(201).json(created);
    } catch (error) {
        console.error('Erreur lors de la création du poste:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la création du poste',
            details: error.message 
        });
    }
});

// PUT /api/postes/:id - Modifier un poste
router.put('/:id', async (req, res) => {
    try {
        const poste = await Poste.findById(req.params.id);
        if (!poste) {
            return res.status(404).json({ error: 'Poste non trouvé' });
        }

        // Mettre à jour les propriétés
        Object.assign(poste, req.body);
        const updated = await poste.update();
        res.json(updated);
    } catch (error) {
        console.error('Erreur lors de la modification du poste:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la modification du poste',
            details: error.message 
        });
    }
});

// DELETE /api/postes/:id - Supprimer un poste
router.delete('/:id', async (req, res) => {
    try {
        await Poste.delete(req.params.id);
        res.json({ message: 'Poste supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du poste:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la suppression du poste',
            details: error.message 
        });
    }
});

module.exports = router; 