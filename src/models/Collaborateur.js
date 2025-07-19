const { pool } = require('../utils/database');

class Collaborateur {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.initiales = data.initiales;
        this.email = data.email;
        this.grade = data.grade;
        this.taux_horaire = data.taux_horaire || 0;
        this.statut = data.statut || 'ACTIF';
        this.date_embauche = data.date_embauche;
        this.division_id = data.division_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    validate() {
        const errors = [];
        if (!this.nom) { errors.push('Nom requis'); }
        if (!this.prenom) { errors.push('Prénom requis'); }
        if (!this.initiales) { errors.push('Initiales requises'); }
        if (!this.email) { errors.push('Email requis'); }
        if (!this.grade) { errors.push('Grade requis'); }
        if (!['ASSISTANT', 'SENIOR', 'MANAGER', 'DIRECTOR', 'PARTNER'].includes(this.grade)) {
            errors.push('Grade invalide');
        }
        if (!['ACTIF', 'INACTIF', 'CONGE'].includes(this.statut)) {
            errors.push('Statut invalide');
        }
        if (this.taux_horaire < 0) { errors.push('Taux horaire doit être positif'); }
        return errors;
    }

    static async create(data) {
        const collaborateur = new Collaborateur(data);
        const errors = collaborateur.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO collaborateurs (
                nom, prenom, initiales, email, grade, taux_horaire, 
                statut, date_embauche, division_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await pool.query(query, [
            collaborateur.nom,
            collaborateur.prenom,
            collaborateur.initiales,
            collaborateur.email,
            collaborateur.grade,
            collaborateur.taux_horaire,
            collaborateur.statut,
            collaborateur.date_embauche,
            collaborateur.division_id
        ]);

        return new Collaborateur(result.rows[0]);
    }

    static async findById(id) {
        const query = `
            SELECT c.*, d.nom as division_nom
            FROM collaborateurs c
            LEFT JOIN divisions d ON c.division_id = d.id
            WHERE c.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new Collaborateur(result.rows[0]) : null;
    }

    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            grade,
            statut,
            division_id,
            search
        } = options;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (grade) {
            whereConditions.push(`c.grade = $${paramIndex++}`);
            queryParams.push(grade);
        }

        if (statut) {
            whereConditions.push(`c.statut = $${paramIndex++}`);
            queryParams.push(statut);
        }

        if (division_id) {
            whereConditions.push(`c.division_id = $${paramIndex++}`);
            queryParams.push(division_id);
        }

        if (search) {
            whereConditions.push(`(
                c.nom ILIKE $${paramIndex} OR 
                c.prenom ILIKE $${paramIndex} OR 
                c.initiales ILIKE $${paramIndex} OR
                c.email ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM collaborateurs c
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT c.*, d.nom as division_nom
            FROM collaborateurs c
            LEFT JOIN divisions d ON c.division_id = d.id
            ${whereClause}
            ORDER BY c.nom, c.prenom
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        return {
            data: result.rows.map(row => new Collaborateur(row)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async update(updateData) {
        Object.assign(this, updateData);
        
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE collaborateurs SET
                nom = $1,
                prenom = $2,
                initiales = $3,
                email = $4,
                grade = $5,
                taux_horaire = $6,
                statut = $7,
                date_embauche = $8,
                division_id = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.nom,
            this.prenom,
            this.initiales,
            this.email,
            this.grade,
            this.taux_horaire,
            this.statut,
            this.date_embauche,
            this.division_id,
            this.id
        ]);

        if (result.rows.length === 0) {
            throw new Error('Collaborateur non trouvé');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    static async delete(id) {
        const query = `
            DELETE FROM collaborateurs WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rowCount === 0) {
            throw new Error('Collaborateur non trouvé');
        }
        
        return true;
    }

    static async getStatistics(options = {}) {
        const query = `
            SELECT 
                COUNT(*) as total_collaborateurs,
                COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as inactifs,
                COUNT(CASE WHEN statut = 'CONGE' THEN 1 END) as en_conge,
                AVG(taux_horaire) as taux_horaire_moyen,
                COUNT(CASE WHEN grade = 'ASSISTANT' THEN 1 END) as assistants,
                COUNT(CASE WHEN grade = 'SENIOR' THEN 1 END) as seniors,
                COUNT(CASE WHEN grade = 'MANAGER' THEN 1 END) as managers,
                COUNT(CASE WHEN grade = 'DIRECTOR' THEN 1 END) as directors,
                COUNT(CASE WHEN grade = 'PARTNER' THEN 1 END) as partners
            FROM collaborateurs
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = Collaborateur; 