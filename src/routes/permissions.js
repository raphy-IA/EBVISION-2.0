const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const permissionManager = require('../utils/PermissionManager');
const { authenticateToken } = require('../middleware/auth');

// Middleware temporaire pour permettre l'accès aux administrateurs existants
const requireAdminPermission = async (req, res, next) => {
    try {
        // Vérifier si l'utilisateur est déjà attaché à la requête (par le middleware JWT)
        if (req.user && req.user.id) {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            // Permettre l'accès pour SUPER_ADMIN, ADMIN, ADMINISTRATEUR, ou tout rôle contenant "admin"
            if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN') || userRoles.includes('ADMINISTRATEUR') ||
                userRoles.some(role => role.toLowerCase().includes('admin'))) {

                return next();
            }

            // Si les tables de permissions existent, essayer le nouveau système
            try {
                await permissionManager.hasPermission(userId, 'permissions.manage');
                return next();
            } catch (error) {
                // Si les tables n'existent pas encore, permettre l'accès aux administrateurs

                return next();
            }
        }

        // Si req.user n'existe pas, essayer de récupérer l'utilisateur depuis le token JWT
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const token = authHeader.substring(7);

        // Décoder le token JWT pour récupérer les informations utilisateur
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            const userRole = decoded.role;

            // Permettre l'accès pour ADMIN, ADMINISTRATEUR, ou tout rôle contenant "admin"
            if (userRole === 'ADMIN' || userRole === 'ADMINISTRATEUR' ||
                userRole.toLowerCase().includes('admin')) {

                return next();
            }

            // Si les tables de permissions existent, essayer le nouveau système
            try {
                await permissionManager.hasPermission(userId, 'permissions.manage');
                return next();
            } catch (error) {
                // Si les tables n'existent pas encore, permettre l'accès aux administrateurs

                return next();
            }
        } catch (jwtError) {
            console.error('Erreur JWT:', jwtError);
            return res.status(401).json({ error: 'Token invalide ou expiré' });
        }
    } catch (error) {
        console.error('Erreur dans le middleware de permissions:', error);
        res.status(401).json({ error: 'Accès non autorisé' });
    }
};

// ===== ROUTES DES RÔLES =====

// GET /api/permissions/roles - Liste des rôles
router.get('/roles', requireAdminPermission, async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        // Vérifier si la table roles existe
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);

        if (!tableExists.rows[0].exists) {
            client.release();
            // Retourner des données factices pour le développement
            const mockRoles = [
                { id: '1', name: 'SUPER_ADMIN', description: 'Super Administrateur', is_system_role: true, created_at: new Date() },
                { id: '2', name: 'ADMIN', description: 'Administrateur', is_system_role: true, created_at: new Date() },
                { id: '3', name: 'MANAGER', description: 'Manager', is_system_role: true, created_at: new Date() },
                { id: '4', name: 'COLLABORATEUR', description: 'Collaborateur', is_system_role: true, created_at: new Date() }
            ];

            // Filtrer SUPER_ADMIN si l'utilisateur n'est pas SUPER_ADMIN
            const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
            return res.json(isSuperAdmin ? mockRoles : mockRoles.filter(r => r.name !== 'SUPER_ADMIN'));
        }

        // Récupérer les rôles de l'utilisateur connecté
        const userRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);

        const userRoles = userRolesResult.rows.map(r => r.name);
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // Si pas SUPER_ADMIN, exclure le rôle SUPER_ADMIN de la liste
        const whereClause = isSuperAdmin
            ? ''
            : "WHERE name != 'SUPER_ADMIN'";

        const result = await client.query(`
            SELECT id, name, description, is_system_role, badge_bg_class, badge_text_class, badge_hex_color, badge_priority, created_at
            FROM roles
            ${whereClause}
            ORDER BY badge_priority DESC, name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des rôles:', error);
        console.error('   Message:', error.message);
        console.error('   User ID:', req.user?.id);
        res.status(500).json({ error: 'Erreur interne du serveur', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// POST /api/permissions/roles - Créer un nouveau rôle
router.post('/roles', requireAdminPermission, async (req, res) => {
    try {
        const { name, description, is_system_role } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Le nom du rôle est requis' });
        }

        const client = await pool.connect();

        // Vérifier si la table roles existe
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);

        if (!tableExists.rows[0].exists) {
            client.release();
            return res.status(400).json({ error: 'Le système de permissions n\'est pas encore configuré. Veuillez exécuter la migration des permissions.' });
        }

        const userRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);
        const userRoles = userRolesResult.rows.map(r => r.name);
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // 🔒 PROTECTION SUPER_ADMIN: Empêcher la création d'un rôle nommé SUPER_ADMIN par un non-SUPER_ADMIN
        if (name === 'SUPER_ADMIN' && !isSuperAdmin) {
            client.release();
            return res.status(403).json({
                error: 'Action non autorisée',
                reason: 'Seul un SUPER_ADMIN peut créer le rôle SUPER_ADMIN'
            });
        }

        const finalIsSystemRole = isSuperAdmin ? !!is_system_role : false;

        const result = await client.query(`
            INSERT INTO roles (name, description, is_system_role)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, is_system_role, created_at
        `, [name, description, finalIsSystemRole]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'GRANT', 'ROLE', $2, $3)
        `, [req.user.id, result.rows[0].id, { name, description, is_system_role: finalIsSystemRole }]);

        client.release();

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur lors de la création du rôle:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Un rôle avec ce nom existe déjà' });
        } else {
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
});

