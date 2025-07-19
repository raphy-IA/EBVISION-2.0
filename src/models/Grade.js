const { Pool } = require('pg');
const { pool } = require('../utils/database');

class Grade {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code = data.code;
        this.division_id = data.division_id;
        this.taux_horaire_default = data.taux_horaire_default;
        this.niveau = data.niveau;
        this.description = data.description;
        this.statut = data.statut;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // =====================================================
    // MÉTHODES CRUD DE BASE
    // =====================================================

    static async create(gradeData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO grades (nom, code, division_id, taux_horaire_default, niveau, description, statut)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [
                gradeData.nom,
                gradeData.code,
                gradeData.division_id,
                gradeData.taux_horaire_default || 0.00,
                gradeData.niveau || 1,
                gradeData.description,
                gradeData.statut || 'ACTIF'
            ];

            const result = await client.query(query, values);
            return new Grade(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT g.*, d.nom as division_nom
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                WHERE g.id = $1
            `;
            const result = await client.query(query, [id]);
            return result.rows[0] ? new Grade(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    static async findByCode(code) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT g.*, d.nom as division_nom
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                WHERE g.code = $1
            `;
            const result = await client.query(query, [code]);
            return result.rows[0] ? new Grade(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT g.*, d.nom as division_nom
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 0;

            // Filtres
            if (filters.division_id) {
                paramCount++;
                query += ` AND g.division_id = $${paramCount}`;
                values.push(filters.division_id);
            }

            if (filters.statut) {
                paramCount++;
                query += ` AND g.statut = $${paramCount}`;
                values.push(filters.statut);
            }

            if (filters.niveau_min) {
                paramCount++;
                query += ` AND g.niveau >= $${paramCount}`;
                values.push(filters.niveau_min);
            }

            if (filters.niveau_max) {
                paramCount++;
                query += ` AND g.niveau <= $${paramCount}`;
                values.push(filters.niveau_max);
            }

            // Tri
            query += ` ORDER BY g.niveau ASC, g.nom ASC`;

            const result = await client.query(query, values);
            return result.rows.map(row => new Grade(row));
        } finally {
            client.release();
        }
    }

    async update(updateData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE grades 
                SET nom = $1, code = $2, division_id = $3, taux_horaire_default = $4, 
                    niveau = $5, description = $6, statut = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `;
            const values = [
                updateData.nom || this.nom,
                updateData.code || this.code,
                updateData.division_id || this.division_id,
                updateData.taux_horaire_default || this.taux_horaire_default,
                updateData.niveau || this.niveau,
                updateData.description || this.description,
                updateData.statut || this.statut,
                this.id
            ];

            const result = await client.query(query, values);
            Object.assign(this, result.rows[0]);
            return this;
        } finally {
            client.release();
        }
    }

    async delete() {
        const client = await pool.connect();
        try {
            const query = 'DELETE FROM grades WHERE id = $1 RETURNING *';
            const result = await client.query(query, [this.id]);
            return result.rows[0] ? new Grade(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // MÉTHODES SPÉCIALISÉES
    // =====================================================

    static async findByDivision(divisionId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT g.*, d.nom as division_nom
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                WHERE g.division_id = $1 AND g.statut = 'ACTIF'
                ORDER BY g.niveau ASC, g.nom ASC
            `;
            const result = await client.query(query, [divisionId]);
            return result.rows.map(row => new Grade(row));
        } finally {
            client.release();
        }
    }

    static async getHierarchy() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT g.*, d.nom as division_nom,
                       COUNT(c.id) as nb_collaborateurs
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                LEFT JOIN collaborateurs c ON g.id = c.grade_actuel_id AND c.statut = 'ACTIF'
                WHERE g.statut = 'ACTIF'
                GROUP BY g.id, d.nom
                ORDER BY g.niveau ASC, g.nom ASC
            `;
            const result = await client.query(query);
            return result.rows.map(row => ({
                ...new Grade(row),
                nb_collaborateurs: parseInt(row.nb_collaborateurs)
            }));
        } finally {
            client.release();
        }
    }

    static async getTauxHoraireByGrade(gradeId, divisionId = null) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT taux_horaire_default
                FROM grades
                WHERE id = $1 AND statut = 'ACTIF'
            `;
            const values = [gradeId];

            if (divisionId) {
                query += ` AND division_id = $2`;
                values.push(divisionId);
            }

            const result = await client.query(query, values);
            return result.rows[0] ? result.rows[0].taux_horaire_default : null;
        } finally {
            client.release();
        }
    }

    static async getGradesByNiveau(niveau) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT g.*, d.nom as division_nom
                FROM grades g
                LEFT JOIN divisions d ON g.division_id = d.id
                WHERE g.niveau = $1 AND g.statut = 'ACTIF'
                ORDER BY g.nom ASC
            `;
            const result = await client.query(query, [niveau]);
            return result.rows.map(row => new Grade(row));
        } finally {
            client.release();
        }
    }

    // =====================================================
    // STATISTIQUES
    // =====================================================

    static async getStatistics() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_grades,
                    COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as grades_actifs,
                    COUNT(CASE WHEN statut = 'INACTIF' THEN 1 END) as grades_inactifs,
                    AVG(taux_horaire_default) as taux_moyen,
                    MIN(taux_horaire_default) as taux_min,
                    MAX(taux_horaire_default) as taux_max,
                    COUNT(DISTINCT division_id) as divisions_avec_grades
                FROM grades
            `;
            const result = await client.query(query);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async getGradesByDivision() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    d.nom as division_nom,
                    d.id as division_id,
                    COUNT(g.id) as nb_grades,
                    AVG(g.taux_horaire_default) as taux_moyen_division
                FROM divisions d
                LEFT JOIN grades g ON d.id = g.division_id AND g.statut = 'ACTIF'
                GROUP BY d.id, d.nom
                ORDER BY d.nom
            `;
            const result = await client.query(query);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    static validate(gradeData) {
        const errors = [];

        if (!gradeData.nom || gradeData.nom.trim().length === 0) {
            errors.push('Le nom du grade est requis');
        }

        if (!gradeData.code || gradeData.code.trim().length === 0) {
            errors.push('Le code du grade est requis');
        }

        if (gradeData.taux_horaire_default !== undefined && gradeData.taux_horaire_default < 0) {
            errors.push('Le taux horaire ne peut pas être négatif');
        }

        if (gradeData.niveau !== undefined && (gradeData.niveau < 1 || gradeData.niveau > 10)) {
            errors.push('Le niveau doit être entre 1 et 10');
        }

        if (gradeData.statut && !['ACTIF', 'INACTIF'].includes(gradeData.statut)) {
            errors.push('Le statut doit être ACTIF ou INACTIF');
        }

        return errors;
    }

    // =====================================================
    // UTILITAIRES
    // =====================================================

    toJSON() {
        return {
            id: this.id,
            nom: this.nom,
            code: this.code,
            division_id: this.division_id,
            division_nom: this.division_nom,
            taux_horaire_default: this.taux_horaire_default,
            niveau: this.niveau,
            description: this.description,
            statut: this.statut,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static async exists(code, excludeId = null) {
        const client = await pool.connect();
        try {
            let query = 'SELECT id FROM grades WHERE code = $1';
            const values = [code];

            if (excludeId) {
                query += ' AND id != $2';
                values.push(excludeId);
            }

            const result = await client.query(query, values);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }
}

module.exports = Grade; 