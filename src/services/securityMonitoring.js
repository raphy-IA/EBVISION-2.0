const { pool } = require('../utils/database');
const fs = require('fs');
const path = require('path');

/**
 * Service de monitoring de sécurité
 * Surveille les tentatives de connexion, les erreurs, et les activités suspectes
 */
class SecurityMonitoringService {
    
    /**
     * Enregistrer une tentative de connexion
     */
    static async logLoginAttempt(userId, email, success, ipAddress, userAgent, reason = null) {
        try {
            await pool.query(`
                INSERT INTO security_logs (user_id, email, action, success, ip_address, user_agent, reason, created_at)
                VALUES ($1, $2, 'LOGIN_ATTEMPT', $3, $4, $5, $6, CURRENT_TIMESTAMP)
            `, [userId, email, success, ipAddress, userAgent, reason]);
            
            // Si échec, vérifier les tentatives suspectes
            if (!success) {
                await this.checkSuspiciousActivity(email, ipAddress);
            }
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la tentative de connexion:', error);
        }
    }
    
    /**
     * Enregistrer une tentative 2FA
     */
    static async log2FAAttempt(userId, success, attemptType, ipAddress, userAgent) {
        try {
            await pool.query(`
                INSERT INTO two_factor_attempts (user_id, attempt_type, success, ip_address, user_agent, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            `, [userId, attemptType, success, ipAddress, userAgent]);
            
            // Si échec, vérifier les tentatives suspectes
            if (!success) {
                await this.checkSuspicious2FA(userId, ipAddress);
            }
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la tentative 2FA:', error);
        }
    }
    
