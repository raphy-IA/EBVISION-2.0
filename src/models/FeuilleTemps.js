const { pool } = require('../utils/database');

class FeuilleTemps {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.semaine = data.semaine;
        this.annee = data.annee;
        this.date_debut_semaine = data.date_debut_semaine;
        this.date_fin_semaine = data.date_fin_semaine;
        this.statut = data.statut || 'BROUILLON';
        this.validateur_id = data.validateur_id;
        this.date_soumission = data.date_soumission;
        this.date_validation = data.date_validation;
        this.commentaire_validation = data.commentaire_validation;
        this.total_heures_chargeables = data.total_heures_chargeables || 0;
        this.total_heures_non_chargeables = data.total_heures_non_chargeables || 0;
        this.total_heures_semaine = data.total_heures_semaine || 0;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Valider les données de la feuille de temps
     */
    validate() {
        const errors = [];

        if (!this.collaborateur_id) {
            errors.push('ID du collaborateur requis');
        }

        if (!this.semaine || this.semaine < 1 || this.semaine > 53) {
            errors.push('Numéro de semaine invalide (1-53)');
        }

        if (!this.annee || this.annee < 2020 || this.annee > 2030) {
            errors.push('Année invalide');
        }

        if (!this.date_debut_semaine) {
            errors.push('Date de début de semaine requise');
        }

        if (!this.date_fin_semaine) {
            errors.push('Date de fin de semaine requise');
        }

        if (this.date_debut_semaine && this.date_fin_semaine && 
            new Date(this.date_debut_semaine) >= new Date(this.date_fin_semaine)) {
            errors.push('La date de fin doit être postérieure à la date de début');
        }

        if (!['BROUILLON', 'SOUMISE', 'VALIDEE', 'REJETEE'].includes(this.statut)) {
            errors.push('Statut invalide');
        }

        return errors;
    }

