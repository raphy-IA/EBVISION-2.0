const express = require('express');
const router = express.Router();
const Collaborateur = require('../models/Collaborateur');
const EvolutionPoste = require('../models/EvolutionPoste');
const EvolutionOrganisation = require('../models/EvolutionOrganisation');
const EvolutionGrade = require('../models/EvolutionGrade');
const DepartCollaborateur = require('../models/DepartCollaborateur');
const { authenticateToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const { pool } = require('../utils/database');
const { upload, processImage, deleteExistingPhoto } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

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
            business_unit_id: req.query.business_unit_id,
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
router.post('/', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
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
router.put('/:id', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
    try {
        const collaborateur = await Collaborateur.findById(req.params.id);
        
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        const updatedCollaborateur = await collaborateur.update(req.body);

        // Synchroniser automatiquement l'utilisateur lié (nom, prénom, email)
        try {
            let linkedUserId = updatedCollaborateur.user_id || collaborateur.user_id || null;

            // 1) Chercher par relation users.collaborateur_id si nécessaire
            if (!linkedUserId) {
                const byLink = await pool.query(
                    'SELECT id FROM users WHERE collaborateur_id = $1 LIMIT 1',
                    [updatedCollaborateur.id]
                );
                if (byLink.rows.length > 0) {
                    linkedUserId = byLink.rows[0].id;
                }
            }

            // 2) Fallback: chercher par ancien email si aucun lien direct
            if (!linkedUserId && collaborateur.email) {
                const byOldEmail = await User.findByEmail(collaborateur.email);
                if (byOldEmail) {
                    linkedUserId = byOldEmail.id;
                }
            }

            if (linkedUserId) {
                // S'assurer que le lien collaborateur_id est posé
                await pool.query(
                    `UPDATE users SET collaborateur_id = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1 AND (collaborateur_id IS DISTINCT FROM $2)`,
                    [linkedUserId, updatedCollaborateur.id]
                );

                // Tentative de mise à jour des infos d'identité (nom, prénom, email)
                try {
                    await User.update(linkedUserId, {
                        nom: updatedCollaborateur.nom,
                        prenom: updatedCollaborateur.prenom,
                        email: updatedCollaborateur.email
                    });
                } catch (syncErr) {
                    // Conflit d'email ou autre; on log sans bloquer la mise à jour du collaborateur
                    console.warn('⚠️ Échec sync user (nom/prenom/email):', syncErr.message);
                }
            }
        } catch (linkErr) {
            console.warn('⚠️ Échec de synchronisation utilisateur lié:', linkErr.message);
        }
        
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
router.post('/:id/generate-user-account', authenticateToken, requireRole(['ADMIN', 'ADMIN_IT']), async (req, res) => {
    try {
        const { id } = req.params;
        const { login, email, nom, prenom, roles, password } = req.body;
        
        console.log('📥 Génération de compte utilisateur pour collaborateur:', id);
        console.log('📋 Données reçues:', { login, email, nom, prenom, roles });
        
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
        
        // Validation: au moins un rôle doit être fourni
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Au moins un rôle doit être sélectionné'
            });
        }
        
        // Créer le compte utilisateur avec rôles multiples
        const userData = {
            login,
            email,
            nom,
            prenom,
            roles: roles, // Tableau d'IDs de rôles
            password: password || 'TempPass123!'
        };
        
        // Utiliser User.create() qui gère les rôles multiples
        const newUser = await User.create(userData);
        
        // Lier l'utilisateur au collaborateur
        await pool.query(`
            UPDATE collaborateurs 
            SET user_id = $1 
            WHERE id = $2
        `, [newUser.id, id]);
        
        console.log('✅ Compte utilisateur créé:', {
            collaborateur_id: id,
            user_id: newUser.id,
            email: email,
            login: login,
            roles: roles
        });
        
        res.json({
            success: true,
            message: 'Compte utilisateur créé avec succès',
            data: {
                user: newUser,
                password: password || 'TempPass123!',
                roles: roles
            }
        });
        
    } catch (error) {
        // Récupération sécurisée des données pour le logging
        const safeParams = req?.params || {};
        const safeBody = req?.body || {};

        console.error('❌ Erreur lors de la génération du compte utilisateur:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Données reçues (sécurisées):', {
            id: safeParams.id,
            login: safeBody.login,
            email: safeBody.email,
            nom: safeBody.nom,
            prenom: safeBody.prenom,
            rolesCount: Array.isArray(safeBody.roles) ? safeBody.roles.length : 0
        });

        // Gestion spécifique des doublons de login
        if (error.code === '23505' && error.constraint === 'users_login_key') {
            return res.status(400).json({
                success: false,
                message: `Le login "${safeBody.login}" est déjà utilisé. Veuillez en choisir un autre.`,
                errorCode: 'LOGIN_DUPLICATE'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération du compte utilisateur',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * DELETE /api/collaborateurs/:id
 * Supprimer un collaborateur
 */
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
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

/**
 * POST /api/collaborateurs/:id/upload-photo
 * Uploader une photo pour un collaborateur
 */
router.post('/:id/upload-photo', authenticateToken, deleteExistingPhoto, upload, processImage, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Aucune photo fournie'
            });
        }
        
        // Vérifier que le collaborateur existe
        const collaborateur = await Collaborateur.findById(id);
        if (!collaborateur) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        // Mettre à jour le collaborateur avec le chemin de la photo
        const photoUrl = req.file.path;
        const updateQuery = `
            UPDATE collaborateurs 
            SET photo_url = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [photoUrl, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const updatedCollaborateur = new Collaborateur(result.rows[0]);
        
        res.json({
            success: true,
            message: 'Photo uploadée avec succès',
            data: {
                collaborateur: updatedCollaborateur,
                photo_url: photoUrl,
                avatar_url: req.file.avatarPath
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'upload de la photo:', error);
        
        // Supprimer le fichier en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        if (req.file && req.file.avatarPath && fs.existsSync(req.file.avatarPath)) {
            fs.unlinkSync(req.file.avatarPath);
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'upload de la photo',
            details: error.message
        });
    }
});

/**
 * DELETE /api/collaborateurs/:id/photo
 * Supprimer la photo d'un collaborateur
 */
router.delete('/:id/photo', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vérifier que le collaborateur existe et récupérer sa photo
        const result = await pool.query(
            'SELECT photo_url FROM collaborateurs WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const collaborateur = result.rows[0];
        
        // Supprimer les fichiers de photo s'ils existent
        if (collaborateur.photo_url) {
            const filesToDelete = [
                collaborateur.photo_url,
                collaborateur.photo_url.replace('thumb_', 'avatar_'),
                collaborateur.photo_url.replace('avatar_', 'thumb_')
            ];
            
            filesToDelete.forEach(filePath => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('🗑️ Fichier supprimé:', filePath);
                }
            });
        }
        
        // Mettre à jour la base de données
        await pool.query(
            'UPDATE collaborateurs SET photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Photo supprimée avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la photo',
            details: error.message
        });
    }
});

/**
 * GET /api/collaborateurs/:id/photo
 * Récupérer la photo d'un collaborateur
 */
router.get('/:id/photo', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { size = 'thumb' } = req.query; // thumb ou avatar
        
        // Récupérer le chemin de la photo
        const result = await pool.query(
            'SELECT photo_url FROM collaborateurs WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const collaborateur = result.rows[0];
        
        if (!collaborateur.photo_url) {
            return res.status(404).json({
                success: false,
                error: 'Aucune photo trouvée pour ce collaborateur'
            });
        }
        
        // Déterminer le chemin du fichier selon la taille demandée
        let filePath = collaborateur.photo_url;
        if (size === 'avatar' && collaborateur.photo_url.includes('thumb_')) {
            filePath = collaborateur.photo_url.replace('thumb_', 'avatar_');
        }
        
        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Fichier photo non trouvé'
            });
        }
        
        // Envoyer le fichier
        res.sendFile(path.resolve(filePath));
        
    } catch (error) {
        console.error('Erreur lors de la récupération de la photo:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la photo',
            details: error.message
        });
    }
});

module.exports = router; 