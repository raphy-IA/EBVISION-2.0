const { pool } = require('../utils/database');

class MissionType {
    static async findAll() {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom,
                COALESCE(bu_direct.nom, bu_div.nom) as business_unit_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN business_units bu_div ON d.business_unit_id = bu_div.id
            LEFT JOIN business_units bu_direct ON mt.business_unit_id = bu_direct.id
            ORDER BY mt.codification
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom,
                COALESCE(bu_direct.nom, bu_div.nom) as business_unit_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN business_units bu_div ON d.business_unit_id = bu_div.id
            LEFT JOIN business_units bu_direct ON mt.business_unit_id = bu_direct.id
            WHERE mt.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByCodification(codification) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom,
                COALESCE(bu_direct.nom, bu_div.nom) as business_unit_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN business_units bu_div ON d.business_unit_id = bu_div.id
            LEFT JOIN business_units bu_direct ON mt.business_unit_id = bu_direct.id
            WHERE mt.codification = $1 AND mt.actif = true
        `;
        const result = await pool.query(query, [codification]);
        return result.rows[0];
    }

    static async create(data) {
        const { codification, libelle, description, division_id, business_unit_id, default_folder_structure } = data;
        const query = `
            INSERT INTO mission_types (codification, libelle, description, division_id, business_unit_id, default_folder_structure)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await pool.query(query, [codification, libelle, description, division_id, business_unit_id, default_folder_structure || '[]']);
        return result.rows[0];
    }

    static async update(id, data) {
        const { codification, libelle, description, division_id, business_unit_id, actif, default_folder_structure } = data;
        const query = `
            UPDATE mission_types 
            SET codification = $1, libelle = $2, description = $3, division_id = $4, 
                business_unit_id = $5, actif = $6, default_folder_structure = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        const result = await pool.query(query, [codification, libelle, description, division_id, business_unit_id, actif, default_folder_structure, id]);
        return result.rows[0];
    }

    static async delete(id) {
        // Hard delete car on a vérifié qu'il n'est pas utilisé
        const query = 'DELETE FROM mission_types WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async countMissions(id) {
        const query = 'SELECT COUNT(*) as count FROM missions WHERE mission_type_id = $1';
        const result = await pool.query(query, [id]);
        return parseInt(result.rows[0].count);
    }

    static async findByDivision(divisionId) {
        const query = `
            SELECT 
                mt.*,
                d.nom as division_nom,
                COALESCE(bu_direct.nom, bu_div.nom) as business_unit_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN business_units bu_div ON d.business_unit_id = bu_div.id
            LEFT JOIN business_units bu_direct ON mt.business_unit_id = bu_direct.id
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