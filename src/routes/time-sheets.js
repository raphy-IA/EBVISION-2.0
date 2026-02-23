const express = require('express');
const router = express.Router();
const TimeSheet = require('../models/TimeSheet');
const TimeEntry = require('../models/TimeEntry');
const { authenticateToken } = require('../middleware/auth');

// Créer une nouvelle feuille de temps (POST /api/time-sheets)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, week_start, week_end, status = 'sauvegardé' } = req.body;

        if (!user_id || !week_start || !week_end) {
            return res.status(400).json({
                success: false,
                message: 'Les paramètres user_id, week_start et week_end sont requis'
            });
        }

        // Vérifier que l'utilisateur crée sa propre feuille de temps (ou est admin)
        if (user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez créer que votre propre feuille de temps'
            });
        }

        // Vérifier si une feuille de temps existe déjà pour cette semaine et cet utilisateur
        const existingTimeSheet = await TimeSheet.findByWeekStart(user_id, week_start);

        if (existingTimeSheet) {
            return res.status(409).json({
                success: false,
                message: 'Une feuille de temps existe déjà pour cette semaine et cet utilisateur',
                data: existingTimeSheet
            });
        }

        // Créer la nouvelle feuille de temps
        const timeSheetData = {
            user_id,
            week_start,
            week_end,
            status
        };

        const newTimeSheet = await TimeSheet.create(timeSheetData);

        res.status(201).json({
            success: true,
            message: 'Feuille de temps créée avec succès',
            data: newTimeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la feuille de temps',
            error: error.message
        });
    }
});

