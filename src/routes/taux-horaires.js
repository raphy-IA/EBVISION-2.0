const express = require('express');
const router = express.Router();
const TauxHoraire = require('../models/TauxHoraire');

// GET /api/taux-horaires - Liste des taux horaires
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, grade_id, division_id, business_unit_id, statut, date_reference } = req.query;
        const result = await TauxHoraire.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            grade_id,
            division_id,
            business_unit_id,
            statut,
            date_reference: date_reference ? new Date(date_reference) : null
        });

        // Réponse formatée pour le frontend
        res.json({ success: true, data: result.taux_horaires, total: result.pagination.total, page: result.pagination.page, limit: result.pagination.limit });
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des taux horaires',
            details: error.message
        });
    }
});

// GET /api/taux-horaires/statistics - Statistiques des taux horaires
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await TauxHoraire.getStatistics();
        res.json({ success: true, data: statistics });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
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
        res.json({ success: true, data: tauxHoraires });
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires actuels:', error);
        res.status(500).json({
            success: false,
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
            return res.status(404).json({ success: false, error: 'Taux horaire non trouvé pour cette combinaison grade/division' });
        }

        res.json({ success: true, data: tauxHoraire });
    } catch (error) {
        console.error('Erreur lors de la récupération du taux horaire:', error);
        res.status(500).json({
            success: false,
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
        res.json({ success: true, data: tauxHoraires });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            success: false,
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
            return res.status(404).json({ success: false, error: 'Taux horaire non trouvé' });
        }
        res.json({ success: true, data: tauxHoraire });
    } catch (error) {
        console.error('Erreur lors de la récupération du taux horaire:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du taux horaire',
            details: error.message
        });
    }
});

// POST /api/taux-horaires - Créer un nouveau taux horaire
router.post('/', async (req, res) => {
    try {
        // Gérer l'incohérence de nommage du champ de date
        const { date_entree_vigueur, ...otherData } = req.body;
        const dataToCreate = {
            ...otherData,
            date_effet: date_entree_vigueur
        };

        const created = await TauxHoraire.create(dataToCreate);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        console.error('Erreur lors de la création du taux horaire:', error);
        res.status(400).json({
            success: false,
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
            return res.status(404).json({ success: false, error: 'Taux horaire non trouvé' });
        }

        // Gérer l'incohérence de nommage du champ de date
        const { date_entree_vigueur, ...otherData } = req.body;
        const dataToUpdate = {
            ...otherData,
            date_effet: date_entree_vigueur
        };

        // Mettre à jour les propriétés de l'instance
        Object.assign(tauxHoraire, dataToUpdate);

        const updated = await tauxHoraire.update();
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Erreur lors de la modification du taux horaire:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la modification du taux horaire',
            details: error.message
        });
    }
});

// DELETE /api/taux-horaires/:id - Supprimer un taux horaire
router.delete('/:id', async (req, res) => {
    try {
        await TauxHoraire.delete(req.params.id);
        res.json({ success: true, message: 'Taux horaire supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du taux horaire:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression du taux horaire',
            details: error.message
        });
    }
});

module.exports = router;
