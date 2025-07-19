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
            initiales,
            grade,
            division_id,
            date_embauche,
            taux_horaire
        } = userData;

        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO users (nom, prenom, email, password_hash, initiales, grade, division_id, date_embauche, taux_horaire)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, nom, prenom, email, initiales, grade, division_id, date_embauche, taux_horaire, statut, created_at
        `;

        const result = await query(sql, [
            nom, prenom, email, passwordHash, initiales, grade, division_id, date_embauche, taux_horaire
        ]);

        return result.rows[0];
    }

    // Récupérer un utilisateur par ID
    static async findById(id) {
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.initiales, u.grade, u.division_id, 
                   u.date_embauche, u.taux_horaire, u.statut, u.last_login, u.created_at, u.updated_at,
                   d.nom as division_nom, d.code as division_code
            FROM users u
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE u.id = $1
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer un utilisateur par email
    static async findByEmail(email) {
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, u.initiales, u.grade, 
                   u.division_id, u.date_embauche, u.taux_horaire, u.statut, u.last_login, 
                   u.created_at, u.updated_at,
                   d.nom as division_nom, d.code as division_code
            FROM users u
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE u.email = $1
        `;

        const result = await query(sql, [email]);
        return result.rows[0] || null;
    }

    // Récupérer tous les utilisateurs avec pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            grade = '',
            division_id = '',
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        // Construire les conditions de recherche
        if (search) {
            conditions.push(`(u.nom ILIKE $${params.length + 1} OR u.prenom ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (grade) {
            conditions.push(`u.grade = $${params.length + 1}`);
            params.push(grade);
        }

        if (division_id) {
            conditions.push(`u.division_id = $${params.length + 1}`);
            params.push(division_id);
        }

        if (statut) {
            conditions.push(`u.statut = $${params.length + 1}`);
            params.push(statut);
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

        // Requête pour les données
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.initiales, u.grade, u.division_id, 
                   u.date_embauche, u.taux_horaire, u.statut, u.last_login, u.created_at, u.updated_at,
                   d.nom as division_nom, d.code as division_code
            FROM users u
            LEFT JOIN divisions d ON u.division_id = d.id
            ${whereClause}
            ORDER BY u.nom, u.prenom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await query(sql, [...params, limit, offset]);

        return {
            users: result.rows,
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
        const allowedFields = ['nom', 'prenom', 'email', 'initiales', 'grade', 'division_id', 'taux_horaire', 'statut'];
        const updates = [];
        const values = [];

        // Construire la requête de mise à jour dynamiquement
        Object.keys(updateData).forEach((key, index) => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updates.push(`${key} = $${index + 2}`);
                values.push(updateData[key]);
            }
        });

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        const sql = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, prenom, email, initiales, grade, division_id, date_embauche, taux_horaire, statut, updated_at
        `;

        const result = await query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Supprimer un utilisateur (soft delete)
    static async delete(id) {
        const sql = `
            UPDATE users 
            SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, prenom, email, statut
        `;

        const result = await query(sql, [id]);
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

    // Récupérer les rôles d'un utilisateur
    static async getRoles(userId) {
        const sql = `
            SELECT r.id, r.nom, r.description
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `;

        const result = await query(sql, [userId]);
        return result.rows;
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
            WHERE ur.user_id = $1 AND r.nom = $2
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
                COUNT(CASE WHEN statut = 'CONGE' THEN 1 END) as on_leave_users,
                COUNT(CASE WHEN grade = 'ASSISTANT' THEN 1 END) as assistants,
                COUNT(CASE WHEN grade = 'SENIOR' THEN 1 END) as seniors,
                COUNT(CASE WHEN grade = 'MANAGER' THEN 1 END) as managers,
                COUNT(CASE WHEN grade = 'DIRECTOR' THEN 1 END) as directors,
                COUNT(CASE WHEN grade = 'PARTNER' THEN 1 END) as partners
            FROM users
        `;

        const result = await query(sql);
        return result.rows[0];
    }
}

module.exports = User; 