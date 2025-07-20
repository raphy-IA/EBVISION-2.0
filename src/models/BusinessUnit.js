const { pool } = require('../utils/database');

class BusinessUnit {
    // Créer une nouvelle business unit
    static async create(businessUnitData) {
        const {
            nom,
            code,
            description,
            statut = 'ACTIF'
        } = businessUnitData;

        // Commencer une transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Créer la business unit
            const businessUnitSql = `
                INSERT INTO business_units (nom, code, description, statut)
                VALUES ($1, $2, $3, $4)
                RETURNING id, nom, code, description, statut
            `;

            const businessUnitResult = await client.query(businessUnitSql, [nom, code, description, statut]);
            const businessUnit = businessUnitResult.rows[0];

            // 2. Créer automatiquement une division par défaut
            const divisionId = require('crypto').randomUUID();
            const divisionCode = `DIV${divisionId.substring(0, 6)}`; // Code plus court pour respecter la limite
            const divisionSql = `
                INSERT INTO divisions (id, nom, code, business_unit_id, description, statut, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'ACTIF', CURRENT_TIMESTAMP)
                RETURNING id, nom, code
            `;

            const divisionDescription = `Division par défaut de la business unit ${nom}`;
            await client.query(divisionSql, [divisionId, nom, divisionCode, businessUnit.id, divisionDescription]);

            await client.query('COMMIT');
            
            console.log(`✅ Business unit "${nom}" créée avec division par défaut`);
            return businessUnit;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erreur lors de la création de la business unit:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Récupérer une business unit par ID
    static async findById(id) {
        const sql = `
            SELECT id, nom, code, description, statut, created_at, updated_at
            FROM business_units
            WHERE id = $1
        `;

        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer une business unit par code
    static async findByCode(code) {
        const sql = `
            SELECT id, nom, code, description, statut, created_at, updated_at
            FROM business_units
            WHERE code = $1
        `;

        const result = await pool.query(sql, [code]);
        return result.rows[0] || null;
    }

    // Récupérer toutes les business units avec pagination
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
            conditions.push(`(nom ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (statut) {
            conditions.push(`statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM business_units
            ${whereClause}
        `;

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT id, nom, code, description, statut, created_at, updated_at
            FROM business_units
            ${whereClause}
            ORDER BY nom
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await pool.query(sql, [...params, limit, offset]);

        return {
            businessUnits: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Récupérer toutes les business units actives (pour les listes déroulantes)
    static async findActive() {
        const sql = `
            SELECT id, nom, code, description
            FROM business_units
            WHERE statut = 'ACTIF'
            ORDER BY nom
        `;

        const result = await pool.query(sql);
        return result.rows;
    }

    // Mettre à jour une business unit
    static async update(id, updateData) {
        const allowedFields = ['nom', 'code', 'description', 'statut'];
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
            UPDATE business_units 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, description, statut, updated_at
        `;

        const result = await pool.query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Supprimer une business unit (soft delete)
    static async delete(id) {
        const sql = `
            UPDATE business_units 
            SET statut = 'INACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, statut
        `;

        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer les divisions d'une business unit
    static async getDivisions(businessUnitId, options = {}) {
        const {
            page = 1,
            limit = 10,
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = ['d.business_unit_id = $1'];
        const params = [businessUnitId];

        if (statut) {
            conditions.push(`d.statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
            SELECT d.id, d.nom, d.code, d.description, d.statut, d.created_at
            FROM divisions d
            ${whereClause}
            ORDER BY d.nom
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

    // Récupérer les statistiques d'une business unit
    static async getStats(businessUnitId) {
        const sql = `
            SELECT 
                COUNT(d.id) as total_divisions,
                COUNT(CASE WHEN d.statut = 'ACTIF' THEN 1 END) as active_divisions,
                COUNT(CASE WHEN d.statut = 'INACTIF' THEN 1 END) as inactive_divisions
            FROM business_units bu
            LEFT JOIN divisions d ON bu.id = d.business_unit_id
            WHERE bu.id = $1
        `;

        const result = await pool.query(sql, [businessUnitId]);
        return result.rows[0];
    }

    // Récupérer les statistiques globales
    static async getGlobalStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_business_units,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as active_business_units,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactive_business_units
            FROM business_units
        `;

        const result = await pool.query(sql);
        return result.rows[0];
    }

    // Vérifier si une business unit peut être supprimée
    static async canDelete(businessUnitId) {
        const sql = `
            SELECT COUNT(*) as division_count
            FROM divisions
            WHERE business_unit_id = $1 AND statut = 'ACTIF'
        `;

        const result = await pool.query(sql, [businessUnitId]);
        return parseInt(result.rows[0].division_count) === 0;
    }
}

module.exports = BusinessUnit; 