// GET /api/permissions/roles/:id/permissions - Permissions d'un rôle
router.get('/roles/:id/permissions', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();

        // Récupérer le rôle
        const roleResult = await client.query(`
            SELECT id, name, description, is_system_role
            FROM roles
            WHERE id = $1
        `, [id]);

        if (roleResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle non trouvé' });
        }

        // Vérifier si l'utilisateur connecté est SUPER_ADMIN
        const userRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);

        const userRoles = userRolesResult.rows.map(r => r.name);
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // Filtrer les permissions sensibles si pas SUPER_ADMIN
        let permissionsWhereClause = '';
        if (!isSuperAdmin) {
            // Exclure les permissions de gestion des permissions et l'item "Administration des Permissions"
            permissionsWhereClause = `
                WHERE p.code NOT LIKE 'permissions.%'
                AND p.code NOT LIKE 'menu.parametres_administration.administration_des_permissions%'
            `;
        }

        // Récupérer toutes les permissions (filtrées si nécessaire)
        const allPermissionsResult = await client.query(`
            SELECT id, code, name, description, category
            FROM permissions p
            ${permissionsWhereClause}
            ORDER BY category, name
        `);

        // Récupérer les permissions accordées au rôle
        const rolePermissionsResult = await client.query(`
            SELECT p.id, p.code, p.name, p.description, p.category
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1
            ${permissionsWhereClause.replace('WHERE', 'AND').replace('p.code', 'p.code')}
        `, [id]);

        client.release();

        res.json({
            role: roleResult.rows[0],
            permissions: rolePermissionsResult.rows,
            allPermissions: allPermissionsResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des permissions du rôle:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// GET /api/permissions/roles/:id/users - Utilisateurs ayant un rôle spécifique
router.get('/roles/:id/users', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();

        // Récupérer le rôle
        const roleResult = await client.query(`
            SELECT id, name, description
            FROM roles
            WHERE id = $1
        `, [id]);

        if (roleResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle non trouvé' });
        }

        // Vérifier si l'utilisateur connecté est SUPER_ADMIN
        const currentUserRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);

        const currentUserRoles = currentUserRolesResult.rows.map(r => r.name);
        const isSuperAdmin = currentUserRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // Récupérer tous les utilisateurs ayant ce rôle
        // Si pas SUPER_ADMIN, exclure les utilisateurs qui sont SUPER_ADMIN
        let query = `
            SELECT DISTINCT u.id, u.nom, u.prenom, u.email
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role_id = $1
        `;

        if (!isSuperAdmin) {
            query += `
                AND u.id NOT IN (
                    SELECT ur_sa.user_id 
                    FROM user_roles ur_sa 
                    JOIN roles r_sa ON ur_sa.role_id = r_sa.id 
                    WHERE r_sa.name = 'SUPER_ADMIN'
                )
            `;
        }

        query += ` ORDER BY u.nom, u.prenom`;

        const usersResult = await client.query(query, [id]);

        client.release();

        res.json({
            role: roleResult.rows[0],
            users: usersResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs du rôle:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// POST /api/permissions/roles/:roleId/permissions/:permissionId - Accorder une permission à un rôle
router.post('/roles/:roleId/permissions/:permissionId', requireAdminPermission, async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;

        const client = await pool.connect();

        // Vérifier que le rôle et la permission existent
        const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [roleId]);
        const permissionResult = await client.query('SELECT code FROM permissions WHERE id = $1', [permissionId]);

        if (roleResult.rows.length === 0 || permissionResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle ou permission non trouvé' });
        }

        // Ajouter la permission sans utiliser ON CONFLICT (la contrainte peut ne pas exister en production)
        // Vérifier d'abord si l'association existe déjà
        const existingAssociation = await client.query(`
            SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);

        if (existingAssociation.rows.length === 0) {
            await client.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
            `, [roleId, permissionId]);
        }

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'GRANT', 'ROLE_PERMISSION', $2, $3::jsonb)
        `, [
            req.user.id,
            roleId,
            JSON.stringify({
                role_name: roleResult.rows[0].name,
                permission_code: permissionResult.rows[0].code
            })
        ]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de l\'attribution de la permission:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// DELETE /api/permissions/roles/:roleId/permissions/:permissionId - Révoquer une permission d'un rôle
router.delete('/roles/:roleId/permissions/:permissionId', requireAdminPermission, async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;

        const client = await pool.connect();

        // Vérifier que le rôle et la permission existent
        const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [roleId]);
        const permissionResult = await client.query('SELECT code FROM permissions WHERE id = $1', [permissionId]);

        if (roleResult.rows.length === 0 || permissionResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle ou permission non trouvé' });
        }

        // Supprimer la permission
        await client.query(`
            DELETE FROM role_permissions
            WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'REVOKE', 'ROLE_PERMISSION', $2, $3::jsonb)
        `, [
            req.user.id,
            roleId,
            JSON.stringify({
                role_name: roleResult.rows[0].name,
                permission_code: permissionResult.rows[0].code
            })
        ]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la révocation de la permission:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ===== ROUTES DES UTILISATEURS =====

// GET /api/permissions/users - Liste des utilisateurs
router.get('/users', requireAdminPermission, async (req, res) => {
    try {
        const client = await pool.connect();

        // Récupérer les rôles de l'utilisateur connecté
        const userRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);

        const userRoles = userRolesResult.rows.map(r => r.name);
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // Si pas SUPER_ADMIN, exclure les utilisateurs SUPER_ADMIN
        let query = `
            SELECT u.id, u.nom, u.prenom, u.email, u.role as role_name
            FROM users u
        `;

        if (!isSuperAdmin) {
            query += `
            WHERE u.id NOT IN (
                SELECT DISTINCT ur.user_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'SUPER_ADMIN'
            )
            AND u.role != 'SUPER_ADMIN'
            `;
        }

        query += `
            ORDER BY u.nom, u.prenom
        `;

        const result = await client.query(query);
        client.release();

        // Pour chaque utilisateur, récupérer la liste de ses rôles (via user_roles)
        // Utiliser pool.query car le client est déjà libéré
        const usersWithRoles = await Promise.all(result.rows.map(async (user) => {
            try {
                const rolesQuery = `
                    SELECT r.id, r.name, r.description
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1
                    ORDER BY r.name
                `;
                const rolesResult = await pool.query(rolesQuery, [user.id]);
                const roles = rolesResult.rows.map(row => row.name).join(', ');

                return {
                    ...user,
                    roles: rolesResult.rows, // Liste complète des rôles
                    roles_display: roles || 'Aucun rôle' // Pour affichage
                };
            } catch (error) {
                console.error(`Erreur lors de la récupération des rôles pour l'utilisateur ${user.id}:`, error);
                return {
                    ...user,
                    roles: [],
                    roles_display: 'Aucun rôle'
                };
            }
        }));

        res.json(usersWithRoles);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// GET /api/permissions/users/me/permissions - Permissions de l'utilisateur connecté
