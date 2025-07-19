const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');

/**
 * GET /api/time-entries
 * Récupérer toutes les saisies de temps avec pagination et filtres
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            user_id,
            mission_id,
            client_id,
            date_debut,
            date_fin,
            type_heures,
            statut_validation,
            semaine,
            annee,
            search
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            user_id,
            mission_id,
            client_id,
            date_debut,
            date_fin,
            type_heures,
            statut_validation,
            semaine: semaine ? parseInt(semaine) : undefined,
            annee: annee ? parseInt(annee) : undefined,
            search
        };

        const result = await TimeEntry.findAll(options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des saisies de temps:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des saisies de temps',
            details: error.message
        });
    }
});

/**
 * GET /api/time-entries/statistics
 * Obtenir les statistiques des saisies de temps
 */
router.get('/statistics', async (req, res) => {
    try {
        const { date_debut, date_fin, user_id, mission_id, type_heures } = req.query;

        const statistics = await TimeEntry.getStatistics({
            date_debut,
            date_fin,
            user_id,
            mission_id,
            type_heures
        });

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
 * GET /api/time-entries/period
 * Obtenir les saisies de temps d'une période
 */
router.get('/period', async (req, res) => {
    try {
        const { date_debut, date_fin, page, limit, type_heures, statut_validation } = req.query;

        if (!date_debut || !date_fin) {
            return res.status(400).json({
                success: false,
                error: 'Dates de début et de fin requises'
            });
        }

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            type_heures,
            statut_validation
        };

        const result = await TimeEntry.getByPeriod(date_debut, date_fin, options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des saisies de temps de la période:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des saisies de temps de la période',
            details: error.message
        });
    }
});

/**
 * GET /api/time-entries/pending-validation
 * Obtenir les saisies de temps en attente de validation
 */
router.get('/pending-validation', async (req, res) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        };

        const result = await TimeEntry.getPendingValidation(options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des saisies de temps en attente:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des saisies de temps en attente',
            details: error.message
        });
    }
});

/**
 * GET /api/time-entries/user/:user_id
 * Obtenir les saisies de temps d'un utilisateur
 */
router.get('/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page, limit, date_debut, date_fin, type_heures, statut_validation } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            date_debut,
            date_fin,
            type_heures,
            statut_validation
        };

        const result = await TimeEntry.getByUser(user_id, options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des saisies de temps de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des saisies de temps de l\'utilisateur',
            details: error.message
        });
    }
});

/**
 * GET /api/time-entries/mission/:mission_id
 * Obtenir les saisies de temps d'une mission
 */
router.get('/mission/:mission_id', async (req, res) => {
    try {
        const { mission_id } = req.params;
        const { page, limit, date_debut, date_fin, type_heures, statut_validation } = req.query;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            date_debut,
            date_fin,
            type_heures,
            statut_validation
        };

        const result = await TimeEntry.getByMission(mission_id, options);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des saisies de temps de la mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des saisies de temps de la mission',
            details: error.message
        });
    }
});

/**
 * GET /api/time-entries/:id
 * Récupérer une saisie de temps par ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const timeEntry = await TimeEntry.findById(id);

        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                error: 'Saisie de temps non trouvée'
            });
        }

        res.json({
            success: true,
            data: timeEntry
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la saisie de temps:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries
 * Créer une nouvelle saisie de temps
 */
router.post('/', async (req, res) => {
    try {
        const timeEntryData = req.body;
        const timeEntry = await TimeEntry.create(timeEntryData);

        res.status(201).json({
            success: true,
            data: timeEntry,
            message: 'Saisie de temps créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries/bulk-create
 * Créer plusieurs saisies de temps en lot
 */
router.post('/bulk-create', async (req, res) => {
    try {
        const { time_entries } = req.body;

        if (!time_entries || !Array.isArray(time_entries) || time_entries.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Liste des saisies de temps requise'
            });
        }

        const createdEntries = [];
        const errors = [];

        for (let i = 0; i < time_entries.length; i++) {
            try {
                const timeEntry = await TimeEntry.create(time_entries[i]);
                createdEntries.push(timeEntry);
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    data: time_entries[i]
                });
            }
        }

        res.status(201).json({
            success: true,
            data: createdEntries,
            errors: errors.length > 0 ? errors : undefined,
            message: `${createdEntries.length} saisies de temps créées avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`
        });
    } catch (error) {
        console.error('Erreur lors de la création en lot des saisies de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création en lot des saisies de temps',
            details: error.message
        });
    }
});

/**
 * PUT /api/time-entries/:id
 * Mettre à jour une saisie de temps
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const timeEntry = await TimeEntry.findById(id);
        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                error: 'Saisie de temps non trouvée'
            });
        }

        const updatedTimeEntry = await timeEntry.update(updateData);

        res.json({
            success: true,
            data: updatedTimeEntry,
            message: 'Saisie de temps mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries/bulk-update
 * Mettre à jour plusieurs saisies de temps en lot
 */
router.post('/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Liste des mises à jour requise'
            });
        }

        const updatedEntries = [];
        const errors = [];

        for (let i = 0; i < updates.length; i++) {
            try {
                const { id, ...updateData } = updates[i];
                const timeEntry = await TimeEntry.findById(id);
                
                if (!timeEntry) {
                    errors.push({
                        index: i,
                        error: 'Saisie de temps non trouvée',
                        id: id
                    });
                    continue;
                }

                const updatedTimeEntry = await timeEntry.update(updateData);
                updatedEntries.push(updatedTimeEntry);
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    data: updates[i]
                });
            }
        }

        res.json({
            success: true,
            data: updatedEntries,
            errors: errors.length > 0 ? errors : undefined,
            message: `${updatedEntries.length} saisies de temps mises à jour avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour en lot des saisies de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour en lot des saisies de temps',
            details: error.message
        });
    }
});

/**
 * DELETE /api/time-entries/:id
 * Supprimer une saisie de temps
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await TimeEntry.delete(id);

        res.json({
            success: true,
            message: 'Saisie de temps supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries/:id/submit
 * Soumettre une saisie de temps pour validation
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const timeEntry = await TimeEntry.findById(id);

        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                error: 'Saisie de temps non trouvée'
            });
        }

        const submittedTimeEntry = await timeEntry.submit();

        res.json({
            success: true,
            data: submittedTimeEntry,
            message: 'Saisie de temps soumise avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la soumission de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la soumission de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries/:id/validate
 * Valider une saisie de temps
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

        const timeEntry = await TimeEntry.findById(id);
        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                error: 'Saisie de temps non trouvée'
            });
        }

        const validatedTimeEntry = await timeEntry.validate(validateur_id, commentaire);

        res.json({
            success: true,
            data: validatedTimeEntry,
            message: 'Saisie de temps validée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la validation de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la validation de la saisie de temps',
            details: error.message
        });
    }
});

/**
 * POST /api/time-entries/:id/reject
 * Rejeter une saisie de temps
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
                error: 'Commentaire requis pour rejeter une saisie de temps'
            });
        }

        const timeEntry = await TimeEntry.findById(id);
        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                error: 'Saisie de temps non trouvée'
            });
        }

        const rejectedTimeEntry = await timeEntry.reject(validateur_id, commentaire);

        res.json({
            success: true,
            data: rejectedTimeEntry,
            message: 'Saisie de temps rejetée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du rejet de la saisie de temps:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors du rejet de la saisie de temps',
            details: error.message
        });
    }
});

module.exports = router; 