const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const TimeEntry = require('../models/TimeEntry');

// GET /api/time-entries - Récupérer les entrées de temps de l'utilisateur pour une période
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { week_start, week_end } = req.query;
        
        if (!week_start || !week_end) {
            return res.status(400).json({
                success: false,
                message: 'Les paramètres week_start et week_end sont requis'
            });
        }

        const timeEntries = await TimeEntry.findByUserAndPeriod(req.user.id, week_start, week_end);
        
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
        // Utiliser la même date pour start et end pour obtenir les entrées d'une journée
        const timeEntries = await TimeEntry.findByUserAndPeriod(req.user.id, date, date);
        
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
            time_sheet_id,
            date_saisie,
            heures,
            mission_id,
            task_id,
            internal_activity_id,
            description,
            type_heures
        } = req.body;

        // Validation des données
        if (!time_sheet_id || !date_saisie || !heures || !type_heures) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes: time_sheet_id, date_saisie, heures et type_heures sont requis'
            });
        }

        // Validation des heures
        if (heures <= 0 || heures > 24) {
            return res.status(400).json({
                success: false,
                message: 'Les heures doivent être entre 0 et 24'
            });
        }

        // Convertir type_heures du frontend vers le backend
        let backendTypeHeures = type_heures;
        if (type_heures === 'chargeable') {
            backendTypeHeures = 'HC';
        } else if (type_heures === 'non-chargeable') {
            backendTypeHeures = 'HNC';
        }

        // Validation des clés étrangères
        let validatedTaskId = task_id;
        let validatedInternalActivityId = internal_activity_id;

        // Validation des tâches si fournies
        if (task_id && task_id !== 'null' && task_id !== '') {
            try {
                const { query } = require('../utils/database');
                const taskResult = await query('SELECT id FROM tasks WHERE id = $1', [task_id]);
                if (taskResult.rows.length === 0) {
                    console.error(`❌ Task ID invalide: ${task_id} - la tâche n'existe pas en base`);
                    return res.status(400).json({ 
                        success: false, 
                        message: `La tâche avec l'ID ${task_id} n'existe pas en base de données` 
                    });
                } else {
                    console.log(`✅ Task trouvée (ID: ${task_id})`);
                    validatedTaskId = task_id;
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification du task_id: ${error.message}`);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la vérification de la tâche' 
                });
            }
        }

        // Validation des activités internes si fournies
        if (internal_activity_id && internal_activity_id !== 'null' && internal_activity_id !== '') {
            try {
                const { query } = require('../utils/database');
                const activityResult = await query('SELECT id FROM internal_activities WHERE id = $1', [internal_activity_id]);
                if (activityResult.rows.length === 0) {
                    console.error(`❌ Internal Activity ID invalide: ${internal_activity_id} - l'activité n'existe pas en base`);
                    return res.status(400).json({ 
                        success: false, 
                        message: `L'activité interne avec l'ID ${internal_activity_id} n'existe pas en base de données` 
                    });
                } else {
                    console.log(`✅ Activité interne trouvée (ID: ${internal_activity_id})`);
                    validatedInternalActivityId = internal_activity_id;
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification du internal_activity_id: ${error.message}`);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la vérification de l\'activité interne' 
                });
            }
        }

        // Validation stricte des contraintes de base de données
        if (backendTypeHeures === 'HC' && !validatedTaskId) {
            console.error('❌ Heures chargeables (HC) sans tâche valide - rejet de l\'entrée');
            return res.status(400).json({ 
                success: false, 
                message: 'Les heures chargeables nécessitent une tâche valide' 
            });
        }

        if (backendTypeHeures === 'HNC' && !validatedInternalActivityId) {
            console.error('❌ Heures non-chargeables (HNC) sans activité interne valide - rejet de l\'entrée');
            return res.status(400).json({ 
                success: false, 
                message: 'Les heures non-chargeables nécessitent une activité interne valide' 
            });
        }

        const timeEntryData = {
            time_sheet_id,
            user_id: req.user.id,
            date_saisie,
            heures: parseFloat(heures),
            mission_id: mission_id || null,
            task_id: validatedTaskId || null,
            description: description || '',
            type_heures: backendTypeHeures,
            internal_activity_id: validatedInternalActivityId || null
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
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Les paramètres start_date et end_date sont requis'
            });
        }

        const statistics = await TimeEntry.getStatisticsByUser(req.user.id, start_date, end_date);
        
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