    /**
     * Enregistrer une action sensible
     */
    static async logSensitiveAction(userId, action, details, ipAddress, userAgent) {
        try {
            await pool.query(`
                INSERT INTO security_logs (user_id, action, success, ip_address, user_agent, details, created_at)
                VALUES ($1, $2, true, $3, $4, $5, CURRENT_TIMESTAMP)
            `, [userId, action, ipAddress, userAgent, JSON.stringify(details)]);
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de l\'action sensible:', error);
        }
    }
    
    /**
     * Vérifier les activités suspectes
     */
    static async checkSuspiciousActivity(email, ipAddress) {
        try {
            // Vérifier les tentatives de connexion échouées récentes
            const failedAttempts = await pool.query(`
                SELECT COUNT(*) as count
                FROM security_logs
                WHERE (email = $1 OR ip_address = $2)
                AND action = 'LOGIN_ATTEMPT'
                AND success = false
                AND created_at > NOW() - INTERVAL '1 hour'
            `, [email, ipAddress]);
            
            const count = parseInt(failedAttempts.rows[0].count);
            
            if (count >= 5) {
                await this.triggerSecurityAlert('MULTIPLE_FAILED_LOGINS', {
                    email,
                    ipAddress,
                    failedAttempts: count,
                    timeWindow: '1 hour'
                });
            }
            
            // Vérifier les tentatives depuis différentes IPs
            const differentIPs = await pool.query(`
                SELECT COUNT(DISTINCT ip_address) as count
                FROM security_logs
                WHERE email = $1
                AND action = 'LOGIN_ATTEMPT'
                AND success = false
                AND created_at > NOW() - INTERVAL '1 hour'
            `, [email]);
            
            const ipCount = parseInt(differentIPs.rows[0].count);
            
            if (ipCount >= 3) {
                await this.triggerSecurityAlert('MULTIPLE_IP_ATTEMPTS', {
                    email,
                    ipCount,
                    timeWindow: '1 hour'
                });
            }
            
        } catch (error) {
            console.error('Erreur lors de la vérification des activités suspectes:', error);
        }
    }
    
    /**
     * Vérifier les tentatives 2FA suspectes
     */
    static async checkSuspicious2FA(userId, ipAddress) {
        try {
            const failed2FA = await pool.query(`
                SELECT COUNT(*) as count
                FROM two_factor_attempts
                WHERE user_id = $1
                AND success = false
                AND created_at > NOW() - INTERVAL '30 minutes'
            `, [userId]);
            
            const count = parseInt(failed2FA.rows[0].count);
            
            if (count >= 3) {
                await this.triggerSecurityAlert('MULTIPLE_FAILED_2FA', {
                    userId,
                    ipAddress,
                    failedAttempts: count,
                    timeWindow: '30 minutes'
                });
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des tentatives 2FA suspectes:', error);
        }
    }
    
    /**
     * Déclencher une alerte de sécurité
     */
    static async triggerSecurityAlert(alertType, details) {
        try {
            // Enregistrer l'alerte
            await pool.query(`
                INSERT INTO security_alerts (alert_type, details, severity, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, [alertType, JSON.stringify(details), this.getAlertSeverity(alertType)]);
            
            // Log l'alerte
            console.warn(`🚨 ALERTE SÉCURITÉ: ${alertType}`, details);
            
            // Actions automatiques selon le type d'alerte
            switch (alertType) {
                case 'MULTIPLE_FAILED_LOGINS':
                    await this.temporaryBlockIP(details.ipAddress, 30); // 30 minutes
                    break;
                case 'MULTIPLE_FAILED_2FA':
                    await this.temporaryBlockUser(details.userId, 15); // 15 minutes
                    break;
            }
            
        } catch (error) {
            console.error('Erreur lors du déclenchement de l\'alerte de sécurité:', error);
        }
    }
    
    /**
     * Bloquer temporairement une IP
     */
    static async temporaryBlockIP(ipAddress, minutes) {
        try {
            const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
            
            await pool.query(`
                INSERT INTO blocked_ips (ip_address, reason, expires_at, created_at)
                VALUES ($1, 'Multiple failed login attempts', $2, CURRENT_TIMESTAMP)
                ON CONFLICT (ip_address) DO UPDATE SET
                expires_at = $2,
                updated_at = CURRENT_TIMESTAMP
            `, [ipAddress, expiresAt]);
            
            console.log(`🔒 IP ${ipAddress} bloquée temporairement pour ${minutes} minutes`);
        } catch (error) {
            console.error('Erreur lors du blocage de l\'IP:', error);
        }
    }
    
    /**
     * Bloquer temporairement un utilisateur
     */
    static async temporaryBlockUser(userId, minutes) {
        try {
            const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
            
            await pool.query(`
                UPDATE users 
                SET blocked_until = $1, 
                    block_reason = 'Multiple failed 2FA attempts',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [expiresAt, userId]);
            
            console.log(`🔒 Utilisateur ${userId} bloqué temporairement pour ${minutes} minutes`);
        } catch (error) {
            console.error('Erreur lors du blocage de l\'utilisateur:', error);
        }
    }
    
    /**
     * Vérifier si une IP est bloquée
     */
    static async isIPBlocked(ipAddress) {
        try {
            const result = await pool.query(`
                SELECT expires_at, reason
                FROM blocked_ips
                WHERE ip_address = $1
                AND expires_at > NOW()
            `, [ipAddress]);
            
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Erreur lors de la vérification du blocage IP:', error);
            return null;
        }
    }
    
    /**
     * Vérifier si un utilisateur est bloqué
     */
    static async isUserBlocked(userId) {
        try {
            const result = await pool.query(`
                SELECT blocked_until, block_reason
                FROM users
                WHERE id = $1
                AND blocked_until > NOW()
            `, [userId]);
            
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Erreur lors de la vérification du blocage utilisateur:', error);
            return null;
        }
    }
    
    /**
     * Obtenir la sévérité d'une alerte
     */
    static getAlertSeverity(alertType) {
        const severityMap = {
            'MULTIPLE_FAILED_LOGINS': 'HIGH',
            'MULTIPLE_IP_ATTEMPTS': 'HIGH',
            'MULTIPLE_FAILED_2FA': 'MEDIUM',
            'SUSPICIOUS_ACTIVITY': 'MEDIUM',
            'UNAUTHORIZED_ACCESS': 'CRITICAL'
        };
        
        return severityMap[alertType] || 'LOW';
    }
    
    /**
     * Générer un rapport de sécurité
     */
    static async generateSecurityReport(days = 7) {
        try {
            const report = {
                period: `${days} derniers jours`,
                generatedAt: new Date(),
                summary: {},
                alerts: [],
                topThreats: [],
                recommendations: []
            };
            
            // Statistiques générales
            const stats = await pool.query(`
                SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_attempts,
                    COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT user_id) as unique_users
                FROM security_logs
                WHERE created_at > NOW() - INTERVAL '${days} days'
            `);
            
            report.summary = stats.rows[0];
            
            // Alertes récentes
            const alerts = await pool.query(`
                SELECT alert_type, severity, details, created_at
                FROM security_alerts
                WHERE created_at > NOW() - INTERVAL '${days} days'
                ORDER BY created_at DESC
                LIMIT 10
            `);
            
            report.alerts = alerts.rows;
            
            // Top des IPs suspectes
            const topIPs = await pool.query(`
                SELECT ip_address, COUNT(*) as attempts
                FROM security_logs
                WHERE success = false
                AND created_at > NOW() - INTERVAL '${days} days'
                GROUP BY ip_address
                ORDER BY attempts DESC
                LIMIT 5
            `);
            
            report.topThreats = topIPs.rows;
            
            // Recommandations
            if (report.summary.failed_attempts > 100) {
                report.recommendations.push('Considérer l\'activation du rate limiting plus strict');
            }
            
            if (report.alerts.filter(a => a.severity === 'CRITICAL').length > 0) {
                report.recommendations.push('Examiner immédiatement les alertes critiques');
            }
            
            return report;
        } catch (error) {
            console.error('Erreur lors de la génération du rapport de sécurité:', error);
            throw error;
        }
    }
}

module.exports = SecurityMonitoringService;


