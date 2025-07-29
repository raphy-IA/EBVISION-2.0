const { pool } = require('../utils/database');

class Pays {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code_pays = data.code_pays;
        this.code_appel = data.code_appel;
        this.devise = data.devise;
        this.langue_principale = data.langue_principale;
        this.fuseau_horaire = data.fuseau_horaire;
        this.capitale = data.capitale;
        this.population = data.population;
        this.superficie = data.superficie;
        this.pib = data.pib;
        this.description = data.description;
        this.actif = data.actif;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            actif = null,
            sortBy = 'nom',
            sortOrder = 'ASC'
        } = options;

        const offset = (page - 1) * limit;
        const params = [];
        let paramIndex = 1;

        let whereClause = '';
        if (search) {
            whereClause += ` WHERE (nom ILIKE $${paramIndex} OR code_pays ILIKE $${paramIndex} OR capitale ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (actif !== null) {
            const operator = whereClause ? 'AND' : 'WHERE';
            whereClause += ` ${operator} actif = $${paramIndex}`;
            params.push(actif);
            paramIndex++;
        }

        const query = `
            SELECT * FROM pays
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*) as total FROM pays
            ${whereClause}
        `;

        try {
            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            return {
                pays: result.rows.map(row => new Pays(row)),
                total: parseInt(countResult.rows[0].total),
                page,
                limit,
                totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
            };
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const result = await pool.query('SELECT * FROM pays WHERE id = $1', [id]);
            return result.rows.length > 0 ? new Pays(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async findByCode(code) {
        try {
            const result = await pool.query('SELECT * FROM pays WHERE code_pays = $1', [code]);
            return result.rows.length > 0 ? new Pays(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async create(data) {
        try {
            const result = await pool.query(`
                INSERT INTO pays (
                    nom, code_pays, code_appel, devise, langue_principale, 
                    fuseau_horaire, capitale, population, superficie, pib, description, actif
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                data.nom, data.code_pays, data.code_appel, data.devise, data.langue_principale,
                data.fuseau_horaire, data.capitale, data.population, data.superficie, data.pib,
                data.description, data.actif !== undefined ? data.actif : true
            ]);

            return new Pays(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    static async update(id, data) {
        try {
            const result = await pool.query(`
                UPDATE pays SET
                    nom = $1, code_pays = $2, code_appel = $3, devise = $4,
                    langue_principale = $5, fuseau_horaire = $6, capitale = $7,
                    population = $8, superficie = $9, pib = $10, description = $11,
                    actif = $12, updated_at = CURRENT_TIMESTAMP
                WHERE id = $13
                RETURNING *
            `, [
                data.nom, data.code_pays, data.code_appel, data.devise,
                data.langue_principale, data.fuseau_horaire, data.capitale,
                data.population, data.superficie, data.pib, data.description,
                data.actif, id
            ]);

            return result.rows.length > 0 ? new Pays(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await pool.query('DELETE FROM pays WHERE id = $1 RETURNING *', [id]);
            return result.rows.length > 0 ? new Pays(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async getActifs() {
        try {
            const result = await pool.query('SELECT * FROM pays WHERE actif = true ORDER BY nom');
            return result.rows.map(row => new Pays(row));
        } catch (error) {
            throw error;
        }
    }

    validate() {
        const errors = [];

        if (!this.nom || this.nom.trim().length === 0) {
            errors.push('Le nom du pays est requis');
        }

        if (!this.code_pays || this.code_pays.trim().length === 0) {
            errors.push('Le code pays est requis');
        } else if (this.code_pays.length !== 3) {
            errors.push('Le code pays doit contenir exactement 3 caractères');
        }

        if (this.code_appel && !this.code_appel.startsWith('+')) {
            errors.push('Le code d\'appel doit commencer par +');
        }

        return errors;
    }
}

module.exports = Pays;