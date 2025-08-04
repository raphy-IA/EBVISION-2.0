const { pool } = require('../utils/database');

class Activity {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.description = data.description;
        this.business_unit_id = data.business_unit_id;
        this.type_activite = data.type_activite || 'ADMINISTRATIF';
        this.obligatoire = data.obligatoire || false;
        this.actif = data.actif !== false; // true par défaut
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Champs joints
        this.business_unit_nom = data.business_unit_nom;
    }

    /**
     * Valider les données de l'activité
     */
    validate() {
        const errors = [];

        if (!this.nom || this.nom.trim().length === 0) {
            errors.push('Nom de l\'activité requis');
        }

        if (!this.business_unit_id) {
            errors.push('Business Unit requise');
        }

        const typesValides = ['ADMINISTRATIF', 'FORMATION', 'CONGE', 'MALADIE', 'FERIE', 'DEPLACEMENT', 'AUTRE'];
        if (!typesValides.includes(this.type_activite)) {
            errors.push('Type d\'activité invalide');
        }

        return errors;
    }

    /**
     * Créer une nouvelle activité
     */
    static async create(data) {
        const activity = new Activity(data);
        const errors = activity.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertQuery = `
                INSERT INTO activities (
                    nom, description, business_unit_id, type_activite, obligatoire, actif
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                activity.nom,
                activity.description,
                activity.business_unit_id,
                activity.type_activite,
                activity.obligatoire,
                activity.actif
            ];

            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');
            return new Activity(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Trouver une activité par ID
     */
    static async findById(id) {
        const query = `
            SELECT 
                a.*,
                bu.nom as business_unit_nom
            FROM activities a
            LEFT JOIN business_units bu ON a.business_unit_id = bu.id
            WHERE a.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new Activity(result.rows[0]) : null;
    }

    /**
     * Trouver toutes les activités avec filtres
     */
    static async findAll(options = {}) {
        const {
            business_unit_id,
            type_activite,
            actif = true,
            page = 1,
            limit = 50,
            search
        } = options;

        let whereConditions = ['a.actif = $1'];
        let values = [actif];
        let valueIndex = 2;

        if (business_unit_id) {
            whereConditions.push(`a.business_unit_id = $${valueIndex}`);
            values.push(business_unit_id);
            valueIndex++;
        }

        if (type_activite) {
            whereConditions.push(`a.type_activite = $${valueIndex}`);
            values.push(type_activite);
            valueIndex++;
        }

        if (search) {
            whereConditions.push(`(a.nom ILIKE $${valueIndex} OR a.description ILIKE $${valueIndex})`);
            values.push(`%${search}%`);
            valueIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM activities a
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT 
                a.*,
                bu.nom as business_unit_nom
            FROM activities a
            LEFT JOIN business_units bu ON a.business_unit_id = bu.id
            ${whereClause}
            ORDER BY a.nom
            LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
        `;

        values.push(limit, offset);
        const result = await pool.query(dataQuery, values);

        const activities = result.rows.map(row => new Activity(row));

        return {
            activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Mettre à jour une activité
     */
    async update(updateData) {
        const updatedActivity = new Activity({ ...this, ...updateData });
        const errors = updatedActivity.validate();
        
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateQuery = `
                UPDATE activities 
                SET 
                    nom = $1,
                    description = $2,
                    business_unit_id = $3,
                    type_activite = $4,
                    obligatoire = $5,
                    actif = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `;

            const values = [
                updatedActivity.nom,
                updatedActivity.description,
                updatedActivity.business_unit_id,
                updatedActivity.type_activite,
                updatedActivity.obligatoire,
                updatedActivity.actif,
                this.id
            ];

            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');
            
            Object.assign(this, new Activity(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Supprimer une activité
     */
    static async delete(id) {
        const query = 'DELETE FROM activities WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows.length > 0;
    }

    /**
     * Trouver les activités par business unit
     */
    static async findByBusinessUnit(businessUnitId, options = {}) {
        const { actif = true } = options;
        
        const query = `
            SELECT 
                a.*,
                bu.nom as business_unit_nom
            FROM activities a
            LEFT JOIN business_units bu ON a.business_unit_id = bu.id
            WHERE a.business_unit_id = $1 AND a.actif = $2
            ORDER BY a.nom
        `;

        const result = await pool.query(query, [businessUnitId, actif]);
        return result.rows.map(row => new Activity(row));
    }

    /**
     * Trouver les activités par type
     */
    static async findByType(typeActivite, options = {}) {
        const { actif = true } = options;
        
        const query = `
            SELECT 
                a.*,
                bu.nom as business_unit_nom
            FROM activities a
            LEFT JOIN business_units bu ON a.business_unit_id = bu.id
            WHERE a.type_activite = $1 AND a.actif = $2
            ORDER BY a.nom
        `;

        const result = await pool.query(query, [typeActivite, actif]);
        return result.rows.map(row => new Activity(row));
    }

    /**
     * Obtenir les statistiques des activités
     */
    static async getStatistics() {
        const query = `
            SELECT 
                type_activite,
                COUNT(*) as total,
                COUNT(CASE WHEN actif = true THEN 1 END) as actives,
                COUNT(CASE WHEN obligatoire = true THEN 1 END) as obligatoires
            FROM activities
            GROUP BY type_activite
            ORDER BY type_activite
        `;

        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = Activity; 