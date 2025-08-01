const { pool } = require('../utils/database');

class TimeEntry {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.mission_id = data.mission_id;
        this.date_saisie = data.date_saisie;
        this.heures = data.heures || 0;
        this.type_heures = data.type_heures || 'CHARGEABLE';
        this.type_non_chargeable_id = data.type_non_chargeable_id;
        this.description = data.description;
        this.perdiem = data.perdiem || 0;
        this.transport = data.transport || 0;
        this.hotel = data.hotel || 0;
        this.restaurant = data.restaurant || 0;
        this.divers = data.divers || 0;
        this.semaine = data.semaine;
        this.annee = data.annee;
        this.statut_validation = data.statut_validation || 'SAISIE';
        this.validateur_id = data.validateur_id;
        this.date_validation = data.date_validation;
        this.commentaire_validation = data.commentaire_validation;
        this.taux_horaire_applique = data.taux_horaire_applique;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Valider les données de la saisie de temps
     */
    validate() {
        const errors = [];

        if (!this.user_id) {
            errors.push('ID utilisateur requis');
        }

        if (!this.date_saisie) {
            errors.push('Date de saisie requise');
        }

        if (!this.heures || this.heures <= 0) {
            errors.push('Nombre d\'heures requis et positif');
        }

        if (this.heures > 24) {
            errors.push('Nombre d\'heures ne peut pas dépasser 24');
        }

        if (!['CHARGEABLE', 'NON_CHARGEABLE'].includes(this.type_heures)) {
            errors.push('Type d\'heures invalide');
        }

        if (this.type_heures === 'CHARGEABLE' && !this.mission_id) {
            errors.push('Mission requise pour les heures chargeables');
        }

        if (this.type_heures === 'NON_CHARGEABLE' && !this.type_non_chargeable_id) {
            errors.push('Type d\'heures non chargeables requis');
        }

        if (!['SAISIE', 'SOUMISE', 'VALIDEE', 'REJETEE'].includes(this.statut_validation)) {
            errors.push('Statut de validation invalide');
        }

        return errors;
    }

