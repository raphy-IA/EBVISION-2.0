const { pool } = require('../utils/database');

class EvolutionPoste {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.poste_id = data.poste_id;
        this.date_debut = data.date_debut;
        this.date_fin = data.date_fin;
        this.motif = data.motif;
        this.created_at = data.created_at;
        // Relations
        this.poste_nom = data.poste_nom;
        this.poste_code = data.poste_code;
        this.collaborateur_nom = data.collaborateur_nom;
        this.collaborateur_prenom = data.collaborateur_prenom;
    }

    validate() {
        const errors = [];
        if (!this.collaborateur_id) { errors.push('Collaborateur requis'); }
        if (!this.poste_id) { errors.push('Poste requis'); }
        if (!this.date_debut) { errors.push('Date de début requise'); }
        return errors;
    }

    static async create(data) {
        const evolution = new EvolutionPoste(data);
        const errors = evolution.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO evolution_postes (
                id, collaborateur_id, poste_id, date_debut, date_fin, motif, created_at
            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await pool.query(query, [
            evolution.collaborateur_id,
            evolution.poste_id,
            evolution.date_debut,
            evolution.date_fin || null,
            evolution.motif || null
        ]);

        return new EvolutionPoste(result.rows[0]);
    }

    static async findByCollaborateur(collaborateurId) {
        const query = `
            SELECT ep.*, 
                   p.nom as poste_nom, p.code as poste_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_postes ep
            LEFT JOIN postes p ON ep.poste_id = p.id
            LEFT JOIN collaborateurs c ON ep.collaborateur_id = c.id
            WHERE ep.collaborateur_id = $1
            ORDER BY ep.date_debut DESC
        `;

        const result = await pool.query(query, [collaborateurId]);
        return result.rows.map(row => new EvolutionPoste(row));
    }

    static async findCurrentByCollaborateur(collaborateurId, dateReference = new Date()) {
        const query = `
            SELECT ep.*, 
                   p.nom as poste_nom, p.code as poste_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_postes ep
            LEFT JOIN postes p ON ep.poste_id = p.id
            LEFT JOIN collaborateurs c ON ep.collaborateur_id = c.id
            WHERE ep.collaborateur_id = $1 
              AND ep.date_debut <= $2
              AND (ep.date_fin IS NULL OR ep.date_fin >= $2)
            ORDER BY ep.date_debut DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [collaborateurId, dateReference]);
        return result.rows.length > 0 ? new EvolutionPoste(result.rows[0]) : null;
    }

    static async findById(id) {
        const query = `
            SELECT ep.*, 
                   p.nom as poste_nom, p.code as poste_code,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_postes ep
            LEFT JOIN postes p ON ep.poste_id = p.id
            LEFT JOIN collaborateurs c ON ep.collaborateur_id = c.id
            WHERE ep.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new EvolutionPoste(result.rows[0]) : null;
    }

    async update(updateData) {
        Object.assign(this, updateData);
        
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            UPDATE evolution_postes SET
                poste_id = $1,
                date_debut = $2,
                date_fin = $3,
                motif = $4
            WHERE id = $5
            RETURNING *
        `;

        const result = await pool.query(query, [
            this.poste_id,
            this.date_debut,
            this.date_fin,
            this.motif,
            this.id
        ]);

        if (result.rows.length === 0) {
            throw new Error('Évolution de poste non trouvée');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    static async delete(id) {
        const query = 'DELETE FROM evolution_postes WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            throw new Error('Évolution de poste non trouvée');
        }
        
        return new EvolutionPoste(result.rows[0]);
    }
}

module.exports = EvolutionPoste;