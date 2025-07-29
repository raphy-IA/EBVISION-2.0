const { pool } = require('../utils/database');

class EvolutionGrade {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.grade_id = data.grade_id;
        this.date_debut = data.date_debut;
        this.date_fin = data.date_fin;
        this.taux_horaire_personnalise = data.taux_horaire_personnalise;
        this.motif = data.motif;
        this.created_at = data.created_at;
        // Relations
        this.grade_nom = data.grade_nom;
        this.grade_code = data.grade_code;
        this.collaborateur_nom = data.collaborateur_nom;
        this.collaborateur_prenom = data.collaborateur_prenom;
    }

    validate() {
        const errors = [];
        if (!this.collaborateur_id) { errors.push('Collaborateur requis'); }
        if (!this.grade_id) { errors.push('Grade requis'); }
        if (!this.date_debut) { errors.push('Date de début requise'); }
        return errors;
    }

    static async create(data) {
        const evolution = new EvolutionGrade(data);
        const errors = evolution.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO evolution_grades (
                id, collaborateur_id, grade_id, date_debut, date_fin, 
                taux_horaire_personnalise, motif, created_at
            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await pool.query(query, [
            evolution.collaborateur_id,
            evolution.grade_id,
            evolution.date_debut,
            evolution.date_fin || null,
            evolution.taux_horaire_personnalise || null,
            evolution.motif || null
        ]);

        return new EvolutionGrade(result.rows[0]);
    }

    static async findByCollaborateur(collaborateurId) {
        const query = `
            SELECT eg.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_grades eg
            LEFT JOIN grades g ON eg.grade_id = g.id
            LEFT JOIN collaborateurs c ON eg.collaborateur_id = c.id
            WHERE eg.collaborateur_id = $1
            ORDER BY eg.date_debut DESC
        `;

        const result = await pool.query(query, [collaborateurId]);
        return result.rows.map(row => new EvolutionGrade(row));
    }

    static async findCurrentByCollaborateur(collaborateurId, dateReference = new Date()) {
        const query = `
            SELECT eg.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_grades eg
            LEFT JOIN grades g ON eg.grade_id = g.id
            LEFT JOIN collaborateurs c ON eg.collaborateur_id = c.id
            WHERE eg.collaborateur_id = $1 
              AND eg.date_debut <= $2
              AND (eg.date_fin IS NULL OR eg.date_fin >= $2)
            ORDER BY eg.date_debut DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [collaborateurId, dateReference]);
        return result.rows.length > 0 ? new EvolutionGrade(result.rows[0]) : null;
    }

    static async findById(id) {
        const query = `
            SELECT eg.*, 
                   g.nom as grade_nom, g.code as grade_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_grades eg
            LEFT JOIN grades g ON eg.grade_id = g.id
            LEFT JOIN collaborateurs c ON eg.collaborateur_id = c.id
            WHERE eg.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new EvolutionGrade(result.rows[0]) : null;
    }

    async update(updateData) {
        Object.assign(this, updateData);
        
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE evolution_grades SET
                grade_id = $1,
                date_debut = $2,
                date_fin = $3,
                taux_horaire_personnalise = $4,
                motif = $5
            WHERE id = $6
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.grade_id,
            this.date_debut,
            this.date_fin,
            this.taux_horaire_personnalise,
            this.motif,
            this.id
        ]);

        if (result.rows.length === 0) {
            throw new Error('Évolution de grade non trouvée');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    static async delete(id) {
        const query = 'DELETE FROM evolution_grades WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            throw new Error('Évolution de grade non trouvée');
        }
        
        return new EvolutionGrade(result.rows[0]);
    }
}

module.exports = EvolutionGrade;