const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const TimeSheet = require('../models/TimeSheet');
const { authenticateToken } = require('../middleware/auth');

// ROUTES DE COMPATIBILITÉ POUR L'ANCIEN FRONTEND
// GET /api/time-entries - Récupérer les entrées d'un utilisateur (compatibilité)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, date, week_start, week_end } = req.query;
        const userId = user_id || req.user.id;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID utilisateur requis' 
            });
        }

        let entries = [];
        
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
            type_heures = 'HC'
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
            type_heures: type_heures === 'chargeable' ? 'HC' : 'HNC',
            mission_id: type_heures === 'chargeable' ? mission_id : null,
            task_id: type_heures === 'chargeable' ? task_id : null,
            internal_activity_id: type_heures === 'non-chargeable' ? internal_activity_id : null
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

module.exports = router; 