const express = require('express');
const router = express.Router();
const TauxHoraire = require('../models/TauxHoraire');

// GET /api/taux-horaires - Liste des taux horaires
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, grade_id, division_id, statut, date_reference } = req.query;
        const result = await TauxHoraire.findAll({ 
            page: parseInt(page), 
            limit: parseInt(limit), 
            grade_id,
            division_id,
            statut,
            date_reference: date_reference ? new Date(date_reference) : null
        });
        
        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des taux horaires',
            details: error.message 
        });
    }
});

// GET /api/taux-horaires/statistics - Statistiques des taux horaires
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await TauxHoraire.getStatistics();
        res.json(statistics);
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message 
        });
    }
});

// GET /api/taux-horaires/current - Taux horaires actuels
router.get('/current', async (req, res) => {
    try {
        const { date_reference } = req.query;
        const tauxHoraires = await TauxHoraire.getCurrentRates(
            date_reference ? new Date(date_reference) : new Date()
        );
        res.json(tauxHoraires);
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires actuels:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des taux horaires actuels',
            details: error.message 
        });
    }
});

// GET /api/taux-horaires/grade/:gradeId/division/:divisionId - Taux horaire actuel par grade et division
router.get('/grade/:gradeId/division/:divisionId', async (req, res) => {
    try {
        const { date_reference } = req.query;
        const tauxHoraire = await TauxHoraire.findCurrentByGradeAndDivision(
            req.params.gradeId,
            req.params.divisionId,
            date_reference ? new Date(date_reference) : new Date()
        );
        
        if (!tauxHoraire) {
            return res.status(404).json({ error: 'Taux horaire non trouvé pour cette combinaison grade/division' });
        }
        
        res.json(tauxHoraire);
    } catch (error) {
        console.error('Erreur lors de la récupération du taux horaire:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du taux horaire',
            details: error.message 
        });
    }
});

// GET /api/taux-horaires/grade/:gradeId/division/:divisionId/history - Historique des taux horaires
router.get('/grade/:gradeId/division/:divisionId/history', async (req, res) => {
    try {
        const tauxHoraires = await TauxHoraire.findHistoryByGradeAndDivision(
            req.params.gradeId,
            req.params.divisionId
        );
        res.json(tauxHoraires);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération de l\'historique',
            details: error.message 
        });
    }
});

// GET /api/taux-horaires/:id - Détails d'un taux horaire
router.get('/:id', async (req, res) => {
    try {
        const tauxHoraire = await TauxHoraire.findById(req.params.id);
        if (!tauxHoraire) {
            return res.status(404).json({ error: 'Taux horaire non trouvé' });
        }
        res.json(tauxHoraire);
    } catch (error) {
        console.error('Erreur lors de la récupération du taux horaire:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du taux horaire',
            details: error.message 
        });
    }
});

// POST /api/taux-horaires - Créer un nouveau taux horaire
router.post('/', async (req, res) => {
    try {
        const tauxHoraire = new TauxHoraire(req.body);
        const created = await TauxHoraire.create(tauxHoraire);
        res.status(201).json(created);
    } catch (error) {
        console.error('Erreur lors de la création du taux horaire:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la création du taux horaire',
            details: error.message 
        });
    }
});

// PUT /api/taux-horaires/:id - Modifier un taux horaire
router.put('/:id', async (req, res) => {
    try {
        const tauxHoraire = await TauxHoraire.findById(req.params.id);
        if (!tauxHoraire) {
            return res.status(404).json({ error: 'Taux horaire non trouvé' });
        }

        // Mettre à jour les propriétés
        Object.assign(tauxHoraire, req.body);
        const updated = await tauxHoraire.update();
        res.json(updated);
    } catch (error) {
        console.error('Erreur lors de la modification du taux horaire:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la modification du taux horaire',
            details: error.message 
        });
    }
});

// DELETE /api/taux-horaires/:id - Supprimer un taux horaire
router.delete('/:id', async (req, res) => {
    try {
        await TauxHoraire.delete(req.params.id);
        res.json({ message: 'Taux horaire supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du taux horaire:', error);
        res.status(400).json({ 
            error: 'Erreur lors de la suppression du taux horaire',
            details: error.message 
        });
    }
});

module.exports = router; 