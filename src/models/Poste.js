const { pool } = require('../utils/database');

class Poste {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code = data.code;
        this.description = data.description;
        this.statut = data.statut || 'ACTIF';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    validate() {
        const errors = [];
        
        if (!this.nom || this.nom.trim().length === 0) {
            errors.push('Le nom du poste est requis');
        }
        
        if (!this.code || this.code.trim().length === 0) {
            errors.push('Le code du poste est requis');
        }
        
        if (this.statut && !['ACTIF', 'INACTIF'].includes(this.statut)) {
            errors.push('Le statut doit être ACTIF ou INACTIF');
        }
        
        return errors;
    }

    static async create(poste) {
        const errors = poste.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO postes (
                nom, code, description, statut
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(query, [
            poste.nom,
            poste.code,
            poste.description,
            poste.statut
        ]);

        return new Poste(result.rows[0]);
    }

    static async findAll(options = {}) {
        const { page, limit, statut } = options;
        const queryParams = [];
        let paramIndex = 1;

        // Construire la clause WHERE
        const whereConditions = [];
        if (statut) {
            whereConditions.push(`p.statut = $${paramIndex++}`);
            queryParams.push(statut);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM postes p
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Construire la requête pour les données
        let dataQuery = `
            SELECT p.*
            FROM postes p
            ${whereClause}
            ORDER BY p.nom
        `;

        // Ajouter la pagination seulement si spécifiée
        if (page && limit) {
            const offset = (page - 1) * limit;
            dataQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            queryParams.push(limit, offset);
        }

        const dataResult = await pool.query(dataQuery, queryParams);
        const postes = dataResult.rows.map(row => new Poste(row));

        return {
            data: postes,
            pagination: {
                total,
                page: page || 1,
                limit: limit || total,
                pages: page && limit ? Math.ceil(total / limit) : 1
            }
        };
    }

    static async findById(id) {
        const query = `
            SELECT p.*
            FROM postes p
            WHERE p.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Poste(result.rows[0]);
    }

    static async findByCode(code) {
        const query = `
            SELECT p.*
            FROM postes p
            WHERE p.code = $1
        `;
        
        const result = await pool.query(query, [code]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Poste(result.rows[0]);
    }

    async update(updateData) {
        const allowedFields = ['nom', 'code', 'description', 'statut'];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                updates.push(`${key} = $${paramIndex++}`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(this.id);

        const query = `
            UPDATE postes 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Poste non trouvé');
        }

        return new Poste(result.rows[0]);
    }

    async delete() {
        const query = `
            DELETE FROM postes 
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await pool.query(query, [this.id]);
        
        if (result.rows.length === 0) {
            throw new Error('Poste non trouvé');
        }
        
        return new Poste(result.rows[0]);
    }

    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_postes,
                COUNT(CASE WHEN p.statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN p.statut = 'INACTIF' THEN 1 END) as inactifs
            FROM postes p
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = Poste; 