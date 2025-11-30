const { query } = require('../utils/database');

class ObjectiveType {
    /**
     * Récupérer tous les types d'objectifs actifs
     */
    static async getAll() {
        const sql = `
            SELECT id, code, label, category, unit, is_financial, description, is_active
            FROM objective_types
            WHERE is_active = TRUE
            ORDER BY category, label
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Récupérer un type par son ID
     */
    static async getById(id) {
        const sql = `SELECT * FROM objective_types WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Créer un nouveau type d'objectif
     */
    static async create(data) {
        const { code, label, category, unit, is_financial, description } = data;
        const sql = `
            INSERT INTO objective_types (code, label, category, unit, is_financial, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await query(sql, [
            code,
            label,
            category || 'STRATEGIC',
            unit,
            is_financial || false,
            description
        ]);
        return result.rows[0];
    }

    /**
     * Mettre à jour un type d'objectif
     */
    static async update(id, data) {
        const { label, category, unit, is_financial, description, is_active } = data;
        const sql = `
            UPDATE objective_types
            SET label = $1, category = $2, unit = $3, is_financial = $4, description = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;
        const result = await query(sql, [
            label,
            category,
            unit,
            is_financial,
            description,
            is_active,
            id
        ]);
        return result.rows[0];
    }

    /**
     * Désactiver un type d'objectif
     */
    static async delete(id) {
        const sql = `
            UPDATE objective_types
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = ObjectiveType;
