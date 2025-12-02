const { pool } = require('../utils/database');

/**
 * Middleware pour vérifier les permissions d'accès aux pages
 * Basé sur la configuration des permissions dans /permissions-admin.html
 */
const checkPagePermission = (pageName) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            // SUPER_ADMIN a accès à tout
            if (req.user.role === 'SUPER_ADMIN' ||
                (req.user.roles && req.user.roles.includes('SUPER_ADMIN'))) {
                return next();
            }

            // Format du code de permission: 'page.{pageName}'
            const permissionCode = `page.${pageName}`;

            // Vérifier les permissions dans la base de données via les rôles de l'utilisateur
            const permissionQuery = `
                SELECT DISTINCT p.code, p.name, p.description
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1 AND p.code = $2
            `;

            const result = await pool.query(permissionQuery, [req.user.id, permissionCode]);

            if (result.rows.length > 0) {
                console.log(`✅ Accès autorisé pour l'utilisateur ${req.user.id} à la page ${pageName} (permission: ${result.rows[0].name})`);
                return next();
            }

            // Vérifier si la permission existe en base de données
            const permissionExistsQuery = `
                SELECT code, name 
                FROM permissions 
                WHERE code = $1
            `;

            const permissionExistsResult = await pool.query(permissionExistsQuery, [permissionCode]);

            if (permissionExistsResult.rows.length > 0) {
                // La permission existe mais l'utilisateur ne l'a pas
                console.log(`❌ Accès refusé pour l'utilisateur ${req.user.id} à la page ${pageName} (permission configurée mais non accordée)`);
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé à cette page',
                    requiredPermission: permissionCode
                });
            }

            // Si la permission n'existe pas en base de données,
            // autoriser l'accès par défaut pour tous les utilisateurs authentifiés
            console.log(`✅ Accès autorisé par défaut pour l'utilisateur ${req.user.id} à la page ${pageName} (permission non configurée)`);
            return next();

        } catch (error) {
            console.error('Erreur lors de la vérification des permissions:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification des permissions'
            });
        }
    };
};

/**
 * Vérifier l'accès par défaut basé sur les rôles
 */
const checkDefaultPageAccess = async (userRole, pageName) => {
    const defaultPermissions = {
        // Pages très sensibles - ADMIN et ADMIN_IT seulement
        'users': ['SUPER_ADMIN', 'ADMIN', 'ADMIN_IT'],
        'permissions-admin': ['SUPER_ADMIN', 'ADMIN'],

        // Pages modérément sensibles - MANAGER et plus
        'dashboard-direction': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'dashboard-rentabilite': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'invoices': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'taux-horaires': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'reports': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'analytics': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'missions': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],

        // Pages standard - tous les utilisateurs authentifiés
        'collaborateurs': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'dashboard': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'time-sheet': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'prospecting': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN']
    };

    const allowedRoles = defaultPermissions[pageName];
    if (!allowedRoles) {
        // Si la page n'est pas dans la liste, accès par défaut pour tous les utilisateurs authentifiés
        return true;
    }

    return allowedRoles.includes(userRole);
};

/**
 * Middleware pour vérifier les permissions d'API
 */
const checkApiPermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            // SUPER_ADMIN a accès à tout
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Vérifier les permissions dans la base de données
            const permissionQuery = `
                SELECT p.name, p.description
                FROM permissions p
                JOIN user_permissions up ON p.id = up.permission_id
                WHERE up.user_id = $1 AND p.name = $2
                UNION
                SELECT p.name, p.description
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1 AND p.name = $2
            `;

            const result = await pool.query(permissionQuery, [req.user.id, permissionName]);

            if (result.rows.length > 0) {
                console.log(`✅ Permission API accordée pour l'utilisateur ${req.user.id}: ${permissionName}`);
                return next();
            }

            // Vérifier les permissions par défaut basées sur les rôles
            const hasDefaultPermission = await checkDefaultApiPermission(req.user.role, permissionName);
            if (hasDefaultPermission) {
                console.log(`✅ Permission API accordée par rôle par défaut pour ${req.user.role}: ${permissionName}`);
                return next();
            }

            console.log(`❌ Permission API refusée pour l'utilisateur ${req.user.id} (rôle: ${req.user.role}): ${permissionName}`);
            return res.status(403).json({
                success: false,
                message: 'Permission insuffisante pour cette action',
                requiredPermission: permissionName
            });

        } catch (error) {
            console.error('Erreur lors de la vérification des permissions API:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification des permissions'
            });
        }
    };
};

/**
 * Vérifier les permissions API par défaut basées sur les rôles
 */
const checkDefaultApiPermission = async (userRole, permissionName) => {
    const defaultApiPermissions = {
        // Permissions très sensibles
        'users.create': ['ADMIN', 'ADMIN_IT'],
        'users.update': ['ADMIN', 'ADMIN_IT'],
        'users.delete': ['ADMIN'],
        'users.generate-account': ['ADMIN', 'ADMIN_IT'],

        // Permissions de gestion RH
        'collaborateurs.create': ['ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER'],
        'collaborateurs.update': ['ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER'],
        'collaborateurs.delete': ['ADMIN'],
        'collaborateurs.rh': ['ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER'],

        // Permissions de gestion des grades
        'grades.create': ['ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER'],
        'grades.update': ['ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER'],
        'grades.delete': ['ADMIN'],

        // Permissions de gestion des missions
        'missions.create': ['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'missions.update': ['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'missions.delete': ['ADMIN'],

        // Permissions financières
        'invoices.create': ['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'invoices.update': ['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
        'invoices.delete': ['ADMIN'],
        'rates.update': ['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN']
    };

    const allowedRoles = defaultApiPermissions[permissionName];
    if (!allowedRoles) {
        // Si la permission n'est pas dans la liste, accès par défaut pour tous les utilisateurs authentifiés
        return true;
    }

    return allowedRoles.includes(userRole);
};

/**
 * Middleware pour vérifier si l'utilisateur peut accéder à une page (côté client)
 */
const checkClientPageAccess = async (pageName) => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        const response = await fetch('/api/auth/check-page-permission', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pageName })
        });

        if (response.ok) {
            const result = await response.json();
            return result.success;
        }

        return false;
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions côté client:', error);
        return false;
    }
};

module.exports = {
    checkPagePermission,
    checkApiPermission,
    checkClientPageAccess,
    checkDefaultPageAccess,
    checkDefaultApiPermission
};
