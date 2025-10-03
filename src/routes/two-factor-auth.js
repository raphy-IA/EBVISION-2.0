const express = require('express');
const router = express.Router();
const TwoFactorAuthService = require('../services/twoFactorAuth');
const { authenticateToken } = require('../middleware/auth');

/**
 * Routes pour l'authentification à deux facteurs (2FA)
 */

// Générer un secret 2FA et QR Code
router.post('/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        // Vérifier si le 2FA est déjà activé
        const isEnabled = await TwoFactorAuthService.is2FAEnabled(userId);
        if (isEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA déjà activé pour cet utilisateur'
            });
        }
        
        // Générer le secret et le QR Code
        const secretData = await TwoFactorAuthService.generateSecret(userId, userEmail);
        const qrCodeDataURL = await TwoFactorAuthService.generateQRCode(secretData.qrCodeUrl);
        
        res.json({
            success: true,
            message: 'Secret 2FA généré avec succès',
            data: {
                secret: secretData.secret,
                qrCode: qrCodeDataURL,
                manualEntryKey: secretData.manualEntryKey
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la génération du secret 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération du secret 2FA'
        });
    }
});

// Activer le 2FA après validation du premier code
router.post('/enable', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Code 2FA requis'
            });
        }
        
        const result = await TwoFactorAuthService.enable2FA(userId, token);
        
        if (result.success) {
            // Générer des codes de récupération
            const backupCodes = await TwoFactorAuthService.generateBackupCodes(userId);
            
            res.json({
                success: true,
                message: '2FA activé avec succès',
                data: {
                    backupCodes: backupCodes
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'activation du 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'activation du 2FA'
        });
    }
});

// Désactiver le 2FA
router.post('/disable', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Code 2FA requis pour désactiver'
            });
        }
        
        const result = await TwoFactorAuthService.disable2FA(userId, token);
        
        res.json({
            success: result.success,
            message: result.message
        });
        
    } catch (error) {
        console.error('Erreur lors de la désactivation du 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la désactivation du 2FA'
        });
    }
});

// Vérifier le statut du 2FA
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isEnabled = await TwoFactorAuthService.is2FAEnabled(userId);
        
        res.json({
            success: true,
            data: {
                enabled: isEnabled
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la vérification du statut 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du statut 2FA'
        });
    }
});

// Vérifier un code 2FA (pour la connexion)
router.post('/verify', async (req, res) => {
    try {
        const { userId, token } = req.body;
        
        if (!userId || !token) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur et code 2FA requis'
            });
        }
        
        const result = await TwoFactorAuthService.verifyToken(userId, token);
        
        res.json({
            success: result.success,
            message: result.message
        });
        
    } catch (error) {
        console.error('Erreur lors de la vérification du code 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du code 2FA'
        });
    }
});

// Vérifier un code de récupération
router.post('/verify-backup', async (req, res) => {
    try {
        const { userId, backupCode } = req.body;
        
        if (!userId || !backupCode) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur et code de récupération requis'
            });
        }
        
        const isValid = await TwoFactorAuthService.verifyBackupCode(userId, backupCode);
        
        res.json({
            success: isValid,
            message: isValid ? 'Code de récupération valide' : 'Code de récupération invalide'
        });
        
    } catch (error) {
        console.error('Erreur lors de la vérification du code de récupération:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du code de récupération'
        });
    }
});

// Régénérer les codes de récupération
router.post('/regenerate-backup-codes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Code 2FA requis'
            });
        }
        
        // Vérifier le code 2FA
        const verification = await TwoFactorAuthService.verifyToken(userId, token);
        
        if (verification.success) {
            // Générer de nouveaux codes de récupération
            const backupCodes = await TwoFactorAuthService.generateBackupCodes(userId);
            
            res.json({
                success: true,
                message: 'Codes de récupération régénérés avec succès',
                data: {
                    backupCodes: backupCodes
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Code 2FA invalide'
            });
        }
        
    } catch (error) {
        console.error('Erreur lors de la régénération des codes de récupération:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la régénération des codes de récupération'
        });
    }
});

module.exports = router;

