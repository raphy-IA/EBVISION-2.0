const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

/**
 * POST /api/auth/check-page-permission
 * Vérifier si l'utilisateur peut accéder à une page
 */
router.post('/check-page-permission', authenticateToken, async (req, res) => {
    try {
        const { pageName } = req.body;

        console.log('🔐 [check-page-permission] Vérification d\'accès pour:', pageName);
        console.log('   👤 User ID:', req.user.id);
        console.log('   📋 req.user.role:', req.user.role);
        console.log('   📋 req.user.roles:', req.user.roles);

        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'Nom de page requis'
            });
        }

        // SUPER_ADMIN a accès à tout
        // Vérifier à la fois req.user.role (string) et req.user.roles (array)
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN' ||
            (req.user.roles && req.user.roles.includes('SUPER_ADMIN'));

        console.log('   🔍 isSuperAdmin:', isSuperAdmin);

        if (isSuperAdmin) {
            console.log('   ✅ Accès autorisé (SUPER_ADMIN)');
            return res.json({
                success: true,
                message: 'Accès autorisé (SUPER_ADMIN)',
                pageName
            });
        }

        // 🔒 PROTECTION SPÉCIALE pour permissions-admin 
        // Cette page doit TOUJOURS être limitée à SUPER_ADMIN, ADMIN, ADMIN_IT
        // indépendamment de la configuration en base de données
        if (pageName === 'permissions-admin') {
            const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_IT'];
            const hasAccess = req.user.roles && req.user.roles.some(role => allowedRoles.includes(role));

            if (hasAccess) {
                console.log('   ✅ Accès autorisé à permissions-admin (protection hardcodée)');
                return res.json({
                    success: true,
                    message: 'Accès autorisé (protection spéciale permissions-admin)',
                    pageName,
                    userRoles: req.user.roles
                });
            } else {
                console.log('   ❌ Accès refusé à permissions-admin (protection hardcodée)');
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé à l\'administration des permissions',
                    pageName,
                    userRoles: req.user.roles,
                    requiredRoles: allowedRoles
                });
            }
        }

        // Vérifier les permissions dans la base de données
        // Format du code de permission: 'page.{pageName}'
        const permissionCode = `page.${pageName}`;

        console.log('   🔍 Recherche de la permission:', permissionCode);

        const permissionQuery = `
            SELECT DISTINCT p.code, p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1 
              AND p.code = $2
        `;

        const permissionResult = await pool.query(permissionQuery, [req.user.id, permissionCode]);

        if (permissionResult.rows.length > 0) {
            console.log('   ✅ Accès autorisé via permissions en base de données');
            console.log('   📋 Permission trouvée:', permissionResult.rows[0].name);
            return res.json({
                success: true,
                message: 'Accès autorisé via permission en base de données',
                pageName,
                userRoles: req.user.roles,
                permission: permissionResult.rows[0]
            });
        }

        // Si aucune permission n'est trouvée en base de données,
        // vérifier si la permission existe pour cette page
        const permissionExistsQuery = `
            SELECT code, name 
            FROM permissions 
            WHERE code = $1
        `;

        const permissionExistsResult = await pool.query(permissionExistsQuery, [permissionCode]);

        if (permissionExistsResult.rows.length > 0) {
            // La permission existe mais l'utilisateur ne l'a pas
            console.log('   ❌ Permission existe mais utilisateur ne l\'a pas');
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette page (permission configurée)',
                pageName,
                userRoles: req.user.roles,
                requiredPermission: permissionCode
            });
        }

        // Si la permission n'existe pas en base de données,
        // accès par défaut pour tous les utilisateurs authentifiés
        console.log('   ℹ️  Permission non configurée en base - accès autorisé par défaut');
        return res.json({
            success: true,
            message: 'Accès autorisé par défaut (permission non configurée)',
            pageName,
            userRoles: req.user.roles
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des permissions de page:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification des permissions'
        });
    }
});

module.exports = router;
