const express = require('express');
const User = require('../models/User');
const { userValidation } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const pool = require('../utils/database'); // Added for the new route
const {
    isSuperAdmin,
    canModifySuperAdmin,
    canRemoveLastSuperAdmin,
    logSuperAdminAction
} = require('../utils/superAdminHelper');
const { superAdminActionLimiter } = require('../middleware/superAdminRateLimiter');

const router = express.Router();

// Récupérer tous les utilisateurs (avec pagination)
router.get('/', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const statut = req.query.status || req.query.statut || ''; // Support both 'status' and 'statut'

        console.log('🔍 [API] GET /users - Paramètres:', { page, limit, search, role, statut });

        const result = await User.findAll({
            page,
            limit,
            search,
            role,
            statut,
            currentUserId: req.user.id // Passer l'ID de l'utilisateur connecté pour filtrer les SUPER_ADMIN
        });

        // Ajouter l'information de liaison avec les collaborateurs
        const usersWithCollaborateurInfo = result.users.map(user => {
            const isLinked = user.collaborateur_id !== null && user.collaborateur_id !== undefined;
            return {
                ...user,
                linked_to_collaborateur: isLinked,
                collaborateur_id: user.collaborateur_id || null
            };
        });

        console.log(`📊 [API] ${usersWithCollaborateurInfo.length} utilisateurs retournés sur ${result.pagination.total} total`);

        res.json({
            success: true,
            message: 'Utilisateurs récupérés avec succès',
            data: usersWithCollaborateurInfo,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des utilisateurs (DOIT ÊTRE AVANT /:id)
router.get('/statistics', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const stats = await User.getStats();

        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// ===== GESTION DES RÔLES MULTIPLES =====
// Ces routes DOIVENT être définies AVANT /:id pour éviter les conflits

/**
 * GET /api/users/roles
 * Récupérer tous les rôles disponibles
 * IMPORTANT: Cette route doit être définie AVANT /:id
 */
router.get('/roles', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Récupération des rôles...');

        // Vérifier l'existence de la table roles
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `;

        const tableExistsResult = await pool.query(tableExistsQuery);
        const tableExists = tableExistsResult.rows[0].exists;

        console.log('📊 Table roles existe:', tableExists);

        if (!tableExists) {
            console.log('❌ Table roles non trouvée');
            return res.status(404).json({
                success: false,
                message: 'Table des rôles non trouvée'
            });
        }

        console.log('📋 Récupération des rôles depuis la table roles...');
        console.log('👤 Utilisateur connecté:', req.user.id, req.user.role);

        // Simplification : récupérer tous les rôles sans filtrage pour l'instant
        console.log('📋 Récupération de tous les rôles...');

        const rolesQuery = `
            SELECT id, name, description
            FROM roles
            ORDER BY name
        `;

        console.log('🔍 Exécution de la requête SQL...');
        const rolesResult = await pool.query(rolesQuery);
        const roles = rolesResult.rows;

        console.log(`✅ ${roles.length} rôles récupérés`);

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des rôles:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des rôles',
            error: error.message
        });
    }
});

// Récupérer un utilisateur par ID (DOIT ÊTRE APRÈS /roles)
router.get('/:id', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Utilisateur récupéré avec succès',
            data: user
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Créer un nouvel utilisateur
router.post('/', authenticateToken, requirePermission('users:create'), async (req, res) => {
    try {
        // Validation des données
        console.log('🔍 Données reçues pour validation:', req.body);
        const { error, value } = userValidation.create.validate(req.body);
        if (error) {
            console.error('❌ Erreur de validation:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }
        console.log('✅ Validation réussie:', value);

        // Validation personnalisée : au moins un rôle doit être fourni
        if (!value.roles && !value.role) {
            return res.status(400).json({
                success: false,
                message: 'Au moins un rôle doit être fourni (role ou roles)'
            });
        }

        // 🔒 PROTECTION SUPER_ADMIN: Vérifier si tentative d'attribution du rôle SUPER_ADMIN
        const rolesToAssign = value.roles || [value.role];

        // Récupérer les noms des rôles à partir des IDs
        if (value.roles && Array.isArray(value.roles)) {
            const rolesCheckResult = await pool.query(
                'SELECT id, name FROM roles WHERE id = ANY($1)',
                [value.roles]
            );

            const roleNames = rolesCheckResult.rows.map(r => r.name);

            if (roleNames.includes('SUPER_ADMIN')) {
                const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);

                if (!isCurrentSuperAdmin) {
                    await logSuperAdminAction(
                        req.user.id,
                        'SUPER_ADMIN_UNAUTHORIZED_CREATE_ATTEMPT',
                        null,
                        { requestedRoles: roleNames, email: value.email },
                        req
                    );

                    return res.status(403).json({
                        success: false,
                        message: 'Accès refusé',
                        reason: 'Seul un SUPER_ADMIN peut créer un utilisateur avec le rôle SUPER_ADMIN'
                    });
                }

                // 📝 AUDIT: Enregistrer la création d'un utilisateur SUPER_ADMIN
                await logSuperAdminAction(
                    req.user.id,
                    'SUPER_ADMIN_USER_CREATED',
                    null,
                    { email: value.email, roles: roleNames },
                    req
                );
            }
        }

        // Vérifier si l'email existe déjà
        const existingUser = await User.findByEmail(value.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Créer l'utilisateur (le modèle User.create fait le hashage et gère les rôles multiples)
        const newUser = await User.create(value);

        // Récupérer les rôles de l'utilisateur créé pour la réponse
        const userRoles = await User.getRoles(newUser.id);

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: {
                ...newUser,
                roles: userRoles
            }
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Mettre à jour un utilisateur
router.put('/:id', superAdminActionLimiter, authenticateToken, requirePermission('users:update'), async (req, res) => {
    try {
        const { id } = req.params;

        // 🔒 PROTECTION SUPER_ADMIN: Vérifier si l'utilisateur peut modifier la cible
        const canModify = await canModifySuperAdmin(req.user.id, id);
        if (!canModify.allowed) {
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_UNAUTHORIZED_MODIFICATION_ATTEMPT',
                id,
                { reason: canModify.reason },
                req
            );

            return res.status(403).json({
                success: false,
                message: 'Accès refusé',
                reason: canModify.reason
            });
        }

        // Validation des données
        console.log('🔍 Données reçues pour mise à jour:', req.body);

        // Validation dynamique du rôle
        if (req.body.role) {
            const rolesResult = await pool.query('SELECT name FROM roles ORDER BY name');
            const validRoles = rolesResult.rows.map(row => row.name);

            if (!validRoles.includes(req.body.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rôle invalide',
                    errors: [`Le rôle "${req.body.role}" n'est pas valide. Rôles autorisés: ${validRoles.join(', ')}`]
                });
            }
        }

        const { error, value } = userValidation.update.validate(req.body);
        if (error) {
            console.log('❌ Erreur de validation:', error.details);
            console.log('❌ Messages d\'erreur:', error.details.map(detail => detail.message));
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }
        console.log('✅ Données validées:', value);

        // Vérifier si l'utilisateur existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier si l'email existe déjà (sauf pour cet utilisateur)
        if (value.email && value.email !== existingUser.email) {
            const userWithEmail = await User.findByEmail(value.email);
            if (userWithEmail && userWithEmail.id !== id) {
                return res.status(400).json({
                    success: false,
                    message: 'Un utilisateur avec cet email existe déjà'
                });
            }
        }



        // Mettre à jour l'utilisateur
        const updatedUser = await User.update(id, value);

        // Gérer la mise à jour des rôles multiples si fournis
        if (req.body.roles && Array.isArray(req.body.roles)) {
            console.log('📋 Mise à jour des rôles multiples:', req.body.roles);

            // 🔒 PROTECTION SUPER_ADMIN: Vérifier si tentative d'attribution du rôle SUPER_ADMIN
            const rolesCheckResult = await pool.query(
                'SELECT id, name FROM roles WHERE id = ANY($1)',
                [req.body.roles]
            );

            const roleNames = rolesCheckResult.rows.map(r => r.name);

            if (roleNames.includes('SUPER_ADMIN')) {
                const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);

                if (!isCurrentSuperAdmin) {
                    await logSuperAdminAction(
                        req.user.id,
                        'SUPER_ADMIN_UNAUTHORIZED_UPDATE_ATTEMPT',
                        id,
                        { requestedRoles: roleNames, targetUser: `${existingUser.nom} ${existingUser.prenom}` },
                        req
                    );

                    return res.status(403).json({
                        success: false,
                        message: 'Accès refusé',
                        reason: 'Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN'
                    });
                }

                // 📝 AUDIT: Enregistrer l'attribution du rôle SUPER_ADMIN
                await logSuperAdminAction(
                    req.user.id,
                    'SUPER_ADMIN_ROLE_UPDATED',
                    id,
                    { targetUser: `${existingUser.nom} ${existingUser.prenom}`, roles: roleNames },
                    req
                );
            }

            try {
                // Supprimer tous les rôles existants
                await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

                // Ajouter les nouveaux rôles
                if (req.body.roles.length > 0) {
                    const insertValues = req.body.roles.map((roleId, index) =>
                        `($1, $${index + 2}, NOW())`
                    ).join(', ');

                    const insertQuery = `
                        INSERT INTO user_roles (user_id, role_id, created_at)
                        VALUES ${insertValues}
                    `;

                    await pool.query(insertQuery, [id, ...req.body.roles]);
                    console.log(`✅ ${req.body.roles.length} rôle(s) assigné(s) à l'utilisateur ${id}`);
                } else {
                    console.log('⚠️ Aucun rôle spécifié');
                }
            } catch (rolesError) {
                console.error('❌ Erreur lors de la mise à jour des rôles:', rolesError);
                // Ne pas bloquer la mise à jour de l'utilisateur si les rôles échouent
            }
        }

        res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Désactiver un utilisateur (soft delete)
