const express = require('express');
const router = express.Router();
const Collaborateur = require('../models/Collaborateur');
const EvolutionPoste = require('../models/EvolutionPoste');
const EvolutionOrganisation = require('../models/EvolutionOrganisation');
const EvolutionGrade = require('../models/EvolutionGrade');
const DepartCollaborateur = require('../models/DepartCollaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/collaborateurs
 * Récupérer tous les collaborateurs avec pagination et filtres
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            grade: req.query.grade,
            statut: req.query.statut,
            division_id: req.query.division_id,
            search: req.query.search
        };

        const result = await Collaborateur.findAll(options);
        
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des collaborateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des collaborateurs',
            details: error.message
        });
    }
});

/**
 * GET /api/collaborateurs/statistics
 * Récupérer les statistiques des collaborateurs
 */
router.get('/statistics', authenticateToken, async (req, res) => {
    try {
        const statistics = await Collaborateur.getStatistics();
        
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message
        });
    }
});

/**
 * POST /api/collaborateurs
 * Créer un nouveau collaborateur
 */
router.post('/', async (req, res) => {
    try {
        console.log('📥 Données reçues pour création:', req.body);
        console.log('🔍 createUserAccess dans req.body:', req.body.createUserAccess);
        
        // Créer le collaborateur
        const collaborateur = new Collaborateur(req.body);
        const created = await Collaborateur.create(collaborateur);
        console.log('🔍 createUserAccess après création:', created.createUserAccess);
        
        console.log('✅ Collaborateur créé:', created.id);
        
        // Créer automatiquement les entrées d'historique RH initiales
        if (created.id) {
            try {
                // Créer l'entrée d'évolution de poste
                if (req.body.poste_actuel_id) {
                    const evolutionPoste = new EvolutionPoste({
                        collaborateur_id: created.id,
                        poste_id: req.body.poste_actuel_id,
                        date_debut: req.body.date_embauche,
                        date_fin: null,
                        motif: 'Affectation initiale'
                    });
                    await EvolutionPoste.create(evolutionPoste);
                    console.log('✅ Évolution poste créée');
                }
                
                // Créer l'entrée d'évolution d'organisation
                if (req.body.business_unit_id || req.body.division_id) {
                    const evolutionOrganisation = new EvolutionOrganisation({
                        collaborateur_id: created.id,
                        business_unit_id: req.body.business_unit_id,
                        division_id: req.body.division_id,
                        date_debut: req.body.date_embauche,
                        date_fin: null,
                        motif: 'Affectation initiale'
                    });
                    await EvolutionOrganisation.create(evolutionOrganisation);
                    console.log('✅ Évolution organisation créée');
                }
                
                // Créer l'entrée d'évolution de grade
                if (req.body.grade_actuel_id) {
                    const evolutionGrade = new EvolutionGrade({
                        collaborateur_id: created.id,
                        grade_id: req.body.grade_actuel_id,
                        date_debut: req.body.date_embauche,
                        date_fin: null,
                        motif: 'Affectation initiale'
                    });
                    await EvolutionGrade.create(evolutionGrade);
                    console.log('✅ Évolution grade créée');
                }
                
                // Mettre à jour les informations actuelles depuis l'historique RH
                await Collaborateur.updateCurrentInfoFromEvolutions(created.id);
                console.log('✅ Informations actuelles mises à jour');
                
            } catch (error) {
                console.error('⚠️ Erreur lors de la création de l\'historique RH:', error);
                // On continue même si l'historique RH échoue
            }
        }
        
        res.status(201).json({
            success: true,
            data: created,
            message: 'Collaborateur créé avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur lors de la création du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création du collaborateur',
            details: error.message
        });
    }
});

/**
 * POST /api/collaborateurs/:id/depart
 * Gérer le départ d'un collaborateur
 */
router.post('/:id/depart', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        // Créer l'enregistrement de départ
        const departData = {
            collaborateur_id: collaborateur.id,
            type_depart: req.body.type_depart,
            date_effet: req.body.date_effet,
            motif: req.body.motif,
            preavis: req.body.preavis || null,
            documentation: req.body.documentation || null,
            remarques: req.body.remarques || null
        };

        const depart = await DepartCollaborateur.create(departData);

        // Mettre à jour le statut du collaborateur
        await collaborateur.updateDepart({
            statut: 'DEPART',
            date_depart: req.body.date_effet
        });

        // Désactiver le compte utilisateur si il existe
        try {
            const { pool } = require('../utils/database');
            await pool.query(`
                UPDATE users 
                SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP 
                WHERE email = $1
            `, [collaborateur.email]);
        } catch (error) {
            console.log('Aucun compte utilisateur trouvé pour ce collaborateur');
        }

        res.status(201).json({
            success: true,
            data: depart,
            message: 'Départ enregistré avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du départ:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement du départ',
            details: error.message
        });
    }
});

