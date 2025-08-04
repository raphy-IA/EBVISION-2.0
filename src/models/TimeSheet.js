const { pool } = require('../utils/database');

class TimeSheet {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.semaine = data.semaine;
        this.annee = data.annee;
        this.date_debut_semaine = data.date_debut_semaine;
        this.date_fin_semaine = data.date_fin_semaine;
        this.statut = data.statut || 'BROUILLON';
        this.total_heures = data.total_heures || 0;
        this.total_heures_chargeables = data.total_heures_chargeables || 0;
        this.total_heures_non_chargeables = data.total_heures_non_chargeables || 0;
        this.commentaire = data.commentaire;
        this.validateur_id = data.validateur_id;
        this.date_soumission = data.date_soumission;
        this.date_validation = data.date_validation;
        this.commentaire_validation = data.commentaire_validation;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Champs joints
        this.collaborateur_nom = data.collaborateur_nom;
        this.validateur_nom = data.validateur_nom;
    }

    /**
     * Valider les données de la feuille de temps
     */
    validate() {
        const errors = [];

        if (!this.collaborateur_id) {
            errors.push('Collaborateur requis');
        }

        if (!this.semaine || this.semaine < 1 || this.semaine > 53) {
            errors.push('Numéro de semaine invalide (1-53)');
        }

        if (!this.annee || this.annee < 2020 || this.annee > 2030) {
            errors.push('Année invalide');
        }

        const statutsValides = ['BROUILLON', 'EN_COURS', 'SOUMISE', 'VALIDEE', 'REJETEE'];
        if (!statutsValides.includes(this.statut)) {
            errors.push('Statut invalide');
        }

        return errors;
    }

    /**
     * Créer une nouvelle feuille de temps
     */
    static async create(data) {
        const timeSheet = new TimeSheet(data);
        const errors = timeSheet.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier si une feuille existe déjà pour cette semaine/collaborateur
            const existingQuery = `
                SELECT id FROM time_sheets 
                WHERE collaborateur_id = $1 AND semaine = $2 AND annee = $3
            `;
            const existing = await client.query(existingQuery, [
                timeSheet.collaborateur_id, 
                timeSheet.semaine, 
                timeSheet.annee
            ]);

            if (existing.rows.length > 0) {
                throw new Error('Une feuille de temps existe déjà pour cette semaine');
            }

            // Calculer les dates de début et fin de semaine si non fournies
            if (!timeSheet.date_debut_semaine || !timeSheet.date_fin_semaine) {
                const weekDates = await client.query(
                    'SELECT * FROM get_week_dates($1, $2)',
                    [timeSheet.semaine, timeSheet.annee]
                );
                
                if (weekDates.rows.length > 0) {
                    timeSheet.date_debut_semaine = weekDates.rows[0].date_debut;
                    timeSheet.date_fin_semaine = weekDates.rows[0].date_fin;
                }
            }

            const insertQuery = `
                INSERT INTO time_sheets (
                    collaborateur_id, semaine, annee, date_debut_semaine, date_fin_semaine,
                    statut, commentaire
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const values = [
                timeSheet.collaborateur_id,
                timeSheet.semaine,
                timeSheet.annee,
                timeSheet.date_debut_semaine,
                timeSheet.date_fin_semaine,
                timeSheet.statut,
                timeSheet.commentaire
            ];

            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');
            return new TimeSheet(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Trouver une feuille de temps par ID
     */
    static async findById(id) {
        const query = `
            SELECT 
                ts.*,
                c.nom as collaborateur_nom,
                u.nom as validateur_nom
            FROM time_sheets ts
            LEFT JOIN collaborateurs c ON ts.collaborateur_id = c.id
            LEFT JOIN users u ON ts.validateur_id = u.id
            WHERE ts.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new TimeSheet(result.rows[0]) : null;
    }

    /**
     * Trouver toutes les feuilles de temps avec filtres
     */
    static async findAll(options = {}) {
        const {
            collaborateur_id,
            statut,
            semaine,
            annee,
            page = 1,
            limit = 50,
            search
        } = options;

        let whereConditions = [];
        let values = [];
        let valueIndex = 1;

        if (collaborateur_id) {
            whereConditions.push(`ts.collaborateur_id = $${valueIndex}`);
            values.push(collaborateur_id);
            valueIndex++;
        }

        if (statut) {
            whereConditions.push(`ts.statut = $${valueIndex}`);
            values.push(statut);
            valueIndex++;
        }

        if (semaine) {
            whereConditions.push(`ts.semaine = $${valueIndex}`);
            values.push(semaine);
            valueIndex++;
        }

        if (annee) {
            whereConditions.push(`ts.annee = $${valueIndex}`);
            values.push(annee);
            valueIndex++;
        }

        if (search) {
            whereConditions.push(`(c.nom ILIKE $${valueIndex} OR ts.commentaire ILIKE $${valueIndex})`);
            values.push(`%${search}%`);
            valueIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM time_sheets ts
            LEFT JOIN collaborateurs c ON ts.collaborateur_id = c.id
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT 
                ts.*,
                c.nom as collaborateur_nom,
                u.nom as validateur_nom
            FROM time_sheets ts
            LEFT JOIN collaborateurs c ON ts.collaborateur_id = c.id
            LEFT JOIN users u ON ts.validateur_id = u.id
            ${whereClause}
            ORDER BY ts.annee DESC, ts.semaine DESC
            LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
        `;

        values.push(limit, offset);
        const result = await pool.query(dataQuery, values);

        const timeSheets = result.rows.map(row => new TimeSheet(row));

        return {
            timeSheets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Trouver une feuille de temps par collaborateur et semaine
     */
    static async findByCollaborateurAndWeek(collaborateurId, semaine, annee) {
        const query = `
            SELECT 
                ts.*,
                c.nom as collaborateur_nom,
                u.nom as validateur_nom
            FROM time_sheets ts
            LEFT JOIN collaborateurs c ON ts.collaborateur_id = c.id
            LEFT JOIN users u ON ts.validateur_id = u.id
            WHERE ts.collaborateur_id = $1 AND ts.semaine = $2 AND ts.annee = $3
        `;

        const result = await pool.query(query, [collaborateurId, semaine, annee]);
        return result.rows.length > 0 ? new TimeSheet(result.rows[0]) : null;
    }

    /**
     * Créer ou récupérer une feuille de temps pour un collaborateur et une semaine
     */
    static async getOrCreate(collaborateurId, semaine, annee) {
        let timeSheet = await this.findByCollaborateurAndWeek(collaborateurId, semaine, annee);
        
        if (!timeSheet) {
            timeSheet = await this.create({
                collaborateur_id: collaborateurId,
                semaine,
                annee
            });
        }
        
        return timeSheet;
    }

    /**
     * Mettre à jour une feuille de temps
     */
    async update(updateData) {
        const updatedTimeSheet = new TimeSheet({ ...this, ...updateData });
        const errors = updatedTimeSheet.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateQuery = `
                UPDATE time_sheets 
                SET 
                    statut = $1,
                    commentaire = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const values = [
                updatedTimeSheet.statut,
                updatedTimeSheet.commentaire,
                this.id
            ];

            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            
            Object.assign(this, new TimeSheet(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Soumettre une feuille de temps
     */
    async submit() {
        if (this.statut !== 'BROUILLON' && this.statut !== 'EN_COURS') {
            throw new Error('Seules les feuilles en brouillon ou en cours peuvent être soumises');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateQuery = `
                UPDATE time_sheets 
                SET 
                    statut = 'SOUMISE',
                    date_soumission = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await client.query(updateQuery, [this.id]);
            await client.query('COMMIT');
            
            Object.assign(this, new TimeSheet(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Valider une feuille de temps
     */
    async validate(validateurId, commentaire = null) {
        if (this.statut !== 'SOUMISE') {
            throw new Error('Seules les feuilles soumises peuvent être validées');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateQuery = `
                UPDATE time_sheets 
                SET 
                    statut = 'VALIDEE',
                    validateur_id = $1,
                    date_validation = CURRENT_TIMESTAMP,
                    commentaire_validation = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const values = [validateurId, commentaire, this.id];
            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            
            Object.assign(this, new TimeSheet(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Rejeter une feuille de temps
     */
    async reject(validateurId, commentaire) {
        if (this.statut !== 'SOUMISE') {
            throw new Error('Seules les feuilles soumises peuvent être rejetées');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateQuery = `
                UPDATE time_sheets 
                SET 
                    statut = 'REJETEE',
                    validateur_id = $1,
                    date_validation = CURRENT_TIMESTAMP,
                    commentaire_validation = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const values = [validateurId, commentaire, this.id];
            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            
            Object.assign(this, new TimeSheet(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Supprimer une feuille de temps
     */
    static async delete(id) {
        const query = 'DELETE FROM time_sheets WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows.length > 0;
    }

    /**
     * Obtenir les statistiques des feuilles de temps
     */
    static async getStatistics(options = {}) {
        const { annee } = options;
        
        let whereClause = '';
        let values = [];
        
        if (annee) {
            whereClause = 'WHERE annee = $1';
            values = [annee];
        }

        const query = `
            SELECT 
                statut,
                COUNT(*) as total,
                COUNT(CASE WHEN total_heures > 0 THEN 1 END) as avec_heures,
                AVG(total_heures) as moyenne_heures,
                SUM(total_heures) as total_heures
            FROM time_sheets
            ${whereClause}
            GROUP BY statut
            ORDER BY statut
        `;

        const result = await pool.query(query, values);
        return result.rows;
    }

    /**
     * Trouver les feuilles de temps en retard
     */
    static async findOverdue() {
        const currentWeek = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        const currentYear = new Date().getFullYear();

        const query = `
            SELECT 
                ts.*,
                c.nom as collaborateur_nom
            FROM time_sheets ts
            LEFT JOIN collaborateurs c ON ts.collaborateur_id = c.id
            WHERE (ts.annee < $1 OR (ts.annee = $1 AND ts.semaine < $2))
            AND ts.statut IN ('BROUILLON', 'EN_COURS')
            ORDER BY ts.annee DESC, ts.semaine DESC
        `;

        const result = await pool.query(query, [currentYear, currentWeek]);
        return result.rows.map(row => new TimeSheet(row));
    }
}

module.exports = TimeSheet; 