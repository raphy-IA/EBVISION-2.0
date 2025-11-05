const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { pool } = require('../utils/database');

/**
 * Service d'authentification à deux facteurs (2FA)
 * Utilise TOTP (Time-based One-Time Password) avec Google Authenticator
 */
class TwoFactorAuthService {
    
    /**
     * Générer un secret 2FA pour un utilisateur
     */
    static async generateSecret(userId, userEmail) {
        try {
            const secret = speakeasy.generateSecret({
                name: `EB-Vision 2.0 (${userEmail})`,
                issuer: 'EB-Vision 2.0',
                length: 32
            });
            
            // Sauvegarder le secret en base (temporairement, en attendant la validation)
            await pool.query(
                'UPDATE users SET two_factor_secret = $1, two_factor_enabled = false WHERE id = $2',
                [secret.base32, userId]
            );
            
            return {
                secret: secret.base32,
                qrCodeUrl: secret.otpauth_url,
                manualEntryKey: secret.base32
            };
        } catch (error) {
            console.error('Erreur lors de la génération du secret 2FA:', error);
            throw new Error('Impossible de générer le secret 2FA');
        }
    }
    
    /**
     * Générer un QR Code pour l'application d'authentification
     */
    static async generateQRCode(otpauthUrl) {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
            return qrCodeDataURL;
        } catch (error) {
            console.error('Erreur lors de la génération du QR Code:', error);
            throw new Error('Impossible de générer le QR Code');
        }
    }
    
    /**
     * Vérifier un code 2FA
     */
    static async verifyToken(userId, token) {
        try {
            // Récupérer le secret de l'utilisateur
            const result = await pool.query(
                'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Utilisateur non trouvé');
            }
            
            const user = result.rows[0];
            
            if (!user.two_factor_secret) {
                throw new Error('2FA non configuré pour cet utilisateur');
            }
            
            // Vérifier le token
            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: token,
                window: 2 // Tolérance de 2 périodes (60 secondes)
            });
            
            if (verified) {
                // Mettre à jour la dernière utilisation du 2FA
                await pool.query(
                    'UPDATE users SET last_2fa_used = CURRENT_TIMESTAMP WHERE id = $1',
                    [userId]
                );
                
                return {
                    success: true,
                    message: 'Code 2FA valide'
                };
            } else {
                return {
                    success: false,
                    message: 'Code 2FA invalide'
                };
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du token 2FA:', error);
            throw new Error('Erreur lors de la vérification du code 2FA');
        }
    }
    
    /**
     * Activer le 2FA pour un utilisateur (après validation du premier code)
     */
    static async enable2FA(userId, token) {
        try {
            // Vérifier le token
            const verification = await this.verifyToken(userId, token);
            
            if (verification.success) {
                // Activer le 2FA
                await pool.query(
                    'UPDATE users SET two_factor_enabled = true WHERE id = $1',
                    [userId]
                );
                
                return {
                    success: true,
                    message: '2FA activé avec succès'
                };
            } else {
                return {
                    success: false,
                    message: 'Code de validation invalide'
                };
            }
        } catch (error) {
            console.error('Erreur lors de l\'activation du 2FA:', error);
            throw new Error('Impossible d\'activer le 2FA');
        }
    }
    
    /**
     * Désactiver le 2FA pour un utilisateur
     */
    static async disable2FA(userId, token) {
        try {
            // Vérifier le token avant de désactiver
            const verification = await this.verifyToken(userId, token);
            
            if (verification.success) {
                // Désactiver le 2FA
                await pool.query(
                    'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
                    [userId]
                );
                
                return {
                    success: true,
                    message: '2FA désactivé avec succès'
                };
            } else {
                return {
                    success: false,
                    message: 'Code 2FA invalide'
                };
            }
        } catch (error) {
            console.error('Erreur lors de la désactivation du 2FA:', error);
            throw new Error('Impossible de désactiver le 2FA');
        }
    }
    
    /**
     * Vérifier si un utilisateur a le 2FA activé
     */
    static async is2FAEnabled(userId) {
        try {
            const result = await pool.query(
                'SELECT two_factor_enabled FROM users WHERE id = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return false;
            }
            
            return result.rows[0].two_factor_enabled === true;
        } catch (error) {
            console.error('Erreur lors de la vérification du statut 2FA:', error);
            return false;
        }
    }
    
    /**
     * Générer des codes de récupération (backup codes)
     */
    static async generateBackupCodes(userId) {
        try {
            const codes = [];
            for (let i = 0; i < 10; i++) {
                codes.push(this.generateRandomCode());
            }
            
            // Sauvegarder les codes (hashés) en base
            const hashedCodes = codes.map(code => this.hashBackupCode(code));
            await pool.query(
                'UPDATE users SET backup_codes = $1 WHERE id = $2',
                [JSON.stringify(hashedCodes), userId]
            );
            
            return codes;
        } catch (error) {
            console.error('Erreur lors de la génération des codes de récupération:', error);
            throw new Error('Impossible de générer les codes de récupération');
        }
    }
    
    /**
     * Vérifier un code de récupération
     */
    static async verifyBackupCode(userId, code) {
        try {
            const result = await pool.query(
                'SELECT backup_codes FROM users WHERE id = $1',
                [userId]
            );
            
            if (result.rows.length === 0 || !result.rows[0].backup_codes) {
                return false;
            }
            
            const hashedCodes = JSON.parse(result.rows[0].backup_codes);
            const hashedInputCode = this.hashBackupCode(code);
            
            const codeIndex = hashedCodes.indexOf(hashedInputCode);
            if (codeIndex !== -1) {
                // Supprimer le code utilisé
                hashedCodes.splice(codeIndex, 1);
                await pool.query(
                    'UPDATE users SET backup_codes = $1 WHERE id = $2',
                    [JSON.stringify(hashedCodes), userId]
                );
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Erreur lors de la vérification du code de récupération:', error);
            return false;
        }
    }
    
    /**
     * Générer un code aléatoire pour les codes de récupération
     */
    static generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Hasher un code de récupération
     */
    static hashBackupCode(code) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(code).digest('hex');
    }
}

module.exports = TwoFactorAuthService;