    /**
     * Créer une nouvelle saisie de temps
     */
    static async create(data) {
        const timeEntry = new TimeEntry(data);
        const errors = timeEntry.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        // Calculer la semaine et l'année si non fournies
        if (!timeEntry.semaine || !timeEntry.annee) {
            const date = new Date(timeEntry.date_saisie);
            timeEntry.annee = date.getFullYear();
            timeEntry.semaine = this.getWeekNumber(date);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertQuery = `
                INSERT INTO time_entries (
                    user_id, mission_id, date_saisie, heures, type_heures, 
                    type_non_chargeable_id, description, perdiem, transport, 
                    hotel, restaurant, divers, semaine, annee, statut_validation,
                    taux_horaire_applique
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `;

            const result = await client.query(insertQuery, [
                timeEntry.user_id,
                timeEntry.mission_id,
                timeEntry.date_saisie,
                timeEntry.heures,
                timeEntry.type_heures,
                timeEntry.type_non_chargeable_id,
                timeEntry.description,
                timeEntry.perdiem,
                timeEntry.transport,
                timeEntry.hotel,
                timeEntry.restaurant,
                timeEntry.divers,
                timeEntry.semaine,
                timeEntry.annee,
                timeEntry.statut_validation,
                timeEntry.taux_horaire_applique
            ]);

            await client.query('COMMIT');
            return new TimeEntry(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Trouver une saisie de temps par ID
     */
    static async findById(id) {
        const query = `
            SELECT te.*, 
                   u.nom as user_nom,
                   m.nom as mission_titre,
                   c.nom as client_nom,
                   thnc.nom as type_non_chargeable_nom,
                   v.nom as validateur_nom
            FROM time_entries te
            LEFT JOIN utilisateurs u ON te.user_id = u.id
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN types_heures_non_chargeables thnc ON te.type_non_chargeable_id = thnc.id
            LEFT JOIN utilisateurs v ON te.validateur_id = v.id
            WHERE te.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new TimeEntry(result.rows[0]) : null;
    }

    /**
     * Trouver toutes les saisies de temps avec pagination et filtres
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            user_id,
            mission_id,
            client_id,
            date_debut,
            date_fin,
            type_heures,
            statut_validation,
            semaine,
            annee,
            search
        } = options;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (user_id) {
            whereConditions.push(`te.user_id = $${paramIndex++}`);
            queryParams.push(user_id);
        }

        if (mission_id) {
            whereConditions.push(`te.mission_id = $${paramIndex++}`);
            queryParams.push(mission_id);
        }

        if (client_id) {
            whereConditions.push(`m.client_id = $${paramIndex++}`);
            queryParams.push(client_id);
        }

        if (date_debut) {
            whereConditions.push(`te.date_saisie >= $${paramIndex++}`);
            queryParams.push(date_debut);
        }

        if (date_fin) {
            whereConditions.push(`te.date_saisie <= $${paramIndex++}`);
            queryParams.push(date_fin);
        }

        if (type_heures) {
            whereConditions.push(`te.type_heures = $${paramIndex++}`);
            queryParams.push(type_heures);
        }

        if (statut_validation) {
            whereConditions.push(`te.statut_validation = $${paramIndex++}`);
            queryParams.push(statut_validation);
        }

        if (semaine) {
            whereConditions.push(`te.semaine = $${paramIndex++}`);
            queryParams.push(semaine);
        }

        if (annee) {
            whereConditions.push(`te.annee = $${paramIndex++}`);
            queryParams.push(annee);
        }

        if (search) {
            whereConditions.push(`(
                te.description ILIKE $${paramIndex} OR 
                m.nom ILIKE $${paramIndex} OR 
                c.nom ILIKE $${paramIndex} OR
                u.nom ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN utilisateurs u ON te.user_id = u.id
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT te.*, 
                   u.nom as user_nom,
                   m.nom as mission_titre,
                   c.nom as client_nom,
                   thnc.nom as type_non_chargeable_nom,
                   v.nom as validateur_nom
            FROM time_entries te
            LEFT JOIN utilisateurs u ON te.user_id = u.id
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN types_heures_non_chargeables thnc ON te.type_non_chargeable_id = thnc.id
            LEFT JOIN utilisateurs v ON te.validateur_id = v.id
            ${whereClause}
            ORDER BY te.date_saisie DESC, te.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        return {
            data: result.rows.map(row => new TimeEntry(row)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Mettre à jour une saisie de temps
     */
    async update(updateData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mettre à jour les propriétés
            Object.assign(this, updateData);
            
            const errors = this.validate();
            if (errors.length > 0) {
                throw new Error(`Validation échouée: ${errors.join(', ')}`);
            }

            // Recalculer la semaine et l'année si la date a changé
            if (updateData.date_saisie) {
                const date = new Date(this.date_saisie);
                this.annee = date.getFullYear();
                this.semaine = TimeEntry.getWeekNumber(date);
            }

            const updateQuery = `
                UPDATE time_entries SET
                    mission_id = $1,
                    date_saisie = $2,
                    heures = $3,
                    type_heures = $4,
                    type_non_chargeable_id = $5,
                    description = $6,
                    perdiem = $7,
                    transport = $8,
                    hotel = $9,
                    restaurant = $10,
                    divers = $11,
                    semaine = $12,
                    annee = $13,
                    statut_validation = $14,
                    validateur_id = $15,
                    date_validation = $16,
                    commentaire_validation = $17,
                    taux_horaire_applique = $18,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $19
                RETURNING *
            `;

            const result = await client.query(updateQuery, [
                this.mission_id,
                this.date_saisie,
                this.heures,
                this.type_heures,
                this.type_non_chargeable_id,
                this.description,
                this.perdiem,
                this.transport,
                this.hotel,
                this.restaurant,
                this.divers,
                this.semaine,
                this.annee,
                this.statut_validation,
                this.validateur_id,
                this.date_validation,
                this.commentaire_validation,
                this.taux_horaire_applique,
                this.id
            ]);

            if (result.rows.length === 0) {
                throw new Error('Saisie de temps non trouvée');
            }

            Object.assign(this, result.rows[0]);
            await client.query('COMMIT');
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Supprimer une saisie de temps
     */
    static async delete(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier si la saisie de temps peut être supprimée
            const checkQuery = `
                SELECT statut_validation FROM time_entries WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw new Error('Saisie de temps non trouvée');
            }

            if (checkResult.rows[0].statut_validation === 'VALIDEE') {
                throw new Error('Impossible de supprimer une saisie de temps validée');
            }

            // Supprimer les liaisons avec les feuilles de temps
            await client.query(`
                DELETE FROM feuille_temps_entries WHERE time_entry_id = $1
            `, [id]);

            // Supprimer la saisie de temps
            const deleteQuery = `
                DELETE FROM time_entries WHERE id = $1
            `;
            const result = await client.query(deleteQuery, [id]);

            if (result.rowCount === 0) {
                throw new Error('Saisie de temps non trouvée');
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Soumettre une saisie de temps pour validation
     */
    async submit() {
        if (this.statut_validation !== 'SAISIE') {
            throw new Error('Seules les saisies en brouillon peuvent être soumises');
        }

        this.statut_validation = 'SOUMISE';

        return await this.update({
            statut_validation: this.statut_validation
        });
    }

    /**
     * Valider une saisie de temps
     */
    async validate(validateur_id, commentaire = null) {
        if (this.statut_validation !== 'SOUMISE') {
            throw new Error('Seules les saisies soumises peuvent être validées');
        }

        this.statut_validation = 'VALIDEE';
        this.validateur_id = validateur_id;
        this.date_validation = new Date();
        this.commentaire_validation = commentaire;

        return await this.update({
            statut_validation: this.statut_validation,
            validateur_id: this.validateur_id,
            date_validation: this.date_validation,
            commentaire_validation: this.commentaire_validation
        });
    }

    /**
     * Rejeter une saisie de temps
     */
    async reject(validateur_id, commentaire) {
        if (this.statut_validation !== 'SOUMISE') {
            throw new Error('Seules les saisies soumises peuvent être rejetées');
        }

        if (!commentaire) {
            throw new Error('Un commentaire est requis pour rejeter une saisie de temps');
        }

        this.statut_validation = 'REJETEE';
        this.validateur_id = validateur_id;
        this.date_validation = new Date();
        this.commentaire_validation = commentaire;

        return await this.update({
            statut_validation: this.statut_validation,
            validateur_id: this.validateur_id,
            date_validation: this.date_validation,
            commentaire_validation: this.commentaire_validation
        });
    }

    /**
     * Obtenir les statistiques des saisies de temps
     */
    static async getStatistics(options = {}) {
        const {
            user_id,
            mission_id,
            client_id,
            date_debut,
            date_fin,
            type_heures,
            annee
        } = options;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (user_id) {
            whereConditions.push(`te.user_id = $${paramIndex++}`);
            queryParams.push(user_id);
        }

        if (mission_id) {
            whereConditions.push(`te.mission_id = $${paramIndex++}`);
            queryParams.push(mission_id);
        }

        if (client_id) {
            whereConditions.push(`m.client_id = $${paramIndex++}`);
            queryParams.push(client_id);
        }

        if (date_debut) {
            whereConditions.push(`te.date_saisie >= $${paramIndex++}`);
            queryParams.push(date_debut);
        }

        if (date_fin) {
            whereConditions.push(`te.date_saisie <= $${paramIndex++}`);
            queryParams.push(date_fin);
        }

        if (type_heures) {
            whereConditions.push(`te.type_heures = $${paramIndex++}`);
            queryParams.push(type_heures);
        }

        if (annee) {
            whereConditions.push(`te.annee = $${paramIndex++}`);
            queryParams.push(annee);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN statut_validation = 'SAISIE' THEN 1 END) as saisies,
                COUNT(CASE WHEN statut_validation = 'SOUMISE' THEN 1 END) as soumises,
                COUNT(CASE WHEN statut_validation = 'VALIDEE' THEN 1 END) as validees,
                COUNT(CASE WHEN statut_validation = 'REJETEE' THEN 1 END) as rejetees,
                COALESCE(SUM(heures), 0) as total_heures,
                COALESCE(SUM(CASE WHEN type_heures = 'CHARGEABLE' THEN heures ELSE 0 END), 0) as heures_chargeables,
                COALESCE(SUM(CASE WHEN type_heures = 'NON_CHARGEABLE' THEN heures ELSE 0 END), 0) as heures_non_chargeables,
                COALESCE(SUM(perdiem), 0) as total_perdiem,
                COALESCE(SUM(transport), 0) as total_transport,
                COALESCE(SUM(hotel), 0) as total_hotel,
                COALESCE(SUM(restaurant), 0) as total_restaurant,
                COALESCE(SUM(divers), 0) as total_divers,
                COALESCE(AVG(heures), 0) as moyenne_heures_par_jour
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            ${whereClause}
        `;

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    /**
     * Obtenir les saisies de temps par utilisateur
     */
    static async getByUser(user_id, options = {}) {
        return await this.findAll({
            user_id,
            ...options
        });
    }

    /**
     * Obtenir les saisies de temps par mission
     */
    static async getByMission(mission_id, options = {}) {
        return await this.findAll({
            mission_id,
            ...options
        });
    }

    /**
     * Obtenir les saisies de temps par période
     */
    static async getByPeriod(date_debut, date_fin, options = {}) {
        return await this.findAll({
            date_debut,
            date_fin,
            ...options
        });
    }

    /**
     * Obtenir les saisies de temps en attente de validation
     */
    static async getPendingValidation(options = {}) {
        return await this.findAll({
            statut_validation: 'SOUMISE',
            ...options
        });
    }

    /**
     * Calculer le numéro de semaine ISO
     */
    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Calculer le montant total de la saisie de temps
     */
    calculateTotal() {
        return this.perdiem + this.transport + this.hotel + this.restaurant + this.divers;
    }

    /**
     * Calculer le coût de la saisie de temps
     */
    calculateCost() {
        if (!this.taux_horaire_applique) {
            return 0;
        }
        return this.heures * this.taux_horaire_applique;
    }
}

module.exports = TimeEntry; 