    /**
     * Créer une nouvelle feuille de temps
     */
    static async create(data) {
        const feuilleTemps = new FeuilleTemps(data);
        const errors = feuilleTemps.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier si une feuille de temps existe déjà pour cette semaine/année/collaborateur
            const existingQuery = `
                SELECT id FROM feuilles_temps 
                WHERE collaborateur_id = $1 AND semaine = $2 AND annee = $3
            `;
            const existingResult = await client.query(existingQuery, [
                feuilleTemps.collaborateur_id, 
                feuilleTemps.semaine, 
                feuilleTemps.annee
            ]);

            if (existingResult.rows.length > 0) {
                throw new Error('Une feuille de temps existe déjà pour cette semaine et ce collaborateur');
            }

            const insertQuery = `
                INSERT INTO feuilles_temps (
                    collaborateur_id, semaine, annee, date_debut_semaine, date_fin_semaine,
                    statut, validateur_id, total_heures_chargeables, total_heures_non_chargeables,
                    total_heures_semaine
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const result = await client.query(insertQuery, [
                feuilleTemps.collaborateur_id,
                feuilleTemps.semaine,
                feuilleTemps.annee,
                feuilleTemps.date_debut_semaine,
                feuilleTemps.date_fin_semaine,
                feuilleTemps.statut,
                feuilleTemps.validateur_id,
                feuilleTemps.total_heures_chargeables,
                feuilleTemps.total_heures_non_chargeables,
                feuilleTemps.total_heures_semaine
            ]);

            await client.query('COMMIT');
            return new FeuilleTemps(result.rows[0]);
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
            SELECT ft.*, 
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom, c.initiales,
                   u.nom as validateur_nom
            FROM feuilles_temps ft
            LEFT JOIN collaborateurs c ON ft.collaborateur_id = c.id
            LEFT JOIN utilisateurs u ON ft.validateur_id = u.id
            WHERE ft.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new FeuilleTemps(result.rows[0]) : null;
    }

    /**
     * Trouver toutes les feuilles de temps avec pagination et filtres
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            collaborateur_id,
            semaine,
            annee,
            statut,
            date_debut,
            date_fin,
            search
        } = options;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (collaborateur_id) {
            whereConditions.push(`ft.collaborateur_id = $${paramIndex++}`);
            queryParams.push(collaborateur_id);
        }

        if (semaine) {
            whereConditions.push(`ft.semaine = $${paramIndex++}`);
            queryParams.push(semaine);
        }

        if (annee) {
            whereConditions.push(`ft.annee = $${paramIndex++}`);
            queryParams.push(annee);
        }

        if (statut) {
            whereConditions.push(`ft.statut = $${paramIndex++}`);
            queryParams.push(statut);
        }

        if (date_debut) {
            whereConditions.push(`ft.date_debut_semaine >= $${paramIndex++}`);
            queryParams.push(date_debut);
        }

        if (date_fin) {
            whereConditions.push(`ft.date_fin_semaine <= $${paramIndex++}`);
            queryParams.push(date_fin);
        }

        if (search) {
            whereConditions.push(`(
                c.nom ILIKE $${paramIndex} OR 
                c.prenom ILIKE $${paramIndex} OR 
                c.initiales ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM feuilles_temps ft
            LEFT JOIN collaborateurs c ON ft.collaborateur_id = c.id
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT ft.*, 
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom, c.initiales,
                   u.nom as validateur_nom
            FROM feuilles_temps ft
            LEFT JOIN collaborateurs c ON ft.collaborateur_id = c.id
            LEFT JOIN utilisateurs u ON ft.validateur_id = u.id
            ${whereClause}
            ORDER BY ft.annee DESC, ft.semaine DESC, ft.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        return {
            data: result.rows.map(row => new FeuilleTemps(row)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Mettre à jour une feuille de temps
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

            const updateQuery = `
                UPDATE feuilles_temps SET
                    date_debut_semaine = $1,
                    date_fin_semaine = $2,
                    statut = $3,
                    validateur_id = $4,
                    date_soumission = $5,
                    date_validation = $6,
                    commentaire_validation = $7,
                    total_heures_chargeables = $8,
                    total_heures_non_chargeables = $9,
                    total_heures_semaine = $10,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $11
                RETURNING *
            `;

            const result = await client.query(updateQuery, [
                this.date_debut_semaine,
                this.date_fin_semaine,
                this.statut,
                this.validateur_id,
                this.date_soumission,
                this.date_validation,
                this.commentaire_validation,
                this.total_heures_chargeables,
                this.total_heures_non_chargeables,
                this.total_heures_semaine,
                this.id
            ]);

            if (result.rows.length === 0) {
                throw new Error('Feuille de temps non trouvée');
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
     * Supprimer une feuille de temps
     */
    static async delete(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier si la feuille de temps peut être supprimée
            const checkQuery = `
                SELECT statut FROM feuilles_temps WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw new Error('Feuille de temps non trouvée');
            }

            if (checkResult.rows[0].statut === 'VALIDEE') {
                throw new Error('Impossible de supprimer une feuille de temps validée');
            }

            // Supprimer les liaisons avec les time entries
            await client.query(`
                DELETE FROM feuille_temps_entries WHERE feuille_temps_id = $1
            `, [id]);

            // Supprimer la feuille de temps
            const deleteQuery = `
                DELETE FROM feuilles_temps WHERE id = $1
            `;
            const result = await client.query(deleteQuery, [id]);

            if (result.rowCount === 0) {
                throw new Error('Feuille de temps non trouvée');
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
     * Soumettre une feuille de temps pour validation
     */
    async submit() {
        if (this.statut !== 'BROUILLON') {
            throw new Error('Seules les feuilles de temps en brouillon peuvent être soumises');
        }

        // Calculer les totaux des heures
        await this.calculateTotals();

        this.statut = 'SOUMISE';
        this.date_soumission = new Date();

        return await this.update({
            statut: this.statut,
            date_soumission: this.date_soumission
        });
    }

    /**
     * Valider une feuille de temps
     */
    async validate(validateur_id, commentaire = null) {
        if (this.statut !== 'SOUMISE') {
            throw new Error('Seules les feuilles de temps soumises peuvent être validées');
        }

        this.statut = 'VALIDEE';
        this.validateur_id = validateur_id;
        this.date_validation = new Date();
        this.commentaire_validation = commentaire;

        return await this.update({
            statut: this.statut,
            validateur_id: this.validateur_id,
            date_validation: this.date_validation,
            commentaire_validation: this.commentaire_validation
        });
    }

    /**
     * Rejeter une feuille de temps
     */
    async reject(validateur_id, commentaire) {
        if (this.statut !== 'SOUMISE') {
            throw new Error('Seules les feuilles de temps soumises peuvent être rejetées');
        }

        if (!commentaire) {
            throw new Error('Un commentaire est requis pour rejeter une feuille de temps');
        }

        this.statut = 'REJETEE';
        this.validateur_id = validateur_id;
        this.date_validation = new Date();
        this.commentaire_validation = commentaire;

        return await this.update({
            statut: this.statut,
            validateur_id: this.validateur_id,
            date_validation: this.date_validation,
            commentaire_validation: this.commentaire_validation
        });
    }

    /**
     * Calculer les totaux des heures
     */
    async calculateTotals() {
        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN te.type_heures = 'CHARGEABLE' THEN te.heures ELSE 0 END), 0) as heures_chargeables,
                COALESCE(SUM(CASE WHEN te.type_heures = 'NON_CHARGEABLE' THEN te.heures ELSE 0 END), 0) as heures_non_chargeables,
                COALESCE(SUM(te.heures), 0) as total_heures
            FROM time_entries te
            INNER JOIN feuille_temps_entries fte ON te.id = fte.time_entry_id
            WHERE fte.feuille_temps_id = $1
        `;

        const result = await pool.query(query, [this.id]);
        const totals = result.rows[0];

        this.total_heures_chargeables = parseFloat(totals.heures_chargeables);
        this.total_heures_non_chargeables = parseFloat(totals.heures_non_chargeables);
        this.total_heures_semaine = parseFloat(totals.total_heures);

        return {
            chargeables: this.total_heures_chargeables,
            non_chargeables: this.total_heures_non_chargeables,
            total: this.total_heures_semaine
        };
    }

    /**
     * Ajouter des time entries à la feuille de temps
     */
    async addTimeEntries(timeEntryIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier que les time entries existent et appartiennent au bon collaborateur
            const checkQuery = `
                SELECT id FROM time_entries 
                WHERE id = ANY($1) AND user_id IN (
                    SELECT id FROM utilisateurs WHERE collaborateur_id = $2
                )
            `;
            const checkResult = await client.query(checkQuery, [timeEntryIds, this.collaborateur_id]);

            if (checkResult.rows.length !== timeEntryIds.length) {
                throw new Error('Certaines saisies de temps ne peuvent pas être ajoutées à cette feuille de temps');
            }

            // Ajouter les liaisons
            for (const timeEntryId of timeEntryIds) {
                await client.query(`
                    INSERT INTO feuille_temps_entries (feuille_temps_id, time_entry_id)
                    VALUES ($1, $2)
                    ON CONFLICT (feuille_temps_id, time_entry_id) DO NOTHING
                `, [this.id, timeEntryId]);
            }

            // Recalculer les totaux
            await this.calculateTotals();
            await this.update({
                total_heures_chargeables: this.total_heures_chargeables,
                total_heures_non_chargeables: this.total_heures_non_chargeables,
                total_heures_semaine: this.total_heures_semaine
            });

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
     * Retirer des time entries de la feuille de temps
     */
    async removeTimeEntries(timeEntryIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Supprimer les liaisons
            await client.query(`
                DELETE FROM feuille_temps_entries 
                WHERE feuille_temps_id = $1 AND time_entry_id = ANY($2)
            `, [this.id, timeEntryIds]);

            // Recalculer les totaux
            await this.calculateTotals();
            await this.update({
                total_heures_chargeables: this.total_heures_chargeables,
                total_heures_non_chargeables: this.total_heures_non_chargeables,
                total_heures_semaine: this.total_heures_semaine
            });

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
     * Obtenir les statistiques des feuilles de temps
     */
    static async getStatistics(options = {}) {
        const {
            collaborateur_id,
            annee,
            date_debut,
            date_fin
        } = options;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (collaborateur_id) {
            whereConditions.push(`ft.collaborateur_id = $${paramIndex++}`);
            queryParams.push(collaborateur_id);
        }

        if (annee) {
            whereConditions.push(`ft.annee = $${paramIndex++}`);
            queryParams.push(annee);
        }

        if (date_debut) {
            whereConditions.push(`ft.date_debut_semaine >= $${paramIndex++}`);
            queryParams.push(date_debut);
        }

        if (date_fin) {
            whereConditions.push(`ft.date_fin_semaine <= $${paramIndex++}`);
            queryParams.push(date_fin);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                COUNT(*) as total_feuilles,
                COUNT(CASE WHEN statut = 'BROUILLON' THEN 1 END) as brouillons,
                COUNT(CASE WHEN statut = 'SOUMISE' THEN 1 END) as soumises,
                COUNT(CASE WHEN statut = 'VALIDEE' THEN 1 END) as validees,
                COUNT(CASE WHEN statut = 'REJETEE' THEN 1 END) as rejetees,
                COALESCE(SUM(total_heures_chargeables), 0) as total_heures_chargeables,
                COALESCE(SUM(total_heures_non_chargeables), 0) as total_heures_non_chargeables,
                COALESCE(SUM(total_heures_semaine), 0) as total_heures_semaine,
                COALESCE(AVG(total_heures_semaine), 0) as moyenne_heures_semaine
            FROM feuilles_temps ft
            ${whereClause}
        `;

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    /**
     * Obtenir les feuilles de temps par collaborateur
     */
    static async getByCollaborateur(collaborateur_id, options = {}) {
        return await this.findAll({
            collaborateur_id,
            ...options
        });
    }

    /**
     * Obtenir les feuilles de temps par période
     */
    static async getByPeriod(semaine, annee, options = {}) {
        return await this.findAll({
            semaine,
            annee,
            ...options
        });
    }

    /**
     * Obtenir les feuilles de temps en attente de validation
     */
    static async getPendingValidation(options = {}) {
        return await this.findAll({
            statut: 'SOUMISE',
            ...options
        });
    }
}

module.exports = FeuilleTemps; 