router.patch('/:id/deactivate', authenticateToken, requirePermission('users:update'), async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si l'utilisateur existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Désactiver l'utilisateur (soft delete)
        await User.deactivate(id);

        res.json({
            success: true,
            message: 'Utilisateur désactivé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Supprimer définitivement un utilisateur (hard delete)
router.delete('/:id', superAdminActionLimiter, authenticateToken, requirePermission('users:delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si l'utilisateur existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // 🔒 PROTECTION SUPER_ADMIN: Vérifier si l'utilisateur peut supprimer la cible
        const canModify = await canModifySuperAdmin(req.user.id, id);
        if (!canModify.allowed) {
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_UNAUTHORIZED_DELETION_ATTEMPT',
                id,
                { reason: canModify.reason, user: `${existingUser.nom} ${existingUser.prenom}` },
                req
            );

            return res.status(403).json({
                success: false,
                message: 'Accès refusé',
                reason: canModify.reason
            });
        }

        // 🔒 PROTECTION: Empêcher la suppression du dernier SUPER_ADMIN
        const canRemove = await canRemoveLastSuperAdmin(id);
        if (!canRemove.allowed) {
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_LAST_ADMIN_DELETION_ATTEMPT',
                id,
                { reason: canRemove.reason },
                req
            );

            return res.status(400).json({
                success: false,
                message: 'Opération interdite',
                reason: canRemove.reason
            });
        }

        // Vérifier si l'utilisateur est lié à un collaborateur
        const linkedCollaborateur = await User.checkLinkedCollaborateur(id);
        if (linkedCollaborateur) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer un utilisateur lié à un collaborateur. Désactivez-le à la place.'
            });
        }

        // Hard delete (suppression définitive)
        await User.hardDelete(id);

        // 📝 AUDIT: Enregistrer la suppression d'un SUPER_ADMIN
        const wasSuperAdmin = await isSuperAdmin(id);
        if (wasSuperAdmin) {
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_USER_DELETED',
                id,
                { user: `${existingUser.nom} ${existingUser.prenom}`, email: existingUser.email },
                req
            );
        }

        res.json({
            success: true,
            message: 'Utilisateur supprimé définitivement'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des utilisateurs
router.get('/stats/overview', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const stats = await User.getStats();

        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// API POUR LE DASHBOARD PERSONNEL

// GET /api/users/objectives/:userId - Objectifs de l'utilisateur
router.get('/objectives/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur demande ses propres objectifs
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        // Pour l'instant, retourner des objectifs simulés
        // TODO: Implémenter une vraie table d'objectifs
        const data = {
            heures: {
                actuel: 120,
                cible: 160,
                progression: 75
            },
            facturation: {
                actuel: 85,
                cible: 90,
                progression: 94
            },
            qualite: {
                actuel: 92,
                cible: 95,
                progression: 97
            },
            missions: {
                actuel: 3,
                cible: 5,
                progression: 60
            }
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des objectifs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des objectifs',
            error: error.message
        });
    }
});

