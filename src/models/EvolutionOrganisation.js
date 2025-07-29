const pool = require('../utils/database');

class EvolutionOrganisation {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.business_unit_id = data.business_unit_id;
        this.division_id = data.division_id;
        this.date_debut = data.date_debut;
        this.date_fin = data.date_fin;
        this.motif = data.motif;
        this.created_at = data.created_at;
        this.business_unit_nom = data.business_unit_nom;
        this.division_nom = data.division_nom;
        this.collaborateur_nom = data.collaborateur_nom;
        this.collaborateur_prenom = data.collaborateur_prenom;
    }

    validate() {
        if (!this.collaborateur_id) {
            throw new Error('ID du collaborateur requis');
        }
        if (!this.business_unit_id) {
            throw new Error('ID de la Business Unit requis');
        }
        if (!this.division_id) {
            throw new Error('ID de la Division requis');
        }
        if (!this.date_debut) {
            throw new Error('Date de début requise');
        }
    }

    static async create(data) {
        const evolution = new EvolutionOrganisation(data);
        evolution.validate();

        const query = `
            INSERT INTO evolution_organisations 
            (id, collaborateur_id, business_unit_id, division_id, date_debut, date_fin, motif, created_at)
            VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const values = [
            evolution.collaborateur_id,
            evolution.business_unit_id,
            evolution.division_id,
            evolution.date_debut,
            evolution.date_fin || null,
            evolution.motif || null
        ];

        const result = await pool.query(query, values);
        return new EvolutionOrganisation(result.rows[0]);
    }

    static async findByCollaborateur(collaborateurId) {
        const query = `
            SELECT eo.*, 
                   bu.nom as business_unit_nom,
                   d.nom as division_nom,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_organisations eo
            LEFT JOIN business_units bu ON eo.business_unit_id = bu.id
            LEFT JOIN divisions d ON eo.division_id = d.id
            LEFT JOIN collaborateurs c ON eo.collaborateur_id = c.id
            WHERE eo.collaborateur_id = $1
            ORDER BY eo.date_debut DESC
        `;

        const result = await pool.query(query, [collaborateurId]);
        return result.rows.map(row => new EvolutionOrganisation(row));
    }

    static async findCurrentByCollaborateur(collaborateurId, dateReference = new Date()) {
        const query = `
            SELECT eo.*, 
                   bu.nom as business_unit_nom,
                   d.nom as division_nom,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_organisations eo
            LEFT JOIN business_units bu ON eo.business_unit_id = bu.id
            LEFT JOIN divisions d ON eo.division_id = d.id
            LEFT JOIN collaborateurs c ON eo.collaborateur_id = c.id
            WHERE eo.collaborateur_id = $1 
            AND eo.date_debut <= $2
            AND (eo.date_fin IS NULL OR eo.date_fin > $2)
            ORDER BY eo.date_debut DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [collaborateurId, dateReference]);
        return result.rows.length > 0 ? new EvolutionOrganisation(result.rows[0]) : null;
    }

    static async findById(id) {
        const query = `
            SELECT eo.*, 
                   bu.nom as business_unit_nom,
                   d.nom as division_nom,
                   c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM evolution_organisations eo
            LEFT JOIN business_units bu ON eo.business_unit_id = bu.id
            LEFT JOIN divisions d ON eo.division_id = d.id
            LEFT JOIN collaborateurs c ON eo.collaborateur_id = c.id
            WHERE eo.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new EvolutionOrganisation(result.rows[0]) : null;
    }

    async update(updateData) {
        const allowedFields = ['business_unit_id', 'division_id', 'date_debut', 'date_fin', 'motif'];
        const updates = [];
        const values = [];
        let paramCount = 1;

        for (const [field, value] of Object.entries(updateData)) {
            if (allowedFields.includes(field)) {
                updates.push(`${field} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        values.push(this.id);
        const query = `
            UPDATE evolution_organisations 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return new EvolutionOrganisation(result.rows[0]);
    }

    static async delete(id) {
        const query = 'DELETE FROM evolution_organisations WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new EvolutionOrganisation(result.rows[0]) : null;
    }
}

module.exports = EvolutionOrganisation;