const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authValidation } = require('../utils/validators');
const { authenticateToken } = require('../middleware/auth');
const { setAuthCookie, clearAuthCookies, authenticateHybrid } = require('../middleware/cookieAuth');
const TwoFactorAuthService = require('../services/twoFactorAuth');
const PasswordPolicyService = require('../services/passwordPolicy');
const pool = require('../utils/database');

const router = express.Router();

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        // Validation des données
        const { error, value } = authValidation.login.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { email, password } = value;

        // Rechercher l'utilisateur par email ou login
        let user = await User.findByEmail(email);
        if (!user) {
            // Essayer par login
            user = await User.findByLogin(email);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Identifiant ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiant ou mot de passe incorrect'
            });
        }

        // Vérifier que l'utilisateur est actif
        if (user.statut !== 'ACTIF') {
            return res.status(401).json({
                success: false,
                message: 'Compte inactif'
            });
        }

        // Mettre à jour la dernière connexion
        await User.updateLastLogin(user.id);

        // Récupérer les rôles multiples de l'utilisateur
        const userRolesData = await User.getRoles(user.id);
        const userRoles = userRolesData.map(r => r.name); // Extraire juste les noms des rôles



        // Récupérer toutes les permissions de l'utilisateur via ses rôles pour le JWT
        const permissionsResult = await pool.query(`
            SELECT DISTINCT p.code
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [user.id]);
        const userPermissions = permissionsResult.rows.map(p => p.code);

        // Générer le token JWT avec les rôles multiples et les permissions réelles
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                roles: userRoles, // Rôles multiples au lieu d'un seul rôle
                permissions: userPermissions // Permissions réelles de la base
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Vérifier si l'utilisateur a le 2FA activé
        const is2FAEnabled = await TwoFactorAuthService.is2FAEnabled(user.id);

        if (is2FAEnabled) {
            // Si 2FA activé, ne pas connecter immédiatement
            // Retourner l'ID utilisateur pour la vérification 2FA
            res.json({
                success: true,
                message: 'Code 2FA requis',
                requires2FA: true,
                data: {
                    userId: user.id,
                    user: {
                        id: user.id,
                        nom: user.nom,
                        prenom: user.prenom,
                        email: user.email,
                        login: user.login,
                        roles: userRoles // Rôles multiples
                    }
                }
            });
        } else {
            // Si pas de 2FA, connexion normale
            setAuthCookie(res, token, user);

            res.json({
                success: true,
                message: 'Connexion réussie',
                requires2FA: false,
                data: {
                    token, // Ajouter le token pour compatibilité développement
                    user: {
                        id: user.id,
                        nom: user.nom,
                        prenom: user.prenom,
                        email: user.email,
                        login: user.login,
                        roles: userRoles // Rôles multiples
                    }
                }
            });
        }

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// La route /change-password est définie plus bas avec une validation complète

// La route /verify est maintenant définie plus bas avec authenticateHybrid

// Route pour récupérer le profil de l'utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer les informations du collaborateur associé si elles existent
        let collaborateurInfo = null;


        if (user.collaborateur_id) {
            try {
                const Collaborateur = require('../models/Collaborateur');
                collaborateurInfo = await Collaborateur.findById(user.collaborateur_id);

            } catch (error) {
                console.error('❌ Erreur lors de la récupération des informations collaborateur:', error);
            }
        } else {

        }

        // Récupérer tous les rôles de l'utilisateur depuis user_roles
        const rolesResult = await pool.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            ORDER BY r.name
        `, [user.id]);

        const userRoles = rolesResult.rows.map(r => r.name);


        // Récupérer toutes les permissions de l'utilisateur via ses rôles
        const permissionsResult = await pool.query(`
            SELECT DISTINCT p.code
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [user.id]);

        const userPermissions = permissionsResult.rows.map(p => p.code);


        // Récupérer toutes les BUs auxquelles l'utilisateur a accès
        const buAccessResult = await pool.query(`
            SELECT business_unit_id FROM user_business_unit_access WHERE user_id = $1 AND granted = true
            UNION
            SELECT business_unit_id FROM collaborateurs WHERE user_id = $1 AND business_unit_id IS NOT NULL
        `, [user.id]);

        const authorizedBuIds = buAccessResult.rows.map(r => r.business_unit_id);

        res.json({
            success: true,
            message: 'Profil récupéré avec succès',
            data: {
                user: {
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    login: user.login,
                    role: user.role, // Rôle legacy (pour compatibilité)
                    roles: userRoles, // Rôles multiples (nouveau système)
                    permissions: userPermissions, // Permissions calculées
                    authorized_bu_ids: authorizedBuIds, // Toutes les BUs autorisées
                    statut: user.statut,
                    collaborateur_id: user.collaborateur_id,
                    business_unit_id: user.business_unit_id || null,
                    business_unit_nom: user.business_unit_nom || null,
                    division_id: user.division_id || null,
                    division_nom: user.division_nom || null,
                    grade_nom: user.grade_nom || null,
                    poste_nom: user.poste_nom || null,
                    collaborateur_email: user.collaborateur_email || null,
                    collaborateur_photo_url: collaborateurInfo ? collaborateurInfo.photo_url : null
                }
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de mot de passe oublié
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email requis'
            });
        }

        // Rechercher l'utilisateur
        const user = await User.findByEmail(email);
        if (!user) {
            // Pour des raisons de sécurité, on ne révèle pas si l'email existe
            return res.json({
                success: true,
                message: 'Si cet email existe dans notre base, vous recevrez un lien de réinitialisation'
            });
        }

        // Générer un token de réinitialisation
        const resetToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // En production, on enverrait un email ici
        // Pour le développement, on retourne juste le token


        res.json({
            success: true,
            message: 'Si cet email existe dans notre base, vous recevrez un lien de réinitialisation'
        });

    } catch (error) {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de réinitialisation de mot de passe
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token et nouveau mot de passe requis'
            });
        }

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Hasher le nouveau mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe
        await User.updatePassword(decoded.userId, newPasswordHash);

        res.json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                message: 'Token invalide ou expiré'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de déconnexion unifiée
router.post('/logout', authenticateHybrid, async (req, res) => {
    try {
        const userId = req.user?.id;

        // Supprimer les cookies d'authentification
        clearAuthCookies(res);

        if (userId) {
            // Mettre à jour la dernière déconnexion
            await User.updateLastLogout(userId);
        }

        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la déconnexion'
        });
    }
});

// Route de vérification du token (support cookies et headers)
router.get('/verify', authenticateHybrid, (req, res) => {
    res.json({
        success: true,
        message: 'Token valide',
        user: {
            id: req.user.id,
            nom: req.user.nom,
            prenom: req.user.prenom,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Route pour changer le mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe actuel et nouveau mot de passe requis'
            });
        }

        // Récupérer l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Vérifier que le nouveau mot de passe est différent
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Le nouveau mot de passe doit être différent de l\'actuel'
            });
        }

        // Valider le nouveau mot de passe selon la politique
        const validation = await PasswordPolicyService.validatePasswordComplete(newPassword, {
            nom: user.nom,
            prenom: user.prenom,
            email: user.email
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Le nouveau mot de passe ne respecte pas la politique de sécurité',
                errors: validation.errors,
                suggestions: PasswordPolicyService.getPasswordSuggestions(validation)
            });
        }

        // Hasher le nouveau mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe en base
        await pool.query(
            'UPDATE users SET password = $1, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Mot de passe modifié avec succès',
            securityScore: validation.securityScore,
            strength: validation.strength
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de mot de passe'
        });
    }
});

// Route pour générer un mot de passe sécurisé
router.get('/generate-password', authenticateToken, (req, res) => {
    try {
        const length = parseInt(req.query.length) || 16;

        if (length < 8 || length > 128) {
            return res.status(400).json({
                success: false,
                message: 'La longueur doit être entre 8 et 128 caractères'
            });
        }

        const password = PasswordPolicyService.generateSecurePassword(length);
        const validation = PasswordPolicyService.validatePassword(password);

        res.json({
            success: true,
            data: {
                password,
                securityScore: validation.securityScore,
                strength: validation.strength
            }
        });

    } catch (error) {
        console.error('Erreur lors de la génération du mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération du mot de passe'
        });
    }
});

// Route pour valider un mot de passe
router.post('/validate-password', authenticateToken, (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe requis'
            });
        }

        const validation = PasswordPolicyService.validatePassword(password, {
            nom: req.user.nom,
            prenom: req.user.prenom,
            email: req.user.email
        });

        res.json({
            success: true,
            data: {
                isValid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                securityScore: validation.securityScore,
                strength: validation.strength,
                suggestions: PasswordPolicyService.getPasswordSuggestions(validation)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la validation du mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la validation du mot de passe'
        });
    }
});

// Route pour finaliser la connexion avec 2FA
router.post('/login-2fa', async (req, res) => {
    try {
        const { userId, token, backupCode } = req.body;

        if (!userId || (!token && !backupCode)) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur et code 2FA ou code de récupération requis'
            });
        }

        let isValid = false;

        if (token) {
            // Vérifier le code 2FA normal
            const result = await TwoFactorAuthService.verifyToken(userId, token);
            isValid = result.success;
        } else if (backupCode) {
            // Vérifier le code de récupération
            isValid = await TwoFactorAuthService.verifyBackupCode(userId, backupCode);
        }

        if (isValid) {
            // Récupérer les informations utilisateur
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            // Récupérer les rôles multiples de l'utilisateur
            const userRolesData = await User.getRoles(user.id);
            const userRoles = userRolesData.map(r => r.name); // Extraire juste les noms des rôles



            // Récupérer toutes les permissions de l'utilisateur via ses rôles pour le JWT final
            const permissionsResult = await pool.query(`
                SELECT DISTINCT p.code
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1
            `, [user.id]);
            const userPermissions = permissionsResult.rows.map(p => p.code);

            // Générer le token JWT final avec les permissions réelles
            const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
            const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

            const finalToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    nom: user.nom,
                    prenom: user.prenom,
                    roles: userRoles, // Rôles multiples au lieu d'un seul rôle
                    permissions: userPermissions // Permissions réelles de la base
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Définir les cookies sécurisés
            setAuthCookie(res, finalToken, user);

            res.json({
                success: true,
                message: 'Connexion 2FA réussie',
                data: {
                    token: finalToken,
                    user: {
                        id: user.id,
                        nom: user.nom,
                        prenom: user.prenom,
                        email: user.email,
                        login: user.login,
                        roles: userRoles // Rôles multiples
                    }
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Code 2FA ou code de récupération invalide'
            });
        }

    } catch (error) {
        console.error('Erreur lors de la connexion 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion 2FA'
        });
    }
});

module.exports = router; 