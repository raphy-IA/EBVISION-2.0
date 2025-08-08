const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const TimeSheet = require('../models/TimeSheet');
const { authenticateToken } = require('../middleware/auth');

// ROUTES DE COMPATIBILITÉ POUR L'ANCIEN FRONTEND
// GET /api/time-entries - Récupérer les entrées d'un utilisateur (compatibilité)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, date, week_start, week_end, time_sheet_id } = req.query;
        const userId = user_id || req.user.id;

        let entries = [];
        
        if (time_sheet_id) {
            // Récupérer les entrées pour une feuille de temps spécifique
            console.log(`🔍 Récupération des entrées pour la feuille de temps: ${time_sheet_id}`);
            entries = await TimeEntry.findByTimeSheet(time_sheet_id);
            console.log(`✅ ${entries.length} entrées trouvées pour la feuille ${time_sheet_id}`);
        } else if (userId) {
            if (week_start && week_end) {
                // Récupérer les entrées pour une période spécifique
                entries = await TimeEntry.findByUserAndPeriod(userId, week_start, week_end);
            } else if (date) {
                // Récupérer les entrées pour une date spécifique
                const weekStart = new Date(date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                entries = await TimeEntry.findByUserAndPeriod(userId, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]);
            } else {
                // Retourner un tableau vide pour la compatibilité
                entries = [];
            }
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'ID utilisateur ou ID feuille de temps requis' 
            });
        }

        res.json({
            success: true,
            data: entries
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des entrées',
            error: error.message 
        });
    }
});

// POST /api/time-entries - Créer une entrée (compatibilité)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            user_id,
            date_saisie,
            heures,
            mission_id,
            task_id,
            internal_activity_id,
            type_heures = 'HC',
            description
        } = req.body;

        // Validation des données
        if (!date_saisie || type_heures === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Données manquantes' 
            });
        }

        // Pour l'instant, accepter les UUIDs tronqués (compatibilité)
        // TODO: Corriger le frontend pour envoyer des UUIDs complets
        
        // Créer ou récupérer la feuille de temps pour cette semaine
        const weekStart = new Date(date_saisie);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi de la semaine
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Dimanche de la semaine

        let timeSheet = await TimeSheet.findOrCreate(
            userId, 
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
        );

        // Créer l'entrée d'heures
        const timeEntryData = {
            time_sheet_id: timeSheet.id,
            user_id: userId,
            date_saisie,
            heures: parseFloat(heures) || 0,
            type_heures: type_heures, // Utiliser directement la valeur envoyée par le frontend
            mission_id: type_heures === 'HC' ? mission_id : null,
            task_id: type_heures === 'HC' ? task_id : null,
            internal_activity_id: type_heures === 'HNC' ? internal_activity_id : null,
            description: description || 'Saisie automatique'
        };

        const entry = await TimeEntry.findOrCreate(timeEntryData);

        res.json({
            success: true,
            message: entry ? 'Entrée créée avec succès' : 'Entrée supprimée (heures = 0)',
            data: entry
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'entrée de temps:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création de l\'entrée de temps',
            error: error.message 
        });
    }
});

// PUT /api/time-entries/:id - Mettre à jour une entrée existante
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { heures } = req.body;

        if (heures === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Heures requises' 
            });
        }

        const updatedEntry = await TimeEntry.update(id, { heures: parseFloat(heures) || 0 });

        if (!updatedEntry) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entrée non trouvée' 
            });
        }

        res.json({
            success: true,
            message: 'Entrée mise à jour avec succès',
            data: updatedEntry
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'entrée de temps:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour de l\'entrée de temps',
            error: error.message 
        });
    }
});

// DELETE /api/time-entries/delete-week - Supprimer toutes les entrées d'une semaine
router.delete('/delete-week', authenticateToken, async (req, res) => {
    try {
        const { user_id, week_start, week_end } = req.query;
        const userId = user_id || req.user.id;

        if (!userId || !week_start || !week_end) {
            return res.status(400).json({ 
                success: false, 
                message: 'Paramètres manquants: user_id, week_start, week_end' 
            });
        }

        // Vérifier que l'utilisateur demande la suppression de ses propres entrées
        if (user_id && user_id !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Accès non autorisé' 
            });
        }

        // Supprimer toutes les entrées de la semaine pour cet utilisateur
        const deletedCount = await TimeEntry.deleteByUserAndPeriod(userId, week_start, week_end);

        res.json({
            success: true,
            message: `${deletedCount} entrée(s) supprimée(s) avec succès`,
            deletedCount
        });

    } catch (error) {
        console.error('Erreur lors de la suppression des entrées de la semaine:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression des entrées de la semaine',
            error: error.message 
        });
    }
});

// DELETE /api/time-entries/:id - Supprimer une entrée individuelle
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Vérifier que l'entrée appartient à l'utilisateur connecté
        const entry = await TimeEntry.findById(id);
        if (!entry) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entrée non trouvée' 
            });
        }

        if (entry.user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Accès non autorisé' 
            });
        }

        const deleted = await TimeEntry.delete(id);

        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entrée non trouvée' 
            });
        }

        res.json({
            success: true,
            message: 'Entrée supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'entrée de temps:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression de l\'entrée de temps',
            error: error.message 
        });
    }
});

module.exports = router; 