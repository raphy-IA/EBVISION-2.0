const { pool } = require('../utils/database');

class MissionType {
    static async findAll() {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            ORDER BY mt.codification
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            WHERE mt.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByCodification(codification) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            WHERE mt.codification = $1 AND mt.actif = true
        `;
        const result = await pool.query(query, [codification]);
        return result.rows[0];
    }

    static async create(data) {
        const { codification, libelle, description, division_id } = data;
        const query = `
            INSERT INTO mission_types (codification, libelle, description, division_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [codification, libelle, description, division_id]);
        return result.rows[0];
    }

    static async update(id, data) {
        const { codification, libelle, description, division_id, actif } = data;
        const query = `
            UPDATE mission_types 
            SET codification = $1, libelle = $2, description = $3, division_id = $4, actif = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;
        const result = await pool.query(query, [codification, libelle, description, division_id, actif, id]);
        return result.rows[0];
    }

    static async delete(id) {
        // Soft delete - marquer comme inactif
        const query = `
            UPDATE mission_types 
            SET actif = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByDivision(divisionId) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            WHERE mt.division_id = $1 AND mt.actif = true
            ORDER BY mt.codification
        `;
        const result = await pool.query(query, [divisionId]);
        return result.rows;
    }

    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_types,
                COUNT(CASE WHEN actif = true THEN 1 END) as types_actifs,
                COUNT(CASE WHEN division_id IS NOT NULL THEN 1 END) as types_avec_division
            FROM mission_types
        `;
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = MissionType; 