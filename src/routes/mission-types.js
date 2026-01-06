const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MissionType = require('../models/MissionType');
const Division = require('../models/Division');

// GET /api/mission-types - Récupérer tous les types de mission
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const user = req.user;
        const userRoles = user.roles || [];

        // Roles sans restriction
        // Roles sans restriction
        const EXEMPT_ROLES = [
            'SUPER_ADMIN', 'ADMIN',
            'RESPONSABLE_RH', 'ASSISTANT_RH', 'ADMIN_RH',
            'RESPONSABLE_IT', 'ASSISTANT_IT', 'ADMIN_IT'
        ];

        const isExempt = userRoles.some(r => EXEMPT_ROLES.includes(r));

        let missionTypes;

        if (isExempt) {
            missionTypes = await MissionType.findAll();
        } else {
            // Utilisateur restreint : Récupérer uniquement les BU accessibles
            // (Logique identique à GET /api/business-units pour non-admin)
            const userBuQuery = `
                SELECT DISTINCT bu.id
                FROM business_units bu
                LEFT JOIN user_business_unit_access uba ON bu.id = uba.business_unit_id AND uba.user_id = $1
                LEFT JOIN users u ON u.id = $1
                LEFT JOIN collaborateurs c ON c.id = u.collaborateur_id 
                WHERE 
                    (uba.user_id IS NOT NULL AND uba.granted = true)
                    OR 
                    (c.business_unit_id = bu.id)
            `;
            const buResult = await pool.query(userBuQuery, [user.id]);
            const accessibleBuIds = buResult.rows.map(row => row.id);

            missionTypes = await MissionType.findByBusinessUnitIds(accessibleBuIds);
        }

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
        const { codification, libelle, description, division_id, business_unit_id, default_folder_structure } = req.body;

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
            business_unit_id,
            default_folder_structure
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
        const { codification, libelle, description, division_id, business_unit_id, actif, default_folder_structure } = req.body;

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
            actif: actif !== undefined ? actif : true,
            default_folder_structure
        });

        res.json(updatedMissionType);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du type de mission:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

const Task = require('../models/Task');

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

// POST /api/mission-types/:id/tasks - Créer une tâche et l'associer au type de mission
router.post('/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const { code, libelle, description, duree_estimee, priorite, mission_name } = req.body;
        const missionTypeId = req.params.id;
        const user = req.user;

        // Validation
        if (!code || !libelle) {
            return res.status(400).json({
                success: false,
                error: 'Code et libellé sont requis'
            });
        }

        // Vérifier si le code existe déjà
        const existingTask = await Task.findByCode(code);
        if (existingTask) {
            return res.status(400).json({
                success: false,
                error: 'Ce code de tâche existe déjà'
            });
        }

        // Vérifier si le type de mission existe
        const missionType = await MissionType.findById(missionTypeId);
        if (!missionType) {
            return res.status(404).json({
                success: false,
                error: 'Type de mission non trouvé'
            });
        }

        // Construire la description enrichie
        let enrichedDescription = description || '';
        if (user && mission_name) {
            const authorName = `${user.prenom} ${user.nom}`.trim();
            const creationNote = `\n\n(Créé par ${authorName} depuis la mission "${mission_name}")`;
            enrichedDescription += creationNote;
        }

        // Créer la tâche
        const task = await Task.create({
            code,
            libelle,
            description: enrichedDescription,
            duree_estimee: duree_estimee || 0,
            priorite: priorite || 'MOYENNE'
        });

        // Associer au type de mission (Optionnelle = obligatoire: false)
        // On met un ordre élevé par défaut (ou 0 pour l'instant)
        await Task.addToMissionType(task.id, missionTypeId, 999, false);

        res.status(201).json({
            success: true,
            message: 'Tâche personnalisée créée avec succès',
            data: task
        });

    } catch (error) {
        console.error('Erreur lors de la création de la tâche personnalisée:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
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