// GET /api/users/alerts/:userId - Alertes de l'utilisateur
router.get('/alerts/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur demande ses propres alertes
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const pool = require('../utils/database');

        // Récupérer les alertes personnelles
        const alertsQuery = `
            SELECT 
                'OBJECTIF' as type,
                'Objectif heures non atteint' as titre,
                'Vous êtes à 75% de votre objectif mensuel' as message,
                'WARNING' as severity,
                NOW() as created_at
            WHERE EXISTS (
                SELECT 1 FROM time_entries te 
                WHERE te.user_id = $1 
                AND te.date_saisie >= DATE_TRUNC('month', CURRENT_DATE)
                AND te.date_saisie < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                HAVING COALESCE(SUM(te.heures), 0) < 160
            )
            UNION ALL
            SELECT 
                'MISSION' as type,
                'Mission en retard' as titre,
                'La mission "Développement Frontend" est en retard' as message,
                'URGENT' as severity,
                NOW() as created_at
            WHERE EXISTS (
                SELECT 1 FROM missions m 
                WHERE m.date_fin < CURRENT_DATE 
                AND m.statut = 'EN_COURS'
            )
            UNION ALL
            SELECT 
                'PERFORMANCE' as type,
                'Performance excellente' as titre,
                'Vous avez dépassé votre objectif de facturation' as message,
                'SUCCESS' as severity,
                NOW() as created_at
            WHERE EXISTS (
                SELECT 1 FROM time_entries te 
                WHERE te.user_id = $1 
                AND te.date_saisie >= DATE_TRUNC('month', CURRENT_DATE)
                AND te.date_saisie < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                HAVING COALESCE(SUM(te.heures), 0) > 160
            )
            LIMIT 5
        `;

        const alertsResult = await pool.query(alertsQuery, [userId]);

        // Si pas d'alertes réelles, retourner des alertes simulées
        let alerts = alertsResult.rows;
        if (alerts.length === 0) {
            alerts = [
                {
                    type: 'OBJECTIF',
                    titre: 'Objectif heures non atteint',
                    message: 'Vous êtes à 75% de votre objectif mensuel',
                    severity: 'WARNING',
                    created_at: new Date().toISOString()
                },
                {
                    type: 'PERFORMANCE',
                    titre: 'Performance excellente',
                    message: 'Vous avez dépassé votre objectif de facturation',
                    severity: 'SUCCESS',
                    created_at: new Date().toISOString()
                }
            ];
        }

        res.json({
            success: true,
            data: alerts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des alertes',
            error: error.message
        });
    }
});

