const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const MissionType = require('../models/MissionType');

// GET /api/tasks - Liste des tâches
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.findAll();
        res.json(tasks);
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/tasks/:id - Détails d'une tâche
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }
        res.json(task);
    } catch (error) {
        console.error('Erreur lors de la récupération de la tâche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/tasks/by-mission-type/:typeId - Tâches par type de mission
router.get('/by-mission-type/:typeId', async (req, res) => {
    try {
        const tasks = await Task.findByMissionType(req.params.typeId);
        res.json(tasks);
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches par type:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/tasks/search/:term - Recherche de tâches
router.get('/search/:term', async (req, res) => {
    try {
        const tasks = await Task.searchTasks(req.params.term);
        res.json(tasks);
    } catch (error) {
        console.error('Erreur lors de la recherche de tâches:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/tasks/stats/stats - Statistiques des tâches
router.get('/stats/stats', async (req, res) => {
    try {
        const stats = await Task.getStats();
        const tasksByPriority = await Task.getTasksByPriority();
        
        res.json({
            ...stats,
            by_priority: tasksByPriority
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/tasks - Créer une tâche
router.post('/', async (req, res) => {
    try {
        const { code, libelle, description, duree_estimee, priorite } = req.body;
        
        // Validation
        if (!code || !libelle) {
            return res.status(400).json({ error: 'Code et libellé sont requis' });
        }
        
        // Vérifier si le code existe déjà
        const existingTask = await Task.findByCode(code);
        if (existingTask) {
            return res.status(400).json({ error: 'Ce code de tâche existe déjà' });
        }
        
        const task = await Task.create({
            code,
            libelle,
            description: description || '',
            duree_estimee: duree_estimee || 0,
            priorite: priorite || 'MOYENNE'
        });
        
        res.status(201).json(task);
    } catch (error) {
        console.error('Erreur lors de la création de la tâche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/tasks/:id - Modifier une tâche
router.put('/:id', async (req, res) => {
    try {
        const { code, libelle, description, duree_estimee, priorite, actif } = req.body;
        
        // Validation
        if (!code || !libelle) {
            return res.status(400).json({ error: 'Code et libellé sont requis' });
        }
        
        // Vérifier si le code existe déjà (sauf pour cette tâche)
        const existingTask = await Task.findByCode(code);
        if (existingTask && existingTask.id !== req.params.id) {
            return res.status(400).json({ error: 'Ce code de tâche existe déjà' });
        }
        
        const task = await Task.update(req.params.id, {
            code,
            libelle,
            description: description || '',
            duree_estimee: duree_estimee || 0,
            priorite: priorite || 'MOYENNE',
            actif: actif !== undefined ? actif : true
        });
        
        if (!task) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Erreur lors de la modification de la tâche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/tasks/:id - Supprimer une tâche (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.delete(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }
        res.json({ message: 'Tâche supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la tâche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/tasks/:id/mission-types - Ajouter une tâche à un type de mission
router.post('/:id/mission-types', async (req, res) => {
    try {
        const { mission_type_id, ordre, obligatoire } = req.body;
        
        if (!mission_type_id) {
            return res.status(400).json({ error: 'ID du type de mission requis' });
        }
        
        // Vérifier que le type de mission existe
        const missionType = await MissionType.findById(mission_type_id);
        if (!missionType) {
            return res.status(404).json({ error: 'Type de mission non trouvé' });
        }
        
        const association = await Task.addToMissionType(
            req.params.id, 
            mission_type_id, 
            ordre || 0, 
            obligatoire || false
        );
        
        res.json(association);
    } catch (error) {
        console.error('Erreur lors de l\'association:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/tasks/:id/mission-types/:missionTypeId - Retirer une tâche d'un type de mission
router.delete('/:id/mission-types/:missionTypeId', async (req, res) => {
    try {
        const success = await Task.removeFromMissionType(req.params.id, req.params.missionTypeId);
        
        if (!success) {
            return res.status(404).json({ error: 'Association non trouvée' });
        }
        
        res.json({ message: 'Association supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'association:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/tasks/:id/mission-types - Supprimer toutes les associations d'une tâche
router.delete('/:id/mission-types', async (req, res) => {
    try {
        const success = await Task.removeAllFromMissionType(req.params.id);
        
        res.json({ message: 'Toutes les associations supprimées avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression des associations:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router; 