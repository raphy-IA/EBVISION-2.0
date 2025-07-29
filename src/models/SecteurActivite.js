const { pool } = require('../utils/database');

class SecteurActivite {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code = data.code;
        this.description = data.description;
        this.couleur = data.couleur;
        this.icone = data.icone;
        this.ordre = data.ordre;
        this.actif = data.actif;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.sous_secteurs = data.sous_secteurs || [];
    }

    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            actif = null,
            sortBy = 'ordre',
            sortOrder = 'ASC'
        } = options;

        const offset = (page - 1) * limit;
        const params = [];
        let paramIndex = 1;

        let whereClause = '';
        if (search) {
            whereClause += ` WHERE (nom ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
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
            SELECT * FROM secteurs_activite
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*) as total FROM secteurs_activite
            ${whereClause}
        `;

        try {
            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            // Récupérer les sous-secteurs pour chaque secteur
            const secteurs = await Promise.all(
                result.rows.map(async (row) => {
                    const secteur = new SecteurActivite(row);
                    secteur.sous_secteurs = await this.getSousSecteurs(secteur.id);
                    return secteur;
                })
            );

            return {
                secteurs,
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
            const result = await pool.query('SELECT * FROM secteurs_activite WHERE id = $1', [id]);
            if (result.rows.length === 0) return null;

            const secteur = new SecteurActivite(result.rows[0]);
            secteur.sous_secteurs = await this.getSousSecteurs(secteur.id);
            return secteur;
        } catch (error) {
            throw error;
        }
    }

    static async findByCode(code) {
        try {
            const result = await pool.query('SELECT * FROM secteurs_activite WHERE code = $1', [code]);
            if (result.rows.length === 0) return null;

            const secteur = new SecteurActivite(result.rows[0]);
            secteur.sous_secteurs = await this.getSousSecteurs(secteur.id);
            return secteur;
        } catch (error) {
            throw error;
        }
    }

    static async getSousSecteurs(secteurId) {
        try {
            const result = await pool.query(`
                SELECT * FROM sous_secteurs_activite 
                WHERE secteur_id = $1 AND actif = true 
                ORDER BY ordre, nom
            `, [secteurId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async create(data) {
        try {
            const result = await pool.query(`
                INSERT INTO secteurs_activite (
                    nom, code, description, couleur, icone, ordre, actif
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                data.nom, data.code, data.description, data.couleur || '#3498db',
                data.icone, data.ordre || 0, data.actif !== undefined ? data.actif : true
            ]);

            return new SecteurActivite(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    static async update(id, data) {
        try {
            const result = await pool.query(`
                UPDATE secteurs_activite SET
                    nom = $1, code = $2, description = $3, couleur = $4,
                    icone = $5, ordre = $6, actif = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `, [
                data.nom, data.code, data.description, data.couleur,
                data.icone, data.ordre, data.actif, id
            ]);

            if (result.rows.length === 0) return null;

            const secteur = new SecteurActivite(result.rows[0]);
            secteur.sous_secteurs = await this.getSousSecteurs(secteur.id);
            return secteur;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await pool.query('DELETE FROM secteurs_activite WHERE id = $1 RETURNING *', [id]);
            return result.rows.length > 0 ? new SecteurActivite(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async getActifs() {
        try {
            const result = await pool.query(`
                SELECT * FROM secteurs_activite 
                WHERE actif = true 
                ORDER BY ordre, nom
            `);
            
            // Récupérer les sous-secteurs pour chaque secteur
            const secteurs = await Promise.all(
                result.rows.map(async (row) => {
                    const secteur = new SecteurActivite(row);
                    secteur.sous_secteurs = await this.getSousSecteurs(secteur.id);
                    return secteur;
                })
            );

            return secteurs;
        } catch (error) {
            throw error;
        }
    }

    // Méthodes pour les sous-secteurs
    static async createSousSecteur(data) {
        try {
            const result = await pool.query(`
                INSERT INTO sous_secteurs_activite (
                    secteur_id, nom, code, description, couleur, icone, ordre, actif
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                data.secteur_id, data.nom, data.code, data.description,
                data.couleur || '#3498db', data.icone, data.ordre || 0,
                data.actif !== undefined ? data.actif : true
            ]);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateSousSecteur(id, data) {
        try {
            const result = await pool.query(`
                UPDATE sous_secteurs_activite SET
                    nom = $1, code = $2, description = $3, couleur = $4,
                    icone = $5, ordre = $6, actif = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `, [
                data.nom, data.code, data.description, data.couleur,
                data.icone, data.ordre, data.actif, id
            ]);

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            throw error;
        }
    }

    static async deleteSousSecteur(id) {
        try {
            const result = await pool.query('DELETE FROM sous_secteurs_activite WHERE id = $1 RETURNING *', [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            throw error;
        }
    }

    validate() {
        const errors = [];

        if (!this.nom || this.nom.trim().length === 0) {
            errors.push('Le nom du secteur est requis');
        }

        if (!this.code || this.code.trim().length === 0) {
            errors.push('Le code du secteur est requis');
        }

        if (this.couleur && !/^#[0-9A-F]{6}$/i.test(this.couleur)) {
            errors.push('La couleur doit être au format hexadécimal (ex: #3498db)');
        }

        return errors;
    }
}

module.exports = SecteurActivite;