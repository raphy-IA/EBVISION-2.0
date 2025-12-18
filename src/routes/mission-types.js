const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MissionType = require('../models/MissionType');
const Division = require('../models/Division');

// GET /api/mission-types - Récupérer tous les types de mission
router.get('/', authenticateToken, async (req, res) => {
    try {
        const missionTypes = await MissionType.findAll();
        res.json({
            success: true,
            message: 'Types de mission récupérés avec succès',
            data: {
                missionTypes: missionTypes
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des types de mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// GET /api/mission-types/stats/stats - Récupérer les statistiques
// IMPORTANT: Cette route doit être AVANT /:id pour éviter que "stats" soit interprété comme un ID
router.get('/stats/stats', async (req, res) => {
    try {
        const stats = await MissionType.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/mission-types/:id - Récupérer un type de mission par ID
router.get('/:id', async (req, res) => {
    try {
        const missionType = await MissionType.findById(req.params.id);
        if (!missionType) {
            return res.status(404).json({ error: 'Type de mission non trouvé' });
        }
        res.json(missionType);
    } catch (error) {
        console.error('Erreur lors de la récupération du type de mission:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/mission-types - Créer un nouveau type de mission
router.post('/', async (req, res) => {
    try {
        const { codification, libelle, description, division_id, business_unit_id } = req.body;

        // Validation des données
        if (!codification || !libelle) {
            return res.status(400).json({ error: 'Codification et libellé sont requis' });
        }

        if (!business_unit_id) {
            return res.status(400).json({ error: 'Business Unit est requise' });
        }

        // Vérifier si la codification existe déjà
        const existingType = await MissionType.findByCodification(codification);
        if (existingType) {
            return res.status(400).json({ error: 'Cette codification existe déjà' });
        }

        // Vérifier si la division existe si elle est fournie
        if (division_id) {
            const division = await Division.findById(division_id);
            if (!division) {
                return res.status(400).json({ error: 'Division non trouvée' });
            }
        }

        const newMissionType = await MissionType.create({
            codification: codification.toUpperCase(),
            libelle,
            description,
            division_id,
            business_unit_id
        });

        res.status(201).json(newMissionType);
    } catch (error) {
        console.error('Erreur lors de la création du type de mission:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/mission-types/:id - Mettre à jour un type de mission
router.put('/:id', async (req, res) => {
    try {
        const { codification, libelle, description, division_id, business_unit_id, actif } = req.body;

        // Validation des données
        if (!codification || !libelle) {
            return res.status(400).json({ error: 'Codification et libellé sont requis' });
        }

        if (!business_unit_id) {
            return res.status(400).json({ error: 'Business Unit est requise' });
        }

        // Vérifier si le type de mission existe
        const existingType = await MissionType.findById(req.params.id);
        if (!existingType) {
            return res.status(404).json({ error: 'Type de mission non trouvé' });
        }

        // Vérifier si la nouvelle codification existe déjà (sauf pour le même type)
        const duplicateType = await MissionType.findByCodification(codification);
        if (duplicateType && duplicateType.id !== req.params.id) {
            return res.status(400).json({ error: 'Cette codification existe déjà' });
        }

        // Vérifier si la division existe si elle est fournie
        if (division_id) {
            const division = await Division.findById(division_id);
            if (!division) {
                return res.status(400).json({ error: 'Division non trouvée' });
            }
        }

        const updatedMissionType = await MissionType.update(req.params.id, {
            codification: codification.toUpperCase(),
            libelle,
            description,
            division_id,
            business_unit_id,
            actif: actif !== undefined ? actif : true
        });

        res.json(updatedMissionType);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du type de mission:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/mission-types/:id/tasks - Récupérer les tâches d'un type de mission
router.get('/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                t.id,
                t.code,
                t.libelle,
                t.description,
                t.duree_estimee,
                t.priorite,
                tmt.ordre,
                tmt.obligatoire
            FROM tasks t
            INNER JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE tmt.mission_type_id = $1 AND t.actif = true
            ORDER BY tmt.ordre, t.libelle
        `;

        const result = await pool.query(query, [req.params.id]);

        res.json({
            success: true,
            tasks: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des tâches',
            details: error.message
        });
    }
});

// DELETE /api/mission-types/:id - Supprimer un type de mission
router.delete('/:id', async (req, res) => {
    try {
        const missionType = await MissionType.findById(req.params.id);
        if (!missionType) {
            return res.status(404).json({ error: 'Type de mission non trouvé' });
        }

        // Vérifier si le type de mission est utilisé
        const usageCount = await MissionType.countMissions(req.params.id);
        if (usageCount > 0) {
            return res.status(409).json({
                error: `Ce type de mission est utilisé par ${usageCount} mission(s). Impossible de le supprimer.`,
                count: usageCount
            });
        }

        await MissionType.delete(req.params.id);
        res.json({ message: 'Type de mission supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du type de mission:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/mission-types/division/:divisionId - Récupérer les types de mission par division
router.get('/division/:divisionId', async (req, res) => {
    try {
        const missionTypes = await MissionType.findByDivision(req.params.divisionId);
        res.json(missionTypes);
    } catch (error) {
        console.error('Erreur lors de la récupération des types de mission par division:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;