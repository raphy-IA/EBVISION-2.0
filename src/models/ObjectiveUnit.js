const { query } = require('../utils/database');

class ObjectiveUnit {
    /**
     * Récupérer toutes les unités actives
     */
    static async getAll() {
        const sql = `
            SELECT id, code, label, symbol, type, is_active
            FROM objective_units
            WHERE is_active = TRUE
            ORDER BY label
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Récupérer une unité par son code
     */
    static async getByCode(code) {
        const sql = `
            SELECT id, code, label, symbol, type, is_active
            FROM objective_units
            WHERE code = $1
        `;
        const result = await query(sql, [code]);
        return result.rows[0];
    }

    /**
     * Récupérer une unité par son ID
     */
    static async getById(id) {
        const sql = `
            SELECT id, code, label, symbol, type, is_active
            FROM objective_units
            WHERE id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Créer une nouvelle unité
     */
    static async create(data) {
        const { code, label, symbol, type } = data;
        const sql = `
            INSERT INTO objective_units (code, label, symbol, type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(sql, [code, label, symbol, type]);
        return result.rows[0];
    }

    /**
     * Mettre à jour une unité
     */
    static async update(id, data) {
        const { label, symbol, is_active } = data;
        const sql = `
            UPDATE objective_units
            SET label = $1, symbol = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        const result = await query(sql, [label, symbol, is_active, id]);
        return result.rows[0];
    }

    /**
     * Désactiver une unité
     */
    static async deactivate(id) {
        const sql = `
            UPDATE objective_units
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = ObjectiveUnit;
