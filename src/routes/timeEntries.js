const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const TimeEntry = require('../models/TimeEntry');

// GET /api/time-entries - Récupérer toutes les entrées de temps de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        const timeEntries = await TimeEntry.findByUser(req.user.id);
        
        res.json({
            success: true,
            data: timeEntries
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des entrées de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des entrées de temps',
            error: error.message
        });
    }
});

// GET /api/time-entries/date/:date - Récupérer les entrées pour une date spécifique
router.get('/date/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const timeEntries = await TimeEntry.findByUserAndDate(req.user.id, date);
        
        res.json({
            success: true,
            data: timeEntries
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des entrées de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des entrées de temps',
            error: error.message
        });
    }
});

// GET /api/time-entries/:id - Récupérer une entrée spécifique
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const timeEntry = await TimeEntry.findById(id);
        
        if (!timeEntry) {
            return res.status(404).json({
                success: false,
                message: 'Entrée de temps non trouvée'
            });
        }
        
        // Vérifier que l'utilisateur peut accéder à cette entrée
        if (timeEntry.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }
        
        res.json({
            success: true,
            data: timeEntry
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'entrée de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'entrée de temps',
            error: error.message
        });
    }
});

// POST /api/time-entries - Créer une nouvelle entrée de temps
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            date_saisie,
            heures,
            mission_id,
            description,
            type_heures
        } = req.body;

        // Validation des données
        if (!date_saisie || !heures || !type_heures) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes'
            });
        }

        // Validation des heures
        if (heures <= 0 || heures > 24) {
            return res.status(400).json({
                success: false,
                message: 'Les heures doivent être entre 0 et 24'
            });
        }

        const timeEntryData = {
            user_id: req.user.id,
            date_saisie,
            heures: parseFloat(heures),
            mission_id: mission_id || null,
            description: description || '',
            type_heures
        };

        const newTimeEntry = await TimeEntry.create(timeEntryData);
        
        res.status(201).json({
            success: true,
            message: 'Entrée de temps créée avec succès',
            data: newTimeEntry
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

// PUT /api/time-entries/:id - Mettre à jour une entrée de temps
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            date,
            hours,
            business_unit_id,
            description,
            type,
            project_id,
            task_id,
            activity_id
        } = req.body;

        // Vérifier que l'entrée existe et appartient à l'utilisateur
        const existingEntry = await TimeEntry.findById(id);
        if (!existingEntry) {
            return res.status(404).json({
                success: false,
                message: 'Entrée de temps non trouvée'
            });
        }

        if (existingEntry.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        // Validation des données
        if (!date || !hours || !business_unit_id || !type) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes'
            });
        }

        // Validation des heures
        if (hours <= 0 || hours > 24) {
            return res.status(400).json({
                success: false,
                message: 'Les heures doivent être entre 0 et 24'
            });
        }

        const updateData = {
            date,
            hours: parseFloat(hours),
            business_unit_id,
            description: description || '',
            type
        };

        // Ajouter les champs spécifiques selon le type
        if (type === 'chargeable') {
            updateData.project_id = project_id || null;
            updateData.task_id = task_id || null;
            updateData.activity_id = null;
        } else if (type === 'non-chargeable') {
            updateData.activity_id = activity_id || null;
            updateData.project_id = null;
            updateData.task_id = null;
        }

        const updatedEntry = await TimeEntry.update(id, updateData);
        
        res.json({
            success: true,
            message: 'Entrée de temps mise à jour avec succès',
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

// DELETE /api/time-entries/:id - Supprimer une entrée de temps
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que l'entrée existe et appartient à l'utilisateur
        const existingEntry = await TimeEntry.findById(id);
        if (!existingEntry) {
            return res.status(404).json({
                success: false,
                message: 'Entrée de temps non trouvée'
            });
        }

        if (existingEntry.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        await TimeEntry.delete(id);
        
        res.json({
            success: true,
            message: 'Entrée de temps supprimée avec succès'
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

// GET /api/time-entries/statistics - Récupérer les statistiques des entrées de temps
router.get('/statistics', authenticateToken, async (req, res) => {
    try {
        const statistics = await TimeEntry.getStatistics(req.user.id);
        
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
});

module.exports = router; 