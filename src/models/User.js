const { query } = require('../utils/database');
const bcrypt = require('bcryptjs');

class User {
    // Créer un nouvel utilisateur
    static async create(userData) {
        const {
            nom,
            prenom,
            email,
            password,
            login,
            roles // Rôles multiples (obligatoire)
        } = userData;

        // Validation : au moins un rôle doit être fourni
        if (!roles || roles.length === 0) {
            throw new Error('Au moins un rôle doit être fourni');
        }

        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Générer un login basé sur les initiales si non fourni, avec gestion de l'unicité
        let userLogin = login || (nom.substring(0, 1) + prenom.substring(0, 1)).toLowerCase();

        // Vérifier l'unicité du login et ajouter un numéro si nécessaire
        if (!login) {
            // Si le login n'a pas été fourni explicitement, vérifier l'unicité
            const baseLogin = userLogin;
            let counter = 1;
            let isUnique = false;

            while (!isUnique) {
                const checkResult = await query('SELECT id FROM users WHERE login = $1', [userLogin]);
                if (checkResult.rows.length === 0) {
                    isUnique = true;
                } else {
                    userLogin = baseLogin + counter;
                    counter++;
                }
            }
        }

        // Créer l'utilisateur avec un rôle legacy par défaut (pour respecter la contrainte NOT NULL)
        // Les rôles réels seront gérés via la table user_roles
        const sql = `
            INSERT INTO users (nom, prenom, email, password_hash, login, role)
            VALUES ($1, $2, $3, $4, $5, 'COLLABORATEUR')
            RETURNING id, nom, prenom, email, login, statut, created_at
        `;

        const result = await query(sql, [
            nom, prenom, email, passwordHash, userLogin
        ]);

        const newUser = result.rows[0];

        // Ajouter les rôles via la table user_roles
        await this.addMultipleRoles(newUser.id, roles);

        return newUser;
    }

    // Ajouter plusieurs rôles à un utilisateur
    static async addMultipleRoles(userId, roleIds) {
        if (!roleIds || roleIds.length === 0) return;

        // Vérifier le type de role_id dans la base de données
        // Support à la fois INTEGER (SERIAL) et UUID
        const values = roleIds.map((roleId, index) => {
            // Convertir en entier si c'est une chaîne numérique, sinon utiliser tel quel
            const paramIndex = index + 2;
            return `($1, $${paramIndex}, NOW())`;
        }).join(', ');

        // Convertir les IDs en entiers si nécessaire (pour les bases de données avec SERIAL)
        const convertedRoleIds = roleIds.map(roleId => {
            // Si c'est déjà un nombre, le garder tel quel
            if (typeof roleId === 'number') return roleId;
            // Si c'est une chaîne qui représente un nombre, la convertir
            if (typeof roleId === 'string' && /^\d+$/.test(roleId)) {
                return parseInt(roleId, 10);
            }
            // Sinon, utiliser tel quel (pour les UUIDs)
            return roleId;
        });

        const sql = `
            INSERT INTO user_roles (user_id, role_id, created_at)
            VALUES ${values}
            ON CONFLICT (user_id, role_id) DO NOTHING
        `;

        await query(sql, [userId, ...convertedRoleIds]);
    }

