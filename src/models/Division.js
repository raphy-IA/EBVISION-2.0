const { pool } = require('../utils/database');

class Division {
    // Créer une nouvelle division
    static async create(divisionData) {
        const {
            nom,
            code,
            description,
            business_unit_id,
            statut = 'ACTIF'
        } = divisionData;

        const sql = `
            INSERT INTO divisions (nom, code, description, business_unit_id, statut)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nom, code, description, business_unit_id, statut, created_at
        `;

        const result = await pool.query(sql, [nom, code, description, business_unit_id, statut]);
        return result.rows[0];
    }

    // Récupérer une division par ID
    static async findById(id) {
        const sql = `
            SELECT d.id, d.nom, d.code, d.description, d.business_unit_id, d.statut, 
                   d.created_at, d.updated_at,
                   bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.id = $1
        `;

        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer une division par code
    static async findByCode(code) {
        const sql = `
            SELECT d.id, d.nom, d.code, d.description, d.business_unit_id, d.statut, 
                   d.created_at, d.updated_at,
                   bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.code = $1
        `;

        const result = await pool.query(sql, [code]);
        return result.rows[0] || null;
    }

    // Récupérer toutes les divisions avec pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            statut = '',
            business_unit_id = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        // Construire les conditions de recherche
        if (search) {
            conditions.push(`(d.nom ILIKE $${params.length + 1} OR d.code ILIKE $${params.length + 1} OR d.description ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (statut) {
            conditions.push(`d.statut = $${params.length + 1}`);
            params.push(statut);
        }

        if (business_unit_id) {
            conditions.push(`d.business_unit_id = $${params.length + 1}`);
            params.push(business_unit_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM divisions d
            ${whereClause}
        `;

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT d.id, d.nom, d.code, d.description, d.business_unit_id, d.statut, 
                   d.created_at, d.updated_at,
                   bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            ${whereClause}
            ORDER BY bu.nom, d.nom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await pool.query(sql, [...params, limit, offset]);

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
            SELECT d.id, d.nom, d.code, d.description, d.business_unit_id,
                   bu.nom as business_unit_nom
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.statut = 'ACTIF'
            ORDER BY bu.nom, d.nom
        `;

        const result = await pool.query(sql);
        return result.rows;
    }

    // Mettre à jour une division
    static async update(id, updateData) {
        const allowedFields = ['nom', 'code', 'description', 'business_unit_id', 'statut'];
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
            RETURNING id, nom, code, description, business_unit_id, statut, updated_at
        `;

        const result = await pool.query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Supprimer une division (hard delete)
    static async delete(id) {
        const sql = `
            DELETE FROM divisions 
            WHERE id = $1
            RETURNING id, nom, code, statut
        `;

        const result = await pool.query(sql, [id]);
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

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.grade, u.statut, u.date_embauche
            FROM users u
            ${whereClause}
            ORDER BY u.nom, u.prenom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await pool.query(sql, [...params, limit, offset]);

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
                COUNT(*) as total_users,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as active_users,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactive_users,
                COUNT(CASE WHEN statut = 'CONGE' THEN 1 END) as on_leave_users,
                AVG(taux_horaire) as avg_hourly_rate
            FROM users
            WHERE division_id = $1
        `;

        const result = await pool.query(sql, [divisionId]);
        return result.rows[0];
    }

    // Récupérer les statistiques globales
    static async getGlobalStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_divisions,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as active_divisions,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactive_divisions
            FROM divisions
        `;

        const result = await pool.query(sql);
        return result.rows[0];
    }

    // Vérifier les dépendances d'une division
    static async checkDependencies(divisionId) {
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM collaborateurs WHERE division_id = $1 AND statut = 'ACTIF') as active_collaborateurs,
                (SELECT COUNT(*) FROM prospecting_campaigns WHERE division_id = $1) as prospecting_campaigns,
                (SELECT COUNT(*) FROM taux_horaires WHERE division_id = $1) as taux_horaires,
                (SELECT COUNT(*) FROM time_entries te 
                 JOIN time_sheets ts ON te.time_sheet_id = ts.id 
                 JOIN users u ON ts.user_id = u.id 
                 JOIN collaborateurs c ON u.collaborateur_id = c.id 
                 WHERE c.division_id = $1) as time_entries
        `;

        const result = await pool.query(sql, [divisionId]);
        const deps = result.rows[0];

        return {
            canDelete: deps.active_collaborateurs == 0 && deps.prospecting_campaigns == 0 &&
                deps.time_entries == 0 && deps.taux_horaires == 0,
            dependencies: {
                active_collaborateurs: parseInt(deps.active_collaborateurs),
                prospecting_campaigns: parseInt(deps.prospecting_campaigns),
                time_entries: parseInt(deps.time_entries),
                taux_horaires: parseInt(deps.taux_horaires)
            }
        };
    }

    // Désactiver une division (soft delete)
    static async deactivate(divisionId) {
        const sql = `
            UPDATE divisions 
            SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, statut
        `;

        const result = await pool.query(sql, [divisionId]);
        return result.rows[0] || null;
    }

    // Transférer les utilisateurs d'une division vers une autre
    static async transferUsers(divisionId, newDivisionId) {
        const sql = `
            UPDATE users 
            SET division_id = $2, updated_at = CURRENT_TIMESTAMP
            WHERE division_id = $1
        `;

        const result = await pool.query(sql, [divisionId, newDivisionId]);
        return result.rowCount;
    }

    // Récupérer les divisions par business unit
    static async findByBusinessUnit(businessUnitId, options = {}) {
        const {
            page = 1,
            limit = 10,
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = ['business_unit_id = $1'];
        const params = [businessUnitId];

        if (statut) {
            conditions.push(`statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM divisions
            ${whereClause}
        `;

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT id, nom, code, description, business_unit_id, statut, created_at
            FROM divisions
            ${whereClause}
            ORDER BY nom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await pool.query(sql, [...params, limit, offset]);

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
}

module.exports = Division; 