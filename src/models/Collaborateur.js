const { pool } = require('../utils/database');

class Collaborateur {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.initiales = data.initiales;
        this.email = data.email;
        this.telephone = data.telephone;
        this.business_unit_id = data.business_unit_id;
        this.division_id = data.division_id;
        this.grade_actuel_id = data.grade_actuel_id;
        this.type_collaborateur_id = data.type_collaborateur_id;
        this.poste_actuel_id = data.poste_actuel_id;
        this.statut = data.statut || 'ACTIF';
        this.date_embauche = data.date_embauche;
        this.date_depart = data.date_depart;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        // Relations
        this.business_unit = data.business_unit;
        this.division = data.division;
        this.grade = data.grade;
        this.type_collaborateur = data.type_collaborateur;
        this.poste = data.poste;
    }

    validate() {
        const errors = [];
        if (!this.nom) { errors.push('Nom requis'); }
        if (!this.prenom) { errors.push('Prénom requis'); }
        if (!this.initiales) { errors.push('Initiales requises'); }
        if (!this.email) { errors.push('Email requis'); }
        if (!this.business_unit_id) { errors.push('Business Unit requise'); }
        if (!this.grade_actuel_id) { errors.push('Grade requis'); }
        if (!this.type_collaborateur_id) { errors.push('Type de collaborateur requis'); }
        if (!this.poste_actuel_id) { errors.push('Poste requis'); }
        if (!this.date_embauche) { errors.push('Date d\'embauche requise'); }
        if (!['ACTIF', 'INACTIF', 'CONGE', 'DEPART'].includes(this.statut)) {
            errors.push('Statut invalide');
        }
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
                nom, prenom, initiales, email, telephone, business_unit_id, division_id,
                grade_actuel_id, type_collaborateur_id, poste_actuel_id, statut, 
                date_embauche, date_depart, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const result = await pool.query(query, [
            collaborateur.nom,
            collaborateur.prenom,
            collaborateur.initiales,
            collaborateur.email,
            collaborateur.telephone,
            collaborateur.business_unit_id,
            collaborateur.division_id,
            collaborateur.grade_actuel_id,
            collaborateur.type_collaborateur_id,
            collaborateur.poste_actuel_id,
            collaborateur.statut,
            collaborateur.date_embauche,
            collaborateur.date_depart,
            collaborateur.notes
        ]);

        return new Collaborateur(result.rows[0]);
    }

    static async findById(id) {
        const query = `
            SELECT c.*, 
                   bu.nom as business_unit_nom, bu.code as business_unit_code,
                   d.nom as division_nom, d.code as division_code,
                   g.nom as grade_nom, g.code as grade_code,
                   tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code,
                   p.nom as poste_nom, p.code as poste_code
            FROM collaborateurs c
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN types_collaborateurs tc ON c.type_collaborateur_id = tc.id
            LEFT JOIN postes p ON c.poste_actuel_id = p.id
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
            whereConditions.push(`g.nom = $${paramIndex++}`);
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
            SELECT c.*, 
                   bu.nom as business_unit_nom, bu.code as business_unit_code,
                   d.nom as division_nom, d.code as division_code,
                   g.nom as grade_nom, g.code as grade_code,
                   tc.nom as type_collaborateur_nom, tc.code as type_collaborateur_code,
                   p.nom as poste_nom, p.code as poste_code
            FROM collaborateurs c
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN types_collaborateurs tc ON c.type_collaborateur_id = tc.id
            LEFT JOIN postes p ON c.poste_actuel_id = p.id
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
                telephone = $5,
                business_unit_id = $6,
                division_id = $7,
                grade_actuel_id = $8,
                type_collaborateur_id = $9,
                poste_actuel_id = $10,
                statut = $11,
                date_embauche = $12,
                date_depart = $13,
                notes = $14,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $15
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.nom,
            this.prenom,
            this.initiales,
            this.email,
            this.telephone,
            this.business_unit_id,
            this.division_id,
            this.grade_actuel_id,
            this.type_collaborateur_id,
            this.poste_actuel_id,
            this.statut,
            this.date_embauche,
            this.date_depart,
            this.notes,
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
                COUNT(CASE WHEN c.statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN c.statut = 'INACTIF' THEN 1 END) as inactifs,
                COUNT(CASE WHEN c.statut = 'CONGE' THEN 1 END) as en_conge,
                COUNT(CASE WHEN c.statut = 'DEPART' THEN 1 END) as departs,
                COUNT(CASE WHEN g.nom = 'Assistant' THEN 1 END) as assistants,
                COUNT(CASE WHEN g.nom = 'Senior Assistant' THEN 1 END) as seniors,
                COUNT(CASE WHEN g.nom = 'Manager' THEN 1 END) as managers,
                COUNT(CASE WHEN g.nom = 'Director' THEN 1 END) as directors,
                COUNT(CASE WHEN g.nom = 'Partner' THEN 1 END) as partners
            FROM collaborateurs c
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
}

module.exports = Collaborateur; 