/**
 * GET /api/users/:id/roles
 * Récupérer les rôles d'un utilisateur
 */
router.get('/:id/roles', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 [GET /api/users/:id/roles] Début de la requête');
        const userId = req.params.id;
        console.log(`📋 User ID: ${userId}`);
        console.log(`👤 Utilisateur authentifié: ${req.user?.nom} ${req.user?.prenom} (${req.user?.id})`);

        console.log('🔄 Appel de User.getRoles()...');
        let roles = await User.getRoles(userId);
        console.log(`✅ Rôles récupérés: ${roles.length}`);
        console.log('📊 Rôles:', JSON.stringify(roles, null, 2));

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer le rôle SUPER_ADMIN pour les non-SUPER_ADMIN
        const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);
        if (!isCurrentSuperAdmin) {
            const originalLength = roles.length;
            roles = roles.filter(r => r.name !== 'SUPER_ADMIN');
            if (originalLength > roles.length) {
                console.log('🔒 SUPER_ADMIN filtré de la liste des rôles');
            }
        }

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('❌ [GET /api/users/:id/roles] ERREUR:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        console.error('   Code:', error.code);
        console.error('   Details:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des rôles',
            error: error.message
        });
    }
});

/**
 * POST /api/users/:id/roles
 * Ajouter un rôle à un utilisateur
 */
