const express = require('express');
const router = express.Router();
const Manager = require('../models/Manager');
const BusinessUnit = require('../models/BusinessUnit');
const Division = require('../models/Division');
const { authenticateToken } = require('../middleware/auth');

// =====================================================
// ROUTES POUR LA GESTION DES RESPONSABLES
// =====================================================

/**
 * GET /api/managers/business-units/:id/managers
 * Récupérer les responsables d'une Business Unit
 */
router.get('/business-units/:id/managers', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const managers = await Manager.getBusinessUnitManagers(id);
        
        if (!managers) {
            return res.status(404).json({
                success: false,
                error: 'Business Unit non trouvée'
            });
        }
        
        res.json({
            success: true,
            data: managers
        });
    } catch (error) {
        console.error('Erreur récupération responsables BU:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des responsables'
        });
    }
});

/**
 * GET /api/managers/divisions/:id/managers
 * Récupérer les responsables d'une Division
 */
router.get('/divisions/:id/managers', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const managers = await Manager.getDivisionManagers(id);
        
        if (!managers) {
            return res.status(404).json({
                success: false,
                error: 'Division non trouvée'
            });
        }
        
        res.json({
            success: true,
            data: managers
        });
    } catch (error) {
        console.error('Erreur récupération responsables Division:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des responsables'
        });
    }
});

/**
 * PUT /api/managers/business-units/:id/managers
 * Définir les responsables d'une Business Unit
 */
router.put('/business-units/:id/managers', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { principal_id, adjoint_id } = req.body;
        
        // Vérifier que la BU existe
        const businessUnit = await BusinessUnit.findById(id);
        if (!businessUnit) {
            return res.status(404).json({
                success: false,
                error: 'Business Unit non trouvée'
            });
        }
        
        const result = await Manager.setBusinessUnitManagers(id, principal_id, adjoint_id);
        
        res.json({
            success: true,
            data: result,
            message: 'Responsables de la Business Unit mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur mise à jour responsables BU:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la mise à jour des responsables'
        });
    }
});

/**
 * PUT /api/managers/divisions/:id/managers
 * Définir les responsables d'une Division
 */
router.put('/divisions/:id/managers', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { principal_id, adjoint_id } = req.body;
        
        // Vérifier que la Division existe
        const division = await Division.findById(id);
        if (!division) {
            return res.status(404).json({
                success: false,
                error: 'Division non trouvée'
            });
        }
        
        const result = await Manager.setDivisionManagers(id, principal_id, adjoint_id);
        
        res.json({
            success: true,
            data: result,
            message: 'Responsables de la Division mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur mise à jour responsables Division:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la mise à jour des responsables'
        });
    }
});

/**
 * GET /api/managers/eligible
 * Récupérer les collaborateurs éligibles pour être responsables
 */
router.get('/eligible', authenticateToken, async (req, res) => {
    try {
        const { business_unit_id, division_id } = req.query;
        
        const eligibleManagers = await Manager.getEligibleManagers(
            business_unit_id || null,
            division_id || null
        );
        
        res.json({
            success: true,
            data: eligibleManagers
        });
    } catch (error) {
        console.error('Erreur récupération collaborateurs éligibles:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des collaborateurs éligibles'
        });
    }
});

/**
 * GET /api/managers/my-responsibilities
 * Récupérer les responsabilités du collaborateur connecté
 */
router.get('/my-responsibilities', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('🔍 [DEBUG] Recherche responsabilités pour utilisateur:', userId);
        
        // Récupérer l'ID du collaborateur
        const { pool } = require('../utils/database');
        const collaborateur = await pool.query(
            'SELECT id FROM collaborateurs WHERE user_id = $1',
            [userId]
        );
        
        console.log('🔍 [DEBUG] Résultat recherche collaborateur:', collaborateur.rows);
        
        if (collaborateur.rows.length === 0) {
            console.log('❌ [DEBUG] Collaborateur non trouvé pour user_id:', userId);
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const collaborateurId = collaborateur.rows[0].id;
        console.log('✅ [DEBUG] Collaborateur trouvé:', collaborateurId);
        
        // Récupérer les BU et Divisions gérées
        const [businessUnits, divisions] = await Promise.all([
            Manager.getBusinessUnitsWhereManagedBy(collaborateurId),
            Manager.getDivisionsWhereManagedBy(collaborateurId)
        ]);
        
        console.log('📋 [DEBUG] BU gérées:', businessUnits);
        console.log('📋 [DEBUG] Divisions gérées:', divisions);
        
        res.json({
            success: true,
            data: {
                business_units: businessUnits,
                divisions: divisions
            }
        });
    } catch (error) {
        console.error('Erreur récupération responsabilités:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des responsabilités'
        });
    }
});

/**
 * POST /api/managers/check-permissions
 * Vérifier les permissions d'un collaborateur pour une validation
 */
router.post('/check-permissions', authenticateToken, async (req, res) => {
    try {
        const { business_unit_id, division_id, validation_level } = req.body;
        const userId = req.user.id;
        
        // Récupérer l'ID du collaborateur
        const { pool } = require('../utils/database');
        const collaborateur = await pool.query(
            'SELECT id FROM collaborateurs WHERE user_id = $1',
            [userId]
        );
        
        if (collaborateur.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const collaborateurId = collaborateur.rows[0].id;
        
        let canValidate = false;
        
        if (validation_level === 'DIVISION' && division_id) {
            canValidate = await Manager.isDivisionManager(collaborateurId, division_id);
        } else if (validation_level === 'BUSINESS_UNIT' && business_unit_id) {
            canValidate = await Manager.isBusinessUnitManager(collaborateurId, business_unit_id);
        }
        
        res.json({
            success: true,
            data: {
                can_validate: canValidate,
                level: validation_level
            }
        });
    } catch (error) {
        console.error('Erreur vérification permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la vérification des permissions'
        });
    }
});

/**
 * POST /api/managers/assign-raphael (TEMPORAIRE)
 * Assigner Raphaël Ngos comme responsable de la Direction Générale
 */
router.post('/assign-raphael', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé aux administrateurs'
            });
        }
        
        const { pool } = require('../utils/database');
        
        // Trouver Raphaël Ngos
        const collaborateurResult = await pool.query(
            'SELECT id FROM collaborateurs WHERE nom = $1 AND prenom = $2',
            ['Ngos', 'Raphaël']
        );
        
        if (collaborateurResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur Raphaël Ngos non trouvé'
            });
        }
        
        const collaborateurId = collaborateurResult.rows[0].id;
        
        // Trouver la Direction Générale
        const buResult = await pool.query(
            'SELECT id FROM business_units WHERE nom = $1',
            ['Direction Générale']
        );
        
        if (buResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Business Unit "Direction Générale" non trouvée'
            });
        }
        
        const buId = buResult.rows[0].id;
        
        // Assigner comme responsable principal
        await pool.query(
            'UPDATE business_units SET responsable_principal_id = $1 WHERE id = $2',
            [collaborateurId, buId]
        );
        
        // Vérifier l'assignation
        const verificationResult = await pool.query(
            `SELECT bu.nom as bu_name, c.nom, c.prenom 
             FROM business_units bu 
             LEFT JOIN collaborateurs c ON bu.responsable_principal_id = c.id 
             WHERE bu.id = $1`,
            [buId]
        );
        
        res.json({
            success: true,
            message: 'Raphaël Ngos a été assigné comme responsable principal de la Direction Générale',
            data: verificationResult.rows[0]
        });
        
    } catch (error) {
        console.error('Erreur assignation manager:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de l\'assignation'
        });
    }
});

module.exports = router;



