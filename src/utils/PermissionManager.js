const { pool } = require('./database');

class PermissionManager {
    /**
     * Récupérer les Business Units auxquelles un utilisateur a accès
     * @param {number} userId - ID de l'utilisateur
     * @returns {Array} Liste des Business Units avec leurs détails
     */
    static async getUserBusinessUnits(userId) {
        try {
            console.log(`🔍 [PermissionManager] Récupération des BU pour l'utilisateur ${userId}`);
            
            const query = `
                SELECT DISTINCT 
                    bu.id,
                    bu.nom as name,
                    bu.code,
                    bu.description,
                    CASE 
                        WHEN uba.user_id IS NOT NULL THEN uba.access_level
                        ELSE 'ADMIN'
                    END as access_level,
                    CASE 
                        WHEN uba.user_id IS NOT NULL THEN 'EXPLICIT'
                        ELSE 'COLLABORATEUR'
                    END as access_type
                FROM business_units bu
                LEFT JOIN user_business_unit_access uba ON bu.id = uba.business_unit_id AND uba.user_id = $1 AND uba.granted = true
                LEFT JOIN collaborateurs c ON c.user_id = $1
                WHERE 
                    -- Accès explicite via user_business_unit_access
                    (uba.user_id IS NOT NULL AND uba.granted = true)
                    OR 
                    -- Accès via collaborateur principal
                    (c.business_unit_id = bu.id)
                ORDER BY bu.nom
            `;
            
            const result = await pool.query(query, [userId]);
            console.log(`✅ [PermissionManager] ${result.rows.length} BU trouvées pour l'utilisateur ${userId}`);
            
            return result.rows;
        } catch (error) {
            console.error('❌ [PermissionManager] Erreur lors de la récupération des BU:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un utilisateur a accès à une Business Unit spécifique
     * @param {number} userId - ID de l'utilisateur
     * @param {number} businessUnitId - ID de la Business Unit
     * @returns {boolean} True si l'utilisateur a accès
     */
    static async hasBusinessUnitAccess(userId, businessUnitId) {
        try {
            const userBusinessUnits = await this.getUserBusinessUnits(userId);
            return userBusinessUnits.some(bu => bu.id === businessUnitId);
        } catch (error) {
            console.error('❌ [PermissionManager] Erreur lors de la vérification d\'accès BU:', error);
            return false;
        }
    }

    /**
     * Récupérer les permissions d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {Array} Liste des permissions
     */
    static async getUserPermissions(userId) {
        try {
            console.log(`🔍 [PermissionManager] Récupération des permissions pour l'utilisateur ${userId}`);
            
            const query = `
                SELECT DISTINCT p.*
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1
                ORDER BY p.name
            `;
            
            const result = await pool.query(query, [userId]);
            console.log(`✅ [PermissionManager] ${result.rows.length} permissions trouvées pour l'utilisateur ${userId}`);
            
            return result.rows;
        } catch (error) {
            console.error('❌ [PermissionManager] Erreur lors de la récupération des permissions:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un utilisateur a une permission spécifique
     * @param {number} userId - ID de l'utilisateur
     * @param {string} permissionCode - Code de la permission
     * @returns {boolean} True si l'utilisateur a la permission
     */
    static async hasPermission(userId, permissionCode) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1 AND p.code = $2
            `;
            
            const result = await pool.query(query, [userId, permissionCode]);
            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.error('❌ [PermissionManager] Erreur lors de la vérification de permission:', error);
            return false;
        }
    }

    /**
     * Récupérer le rôle principal d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {Object|null} Rôle principal ou null
     */
    static async getUserPrimaryRole(userId) {
        try {
            const query = `
                SELECT r.*
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = $1
                ORDER BY r.priority ASC
                LIMIT 1
            `;
            
            const result = await pool.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ [PermissionManager] Erreur lors de la récupération du rôle principal:', error);
            return null;
        }
    }
}

module.exports = PermissionManager;