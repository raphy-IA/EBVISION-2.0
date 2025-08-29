const { pool } = require('./database');

class PermissionManager {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Vérifie si un utilisateur a une permission spécifique
     */
    async hasPermission(userId, permissionCode) {
        try {
            const client = await pool.connect();
            
            // Vérifier les permissions directes de l'utilisateur
            const userPermission = await client.query(`
                SELECT up.granted 
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1 AND p.code = $2
            `, [userId, permissionCode]);
            
            if (userPermission.rows.length > 0) {
                client.release();
                return userPermission.rows[0].granted;
            }
            
            // Vérifier les permissions via le rôle
            const rolePermission = await client.query(`
                SELECT rp.role_id
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                JOIN users u ON u.role_id = rp.role_id
                WHERE u.id = $1 AND p.code = $2
            `, [userId, permissionCode]);
            
            client.release();
            return rolePermission.rows.length > 0;
            
        } catch (error) {
            console.error('Erreur lors de la vérification des permissions:', error);
            return false;
        }
    }

    /**
     * Vérifie si un utilisateur a accès à une Business Unit
     */
    async hasBusinessUnitAccess(userId, businessUnitId, accessLevel = 'READ') {
        try {
            const client = await pool.connect();
            
            const access = await client.query(`
                SELECT access_level, granted
                FROM user_business_unit_access
                WHERE user_id = $1 AND business_unit_id = $2
            `, [userId, businessUnitId]);
            
            client.release();
            
            if (access.rows.length === 0 || !access.rows[0].granted) {
                return false;
            }
            
            const userAccessLevel = access.rows[0].access_level;
            
            // Hiérarchie des niveaux d'accès
            const levels = { 'READ': 1, 'WRITE': 2, 'ADMIN': 3 };
            const requiredLevel = levels[accessLevel] || 1;
            const userLevel = levels[userAccessLevel] || 0;
            
            return userLevel >= requiredLevel;
            
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'accès BU:', error);
            return false;
        }
    }

    /**
     * Récupère toutes les permissions d'un utilisateur
     */
    async getUserPermissions(userId) {
        try {
            const client = await pool.connect();
            
            // Permissions directes
            const directPermissions = await client.query(`
                SELECT p.code, p.name, p.category, up.granted
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1
            `, [userId]);
            
            // Permissions via le rôle
            const rolePermissions = await client.query(`
                SELECT DISTINCT p.code, p.name, p.category, true as granted
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                JOIN users u ON u.role_id = rp.role_id
                WHERE u.id = $1
            `, [userId]);
            
            client.release();
            
            // Combiner et dédupliquer
            const allPermissions = new Map();
            
            // Ajouter les permissions de rôle
            rolePermissions.rows.forEach(perm => {
                allPermissions.set(perm.code, {
                    code: perm.code,
                    name: perm.name,
                    category: perm.category,
                    granted: perm.granted
                });
            });
            
            // Les permissions directes écrasent celles du rôle
            directPermissions.rows.forEach(perm => {
                allPermissions.set(perm.code, {
                    code: perm.code,
                    name: perm.name,
                    category: perm.category,
                    granted: perm.granted
                });
            });
            
            return Array.from(allPermissions.values());
            
        } catch (error) {
            console.error('Erreur lors de la récupération des permissions:', error);
            return [];
        }
    }

    /**
     * Récupère les Business Units accessibles à un utilisateur
     */
    async getUserBusinessUnits(userId) {
        try {
            const client = await pool.connect();
            
            const businessUnits = await client.query(`
                SELECT bu.id, bu.name, uba.access_level, uba.granted
                FROM user_business_unit_access uba
                JOIN business_units bu ON uba.business_unit_id = bu.id
                WHERE uba.user_id = $1 AND uba.granted = true
            `, [userId]);
            
            client.release();
            return businessUnits.rows;
            
        } catch (error) {
            console.error('Erreur lors de la récupération des BU:', error);
            return [];
        }
    }

    /**
     * Vérifie si un utilisateur peut voir un élément d'une BU spécifique
     */
    async canAccessBusinessUnitElement(userId, businessUnitId, elementType = 'READ') {
        // D'abord vérifier l'accès à la BU
        const hasAccess = await this.hasBusinessUnitAccess(userId, businessUnitId, elementType);
        if (!hasAccess) {
            return false;
        }
        
        // Ensuite vérifier les permissions spécifiques selon le type d'élément
        const permissionMap = {
            'opportunities': 'opportunities.view',
            'campaigns': 'campaigns.view',
            'missions': 'missions.view',
            'clients': 'clients.view',
            'reports': 'reports.view'
        };
        
        const permissionCode = permissionMap[elementType];
        if (!permissionCode) {
            return true; // Si pas de permission spécifique, on se base sur l'accès BU
        }
        
        return await this.hasPermission(userId, permissionCode);
    }

    /**
     * Middleware pour vérifier les permissions dans les routes Express
     */
    requirePermission(permissionCode) {
        return async (req, res, next) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ error: 'Utilisateur non authentifié' });
                }
                
                const hasPermission = await this.hasPermission(userId, permissionCode);
                if (!hasPermission) {
                    return res.status(403).json({ error: 'Permission insuffisante' });
                }
                
                next();
            } catch (error) {
                console.error('Erreur dans le middleware de permissions:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        };
    }

    /**
     * Middleware pour vérifier l'accès à une Business Unit
     */
    requireBusinessUnitAccess(accessLevel = 'READ') {
        return async (req, res, next) => {
            try {
                const userId = req.user?.id;
                const businessUnitId = req.params.businessUnitId || req.body.businessUnitId;
                
                if (!userId) {
                    return res.status(401).json({ error: 'Utilisateur non authentifié' });
                }
                
                if (!businessUnitId) {
                    return res.status(400).json({ error: 'Business Unit ID requis' });
                }
                
                const hasAccess = await this.hasBusinessUnitAccess(userId, businessUnitId, accessLevel);
                if (!hasAccess) {
                    return res.status(403).json({ error: 'Accès insuffisant à cette Business Unit' });
                }
                
                next();
            } catch (error) {
                console.error('Erreur dans le middleware d\'accès BU:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        };
    }
}

// Instance singleton
const permissionManager = new PermissionManager();

module.exports = permissionManager;
