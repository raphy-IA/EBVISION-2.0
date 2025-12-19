const { pool } = require('../utils/database');

class MissionDocument {
    static async findAllByMissionId(missionId) {
        const query = `
            SELECT * FROM mission_documents 
            WHERE mission_id = $1 
            ORDER BY type DESC, name ASC
        `;
        const result = await pool.query(query, [missionId]);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM mission_documents WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const { mission_id, parent_id, name, type, file_path, mime_type, size, created_by, is_locked } = data;
        const query = `
            INSERT INTO mission_documents (mission_id, parent_id, name, type, file_path, mime_type, size, created_by, is_locked)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await pool.query(query, [mission_id, parent_id, name, type, file_path, mime_type, size, created_by, is_locked || false]);
        return result.rows[0];
    }

    static async update(id, data) {
        const { parent_id, name } = data;
        const query = `
            UPDATE mission_documents 
            SET parent_id = $1, name = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [parent_id, name, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM mission_documents WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = MissionDocument;
