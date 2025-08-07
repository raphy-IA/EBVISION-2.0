const express = require('express');
const router = express.Router();
const TimeSheetSupervisor = require('../models/TimeSheetSupervisor');
const { authenticateToken } = require('../middleware/auth');

/**
 * Créer une relation superviseur-collaborateur
 * POST /api/time-sheet-supervisors
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { collaborateur_id, supervisor_id } = req.body;

        if (!collaborateur_id || !supervisor_id) {
            return res.status(400).json({ 
                error: 'Les IDs du collaborateur et du superviseur sont requis' 
            });
        }

        // Vérifier que le collaborateur et le superviseur existent
        const { pool } = require('../utils/database');
        const client = await pool.connect();
        
        try {
            const collaborateurCheck = await client.query(
                'SELECT id FROM collaborateurs WHERE id = $1',
                [collaborateur_id]
            );
            
            const supervisorCheck = await client.query(
                'SELECT id FROM collaborateurs WHERE id = $1',
                [supervisor_id]
            );

            if (collaborateurCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Collaborateur non trouvé' });
            }

            if (supervisorCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Superviseur non trouvé' });
            }

            // Vérifier que ce n'est pas la même personne
            if (collaborateur_id === supervisor_id) {
                return res.status(400).json({ 
                    error: 'Un collaborateur ne peut pas être son propre superviseur' 
                });
            }

        } finally {
            client.release();
        }

        const supervisor = await TimeSheetSupervisor.create(collaborateur_id, supervisor_id);
        
        res.status(201).json({
            message: 'Relation superviseur créée avec succès',
            data: supervisor
        });

    } catch (error) {
        console.error('Erreur lors de la création de la relation superviseur:', error);
        
        if (error.code === '23505') { // Violation de contrainte unique
            return res.status(409).json({ 
                error: 'Cette relation superviseur existe déjà' 
            });
        }
        
        res.status(500).json({ 
            error: 'Erreur lors de la création de la relation superviseur' 
        });
    }
});

/**
 * Récupérer tous les superviseurs d'un collaborateur
 * GET /api/time-sheet-supervisors/collaborateur/:id
 */
router.get('/collaborateur/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const supervisors = await TimeSheetSupervisor.getSupervisors(id);
        
        res.json({
            message: 'Superviseurs récupérés avec succès',
            data: supervisors
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des superviseurs:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des superviseurs' 
        });
    }
});

/**
 * Récupérer tous les collaborateurs d'un superviseur
 * GET /api/time-sheet-supervisors/supervisor/:id
 */
router.get('/supervisor/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const collaborateurs = await TimeSheetSupervisor.getCollaborateurs(id);
        
        res.json({
            message: 'Collaborateurs récupérés avec succès',
            data: collaborateurs
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des collaborateurs:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des collaborateurs' 
        });
    }
});

/**
 * Récupérer tous les superviseurs configurés
 * GET /api/time-sheet-supervisors/all-supervisors
 */
router.get('/all-supervisors', authenticateToken, async (req, res) => {
    try {
        const supervisors = await TimeSheetSupervisor.getAllSupervisors();
        
        res.json({
            message: 'Tous les superviseurs récupérés avec succès',
            data: supervisors
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de tous les superviseurs:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération de tous les superviseurs' 
        });
    }
});

/**
 * Supprimer une relation superviseur
 * DELETE /api/time-sheet-supervisors/:collaborateurId/:supervisorId
 */
router.delete('/:collaborateurId/:supervisorId', authenticateToken, async (req, res) => {
    try {
        const { collaborateurId, supervisorId } = req.params;
        const removed = await TimeSheetSupervisor.remove(collaborateurId, supervisorId);
        
        if (!removed) {
            return res.status(404).json({ 
                error: 'Relation superviseur non trouvée' 
            });
        }
        
        res.json({
            message: 'Relation superviseur supprimée avec succès',
            data: removed
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la relation superviseur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la suppression de la relation superviseur' 
        });
    }
});

/**
 * Vérifier si un superviseur est configuré pour un collaborateur
 * GET /api/time-sheet-supervisors/check/:collaborateurId/:supervisorId
 */
router.get('/check/:collaborateurId/:supervisorId', authenticateToken, async (req, res) => {
    try {
        const { collaborateurId, supervisorId } = req.params;
        const isSupervisor = await TimeSheetSupervisor.isSupervisor(collaborateurId, supervisorId);
        
        res.json({
            message: 'Vérification effectuée avec succès',
            data: { isSupervisor }
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de la relation superviseur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la vérification de la relation superviseur' 
        });
    }
});

module.exports = router; 