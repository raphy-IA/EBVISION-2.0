const { query } = require('../utils/database');

class Division {
    // Créer une nouvelle division
    static async create(divisionData) {
        const {
            nom,
            code,
            responsable_id,
            budget_annuel
        } = divisionData;

        const sql = `
            INSERT INTO divisions (nom, code, responsable_id, budget_annuel)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nom, code, responsable_id, budget_annuel, statut, created_at
        `;

        const result = await query(sql, [nom, code, responsable_id, budget_annuel]);
        return result.rows[0];
    }

    // Récupérer une division par ID
    static async findById(id) {
        const sql = `
            SELECT d.id, d.nom, d.code, d.responsable_id, d.budget_annuel, d.statut, 
                   d.created_at, d.updated_at,
                   u.nom as responsable_nom, u.prenom as responsable_prenom, u.email as responsable_email
            FROM divisions d
            LEFT JOIN users u ON d.responsable_id = u.id
            WHERE d.id = $1
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer une division par code
    static async findByCode(code) {
        const sql = `
            SELECT d.id, d.nom, d.code, d.responsable_id, d.budget_annuel, d.statut, 
                   d.created_at, d.updated_at,
                   u.nom as responsable_nom, u.prenom as responsable_prenom, u.email as responsable_email
            FROM divisions d
            LEFT JOIN users u ON d.responsable_id = u.id
            WHERE d.code = $1
        `;

        const result = await query(sql, [code]);
        return result.rows[0] || null;
    }

    // Récupérer toutes les divisions avec pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        // Construire les conditions de recherche
        if (search) {
            conditions.push(`(d.nom ILIKE $${params.length + 1} OR d.code ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (statut) {
            conditions.push(`d.statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM divisions d
            ${whereClause}
        `;

        const countResult = await query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT d.id, d.nom, d.code, d.responsable_id, d.budget_annuel, d.statut, 
                   d.created_at, d.updated_at,
                   u.nom as responsable_nom, u.prenom as responsable_prenom, u.email as responsable_email
            FROM divisions d
            LEFT JOIN users u ON d.responsable_id = u.id
            ${whereClause}
            ORDER BY d.nom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await query(sql, [...params, limit, offset]);

        return {
            divisions: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Récupérer toutes les divisions actives (pour les listes déroulantes)
    static async findActive() {
        const sql = `
            SELECT d.id, d.nom, d.code, d.responsable_id,
                   u.nom as responsable_nom, u.prenom as responsable_prenom
            FROM divisions d
            LEFT JOIN users u ON d.responsable_id = u.id
            WHERE d.statut = 'ACTIF'
            ORDER BY d.nom
        `;

        const result = await query(sql);
        return result.rows;
    }

    // Mettre à jour une division
    static async update(id, updateData) {
        const allowedFields = ['nom', 'code', 'responsable_id', 'budget_annuel', 'statut'];
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
            UPDATE divisions 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, responsable_id, budget_annuel, statut, updated_at
        `;

        const result = await query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Supprimer une division (soft delete)
    static async delete(id) {
        const sql = `
            UPDATE divisions 
            SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, statut
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer les utilisateurs d'une division
    static async getUsers(divisionId, options = {}) {
        const {
            page = 1,
            limit = 10,
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = ['u.division_id = $1'];
        const params = [divisionId];

        if (statut) {
            conditions.push(`u.statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
            SELECT u.id, u.nom, u.prenom, u.email, u.initiales, u.grade, 
                   u.date_embauche, u.taux_horaire, u.statut, u.last_login,
                   u.created_at, u.updated_at
            FROM users u
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

    // Récupérer les statistiques d'une division
    static async getStats(divisionId) {
        const sql = `
            SELECT 
                COUNT(u.id) as total_users,
                COUNT(CASE WHEN u.statut = 'ACTIF' THEN 1 END) as active_users,
                COUNT(CASE WHEN u.statut = 'INACTIF' THEN 1 END) as inactive_users,
                COUNT(CASE WHEN u.statut = 'CONGE' THEN 1 END) as on_leave_users,
                COUNT(CASE WHEN u.grade = 'ASSISTANT' THEN 1 END) as assistants,
                COUNT(CASE WHEN u.grade = 'SENIOR' THEN 1 END) as seniors,
                COUNT(CASE WHEN u.grade = 'MANAGER' THEN 1 END) as managers,
                COUNT(CASE WHEN u.grade = 'DIRECTOR' THEN 1 END) as directors,
                COUNT(CASE WHEN u.grade = 'PARTNER' THEN 1 END) as partners,
                AVG(u.taux_horaire) as avg_hourly_rate,
                SUM(u.taux_horaire) as total_hourly_rate
            FROM users u
            WHERE u.division_id = $1
        `;

        const result = await query(sql, [divisionId]);
        return result.rows[0];
    }

    // Récupérer les statistiques globales des divisions
    static async getGlobalStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_divisions,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as active_divisions,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactive_divisions,
                SUM(budget_annuel) as total_budget,
                AVG(budget_annuel) as avg_budget
            FROM divisions
        `;

        const result = await query(sql);
        return result.rows[0];
    }

    // Vérifier si une division peut être supprimée (pas d'utilisateurs actifs)
    static async canDelete(divisionId) {
        const sql = `
            SELECT COUNT(*) as user_count
            FROM users
            WHERE division_id = $1 AND statut = 'ACTIF'
        `;

        const result = await query(sql, [divisionId]);
        return parseInt(result.rows[0].user_count) === 0;
    }

    // Transférer les utilisateurs d'une division vers une autre
    static async transferUsers(divisionId, newDivisionId) {
        const sql = `
            UPDATE users 
            SET division_id = $2, updated_at = CURRENT_TIMESTAMP
            WHERE division_id = $1
            RETURNING id, nom, prenom, email
        `;

        const result = await query(sql, [divisionId, newDivisionId]);
        return result.rows;
    }

    // Récupérer les divisions avec leur budget consommé
    static async getBudgetUsage() {
        const sql = `
            SELECT 
                d.id,
                d.nom,
                d.code,
                d.budget_annuel,
                COALESCE(SUM(u.taux_horaire * 160), 0) as estimated_cost_per_month,
                COALESCE(SUM(u.taux_horaire * 160 * 12), 0) as estimated_cost_per_year,
                CASE 
                    WHEN d.budget_annuel > 0 THEN 
                        (COALESCE(SUM(u.taux_horaire * 160 * 12), 0) / d.budget_annuel) * 100
                    ELSE 0 
                END as budget_usage_percentage
            FROM divisions d
            LEFT JOIN users u ON d.id = u.division_id AND u.statut = 'ACTIF'
            WHERE d.statut = 'ACTIF'
            GROUP BY d.id, d.nom, d.code, d.budget_annuel
            ORDER BY d.nom
        `;

        const result = await query(sql);
        return result.rows;
    }
}

module.exports = Division; 