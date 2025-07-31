const { pool } = require('../utils/database');

class Task {
    static async findAll() {
        const query = `
            SELECT 
                t.*,
                COUNT(tmt.mission_type_id) as nb_types_mission,
                COUNT(CASE WHEN tmt.obligatoire = true THEN 1 END) as nb_obligatoires
            FROM tasks t
            LEFT JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE t.actif = true
            GROUP BY t.id
            ORDER BY t.code
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT 
                t.*,
                ARRAY_AGG(
                    JSON_BUILD_OBJECT(
                        'mission_type_id', mt.id,
                        'mission_type_code', mt.codification,
                        'mission_type_libelle', mt.libelle,
                        'ordre', tmt.ordre,
                        'obligatoire', tmt.obligatoire
                    )
                ) as mission_types
            FROM tasks t
            LEFT JOIN task_mission_types tmt ON t.id = tmt.task_id
            LEFT JOIN mission_types mt ON tmt.mission_type_id = mt.id
            WHERE t.id = $1
            GROUP BY t.id
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByCode(code) {
        const query = 'SELECT * FROM tasks WHERE code = $1 AND actif = true';
        const result = await pool.query(query, [code]);
        return result.rows[0];
    }

    static async findByMissionType(missionTypeId) {
        const query = `
            SELECT 
                t.*,
                tmt.ordre,
                tmt.obligatoire
            FROM tasks t
            JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE tmt.mission_type_id = $1 AND t.actif = true
            ORDER BY tmt.ordre, t.code
        `;
        const result = await pool.query(query, [missionTypeId]);
        return result.rows;
    }

    static async create(taskData) {
        const { code, libelle, description, duree_estimee, priorite } = taskData;
        
        const query = `
            INSERT INTO tasks (code, libelle, description, duree_estimee, priorite)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [code, libelle, description, duree_estimee, priorite]);
        return result.rows[0];
    }

    static async update(id, taskData) {
        const { code, libelle, description, duree_estimee, priorite, actif } = taskData;
        
        const query = `
            UPDATE tasks 
            SET code = $1, libelle = $2, description = $3, duree_estimee = $4, priorite = $5, actif = $6
            WHERE id = $7
            RETURNING *
        `;
        
        const result = await pool.query(query, [code, libelle, description, duree_estimee, priorite, actif, id]);
        return result.rows[0];
    }

    static async delete(id) {
        // Soft delete
        const query = 'UPDATE tasks SET actif = false WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async addToMissionType(taskId, missionTypeId, ordre = 0, obligatoire = false) {
        const query = `
            INSERT INTO task_mission_types (task_id, mission_type_id, ordre, obligatoire)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (task_id, mission_type_id) 
            DO UPDATE SET ordre = $3, obligatoire = $4
            RETURNING *
        `;
        
        const result = await pool.query(query, [taskId, missionTypeId, ordre, obligatoire]);
        return result.rows[0];
    }

    static async removeFromMissionType(taskId, missionTypeId) {
        const query = 'DELETE FROM task_mission_types WHERE task_id = $1 AND mission_type_id = $2';
        const result = await pool.query(query, [taskId, missionTypeId]);
        return result.rowCount > 0;
    }

    static async removeAllFromMissionType(taskId) {
        const query = 'DELETE FROM task_mission_types WHERE task_id = $1';
        const result = await pool.query(query, [taskId]);
        return result.rowCount > 0;
    }

    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN actif = true THEN 1 END) as active_tasks,
                COUNT(CASE WHEN actif = false THEN 1 END) as inactive_tasks,
                AVG(duree_estimee) as avg_duration,
                COUNT(CASE WHEN priorite = 'CRITIQUE' THEN 1 END) as critical_tasks,
                COUNT(CASE WHEN priorite = 'HAUTE' THEN 1 END) as high_priority_tasks,
                COUNT(CASE WHEN priorite = 'MOYENNE' THEN 1 END) as medium_priority_tasks,
                COUNT(CASE WHEN priorite = 'BASSE' THEN 1 END) as low_priority_tasks
            FROM tasks
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }

    static async getTasksByPriority() {
        const query = `
            SELECT 
                priorite,
                COUNT(*) as count,
                AVG(duree_estimee) as avg_duration
            FROM tasks
            WHERE actif = true
            GROUP BY priorite
            ORDER BY 
                CASE priorite 
                    WHEN 'CRITIQUE' THEN 1 
                    WHEN 'HAUTE' THEN 2 
                    WHEN 'MOYENNE' THEN 3 
                    WHEN 'BASSE' THEN 4 
                END
        `;
        
        const result = await pool.query(query);
        return result.rows;
    }

    static async searchTasks(searchTerm) {
        const query = `
            SELECT 
                t.*,
                COUNT(tmt.mission_type_id) as nb_types_mission
            FROM tasks t
            LEFT JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE t.actif = true 
                AND (t.code ILIKE $1 OR t.libelle ILIKE $1 OR t.description ILIKE $1)
            GROUP BY t.id
            ORDER BY t.code
        `;
        
        const result = await pool.query(query, [`%${searchTerm}%`]);
        return result.rows;
    }
}

module.exports = Task; 