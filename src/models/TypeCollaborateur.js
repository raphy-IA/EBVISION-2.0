const { pool } = require('../utils/database');

class TypeCollaborateur {
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
        if (!this.nom) { errors.push('Nom requis'); }
        if (!this.code) { errors.push('Code requis'); }
        if (!['ACTIF', 'INACTIF'].includes(this.statut)) {
            errors.push('Statut invalide');
        }
        return errors;
    }

    static async create(typeCollaborateur) {
        const errors = typeCollaborateur.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO types_collaborateurs (
                nom, code, description, statut
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(query, [
            typeCollaborateur.nom,
            typeCollaborateur.code,
            typeCollaborateur.description,
            typeCollaborateur.statut
        ]);

        return new TypeCollaborateur(result.rows[0]);
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 10, statut } = options;
        const offset = (page - 1) * limit;
        const queryParams = [];
        let paramIndex = 1;

        // Construire la clause WHERE
        let whereClause = '';
        if (statut) {
            whereClause = `WHERE statut = $${paramIndex++}`;
            queryParams.push(statut);
        }

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM types_collaborateurs tc
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const dataQuery = `
            SELECT tc.*
            FROM types_collaborateurs tc
            ${whereClause}
            ORDER BY tc.nom
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        queryParams.push(limit, offset);

        const dataResult = await pool.query(dataQuery, queryParams);
        const types = dataResult.rows.map(row => new TypeCollaborateur(row));

        return {
            types,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async findById(id) {
        const query = `
            SELECT * FROM types_collaborateurs WHERE id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new TypeCollaborateur(result.rows[0]) : null;
    }

    static async findByCode(code) {
        const query = `
            SELECT * FROM types_collaborateurs WHERE code = $1
        `;
        
        const result = await pool.query(query, [code]);
        return result.rows.length > 0 ? new TypeCollaborateur(result.rows[0]) : null;
    }

    async update() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE types_collaborateurs SET
                nom = $1,
                code = $2,
                description = $3,
                statut = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.nom,
            this.code,
            this.description,
            this.statut,
            this.id
        ]);

        return new TypeCollaborateur(result.rows[0]);
    }

    static async delete(id) {
        // Vérifier s'il y a des collaborateurs avec ce type
        const checkQuery = `
            SELECT COUNT(*) as count FROM collaborateurs 
            WHERE type_collaborateur_id = $1
        `;
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            throw new Error('Impossible de supprimer ce type car il est utilisé par des collaborateurs');
        }

        const query = `
            DELETE FROM types_collaborateurs WHERE id = $1
        `;
        
        await pool.query(query, [id]);
        return true;
    }

    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_types,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactifs
            FROM types_collaborateurs
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = TypeCollaborateur; 