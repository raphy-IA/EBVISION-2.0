/**
 * Rate Limiter spécifique pour les actions sensibles SUPER_ADMIN
 */

const rateLimit = require('express-rate-limit');
const { isSuperAdmin } = require('../utils/superAdminHelper');

/**
 * Rate limiter pour les actions sensibles SUPER_ADMIN
 * Limite: 50 requêtes par 15 minutes par utilisateur
 */
const superAdminActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requêtes max
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Trop de requêtes sensibles. Veuillez réessayer dans 15 minutes.',
        reason: 'Rate limit dépassé pour les actions SUPER_ADMIN'
    },
    // Utiliser l'ID utilisateur comme clé pour le rate limiting
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    // Ne s'applique qu'aux actions SUPER_ADMIN sensibles
    skip: async (req) => {
        // Ne pas appliquer le rate limiting aux requêtes GET (lecture)
        if (req.method === 'GET') {
            return true;
        }
        
        // Appliquer uniquement aux actions de modification/suppression d'utilisateurs SUPER_ADMIN
        // ou d'attribution/révocation de rôles SUPER_ADMIN
        const targetUserId = req.params.id;
        const roleId = req.body?.roleId || req.params.roleId;
        
        if (!targetUserId && !roleId) {
            return true; // Pas d'action sensible détectée
        }
        
        try {
            // Vérifier si l'utilisateur cible est SUPER_ADMIN
            if (targetUserId) {
                const isTargetSuperAdmin = await isSuperAdmin(targetUserId);
                if (isTargetSuperAdmin) {
                    return false; // Appliquer le rate limiting
                }
            }
            
            // Vérifier si le rôle est SUPER_ADMIN
            if (roleId) {
                const { pool } = require('../utils/database');
                const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
                const roleName = roleResult.rows[0]?.name;
                
                if (roleName === 'SUPER_ADMIN') {
                    return false; // Appliquer le rate limiting
                }
            }
        } catch (error) {
            console.error('Erreur dans le rate limiter:', error);
        }
        
        return true; // Ne pas appliquer le rate limiting par défaut
    },
    // Handler personnalisé pour les dépassements
    handler: (req, res) => {
        console.warn(`⚠️  Rate limit dépassé pour l'utilisateur ${req.user?.id} (IP: ${req.ip})`);
        
        res.status(429).json({
            success: false,
            message: 'Trop de requêtes sensibles',
            reason: 'Vous avez effectué trop d\'actions sensibles en peu de temps. Veuillez patienter 15 minutes avant de réessayer.',
            retryAfter: '15 minutes'
        });
    }
});

/**
 * Rate limiter strict pour les tentatives d'accès non autorisées
 * Limite: 5 tentatives par heure par IP
 */
const unauthorizedAccessLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // 5 tentatives max
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Trop de tentatives d\'accès non autorisées',
        reason: 'Votre accès a été temporairement bloqué pour des raisons de sécurité'
    },
    keyGenerator: (req) => {
        return req.ip;
    },
    handler: (req, res) => {
        console.error(`🚨 ALERTE SÉCURITÉ: Tentatives d'accès non autorisées répétées depuis ${req.ip}`);
        
        // TODO: Envoyer une alerte email/SMS à l'équipe de sécurité
        
        res.status(429).json({
            success: false,
            message: 'Accès temporairement bloqué',
            reason: 'Trop de tentatives d\'accès non autorisées. Votre IP a été temporairement bloquée pour des raisons de sécurité.',
            retryAfter: '1 heure'
        });
    }
});

module.exports = {
    superAdminActionLimiter,
    unauthorizedAccessLimiter
};