    // Récupérer un utilisateur par ID
    static async findById(id) {
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.login, u.role, u.password_hash,
                   u.statut, u.last_login, u.created_at, u.updated_at, u.collaborateur_id,
                   c.business_unit_id, c.division_id,
                   bu.nom as business_unit_nom, bu.code as business_unit_code,
                   d.nom as division_nom, d.code as division_code,
                   g.nom as grade_nom, g.code as grade_code,
                   p.nom as poste_nom, p.code as poste_code,
                   c.email as collaborateur_email
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id OR c.id = u.collaborateur_id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN postes p ON c.poste_actuel_id = p.id
            WHERE u.id = $1
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer un utilisateur par email
    static async findByEmail(email) {
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, u.role,
                   u.statut, u.last_login, u.created_at, u.updated_at
            FROM users u
            WHERE u.email = $1
        `;

        const result = await query(sql, [email]);
        return result.rows[0] || null;
    }

    // Récupérer un utilisateur par login (alias pour findByEmail)
    static async findByLogin(login) {
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, u.role,
                   u.statut, u.last_login, u.created_at, u.updated_at
            FROM users u
            WHERE u.email = $1
        `;

        const result = await query(sql, [login]);
        return result.rows[0] || null;
    }



    // Récupérer tous les utilisateurs avec pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            statut = '',
            currentUserId = null // ID de l'utilisateur connecté pour filtrer les SUPER_ADMIN
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        // Construire les conditions de recherche
        if (search) {
            conditions.push(`(u.nom ILIKE $${params.length + 1} OR u.prenom ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (role) {
            conditions.push(`u.role = $${params.length + 1}`);
            params.push(role);
        }

        // Gestion du filtrage par statut
        if (statut) {
            conditions.push(`u.statut = $${params.length + 1}`);
            params.push(statut);
        } else {
            // Par défaut, ne pas exclure les utilisateurs INACTIF si aucun filtre de statut n'est spécifié
            // Cela permet de voir tous les utilisateurs quand on ne filtre pas par statut
        }

        // Vérifier si l'utilisateur connecté est SUPER_ADMIN
        let isSuperAdmin = false;
        if (currentUserId) {
            try {
                const userRolesQuery = `
                    SELECT r.name
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1
                `;
                const userRolesResult = await query(userRolesQuery, [currentUserId]);
                const userRoles = userRolesResult.rows.map(r => r.name);

                // Vérifier également le rôle principal (legacy)
                const userQuery = `SELECT role FROM users WHERE id = $1`;
                const userResult = await query(userQuery, [currentUserId]);
                const principalRole = userResult.rows[0]?.role;

                isSuperAdmin = userRoles.includes('SUPER_ADMIN') || principalRole === 'SUPER_ADMIN';
            } catch (error) {
                console.error('Erreur lors de la vérification du rôle SUPER_ADMIN:', error);
            }
        }

        // Si pas SUPER_ADMIN, exclure les utilisateurs SUPER_ADMIN
        if (!isSuperAdmin) {
            conditions.push(`u.id NOT IN (
                SELECT DISTINCT ur.user_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'SUPER_ADMIN'
            )`);
            conditions.push(`u.role != 'SUPER_ADMIN'`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `;

        const countResult = await query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données avec information des collaborateurs
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.login, u.email, u.role,
                   u.statut, u.last_login, u.created_at, u.updated_at,
                   c.id as collaborateur_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            ${whereClause}
            ORDER BY u.nom, u.prenom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await query(sql, [...params, limit, offset]);

        // Récupérer les rôles multiples pour chaque utilisateur avec leurs couleurs
        const usersWithRoles = await Promise.all(result.rows.map(async (user) => {
            try {
                const rolesQuery = `
                    SELECT r.name, r.badge_bg_class, r.badge_text_class, r.badge_hex_color, r.badge_priority
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1
                    ORDER BY r.badge_priority DESC NULLS LAST, r.name
                `;
                const rolesResult = await query(rolesQuery, [user.id]);
                const roles = rolesResult.rows.map(row => row.name);
                const rolesWithColors = rolesResult.rows; // Conserver toutes les infos des rôles

                return {
                    ...user,
                    roles: roles, // Noms des rôles (pour compatibilité)
                    roles_details: rolesWithColors // Détails complets des rôles avec couleurs
                };
            } catch (error) {
                console.error(`Erreur lors de la récupération des rôles pour l'utilisateur ${user.id}:`, error);
                return {
                    ...user,
                    roles: [], // Retourner un tableau vide en cas d'erreur
                    roles_details: []
                };
            }
        }));

        return {
            users: usersWithRoles,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Mettre à jour un utilisateur
    static async update(id, updateData) {
        const allowedFields = ['nom', 'prenom', 'email', 'login', 'role', 'statut'];
        const updates = [];
        const values = [];
        let passwordHash = null;

        // Construire la requête de mise à jour dynamiquement
        let paramIndex = 2; // Commencer à $2 car $1 est l'ID

        // Gérer le mot de passe séparément
        if (updateData.password) {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            passwordHash = await bcrypt.hash(updateData.password, saltRounds);
            updates.push(`password_hash = $${paramIndex}`);
            values.push(passwordHash);
            paramIndex++;
        }

        // Traiter les autres champs
        Object.keys(updateData).forEach((key) => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        const sql = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, prenom, email, login, role, statut, updated_at
        `;

        const result = await query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Désactiver un utilisateur (soft delete)
    static async deactivate(id) {
        const sql = `
            UPDATE users 
            SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, prenom, email, statut
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Supprimer définitivement un utilisateur (hard delete)
    static async hardDelete(id) {
        const sql = `
            DELETE FROM users 
            WHERE id = $1
            RETURNING id, nom, prenom, email
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Vérifier si un utilisateur est lié à un collaborateur
    static async checkLinkedCollaborateur(userId) {
        const sql = `
            SELECT c.id, c.nom, c.prenom
            FROM collaborateurs c
            WHERE c.user_id = $1
        `;

        const result = await query(sql, [userId]);
        return result.rows[0] || null;
    }

    // Vérifier le mot de passe
    static async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }

    // Changer le mot de passe
    static async changePassword(id, newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        const sql = `
            UPDATE users 
            SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email
        `;

        const result = await query(sql, [id, passwordHash]);
        return result.rows[0] || null;
    }

    // Mettre à jour le mot de passe (alias pour updatePassword)
    static async updatePassword(id, passwordHash) {
        const sql = `
            UPDATE users 
            SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email
        `;

        const result = await query(sql, [id, passwordHash]);
        return result.rows[0] || null;
    }

    // Mettre à jour la dernière connexion
    static async updateLastLogin(id) {
        const sql = `
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, last_login
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Mettre à jour la dernière déconnexion
    static async updateLastLogout(id) {
        const sql = `
            UPDATE users 
            SET last_logout = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, last_logout
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer les rôles d'un utilisateur
    static async getRoles(userId) {
        console.log('🔍 [User.getRoles] Début de la méthode');
        console.log(`📋 User ID: ${userId}`);

        const sql = `
            SELECT r.id, r.name, r.description
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `;

        console.log('🔄 Exécution de la requête SQL...');
        console.log('📝 SQL:', sql.trim());
        console.log('📊 Paramètres:', [userId]);

        try {
            const result = await query(sql, [userId]);
            console.log(`✅ Requête réussie - ${result.rows.length} rôle(s) trouvé(s)`);
            console.log('📋 Résultat:', JSON.stringify(result.rows, null, 2));
            return result.rows;
        } catch (error) {
            console.error('❌ [User.getRoles] ERREUR SQL:');
            console.error('   Message:', error.message);
            console.error('   Code:', error.code);
            console.error('   Detail:', error.detail);
            console.error('   Position:', error.position);
            throw error;
        }
    }

    // Récupérer les permissions d'un utilisateur
    static async getPermissions(userId) {
        const sql = `
            SELECT DISTINCT p.id, p.nom, p.description, p.module
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = $1
            UNION
            SELECT DISTINCT p.id, p.nom, p.description, p.module
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = $1
        `;

        const result = await query(sql, [userId]);
        return result.rows;
    }

    // Ajouter un rôle à un utilisateur
    static async addRole(userId, roleId) {
        const sql = `
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
            RETURNING id
        `;

        const result = await query(sql, [userId, roleId]);
        return result.rows[0] || null;
    }

    // Retirer un rôle d'un utilisateur
    static async removeRole(userId, roleId) {
        const sql = `
            DELETE FROM user_roles 
            WHERE user_id = $1 AND role_id = $2
            RETURNING id
        `;

        const result = await query(sql, [userId, roleId]);
        return result.rows[0] || null;
    }

    // Ajouter une permission à un utilisateur
    static async addPermission(userId, permissionId) {
        const sql = `
            INSERT INTO user_permissions (user_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, permission_id) DO NOTHING
            RETURNING id
        `;

        const result = await query(sql, [userId, permissionId]);
        return result.rows[0] || null;
    }

    // Retirer une permission d'un utilisateur
    static async removePermission(userId, permissionId) {
        const sql = `
            DELETE FROM user_permissions 
            WHERE user_id = $1 AND permission_id = $2
            RETURNING id
        `;

        const result = await query(sql, [userId, permissionId]);
        return result.rows[0] || null;
    }

    // Vérifier si un utilisateur a une permission spécifique
    static async hasPermission(userId, permissionName) {
        const sql = `
            SELECT COUNT(*) as count
            FROM (
                SELECT p.nom
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1 AND p.nom = $2
                UNION
                SELECT p.nom
                FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = $1 AND p.nom = $2
            ) as user_permissions
        `;

        const result = await query(sql, [userId, permissionName]);
        return parseInt(result.rows[0].count) > 0;
    }

    // Vérifier si un utilisateur a un rôle spécifique
    static async hasRole(userId, roleName) {
        const sql = `
            SELECT COUNT(*) as count
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1 AND r.name = $2
        `;

        const result = await query(sql, [userId, roleName]);
        return parseInt(result.rows[0].count) > 0;
    }

    // Statistiques des utilisateurs
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as active_users,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactive_users,
                COUNT(CASE WHEN role = 'ASSISTANT' THEN 1 END) as assistants,
                COUNT(CASE WHEN role = 'SENIOR' THEN 1 END) as seniors,
                COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as managers,
                COUNT(CASE WHEN role = 'DIRECTOR' THEN 1 END) as directors,
                COUNT(CASE WHEN role = 'PARTNER' THEN 1 END) as partners
            FROM users
        `;

        const result = await query(sql);
        return result.rows[0];
    }
}

module.exports = User; 