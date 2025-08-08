const { pool } = require('../utils/database');

class TimeEntry {
    // Créer une nouvelle entrée d'heures
    static async create(timeEntryData) {
        const {
            time_sheet_id,
            user_id,
            date_saisie,
            heures,
            type_heures,
            mission_id = null,
            task_id = null,
            internal_activity_id = null
        } = timeEntryData;

        const query = `
            INSERT INTO time_entries (
                time_sheet_id, user_id, date_saisie, heures, type_heures,
                mission_id, task_id, internal_activity_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'saved')
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [
                time_sheet_id, user_id, date_saisie, heures, type_heures,
                mission_id, task_id, internal_activity_id
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la création de l\'entrée de temps:', error);
            throw error;
        }
    }

    // Trouver une entrée d'heures par ID
    static async findById(id) {
        const query = `
            SELECT te.*, ts.status as time_sheet_status
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.id = $1
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'entrée de temps:', error);
            throw error;
        }
    }

    // Trouver une entrée d'heures existante
    static async findExisting(timeSheetId, dateSaisie, typeHeures, missionId = null, taskId = null, internalActivityId = null) {
        const query = `
            SELECT * FROM time_entries 
            WHERE time_sheet_id = $1::uuid
            AND date_saisie = $2::date
            AND type_heures = $3::text
            AND (mission_id IS NULL AND $4::uuid IS NULL OR mission_id = $4::uuid)
            AND (task_id IS NULL AND $5::uuid IS NULL OR task_id = $5::uuid)
            AND (internal_activity_id IS NULL AND $6::uuid IS NULL OR internal_activity_id = $6::uuid)
        `;

        try {
            const result = await pool.query(query, [
                timeSheetId, dateSaisie, typeHeures, missionId, taskId, internalActivityId
            ]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'entrée existante:', error);
            throw error;
        }
    }

    // Mettre à jour une entrée d'heures
    static async update(id, updateData) {
        const allowedFields = ['heures', 'status'];
        const updates = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        values.push(id);
        const query = `
            UPDATE time_entries 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'entrée de temps:', error);
            throw error;
        }
    }

    // Trouver ou créer une entrée d'heures
    static async findOrCreate(timeEntryData) {
        const {
            time_sheet_id,
            user_id,
            date_saisie,
            heures,
            type_heures,
            mission_id = null,
            task_id = null,
            internal_activity_id = null
        } = timeEntryData;

        try {
            // Essayer de trouver une entrée existante
            let entry = await this.findExisting(
                time_sheet_id, date_saisie, type_heures, 
                mission_id, task_id, internal_activity_id
            );

            if (entry) {
                // Mettre à jour l'entrée existante
                if (heures > 0) {
                    entry = await this.update(entry.id, { heures });
                } else {
                    // Supprimer l'entrée si les heures sont 0
                    await this.delete(entry.id);
                    return null;
                }
            } else if (heures > 0) {
                // Créer une nouvelle entrée
                entry = await this.create(timeEntryData);
            }

            return entry;
        } catch (error) {
            console.error('Erreur lors de la recherche/création de l\'entrée:', error);
            throw error;
        }
    }

    // Supprimer une entrée d'heures
    static async delete(id) {
        const query = 'DELETE FROM time_entries WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'entrée de temps:', error);
            throw error;
        }
    }

    // Supprimer toutes les entrées d'un utilisateur pour une période
    static async deleteByUserAndPeriod(userId, startDate, endDate) {
        const query = `
            DELETE FROM time_entries 
            WHERE user_id = $1 
            AND date_saisie BETWEEN $2 AND $3
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [userId, startDate, endDate]);
            return result.rows.length;
        } catch (error) {
            console.error('Erreur lors de la suppression des entrées par période:', error);
            throw error;
        }
    }

    // Obtenir toutes les entrées d'une feuille de temps
    static async findByTimeSheet(timeSheetId) {
        const query = `
            SELECT te.*, 
                   m.nom as mission_nom,
                   COALESCE(t.description, t.libelle) as task_nom,
                   ia.description as internal_activity_nom
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            WHERE te.time_sheet_id = $1
            ORDER BY te.date_saisie, te.type_heures
        `;

        try {
            const result = await pool.query(query, [timeSheetId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la recherche des entrées de temps:', error);
            throw error;
        }
    }

    // Obtenir les entrées d'un utilisateur pour une période
    static async findByUserAndPeriod(userId, startDate, endDate) {
        const query = `
            SELECT te.*, ts.week_start, ts.week_end,
                   m.nom as mission_nom,
                   COALESCE(t.description, t.libelle) as task_nom,
                   ia.description as internal_activity_nom
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            WHERE te.user_id = $1 
            AND te.date_saisie BETWEEN $2 AND $3
            ORDER BY te.date_saisie, te.type_heures
        `;

        try {
            const result = await pool.query(query, [userId, startDate, endDate]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la recherche des entrées par période:', error);
            throw error;
        }
    }

    // Obtenir les statistiques d'un utilisateur pour une période
    static async getStatisticsByUser(userId, startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_entries,
                SUM(CASE WHEN type_heures = 'HC' THEN heures ELSE 0 END) as total_hc,
                SUM(CASE WHEN type_heures = 'HNC' THEN heures ELSE 0 END) as total_hnc,
                SUM(heures) as total_heures,
                COUNT(DISTINCT date_saisie) as jours_travailles
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.user_id = $1 
            AND te.date_saisie BETWEEN $2 AND $3
        `;

        try {
            const result = await pool.query(query, [userId, startDate, endDate]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            throw error;
        }
    }

    // Obtenir les entrées par type pour une feuille de temps
    static async getByType(timeSheetId, typeHeures) {
        const query = `
            SELECT te.*, 
                   m.nom as mission_nom,
                   COALESCE(t.description, t.libelle) as task_nom,
                   ia.description as internal_activity_nom
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            WHERE te.time_sheet_id = $1 AND te.type_heures = $2
            ORDER BY te.date_saisie
        `;

        try {
            const result = await pool.query(query, [timeSheetId, typeHeures]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la recherche des entrées par type:', error);
            throw error;
        }
    }

    // Mettre à jour le status de toutes les entrées d'une feuille de temps
    static async updateStatusByTimeSheet(timeSheetId, newStatus) {
        const query = `
            UPDATE time_entries 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE time_sheet_id = $2
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [newStatus, timeSheetId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des statuts:', error);
            throw error;
        }
    }
}

module.exports = TimeEntry; 