router.post('/:id/roles', superAdminActionLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { roleId } = req.body;

        if (!roleId) {
            return res.status(400).json({
                success: false,
                message: 'ID du rôle requis'
            });
        }

        // Récupérer le nom du rôle
        const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
        const roleName = roleResult.rows[0]?.name;

        // 🔒 PROTECTION: Empêcher l'attribution du rôle SUPER_ADMIN par des non-SUPER_ADMIN
        if (roleName === 'SUPER_ADMIN') {
            const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);

            if (!isCurrentSuperAdmin) {
                await logSuperAdminAction(
                    req.user.id,
                    'SUPER_ADMIN_UNAUTHORIZED_ROLE_GRANT_ATTEMPT',
                    userId,
                    { role: 'SUPER_ADMIN' },
                    req
                );

                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé',
                    reason: 'Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN'
                });
            }

            // 📝 AUDIT: Enregistrer l'attribution du rôle SUPER_ADMIN
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_ROLE_GRANTED',
                userId,
                { role: 'SUPER_ADMIN' },
                req
            );
        }

        const result = await User.addRole(userId, roleId);

        if (result) {
            res.json({
                success: true,
                message: 'Rôle ajouté avec succès',
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Erreur lors de l\'ajout du rôle'
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du rôle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'ajout du rôle',
            error: error.message
        });
    }
});

/**
 * DELETE /api/users/:id/roles/:roleId
 * Retirer un rôle d'un utilisateur
 */
router.delete('/:id/roles/:roleId', superAdminActionLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const roleId = req.params.roleId;

        // Récupérer le nom du rôle
        const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
        const roleName = roleResult.rows[0]?.name;

        // 🔒 PROTECTION: Empêcher la révocation du rôle SUPER_ADMIN par des non-SUPER_ADMIN
        if (roleName === 'SUPER_ADMIN') {
            const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);

            if (!isCurrentSuperAdmin) {
                await logSuperAdminAction(
                    req.user.id,
                    'SUPER_ADMIN_UNAUTHORIZED_ROLE_REVOKE_ATTEMPT',
                    userId,
                    { role: 'SUPER_ADMIN' },
                    req
                );

                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé',
                    reason: 'Seul un SUPER_ADMIN peut retirer le rôle SUPER_ADMIN'
                });
            }

            // 🔒 PROTECTION: Empêcher la révocation du dernier SUPER_ADMIN
            const canRemove = await canRemoveLastSuperAdmin(userId);
            if (!canRemove.allowed) {
                await logSuperAdminAction(
                    req.user.id,
                    'SUPER_ADMIN_LAST_ADMIN_REVOKE_ATTEMPT',
                    userId,
                    { reason: canRemove.reason },
                    req
                );

                return res.status(400).json({
                    success: false,
                    message: 'Opération interdite',
                    reason: canRemove.reason
                });
            }

            // 📝 AUDIT: Enregistrer la révocation du rôle SUPER_ADMIN
            await logSuperAdminAction(
                req.user.id,
                'SUPER_ADMIN_ROLE_REVOKED',
                userId,
                { role: 'SUPER_ADMIN' },
                req
            );
        }

        const result = await User.removeRole(userId, roleId);

        if (result) {
            res.json({
                success: true,
                message: 'Rôle retiré avec succès',
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Erreur lors de la suppression du rôle'
            });
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du rôle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du rôle',
            error: error.message
        });
    }
});

/**
 * GET /api/users/me/bu-access
 * Récupérer les Business Units auxquelles l'utilisateur connecté a accès
 */
router.get('/me/bu-access', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 [GET /api/users/me/bu-access] Utilisateur:', req.user.id);

        // Récupérer les BU autorisées depuis user_business_unit_access
        const sql = `
            SELECT DISTINCT bu.id, bu.nom
            FROM user_business_unit_access ubua
            JOIN business_units bu ON bu.id = ubua.business_unit_id
            WHERE ubua.user_id = $1 AND ubua.granted = true
            ORDER BY bu.nom
        `;
        const result = await pool.query(sql, [req.user.id]);

        // Si aucune BU spécifique, l'utilisateur a accès à toutes
        const hasAllAccess = result.rows.length === 0;

        console.log(`✅ BU Access: ${hasAllAccess ? 'ALL' : result.rows.length + ' BU'}`);

        res.json({
            success: true,
            data: {
                hasAllAccess,
                businessUnits: result.rows
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des BU access:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

module.exports = router; 