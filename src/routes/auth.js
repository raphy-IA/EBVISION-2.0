const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authValidation } = require('../utils/validators');
const { authenticateToken } = require('../middleware/auth');

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

        // Générer le token JWT avec permissions par défaut
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
        
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role, // Utiliser le rôle
                permissions: ['users:read', 'users:create', 'users:update', 'users:delete'] // Permissions par défaut
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                token,
                user: {
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    login: user.login,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de changement de mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        // Validation des données
        const { error, value } = authValidation.changePassword.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { currentPassword, newPassword } = value;
        const userId = req.user.id;

        // Récupérer l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier l'ancien mot de passe
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Hasher le nouveau mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe
        await User.updatePassword(userId, newPasswordHash);

        res.json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de vérification du token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token valide',
        data: {
            user: req.user
        }
    });
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
        console.log('Token de réinitialisation généré:', resetToken);

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

// Route de déconnexion
router.post('/logout', authenticateToken, (req, res) => {
    // En production, on pourrait invalider le token côté serveur
    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

module.exports = router; 