/**
 * POST /api/collaborateurs/:id/reembaucher
 * Réembaucher un collaborateur
 */
router.post('/:id/reembaucher', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        if (collaborateur.statut !== 'DEPART') {
            return res.status(400).json({
                success: false,
                error: 'Le collaborateur n\'est pas en départ'
            });
        }

        // Réactiver le collaborateur
        await collaborateur.updateReembauche({
            statut: 'ACTIF',
            date_depart: null
        });

        // Mettre à jour les informations actuelles depuis l'historique RH
        await Collaborateur.updateCurrentInfoFromEvolutions(collaborateur.id);

        // Réactiver le compte utilisateur si il existe
        try {
            const { pool } = require('../utils/database');
            await pool.query(`
                UPDATE users 
                SET statut = 'ACTIF', updated_at = CURRENT_TIMESTAMP 
                WHERE email = $1
            `, [collaborateur.email]);
        } catch (error) {
            console.log('Aucun compte utilisateur trouvé pour ce collaborateur');
        }

        res.status(200).json({
            success: true,
            data: collaborateur,
            message: 'Collaborateur réembauché avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la réembauche:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la réembauche',
            details: error.message
        });
    }
});

/**
 * GET /api/collaborateurs/:id
 * Récupérer un collaborateur par ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: collaborateur
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du collaborateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du collaborateur',
            details: error.message
        });
    }
});

/**
 * PUT /api/collaborateurs/:id
 * Mettre à jour un collaborateur
 */
router.put('/:id', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        const updatedCollaborateur = await collaborateur.update(req.body);
        
        res.json({
            success: true,
            data: updatedCollaborateur,
            message: 'Collaborateur mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour du collaborateur',
            details: error.message
        });
    }
});

/**
 * PUT /api/collaborateurs/:id/type
 * Mettre à jour le type de collaborateur
 */
router.put('/:id/type', async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        if (!req.body.type_collaborateur_id) {
            return res.status(400).json({
                success: false,
                error: 'Type de collaborateur requis'
            });
        }

        const updatedCollaborateur = await collaborateur.updateTypeCollaborateur(req.body.type_collaborateur_id);
        
        // Mettre à jour les informations actuelles depuis l'historique RH
        await Collaborateur.updateCurrentInfoFromEvolutions(collaborateur.id);
        
        res.json({
            success: true,
            data: updatedCollaborateur,
            message: 'Type de collaborateur mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du type de collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour du type de collaborateur',
            details: error.message
        });
    }
});

/**
 * POST /api/collaborateurs/:id/generate-user-account
 * Générer un compte utilisateur pour un collaborateur
 */
router.post('/:id/generate-user-account', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { login, email, nom, prenom, role, password } = req.body;
        
        console.log('📥 Génération de compte utilisateur pour collaborateur:', id);
        console.log('📋 Données reçues:', { login, email, nom, prenom, role });
        
        // Vérifier que le collaborateur existe
        const collaborateur = await Collaborateur.findById(id);
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                message: 'Collaborateur non trouvé'
            });
        }
        
        // Vérifier que le collaborateur n'a pas déjà un compte utilisateur
        if (collaborateur.user_id) {
            return res.status(400).json({
                success: false,
                message: 'Ce collaborateur a déjà un compte utilisateur'
            });
        }
        
        // Créer le compte utilisateur
        const UserAccessService = require('../services/userAccessService');
        const userData = {
            login,
            email,
            nom,
            prenom,
            role: role || 'USER',
            password: password || 'TempPass123!'
        };
        
        const userAccessResult = await UserAccessService.createUserAccessForCollaborateur({
            ...collaborateur,
            ...userData
        });
        
        console.log('✅ Compte utilisateur créé:', userAccessResult);
        
        res.json({
            success: true,
            message: 'Compte utilisateur créé avec succès',
            data: userAccessResult
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération du compte utilisateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération du compte utilisateur',
            details: error.message
        });
    }
});

/**
 * DELETE /api/collaborateurs/:id
 * Supprimer un collaborateur
 */
router.delete('/:id', async (req, res) => {
    try {
        await Collaborateur.delete(req.params.id);
        
        res.json({
            success: true,
            message: 'Collaborateur supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du collaborateur:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression du collaborateur',
            details: error.message
        });
    }
});

module.exports = router; 