const express = require('express');
const router = express.Router();
const FeuilleTemps = require('../models/FeuilleTemps');

/**
 * GET /api/feuilles-temps
 * Récupérer toutes les feuilles de temps avec pagination et filtres
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            collaborateur_id,
            semaine,
            annee,
            statut,
            date_debut,
            date_fin,
            search
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            collaborateur_id,
            semaine: semaine ? parseInt(semaine) : undefined,
            annee: annee ? parseInt(annee) : undefined,
            statut,
            date_debut,
            date_fin,
            search
        };

        const result = await FeuilleTemps.findAll(options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des feuilles de temps',
            details: error.message
        });
    }
});

/**
 * GET /api/feuilles-temps/:id
 * Récupérer une feuille de temps par ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const feuilleTemps = await FeuilleTemps.findById(id);

        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        res.json({
            success: true,
            data: feuilleTemps
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la feuille de temps:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps
 * Créer une nouvelle feuille de temps
 */
router.post('/', async (req, res) => {
    try {
        const feuilleTempsData = req.body;
        const feuilleTemps = await FeuilleTemps.create(feuilleTempsData);

        res.status(201).json({
            success: true,
            data: feuilleTemps,
            message: 'Feuille de temps créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * PUT /api/feuilles-temps/:id
 * Mettre à jour une feuille de temps
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const feuilleTemps = await FeuilleTemps.findById(id);
        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        const updatedFeuilleTemps = await feuilleTemps.update(updateData);

        res.json({
            success: true,
            data: updatedFeuilleTemps,
            message: 'Feuille de temps mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * DELETE /api/feuilles-temps/:id
 * Supprimer une feuille de temps
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await FeuilleTemps.delete(id);

        res.json({
            success: true,
            message: 'Feuille de temps supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/submit
 * Soumettre une feuille de temps pour validation
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const feuilleTemps = await FeuilleTemps.findById(id);

        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        const submittedFeuilleTemps = await feuilleTemps.submit();

        res.json({
            success: true,
            data: submittedFeuilleTemps,
            message: 'Feuille de temps soumise avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la soumission de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la soumission de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/validate
 * Valider une feuille de temps
 */
router.post('/:id/validate', async (req, res) => {
    try {
        const { id } = req.params;
        const { validateur_id, commentaire } = req.body;

        if (!validateur_id) {
            return res.status(400).json({
                success: false,
                error: 'ID du validateur requis'
            });
        }

        const feuilleTemps = await FeuilleTemps.findById(id);
        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        const validatedFeuilleTemps = await feuilleTemps.validate(validateur_id, commentaire);

        res.json({
            success: true,
            data: validatedFeuilleTemps,
            message: 'Feuille de temps validée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la validation de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la validation de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/reject
 * Rejeter une feuille de temps
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { validateur_id, commentaire } = req.body;

        if (!validateur_id) {
            return res.status(400).json({
                success: false,
                error: 'ID du validateur requis'
            });
        }

        if (!commentaire) {
            return res.status(400).json({
                success: false,
                error: 'Commentaire requis pour rejeter une feuille de temps'
            });
        }

        const feuilleTemps = await FeuilleTemps.findById(id);
        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        const rejectedFeuilleTemps = await feuilleTemps.reject(validateur_id, commentaire);

        res.json({
            success: true,
            data: rejectedFeuilleTemps,
            message: 'Feuille de temps rejetée'
        });
    } catch (error) {
        console.error('Erreur lors du rejet de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors du rejet de la feuille de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/calculate-totals
 * Recalculer les totaux d'une feuille de temps
 */
router.post('/:id/calculate-totals', async (req, res) => {
    try {
        const { id } = req.params;
        const feuilleTemps = await FeuilleTemps.findById(id);

        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        const totals = await feuilleTemps.calculateTotals();

        res.json({
            success: true,
            data: totals,
            message: 'Totaux recalculés avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du calcul des totaux:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du calcul des totaux',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/add-time-entries
 * Ajouter des time entries à une feuille de temps
 */
router.post('/:id/add-time-entries', async (req, res) => {
    try {
        const { id } = req.params;
        const { time_entry_ids } = req.body;

        if (!time_entry_ids || !Array.isArray(time_entry_ids) || time_entry_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Liste des IDs de time entries requise'
            });
        }

        const feuilleTemps = await FeuilleTemps.findById(id);
        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        await feuilleTemps.addTimeEntries(time_entry_ids);

        res.json({
            success: true,
            message: 'Time entries ajoutées avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout des time entries:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de l\'ajout des time entries',
            details: error.message
        });
    }
});

/**
 * POST /api/feuilles-temps/:id/remove-time-entries
 * Retirer des time entries d'une feuille de temps
 */
router.post('/:id/remove-time-entries', async (req, res) => {
    try {
        const { id } = req.params;
        const { time_entry_ids } = req.body;

        if (!time_entry_ids || !Array.isArray(time_entry_ids) || time_entry_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Liste des IDs de time entries requise'
            });
        }

        const feuilleTemps = await FeuilleTemps.findById(id);
        if (!feuilleTemps) {
            return res.status(404).json({
                success: false,
                error: 'Feuille de temps non trouvée'
            });
        }

        await feuilleTemps.removeTimeEntries(time_entry_ids);

        res.json({
            success: true,
            message: 'Time entries retirées avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du retrait des time entries:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors du retrait des time entries',
            details: error.message
        });
    }
});

/**
 * GET /api/feuilles-temps/statistics
 * Obtenir les statistiques des feuilles de temps
 */
router.get('/statistics', async (req, res) => {
    try {
        const {
            collaborateur_id,
            annee,
            date_debut,
            date_fin
        } = req.query;

        const options = {
            collaborateur_id,
            annee: annee ? parseInt(annee) : undefined,
            date_debut,
            date_fin
        };

        const statistics = await FeuilleTemps.getStatistics(options);

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

/**
 * GET /api/feuilles-temps/collaborateur/:collaborateur_id
 * Obtenir les feuilles de temps d'un collaborateur
 */
router.get('/collaborateur/:collaborateur_id', async (req, res) => {
    try {
        const { collaborateur_id } = req.params;
        const { page, limit, statut, annee } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            statut,
            annee: annee ? parseInt(annee) : undefined
        };

        const result = await FeuilleTemps.getByCollaborateur(collaborateur_id, options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps du collaborateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des feuilles de temps du collaborateur',
            details: error.message
        });
    }
});

/**
 * GET /api/feuilles-temps/period/:semaine/:annee
 * Obtenir les feuilles de temps d'une période
 */
router.get('/period/:semaine/:annee', async (req, res) => {
    try {
        const { semaine, annee } = req.params;
        const { page, limit, statut } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            statut
        };

        const result = await FeuilleTemps.getByPeriod(
            parseInt(semaine), 
            parseInt(annee), 
            options
        );

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps de la période:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des feuilles de temps de la période',
            details: error.message
        });
    }
});

/**
 * GET /api/feuilles-temps/pending-validation
 * Obtenir les feuilles de temps en attente de validation
 */
router.get('/pending-validation', async (req, res) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        };

        const result = await FeuilleTemps.getPendingValidation(options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps en attente:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des feuilles de temps en attente',
            details: error.message
        });
    }
});

module.exports = router; 