router.get('/users/me/permissions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const client = await pool.connect();

        // Récupérer l'utilisateur
        const userResult = await client.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.role as role_name
            FROM users u
            WHERE u.id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Récupérer toutes les permissions
        const allPermissionsResult = await client.query(`
            SELECT id, code, name, description, category
            FROM permissions
            ORDER BY category, name
        `);

        // Récupérer les permissions directes de l'utilisateur
        const userPermissionsResult = await client.query(`
            SELECT p.id, p.code, p.name, p.description, p.category, true as granted
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = $1
        `, [userId]);

        // Récupérer les permissions de TOUS les rôles de l'utilisateur (union)
        const rolePermissionsResult = await client.query(`
            SELECT DISTINCT p.id, p.code, p.name, p.description, p.category, true as granted
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [userId]);

        client.release();

        // Combiner les permissions directes et les permissions du rôle
        const allUserPermissions = [...userPermissionsResult.rows, ...rolePermissionsResult.rows];

        // Supprimer les doublons (si une permission est à la fois directe et via le rôle)
        const uniquePermissions = allUserPermissions.filter((perm, index, self) =>
            index === self.findIndex(p => p.id === perm.id)
        );

        res.json({
            user: userResult.rows[0],
            permissions: uniquePermissions,
            allPermissions: allPermissionsResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des permissions de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// GET /api/permissions/users/:userId/business-units - Récupérer toutes les BUs d'un utilisateur
router.get('/users/:userId/business-units', requireAdminPermission, async (req, res) => {
    try {
        const { userId } = req.params;

        const client = await pool.connect();

        // Récupérer toutes les BUs auxquelles l'utilisateur a accès
        const result = await client.query(`
            SELECT 
                bu.id as business_unit_id,
                bu.nom as business_unit_nom,
                bu.description as business_unit_description,
                COALESCE(uba.access_level, 'ADMIN') as access_level,
                CASE 
                    WHEN uba.user_id IS NOT NULL THEN 'EXPLICIT'
                    ELSE 'COLLABORATEUR'
                END as access_type
            FROM business_units bu
            LEFT JOIN user_business_unit_access uba ON bu.id = uba.business_unit_id AND uba.user_id = $1
            LEFT JOIN collaborateurs c ON c.user_id = $1 AND c.business_unit_id = bu.id
            WHERE 
                -- Accès explicite
                (uba.user_id IS NOT NULL AND uba.granted = true)
                OR 
                -- Accès via collaborateur principal
                (c.business_unit_id IS NOT NULL)
            ORDER BY bu.nom
        `, [userId]);

        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des BUs de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// GET /api/permissions/users/:id/permissions - Permissions d'un utilisateur (admin)
router.get('/users/:id/permissions', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();

        // Récupérer l'utilisateur
        const userResult = await client.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.role as role_name
            FROM users u
            WHERE u.id = $1
        `, [id]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Récupérer toutes les permissions
        const allPermissionsResult = await client.query(`
            SELECT id, code, name, description, category
            FROM permissions
            ORDER BY category, name
        `);

        // Récupérer les permissions directes de l'utilisateur
        const userPermissionsResult = await client.query(`
            SELECT p.id, p.code, p.name, p.description, p.category, true as granted
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = $1
        `, [id]);

        // Récupérer les permissions de TOUS les rôles de l'utilisateur (via user_roles pour support rôles multiples)
        const rolePermissionsResult = await client.query(`
            SELECT DISTINCT p.id, p.code, p.name, p.description, p.category, true as granted
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [id]);

        client.release();

        // Combiner les permissions directes et les permissions du rôle
        const allUserPermissions = [...userPermissionsResult.rows, ...rolePermissionsResult.rows];

        // Supprimer les doublons (si une permission est à la fois directe et via le rôle)
        const uniquePermissions = allUserPermissions.filter((perm, index, self) =>
            index === self.findIndex(p => p.id === perm.id)
        );

        res.json({
            user: userResult.rows[0],
            permissions: uniquePermissions,
            allPermissions: allPermissionsResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des permissions de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// POST /api/permissions/users/:userId/permissions/:permissionId - Accorder une permission à un utilisateur
router.post('/users/:userId/permissions/:permissionId', requireAdminPermission, async (req, res) => {
    try {
        const { userId, permissionId } = req.params;

        const client = await pool.connect();

        // Vérifier que l'utilisateur et la permission existent
        const userResult = await client.query('SELECT nom, prenom FROM users WHERE id = $1', [userId]);
        const permissionResult = await client.query('SELECT code FROM permissions WHERE id = $1', [permissionId]);

        if (userResult.rows.length === 0 || permissionResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Utilisateur ou permission non trouvé' });
        }

        // Ajouter/mettre à jour la permission sans ON CONFLICT (compatibilité production)
        const existingUserPerm = await client.query(`
            SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_id = $2
        `, [userId, permissionId]);

        if (existingUserPerm.rows.length > 0) {
            await client.query(`
                UPDATE user_permissions
                SET granted = true
                WHERE user_id = $1 AND permission_id = $2
            `, [userId, permissionId]);
        } else {
            await client.query(`
                INSERT INTO user_permissions (user_id, permission_id, granted)
                VALUES ($1, $2, true)
            `, [userId, permissionId]);
        }

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'GRANT', 'USER_PERMISSION', $2, $3::jsonb)
        `, [
            req.user.id,
            userId,
            JSON.stringify({
                username: `${userResult.rows[0].nom} ${userResult.rows[0].prenom}`,
                permission_code: permissionResult.rows[0].code
            })
        ]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de l\'attribution de la permission:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// DELETE /api/permissions/users/:userId/permissions/:permissionId - Révoquer une permission d'un utilisateur
router.delete('/users/:userId/permissions/:permissionId', requireAdminPermission, async (req, res) => {
    try {
        const { userId, permissionId } = req.params;

        const client = await pool.connect();

        // Vérifier que l'utilisateur et la permission existent
        const userResult = await client.query('SELECT nom, prenom FROM users WHERE id = $1', [userId]);
        const permissionResult = await client.query('SELECT code FROM permissions WHERE id = $1', [permissionId]);

        if (userResult.rows.length === 0 || permissionResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Utilisateur ou permission non trouvé' });
        }

        // Supprimer la permission
        await client.query(`
            DELETE FROM user_permissions
            WHERE user_id = $1 AND permission_id = $2
        `, [userId, permissionId]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'REVOKE', 'USER_PERMISSION', $2, $3)
        `, [req.user.id, userId, {
            username: `${userResult.rows[0].nom} ${userResult.rows[0].prenom}`,
            permission_code: permissionResult.rows[0].code
        }]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la révocation de la permission:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ===== ROUTES DES BUSINESS UNITS =====

// GET /api/permissions/business-units - Liste des Business Units
router.get('/business-units', requireAdminPermission, async (req, res) => {
    try {
        const client = await pool.connect();

        // Vérifier si la table business_units existe
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'business_units'
            );
        `);

        if (!tableExists.rows[0].exists) {
            client.release();
            // Retourner des données factices pour le développement
            return res.json([
                { id: '1', name: 'BU 1', description: 'Business Unit 1' },
                { id: '2', name: 'BU 2', description: 'Business Unit 2' },
                { id: '3', name: 'BU 3', description: 'Business Unit 3' }
            ]);
        }

        const result = await client.query(`
            SELECT id, nom as name, description
            FROM business_units
            ORDER BY nom
        `);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des Business Units:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// GET /api/permissions/business-units/:id/access - Accès des utilisateurs à une BU
router.get('/business-units/:id/access', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();

        // Récupérer la Business Unit
        const buResult = await client.query(`
            SELECT id, nom as name, description
            FROM business_units
            WHERE id = $1
        `, [id]);

        if (buResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Business Unit non trouvée' });
        }

        // Récupérer TOUS les utilisateurs qui ont accès à cette BU
        // 1. Accès explicites via user_business_unit_access
        // 2. Accès via collaborateur principal (collaborateur.business_unit_id)
        const accessResult = await client.query(`
            SELECT 
                u.id as user_id, 
                u.nom, 
                u.prenom,
                COALESCE(uba.access_level, 'ADMIN') as access_level,
                COALESCE(uba.granted, true) as granted,
                CASE 
                    WHEN uba.user_id IS NOT NULL THEN 'EXPLICIT'
                    ELSE 'COLLABORATEUR'
                END as access_type,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id
            LEFT JOIN user_business_unit_access uba ON u.id = uba.user_id AND uba.business_unit_id = $1
            WHERE 
                -- Accès explicite
                (uba.user_id IS NOT NULL AND uba.granted = true)
                OR 
                -- Accès via collaborateur principal
                (c.business_unit_id = $1)
            ORDER BY u.nom, u.prenom
        `, [id]);

        client.release();

        res.json({
            businessUnit: buResult.rows[0],
            userAccess: accessResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des accès:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// PUT /api/permissions/business-units/:buId/access/:userId - Modifier l'accès d'un utilisateur à une BU
router.put('/business-units/:buId/access/:userId', requireAdminPermission, async (req, res) => {
    try {
        const { buId, userId } = req.params;
        const { access_level } = req.body;

        if (!['READ', 'WRITE', 'ADMIN'].includes(access_level)) {
            return res.status(400).json({ error: 'Niveau d\'accès invalide' });
        }

        const client = await pool.connect();

        // Vérifier que la BU et l'utilisateur existent
        const buResult = await client.query('SELECT nom as name FROM business_units WHERE id = $1', [buId]);
        const userResult = await client.query('SELECT nom, prenom FROM users WHERE id = $1', [userId]);

        if (buResult.rows.length === 0 || userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Business Unit ou utilisateur non trouvé' });
        }

        // Mettre à jour l'accès sans ON CONFLICT (compatibilité production)
        const existingAccess = await client.query(`
            SELECT 1 FROM user_business_unit_access WHERE user_id = $1 AND business_unit_id = $2
        `, [userId, buId]);

        if (existingAccess.rows.length > 0) {
            await client.query(`
                UPDATE user_business_unit_access
                SET access_level = $3, granted = true
                WHERE user_id = $1 AND business_unit_id = $2
            `, [userId, buId, access_level]);
        } else {
            await client.query(`
                INSERT INTO user_business_unit_access (user_id, business_unit_id, access_level, granted)
                VALUES ($1, $2, $3, true)
            `, [userId, buId, access_level]);
        }

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'MODIFY', 'BU_ACCESS', $2, $3::jsonb)
        `, [
            req.user.id,
            buId,
            JSON.stringify({
                bu_name: buResult.rows[0].name,
                username: `${userResult.rows[0].nom} ${userResult.rows[0].prenom}`,
                access_level
            })
        ]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la modification de l\'accès:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// DELETE /api/permissions/business-units/:buId/access/:userId - Supprimer l'accès d'un utilisateur à une BU
router.delete('/business-units/:buId/access/:userId', requireAdminPermission, async (req, res) => {
    try {
        const { buId, userId } = req.params;

        const client = await pool.connect();

        // Vérifier que la BU et l'utilisateur existent
        const buResult = await client.query('SELECT nom as name FROM business_units WHERE id = $1', [buId]);
        const userResult = await client.query('SELECT nom, prenom FROM users WHERE id = $1', [userId]);

        if (buResult.rows.length === 0 || userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Business Unit ou utilisateur non trouvé' });
        }

        // Supprimer l'accès
        await client.query(`
            DELETE FROM user_business_unit_access
            WHERE user_id = $1 AND business_unit_id = $2
        `, [userId, buId]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'REVOKE', 'BU_ACCESS', $2, $3::jsonb)
        `, [
            req.user.id,
            buId,
            JSON.stringify({
                bu_name: buResult.rows[0].name,
                username: `${userResult.rows[0].nom} ${userResult.rows[0].prenom}`
            })
        ]);

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'accès:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ===== ROUTES D'AUDIT =====

// GET /api/permissions/audit - Journal d'audit
router.get('/audit', requireAdminPermission, async (req, res) => {
    try {
        const { start_date, end_date, action } = req.query;

        let query = `
            SELECT pal.*, u.nom, u.prenom
            FROM permission_audit_log pal
            LEFT JOIN users u ON pal.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (start_date) {
            query += ` AND pal.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND pal.created_at <= $${paramIndex}`;
            params.push(end_date + ' 23:59:59');
            paramIndex++;
        }

        if (action) {
            query += ` AND pal.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        query += ` ORDER BY pal.created_at DESC LIMIT 100`;

        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération du journal d\'audit:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/permissions/roles/:roleId/users-count
 * Compter le nombre d'utilisateurs ayant un rôle spécifique
 */
router.get('/roles/:roleId/users-count', authenticateToken, async (req, res) => {
    try {
        const { roleId } = req.params;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM user_roles
            WHERE role_id = $1
        `;

        const result = await pool.query(countQuery, [roleId]);
        const count = parseInt(result.rows[0].count);

        res.json({
            success: true,
            count
        });

    } catch (error) {
        console.error('Erreur lors du comptage des utilisateurs pour le rôle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du comptage des utilisateurs'
        });
    }
});

/**
 * PUT /api/permissions/roles/:id
 * Modifier un rôle existant
 */
router.put('/roles/:id', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_system_role } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Le nom du rôle est requis' });
        }

        const client = await pool.connect();

        // Vérifier que le rôle existe
        const roleResult = await client.query('SELECT * FROM roles WHERE id = $1', [id]);

        if (roleResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle non trouvé' });
        }

        const existingRole = roleResult.rows[0];

        const userRolesResult = await client.query(`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [req.user.id]);
        const userRoles = userRolesResult.rows.map(r => r.name);
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

        // 🔒 PROTECTION SUPER_ADMIN:
        // 1. Empêcher de renommer un rôle vers SUPER_ADMIN si pas SUPER_ADMIN
        if (name === 'SUPER_ADMIN' && !isSuperAdmin) {
            client.release();
            return res.status(403).json({
                error: 'Action non autorisée',
                reason: 'Seul un SUPER_ADMIN peut utiliser le nom SUPER_ADMIN'
            });
        }

        // 2. Empêcher de modifier le rôle SUPER_ADMIN existant si pas SUPER_ADMIN
        if (existingRole.name === 'SUPER_ADMIN' && !isSuperAdmin) {
            client.release();
            return res.status(403).json({
                error: 'Action non autorisée',
                reason: 'Seul un SUPER_ADMIN peut modifier le rôle SUPER_ADMIN'
            });
        }

        const finalIsSystemRole = isSuperAdmin && typeof is_system_role === 'boolean'
            ? is_system_role
            : existingRole.is_system_role;

        // Mettre à jour le rôle
        const result = await client.query(`
            UPDATE roles
            SET name = $1, description = $2, is_system_role = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, name, description, is_system_role, created_at, updated_at
        `, [name, description, finalIsSystemRole, id]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'MODIFY', 'ROLE', $2, $3::jsonb)
        `, [
            req.user.id,
            id,
            JSON.stringify({
                old_name: existingRole.name,
                new_name: name,
                description
            })
        ]);

        client.release();

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur lors de la modification du rôle:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Un rôle avec ce nom existe déjà' });
        } else {
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
});

/**
 * DELETE /api/permissions/roles/:id
 * Supprimer un rôle
 */
router.delete('/roles/:id', requireAdminPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();

        // Vérifier que le rôle existe
        const roleResult = await client.query('SELECT * FROM roles WHERE id = $1', [id]);

        if (roleResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Rôle non trouvé' });
        }

        const role = roleResult.rows[0];

        // Vérifier si c'est un rôle système
        if (role.is_system_role) {
            client.release();
            return res.status(403).json({
                error: 'Impossible de supprimer un rôle système',
                reason: 'Les rôles système sont essentiels au fonctionnement de l\'application et ne peuvent pas être supprimés.'
            });
        }

        // Vérifier si des utilisateurs ont ce rôle
        const userCountResult = await client.query(`
            SELECT COUNT(*) as count
            FROM user_roles
            WHERE role_id = $1
        `, [id]);

        const userCount = parseInt(userCountResult.rows[0].count);

        if (userCount > 0) {
            client.release();
            return res.status(400).json({
                error: 'Impossible de supprimer ce rôle',
                reason: `Ce rôle est actuellement attribué à ${userCount} utilisateur${userCount > 1 ? 's' : ''}. Veuillez d'abord retirer ce rôle à tous les utilisateurs avant de le supprimer.`,
                userCount
            });
        }

        // Supprimer les permissions associées au rôle
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Supprimer le rôle
        await client.query('DELETE FROM roles WHERE id = $1', [id]);

        // Audit
        await client.query(`
            INSERT INTO permission_audit_log (user_id, action, target_type, target_id, details)
            VALUES ($1, 'DELETE', 'ROLE', $2, $3::jsonb)
        `, [
            req.user.id,
            id,
            JSON.stringify({
                role_name: role.name,
                description: role.description
            })
        ]);

        client.release();

        res.json({
            success: true,
            message: 'Rôle supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du rôle:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