// Obtenir la feuille de temps actuelle pour un utilisateur (GET /api/time-sheets/current)
router.get('/current', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { week_start } = req.query;

        if (!week_start) {
            return res.status(400).json({ error: 'Le paramètre week_start est requis' });
        }

        console.log('User ID:', userId);
        console.log('Week start handle:', week_start);

        // Validation et parsing sécurisé de la date
        let weekStartDate;
        try {
            // S'assurer que les dates sont traitées sans timezone
            const cleanWeekStart = week_start.split('T')[0];
            weekStartDate = new Date(cleanWeekStart + 'T00:00:00');

            if (isNaN(weekStartDate.getTime())) {
                throw new Error('Invalid date');
            }
        } catch (e) {
            console.error('📅 Date invalide reçue for week_start:', week_start);
            return res.status(400).json({
                success: false,
                message: 'Le paramètre week_start est invalide. Format attendu: YYYY-MM-DD'
            });
        }

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6); // +6 pour aller du lundi au dimanche

        const weekEnd = weekEndDate.toISOString().split('T')[0];

        console.log('📅 Calcul des dates de semaine:', {
            userId,
            start: week_start,
            end: weekEnd
        });

        // Chercher la feuille de temps (SANS créer automatiquement)
        let timeSheet = await TimeSheet.findByWeekStart(userId, week_start);

        // Si pas de feuille trouvée, retourner null (le frontend affichera "Brouillon")
        if (!timeSheet) {
            return res.json({
                timeSheet: null,
                timeEntries: [],
                statistics: {
                    total_hours: 0,
                    billable_hours: 0,
                    non_billable_hours: 0
                }
            });
        }

        // Récupérer les entrées d'heures de cette feuille de temps
        const timeEntries = await TimeEntry.findByTimeSheet(timeSheet.id);

        // Calculer les statistiques
        const statistics = await TimeSheet.getStatistics(timeSheet.id);

        res.json({
            timeSheet,
            timeEntries,
            statistics
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la feuille de temps actuelle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtenir toutes les feuilles de temps d'un utilisateur
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const timeSheets = await TimeSheet.findByUser(userId, parseInt(limit));

        res.json(timeSheets);
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtenir les feuilles de temps en attente de validation (doit être avant /:id)
router.get('/pending/validation', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur a les permissions de validation
        const permissions = req.user.permissions || [];
        if (!permissions.includes('timesheets:validate') && req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Permissions insuffisantes' });
        }

        const { limit = 50 } = req.query;
        const pendingTimeSheets = await TimeSheet.findPendingValidation(parseInt(limit));

        res.json(pendingTimeSheets);
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles en attente:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtenir une feuille de temps spécifique avec ses entrées
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer la feuille de temps
        const timeSheet = await TimeSheet.findById(id);
        if (!timeSheet) {
            return res.status(404).json({ error: 'Feuille de temps non trouvée' });
        }

        // Récupérer les entrées d'heures
        const timeEntries = await TimeEntry.findByTimeSheet(id);

        // Calculer les statistiques
        const statistics = await TimeSheet.getStatistics(id);

        res.json({
            timeSheet,
            timeEntries,
            statistics
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Soumettre une feuille de temps
router.post('/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Vérifier que la feuille de temps appartient à l'utilisateur
        const timeSheet = await TimeSheet.findById(id);
        if (!timeSheet) {
            return res.status(404).json({ error: 'Feuille de temps non trouvée' });
        }

        if (timeSheet.user_id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Soumettre la feuille de temps
        const updatedTimeSheet = await TimeSheet.submit(id);

        res.json({
            message: 'Feuille de temps soumise avec succès',
            timeSheet: updatedTimeSheet
        });

    } catch (error) {
        console.error('Erreur lors de la soumission de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Valider une feuille de temps (pour les superviseurs)
router.post('/:id/validate', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const validateurId = req.user.id;

        // Vérifier que l'utilisateur a les permissions de validation
        const permissions = req.user.permissions || [];
        if (!permissions.includes('timesheets:validate') && req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Permissions insuffisantes' });
        }

        // Valider la feuille de temps
        const updatedTimeSheet = await TimeSheet.validate(id, validateurId);

        res.json({
            message: 'Feuille de temps validée avec succès',
            timeSheet: updatedTimeSheet
        });

    } catch (error) {
        console.error('Erreur lors de la validation de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rejeter une feuille de temps (pour les superviseurs)
router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes_rejet } = req.body;
        const validateurId = req.user.id;

        // Vérifier que l'utilisateur a les permissions de validation
        const permissions = req.user.permissions || [];
        if (!permissions.includes('timesheets:validate') && req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Permissions insuffisantes' });
        }

        if (!notes_rejet) {
            return res.status(400).json({ error: 'Les notes de rejet sont requises' });
        }

        // Rejeter la feuille de temps
        const updatedTimeSheet = await TimeSheet.reject(id, validateurId, notes_rejet);

        res.json({
            message: 'Feuille de temps rejetée',
            timeSheet: updatedTimeSheet
        });

    } catch (error) {
        console.error('Erreur lors du rejet de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mettre à jour une feuille de temps
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user.id;

        // Vérifier que la feuille de temps appartient à l'utilisateur
        const timeSheet = await TimeSheet.findById(id);
        if (!timeSheet) {
            return res.status(404).json({ error: 'Feuille de temps non trouvée' });
        }

        // Comparaison avec conversion de type pour éviter les problèmes de string vs UUID
        if (timeSheet.user_id.toString() !== userId.toString()) {
            console.warn(`⚠️ Tentative de modification d'une feuille de temps d'un autre utilisateur: ${timeSheet.user_id} !== ${userId}`);
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Vérifier que la feuille de temps n'est pas en statut final ou soumise
        if (['validé', 'soumis', 'validé'].includes(timeSheet.statut)) {
            return res.status(400).json({ error: 'Impossible de modifier une feuille de temps validée ou soumise' });
        }

        // Mettre à jour la feuille de temps
        const updatedTimeSheet = await TimeSheet.update(id, updateData);

        res.json({
            message: 'Feuille de temps mise à jour avec succès',
            timeSheet: updatedTimeSheet
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Supprimer une feuille de temps
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Vérifier que la feuille de temps appartient à l'utilisateur
        const timeSheet = await TimeSheet.findById(id);
        if (!timeSheet) {
            return res.status(404).json({ error: 'Feuille de temps non trouvée' });
        }

        if (timeSheet.user_id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Vérifier que la feuille de temps n'est pas en statut final
        if (['soumis', 'validé', 'rejeté'].includes(timeSheet.statut)) {
            return res.status(400).json({ error: 'Impossible de supprimer une feuille de temps soumise, validée ou rejetée' });
        }

        // Supprimer la feuille de temps (et ses entrées via CASCADE)
        await TimeSheet.delete(id);

        res.json({
            message: 'Feuille de temps supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la feuille de temps:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;