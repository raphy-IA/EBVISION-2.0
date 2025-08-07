const { pool } = require('../utils/database');

class TimeSheetSupervisor {
    /**
     * Créer une relation superviseur-collaborateur
     */
    static async create(collaborateurId, supervisorId) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'INSERT INTO time_sheet_supervisors (collaborateur_id, supervisor_id) VALUES ($1, $2) RETURNING *',
                [collaborateurId, supervisorId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer tous les superviseurs d'un collaborateur
     */
    static async getSupervisors(collaborateurId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    tss.id,
                    tss.supervisor_id,
                    c.nom,
                    c.prenom,
                    c.email,
                    tss.created_at
                FROM time_sheet_supervisors tss
                JOIN collaborateurs c ON tss.supervisor_id = c.id
                WHERE tss.collaborateur_id = $1
                ORDER BY c.nom, c.prenom
            `, [collaborateurId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer tous les superviseurs d'un utilisateur (via la relation users -> collaborateurs)
     */
    static async getSupervisorsForUser(userId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    tss.id,
                    tss.supervisor_id,
                    c.nom,
                    c.prenom,
                    c.email,
                    tss.created_at
                FROM time_sheet_supervisors tss
                JOIN collaborateurs c ON tss.supervisor_id = c.id
                JOIN users u ON u.id = c.user_id
                WHERE tss.collaborateur_id = (
                    SELECT c2.id 
                    FROM collaborateurs c2 
                    WHERE c2.user_id = $1
                )
                ORDER BY c.nom, c.prenom
            `, [userId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer tous les collaborateurs d'un superviseur
     */
    static async getCollaborateurs(supervisorId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    tss.id,
                    tss.collaborateur_id,
                    c.nom,
                    c.prenom,
                    c.email,
                    tss.created_at
                FROM time_sheet_supervisors tss
                JOIN collaborateurs c ON tss.collaborateur_id = c.id
                WHERE tss.supervisor_id = $1
                ORDER BY c.nom, c.prenom
            `, [supervisorId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Supprimer une relation superviseur
     */
    static async remove(collaborateurId, supervisorId) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'DELETE FROM time_sheet_supervisors WHERE collaborateur_id = $1 AND supervisor_id = $2 RETURNING *',
                [collaborateurId, supervisorId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Vérifier si un superviseur est configuré pour un collaborateur
     */
    static async isSupervisor(collaborateurId, supervisorId) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT id FROM time_sheet_supervisors WHERE collaborateur_id = $1 AND supervisor_id = $2',
                [collaborateurId, supervisorId]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer tous les superviseurs configurés
     */
    static async getAllSupervisors() {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT DISTINCT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.email
                FROM collaborateurs c
                JOIN time_sheet_supervisors tss ON c.id = tss.supervisor_id
                ORDER BY c.nom, c.prenom
            `);
            return result.rows;
        } finally {
            client.release();
        }
    }
}

module.exports = TimeSheetSupervisor; 