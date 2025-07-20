const { pool } = require('../utils/database');

class Poste {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code = data.code;
        this.type_collaborateur_id = data.type_collaborateur_id;
        this.description = data.description;
        this.statut = data.statut || 'ACTIF';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        // Relations
        this.type_collaborateur = data.type_collaborateur;
    }

    validate() {
        const errors = [];
        if (!this.nom) { errors.push('Nom requis'); }
        if (!this.code) { errors.push('Code requis'); }
        if (!this.type_collaborateur_id) { errors.push('Type de collaborateur requis'); }
        if (!['ACTIF', 'INACTIF'].includes(this.statut)) {
            errors.push('Statut invalide');
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
                nom, code, type_collaborateur_id, description, statut
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [
            poste.nom,
            poste.code,
            poste.type_collaborateur_id,
            poste.description,
            poste.statut
        ]);

        return new Poste(result.rows[0]);
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 10, statut, type_collaborateur_id } = options;
        const offset = (page - 1) * limit;
        const queryParams = [];
        let paramIndex = 1;

        // Construire la clause WHERE
        const whereConditions = [];
        if (statut) {
            whereConditions.push(`p.statut = $${paramIndex++}`);
            queryParams.push(statut);
        }
        if (type_collaborateur_id) {
            whereConditions.push(`p.type_collaborateur_id = $${paramIndex++}`);
            queryParams.push(type_collaborateur_id);
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

        // Requête pour les données
        const dataQuery = `
            SELECT p.*, tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code
            FROM postes p
            LEFT JOIN types_collaborateurs tc ON p.type_collaborateur_id = tc.id
            ${whereClause}
            ORDER BY tc.nom, p.nom
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        queryParams.push(limit, offset);

        const dataResult = await pool.query(dataQuery, queryParams);
        const postes = dataResult.rows.map(row => new Poste(row));

        return {
            postes,
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
            SELECT p.*, tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code
            FROM postes p
            LEFT JOIN types_collaborateurs tc ON p.type_collaborateur_id = tc.id
            WHERE p.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new Poste(result.rows[0]) : null;
    }

    static async findByCode(code) {
        const query = `
            SELECT p.*, tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code
            FROM postes p
            LEFT JOIN types_collaborateurs tc ON p.type_collaborateur_id = tc.id
            WHERE p.code = $1
        `;
        
        const result = await pool.query(query, [code]);
        return result.rows.length > 0 ? new Poste(result.rows[0]) : null;
    }

    static async findByTypeCollaborateur(typeCollaborateurId) {
        const query = `
            SELECT p.*, tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code
            FROM postes p
            LEFT JOIN types_collaborateurs tc ON p.type_collaborateur_id = tc.id
            WHERE p.type_collaborateur_id = $1 AND p.statut = 'ACTIF'
            ORDER BY p.nom
        `;
        
        const result = await pool.query(query, [typeCollaborateurId]);
        return result.rows.map(row => new Poste(row));
    }

    async update() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE postes SET
                nom = $1,
                code = $2,
                type_collaborateur_id = $3,
                description = $4,
                statut = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.nom,
            this.code,
            this.type_collaborateur_id,
            this.description,
            this.statut,
            this.id
        ]);

        return new Poste(result.rows[0]);
    }

    static async delete(id) {
        // Vérifier s'il y a des collaborateurs avec ce poste
        const checkQuery = `
            SELECT COUNT(*) as count FROM collaborateurs 
            WHERE poste_actuel_id = $1
        `;
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            throw new Error('Impossible de supprimer ce poste car il est utilisé par des collaborateurs');
        }

        const query = `
            DELETE FROM postes WHERE id = $1
        `;
        
        await pool.query(query, [id]);
        return true;
    }

    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_postes,
                COUNT(CASE WHEN p.statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN p.statut = 'INACTIF' THEN 1 END) as inactifs,
                COUNT(CASE WHEN tc.code = 'ADMIN' THEN 1 END) as postes_admin,
                COUNT(CASE WHEN tc.code = 'CONSULTANT' THEN 1 END) as postes_consultant
            FROM postes p
            LEFT JOIN types_collaborateurs tc ON p.type_collaborateur_id = tc.id
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = Poste; 