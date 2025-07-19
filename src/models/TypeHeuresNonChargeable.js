const { Pool } = require('pg');
const { pool } = require('../utils/database');

class TypeHeuresNonChargeable {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.code = data.code;
        this.division_id = data.division_id;
        this.description = data.description;
        this.statut = data.statut;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Données liées (optionnelles)
        this.division_nom = data.division_nom;
    }

    // =====================================================
    // MÉTHODES CRUD DE BASE
    // =====================================================

    static async create(typeData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO types_heures_non_chargeables (nom, code, division_id, description, statut)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [
                typeData.nom,
                typeData.code,
                typeData.division_id,
                typeData.description,
                typeData.statut || 'ACTIF'
            ];

            const result = await client.query(query, values);
            return new TypeHeuresNonChargeable(result.rows[0]);
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE t.id = $1
            `;
            const result = await client.query(query, [id]);
            return result.rows[0] ? new TypeHeuresNonChargeable(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    static async findByCode(code) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE t.code = $1
            `;
            const result = await client.query(query, [code]);
            return result.rows[0] ? new TypeHeuresNonChargeable(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    static async findAll(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 0;

            // Filtres
            if (filters.division_id) {
                paramCount++;
                query += ` AND t.division_id = $${paramCount}`;
                values.push(filters.division_id);
            }

            if (filters.statut) {
                paramCount++;
                query += ` AND t.statut = $${paramCount}`;
                values.push(filters.statut);
            }

            if (filters.nom) {
                paramCount++;
                query += ` AND t.nom ILIKE $${paramCount}`;
                values.push(`%${filters.nom}%`);
            }

            if (filters.code) {
                paramCount++;
                query += ` AND t.code ILIKE $${paramCount}`;
                values.push(`%${filters.code}%`);
            }

            // Tri
            query += ` ORDER BY t.nom ASC`;

            const result = await client.query(query, values);
            return result.rows.map(row => new TypeHeuresNonChargeable(row));
        } finally {
            client.release();
        }
    }

    async update(updateData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE types_heures_non_chargeables 
                SET nom = $1, code = $2, division_id = $3, description = $4, 
                    statut = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `;
            const values = [
                updateData.nom || this.nom,
                updateData.code || this.code,
                updateData.division_id || this.division_id,
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
            const query = 'DELETE FROM types_heures_non_chargeables WHERE id = $1 RETURNING *';
            const result = await client.query(query, [this.id]);
            return result.rows[0] ? new TypeHeuresNonChargeable(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // MÉTHODES SPÉCIALISÉES
    // =====================================================

    static async findByDivision(divisionId, statut = 'ACTIF') {
        const client = await pool.connect();
        try {
            const query = `
                SELECT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE t.division_id = $1 AND t.statut = $2
                ORDER BY t.nom ASC
            `;
            const result = await client.query(query, [divisionId, statut]);
            return result.rows.map(row => new TypeHeuresNonChargeable(row));
        } finally {
            client.release();
        }
    }

    static async getTypesGlobaux(statut = 'ACTIF') {
        const client = await pool.connect();
        try {
            const query = `
                SELECT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE t.division_id IS NULL AND t.statut = $1
                ORDER BY t.nom ASC
            `;
            const result = await client.query(query, [statut]);
            return result.rows.map(row => new TypeHeuresNonChargeable(row));
        } finally {
            client.release();
        }
    }

    static async getTypesPourCollaborateur(collaborateurId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT DISTINCT t.*, d.nom as division_nom
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                WHERE (t.division_id IS NULL OR t.division_id = c.division_id)
                AND t.statut = 'ACTIF'
                FROM collaborateurs c
                WHERE c.id = $1
                ORDER BY t.nom ASC
            `;
            const result = await client.query(query, [collaborateurId]);
            return result.rows.map(row => new TypeHeuresNonChargeable(row));
        } finally {
            client.release();
        }
    }

    // =====================================================
    // STATISTIQUES D'UTILISATION
    // =====================================================

    async getStatistiquesUtilisation(debut = null, fin = null) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT 
                    COUNT(*) as nb_saisies,
                    SUM(te.heures) as total_heures,
                    AVG(te.heures) as moyenne_heures_par_saisie
                FROM time_entries te
                WHERE te.type_non_chargeable_id = $1
            `;
            const values = [this.id];

            if (debut) {
                query += ` AND te.date_saisie >= $2`;
                values.push(debut);
            }

            if (fin) {
                query += ` AND te.date_saisie <= $${values.length + 1}`;
                values.push(fin);
            }

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async getStatistiquesGlobales() {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    t.id,
                    t.nom,
                    t.code,
                    d.nom as division_nom,
                    COUNT(te.id) as nb_saisies,
                    SUM(te.heures) as total_heures,
                    COUNT(DISTINCT te.user_id) as nb_collaborateurs
                FROM types_heures_non_chargeables t
                LEFT JOIN divisions d ON t.division_id = d.id
                LEFT JOIN time_entries te ON t.id = te.type_non_chargeable_id
                WHERE t.statut = 'ACTIF'
                GROUP BY t.id, t.nom, t.code, d.nom
                ORDER BY total_heures DESC NULLS LAST
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

    static validate(typeData) {
        const errors = [];

        if (!typeData.nom || typeData.nom.trim().length === 0) {
            errors.push('Le nom du type d\'heures est requis');
        }

        if (!typeData.code || typeData.code.trim().length === 0) {
            errors.push('Le code du type d\'heures est requis');
        }

        if (typeData.statut && !['ACTIF', 'INACTIF'].includes(typeData.statut)) {
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
            description: this.description,
            statut: this.statut,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static async exists(code, excludeId = null) {
        const client = await pool.connect();
        try {
            let query = 'SELECT id FROM types_heures_non_chargeables WHERE code = $1';
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

    // =====================================================
    // MÉTHODES DE DONNÉES INITIALES
    // =====================================================

    static async initializeTypesGlobaux() {
        const typesGlobaux = [
            { nom: 'Formation', code: 'FORMATION', description: 'Formation interne ou externe' },
            { nom: 'Administration', code: 'ADMIN', description: 'Tâches administratives' },
            { nom: 'Réunion interne', code: 'REUNION_INT', description: 'Réunions internes' },
            { nom: 'Développement commercial', code: 'DEV_COM', description: 'Développement commercial' },
            { nom: 'Recherche et développement', code: 'R_D', description: 'Recherche et développement' },
            { nom: 'Congé', code: 'CONGE', description: 'Congés et absences' },
            { nom: 'Autre', code: 'AUTRE', description: 'Autres activités non chargeables' }
        ];

        const client = await pool.connect();
        try {
            for (const type of typesGlobaux) {
                const exists = await this.exists(type.code);
                if (!exists) {
                    await this.create(type);
                }
            }
        } finally {
            client.release();
        }
    }
}

module.exports = TypeHeuresNonChargeable; 