/**
 * Utilitaires pour la gestion et la protection du rôle SUPER_ADMIN
 */

const { pool } = require('./database');

/**
 * Vérifie si un utilisateur est SUPER_ADMIN
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>}
 */
async function isSuperAdmin(userId) {
    try {
        // Vérifier dans les rôles multiples
        const userRolesResult = await pool.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [userId]);
        
        const userRoles = userRolesResult.rows.map(r => r.name);
        
        if (userRoles.includes('SUPER_ADMIN')) {
            return true;
        }
        
        // Vérifier le rôle principal (legacy)
        const userResult = await pool.query(`
            SELECT role FROM users WHERE id = $1
        `, [userId]);
        
        return userResult.rows[0]?.role === 'SUPER_ADMIN';
    } catch (error) {
        console.error('Erreur lors de la vérification du rôle SUPER_ADMIN:', error);
        return false;
    }
}

/**
 * Compte le nombre total de SUPER_ADMIN dans le système
 * @returns {Promise<number>}
 */
async function countSuperAdmins() {
    try {
        const result = await pool.query(`
            SELECT COUNT(DISTINCT ur.user_id) as count
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN'
            UNION
            SELECT COUNT(DISTINCT id) as count
            FROM users
            WHERE role = 'SUPER_ADMIN'
        `);
        
        // Additionner les comptes (éliminer les doublons se fait via DISTINCT dans les requêtes)
        return result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    } catch (error) {
        console.error('Erreur lors du comptage des SUPER_ADMIN:', error);
        return 0;
    }
}

/**
 * Récupère les rôles d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<string[]>}
 */
async function getUserRoles(userId) {
    try {
        const result = await pool.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [userId]);
        
        return result.rows.map(r => r.name);
    } catch (error) {
        console.error('Erreur lors de la récupération des rôles:', error);
        return [];
    }
}

/**
 * Enregistre une action sensible liée aux SUPER_ADMIN dans le journal d'audit
 * @param {string} userId - ID de l'utilisateur qui effectue l'action
 * @param {string} action - Type d'action
 * @param {string} targetUserId - ID de l'utilisateur cible (optionnel)
 * @param {object} details - Détails supplémentaires
 * @param {object} req - Objet request Express (pour IP et user-agent)
 */
async function logSuperAdminAction(userId, action, targetUserId, details, req) {
    try {
        const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const userAgent = req?.get?.('user-agent') || 'unknown';
        
        await pool.query(`
            INSERT INTO super_admin_audit_log 
            (user_id, action, target_user_id, details, ip_address, user_agent, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
            userId,
            action,
            targetUserId || null,
            JSON.stringify(details || {}),
            ipAddress,
            userAgent
        ]);
        
        console.log(`🔒 SUPER_ADMIN ACTION: ${action} by ${userId}`, details);
    } catch (error) {
        // Si la table n'existe pas encore, on log juste dans la console
        if (error.code === '42P01') { // Table does not exist
            console.warn('⚠️  Table super_admin_audit_log non trouvée. Action:', action, 'User:', userId);
        } else {
            console.error('Erreur lors de l\'enregistrement de l\'action SUPER_ADMIN:', error);
        }
    }
}

/**
 * Vérifie si l'utilisateur peut modifier/supprimer un autre utilisateur
 * @param {string} currentUserId - ID de l'utilisateur connecté
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canModifySuperAdmin(currentUserId, targetUserId) {
    try {
        const isCurrentSuperAdmin = await isSuperAdmin(currentUserId);
        const isTargetSuperAdmin = await isSuperAdmin(targetUserId);
        
        // Si la cible est SUPER_ADMIN et l'utilisateur courant ne l'est pas
        if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
            return {
                allowed: false,
                reason: 'Seul un SUPER_ADMIN peut modifier un autre SUPER_ADMIN'
            };
        }
        
        return { allowed: true };
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return {
            allowed: false,
            reason: 'Erreur lors de la vérification des permissions'
        };
    }
}

/**
 * Vérifie si le dernier SUPER_ADMIN peut être supprimé ou dégradé
 * @param {string} userId - ID du SUPER_ADMIN à vérifier
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canRemoveLastSuperAdmin(userId) {
    try {
        const isSA = await isSuperAdmin(userId);
        
        if (!isSA) {
            return { allowed: true }; // Pas un SUPER_ADMIN, pas de restriction
        }
        
        const count = await countSuperAdmins();
        
        if (count <= 1) {
            return {
                allowed: false,
                reason: 'Impossible de retirer le dernier SUPER_ADMIN. Au moins un SUPER_ADMIN doit toujours exister dans le système.'
            };
        }
        
        return { allowed: true };
    } catch (error) {
        console.error('Erreur lors de la vérification du dernier SUPER_ADMIN:', error);
        return {
            allowed: false,
            reason: 'Erreur lors de la vérification'
        };
    }
}

module.exports = {
    isSuperAdmin,
    countSuperAdmins,
    getUserRoles,
    logSuperAdminAction,
    canModifySuperAdmin,
    canRemoveLastSuperAdmin
};















