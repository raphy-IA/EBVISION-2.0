const { pool } = require('../utils/database');

class TauxHoraire {
    constructor(data) {
        this.id = data.id;
        this.grade_id = data.grade_id;
        this.division_id = data.division_id;
        this.taux_horaire = data.taux_horaire;
        this.salaire_base = data.salaire_base;
        this.date_effet = data.date_effet;
        this.date_fin_effet = data.date_fin_effet;
        this.statut = data.statut || 'ACTIF';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        // Relations avec noms
        this.grade_nom = data.grade_nom;
        this.grade_code = data.grade_code;
        this.division_nom = data.division_nom;
        this.division_code = data.division_code;
        this.business_unit_id = data.business_unit_id;
        this.business_unit_nom = data.business_unit_nom;
        this.business_unit_code = data.business_unit_code;
        // Relations objets (pour compatibilité)
        this.grade = data.grade;
        this.division = data.division;
    }

    validate() {
        const errors = [];
        if (!this.grade_id) { errors.push('Grade requis'); }
        if (!this.division_id) { errors.push('Division requise'); }
        if (!this.taux_horaire || this.taux_horaire <= 0) { 
            errors.push('Taux horaire doit être positif'); 
        }
        if (!this.salaire_base || this.salaire_base <= 0) { 
            errors.push('Salaire de base doit être positif'); 
        }
        if (!this.date_effet) { errors.push('Date d\'effet requise'); }
        if (this.date_fin_effet && this.date_fin_effet <= this.date_effet) {
            errors.push('Date de fin d\'effet doit être postérieure à la date d\'effet');
        }
        if (!['ACTIF', 'INACTIF'].includes(this.statut)) {
            errors.push('Statut invalide');
        }
        return errors;
    }

    static async create(data) {
        const tauxHoraire = new TauxHoraire(data);
        const errors = tauxHoraire.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO taux_horaires (
                grade_id, division_id, taux_horaire, salaire_base, date_effet, date_fin_effet, statut
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            tauxHoraire.grade_id,
            tauxHoraire.division_id,
            tauxHoraire.taux_horaire,
            tauxHoraire.salaire_base,
            tauxHoraire.date_effet,
            tauxHoraire.date_fin_effet,
            tauxHoraire.statut
        ]);

        return new TauxHoraire(result.rows[0]);
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 10, grade_id, division_id, statut, date_reference } = options;
        const offset = (page - 1) * limit;
        const queryParams = [];
        let paramIndex = 1;

        // Construire la clause WHERE
        const whereConditions = [];
        if (grade_id) {
            whereConditions.push(`th.grade_id = $${paramIndex++}`);
            queryParams.push(grade_id);
        }
        if (division_id) {
            whereConditions.push(`th.division_id = $${paramIndex++}`);
            queryParams.push(division_id);
        }
        if (statut) {
            whereConditions.push(`th.statut = $${paramIndex++}`);
            queryParams.push(statut);
        }
        if (date_reference) {
            whereConditions.push(`th.date_effet <= $${paramIndex++}`);
            whereConditions.push(`(th.date_fin_effet IS NULL OR th.date_fin_effet >= $${paramIndex++})`);
            queryParams.push(date_reference, date_reference);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM taux_horaires th
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const dataQuery = `
            SELECT th.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   d.nom as division_nom, d.code as division_code,
                   bu.id as business_unit_id, bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            ${whereClause}
            ORDER BY bu.nom, d.nom, g.niveau, th.date_effet DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        queryParams.push(limit, offset);

        const dataResult = await pool.query(dataQuery, queryParams);
        const tauxHoraires = dataResult.rows.map(row => new TauxHoraire(row));

        return {
            taux_horaires: tauxHoraires,
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
            SELECT th.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   d.nom as division_nom, d.code as division_code,
                   bu.id as business_unit_id, bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE th.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new TauxHoraire(result.rows[0]) : null;
    }

    static async findCurrentByGradeAndDivision(gradeId, divisionId, dateReference = new Date()) {
        const query = `
            SELECT th.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   d.nom as division_nom, d.code as division_code,
                   bu.id as business_unit_id, bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE th.grade_id = $1 
              AND th.division_id = $2 
              AND th.statut = 'ACTIF'
              AND th.date_effet <= $3
              AND (th.date_fin_effet IS NULL OR th.date_fin_effet >= $3)
            ORDER BY th.date_effet DESC
            LIMIT 1
        `;
        
        const result = await pool.query(query, [gradeId, divisionId, dateReference]);
        return result.rows.length > 0 ? new TauxHoraire(result.rows[0]) : null;
    }

    static async findHistoryByGradeAndDivision(gradeId, divisionId) {
        const query = `
            SELECT th.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   d.nom as division_nom, d.code as division_code,
                   bu.id as business_unit_id, bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE th.grade_id = $1 AND th.division_id = $2
            ORDER BY th.date_effet DESC
        `;
        
        const result = await pool.query(query, [gradeId, divisionId]);
        return result.rows.map(row => new TauxHoraire(row));
    }

    async update() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE taux_horaires SET
                grade_id = $1,
                division_id = $2,
                taux_horaire = $3,
                salaire_base = $4,
                date_effet = $5,
                date_fin_effet = $6,
                statut = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.grade_id,
            this.division_id,
            this.taux_horaire,
            this.salaire_base,
            this.date_effet,
            this.date_fin_effet,
            this.statut,
            this.id
        ]);

        return new TauxHoraire(result.rows[0]);
    }

    static async delete(id) {
        const query = `
            DELETE FROM taux_horaires WHERE id = $1
        `;
        
        await pool.query(query, [id]);
        return true;
    }

    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_taux,
                COUNT(CASE WHEN th.statut = 'ACTIF' THEN 1 END) as actifs,
                COUNT(CASE WHEN th.statut = 'INACTIF' THEN 1 END) as inactifs,
                AVG(th.taux_horaire) as taux_moyen,
                MIN(th.taux_horaire) as taux_min,
                MAX(th.taux_horaire) as taux_max
            FROM taux_horaires th
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }

    static async getCurrentRates(dateReference = new Date()) {
        const query = `
            SELECT th.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   d.nom as division_nom, d.code as division_code,
                   bu.id as business_unit_id, bu.nom as business_unit_nom, bu.code as business_unit_code
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE th.statut = 'ACTIF'
              AND th.date_effet <= $1
              AND (th.date_fin_effet IS NULL OR th.date_fin_effet >= $1)
            ORDER BY bu.nom, d.nom, g.niveau
        `;
        
        const result = await pool.query(query, [dateReference]);
        return result.rows.map(row => new TauxHoraire(row));
    }
}

module.exports = TauxHoraire; 