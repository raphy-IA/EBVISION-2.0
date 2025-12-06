const { pool } = require('../utils/database');

class TimeSheet {
    // Créer une nouvelle feuille de temps
    static async create(timeSheetData) {
        const {
            user_id,
            week_start,
            week_end,
            status = 'sauvegardé'
        } = timeSheetData;

        // S'assurer que les dates sont au format YYYY-MM-DD sans timezone
        const formattedWeekStart = week_start.split('T')[0];
        const formattedWeekEnd = week_end.split('T')[0];

        console.log('📋 Création feuille de temps avec dates:');
        console.log('  - week_start:', formattedWeekStart);
        console.log('  - week_end:', formattedWeekEnd);

        const query = `
            INSERT INTO time_sheets (user_id, week_start, week_end, statut)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [user_id, formattedWeekStart, formattedWeekEnd, status]);
            const timeSheet = result.rows[0];
            // Map 'statut' to 'status' for frontend compatibility
            if (timeSheet && timeSheet.statut) {
                timeSheet.status = timeSheet.statut;
            }
            return timeSheet;
        } catch (error) {
            console.error('Erreur lors de la création de la feuille de temps:', error);
            throw error;
        }
    }

    // Trouver une feuille de temps par ID
    static async findById(id) {
        const query = `
            SELECT * FROM time_sheets 
            WHERE id = $1
        `;

        try {
            const result = await pool.query(query, [id]);
            const timeSheet = result.rows[0] || null;
            // Map 'statut' to 'status' for frontend compatibility
            if (timeSheet && timeSheet.statut) {
                timeSheet.status = timeSheet.statut;
            }
            return timeSheet;
        } catch (error) {
            console.error('Erreur lors de la recherche de la feuille de temps:', error);
            throw error;
        }
    }

    // Trouver une feuille de temps par semaine et utilisateur
    static async findByWeekStart(userId, weekStart) {
        const query = `
            SELECT * FROM time_sheets 
            WHERE user_id = $1 AND week_start = $2
        `;

        try {
            const result = await pool.query(query, [userId, weekStart]);
            const timeSheet = result.rows[0] || null;
            // Map 'statut' to 'status' for frontend compatibility
            if (timeSheet && timeSheet.statut) {
                timeSheet.status = timeSheet.statut;
            }
            return timeSheet;
        } catch (error) {
            console.error('Erreur lors de la recherche de la feuille de temps:', error);
            throw error;
        }
    }

    // Trouver ou créer une feuille de temps pour une semaine
    static async findOrCreate(userId, weekStart, weekEnd) {
        try {
            // S'assurer que les dates sont au format YYYY-MM-DD sans timezone
            const formattedWeekStart = weekStart.split('T')[0];
            const formattedWeekEnd = weekEnd.split('T')[0];

            console.log('🔍 Recherche/création feuille de temps:');
            console.log('  - week_start:', formattedWeekStart);
            console.log('  - week_end:', formattedWeekEnd);

            // Essayer de trouver une feuille existante
            let timeSheet = await this.findByWeekStart(userId, formattedWeekStart);

            if (!timeSheet) {
                try {
                    // Créer une nouvelle feuille de temps
                    timeSheet = await this.create({
                        user_id: userId,
                        week_start: formattedWeekStart,
                        week_end: formattedWeekEnd,
                        status: 'sauvegardé'
                    });
                } catch (error) {
                    // Si erreur de contrainte unique (code 23505),
                    // c'est qu'une autre requête a créé la feuille entre-temps (race condition)
                    if (error.code === '23505') {
                        console.log('⚠️ Race condition détectée - récupération de la feuille créée par une autre requête');
                        timeSheet = await this.findByWeekStart(userId, formattedWeekStart);
                        if (!timeSheet) {
                            throw new Error('Impossible de récupérer la feuille de temps après race condition');
                        }
                    } else {
                        throw error;
                    }
                }
            }

            return timeSheet;
        } catch (error) {
            console.error('Erreur lors de la recherche/création de la feuille de temps:', error);
            throw error;
        }
    }

    // Mettre à jour une feuille de temps
    static async update(id, updateData) {
        const allowedFields = ['statut', 'notes_rejet', 'validateur_id', 'date_validation'];
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
            UPDATE time_sheets 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await pool.query(query, values);
            const timeSheet = result.rows[0];
            // Map 'statut' to 'status' for frontend compatibility
            if (timeSheet && timeSheet.statut) {
                timeSheet.status = timeSheet.statut;
            }
            return timeSheet;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la feuille de temps:', error);
            throw error;
        }
    }

    // Soumettre une feuille de temps
    static async submit(id) {
        return await this.update(id, { statut: 'soumis' });
    }

    // Valider une feuille de temps
    static async validate(id, validateurId) {
        return await this.update(id, {
            statut: 'validé',
            validateur_id: validateurId,
            date_validation: new Date()
        });
    }

    // Rejeter une feuille de temps
    static async reject(id, validateurId, notesRejet) {
        return await this.update(id, {
            statut: 'rejeté',
            validateur_id: validateurId,
            notes_rejet: notesRejet,
            date_validation: new Date()
        });
    }

    // Obtenir toutes les feuilles de temps d'un utilisateur
    static async findByUser(userId, limit = 50) {
        const query = `
            SELECT * FROM time_sheets 
            WHERE user_id = $1 
            ORDER BY week_start DESC 
            LIMIT $2
        `;

        try {
            const result = await pool.query(query, [userId, limit]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la recherche des feuilles de temps:', error);
            throw error;
        }
    }

    // Obtenir les feuilles de temps en attente de validation
    static async findPendingValidation(limit = 50) {
        const query = `
            SELECT ts.*, u.nom as user_nom, u.prenom as user_prenom
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            WHERE ts.status = 'submitted'
            ORDER BY ts.created_at ASC
            LIMIT $1
        `;

        try {
            const result = await pool.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la recherche des feuilles en attente:', error);
            throw error;
        }
    }

    // Supprimer une feuille de temps (et ses entrées)
    static async delete(id) {
        const query = 'DELETE FROM time_sheets WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la suppression de la feuille de temps:', error);
            throw error;
        }
    }

    // Obtenir les statistiques d'une feuille de temps
    static async getStatistics(id) {
        const query = `
            SELECT 
                COUNT(*) as total_entries,
                SUM(CASE WHEN type_heures = 'HC' THEN heures ELSE 0 END) as total_hc,
                SUM(CASE WHEN type_heures = 'HNC' THEN heures ELSE 0 END) as total_hnc,
                SUM(heures) as total_heures
            FROM time_entries 
            WHERE time_sheet_id = $1
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            throw error;
        }
    }
}

module.exports = TimeSheet; 