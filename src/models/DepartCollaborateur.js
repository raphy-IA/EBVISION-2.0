const { pool } = require('../utils/database');

class DepartCollaborateur {
    constructor(data) {
        this.id = data.id;
        this.collaborateur_id = data.collaborateur_id;
        this.type_depart = data.type_depart;
        this.date_effet = data.date_effet;
        this.motif = data.motif;
        this.preavis = data.preavis || null;
        this.documentation = data.documentation || null;
        this.remarques = data.remarques || null;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    validate() {
        const errors = [];
        
        if (!this.collaborateur_id) {
            errors.push('ID du collaborateur requis');
        }
        if (!this.type_depart) {
            errors.push('Type de départ requis');
        }
        if (!this.date_effet) {
            errors.push('Date de prise d\'effet requise');
        }
        if (!this.motif) {
            errors.push('Motif du départ requis');
        }
        
        return errors;
    }

    static async create(data) {
        const depart = new DepartCollaborateur(data);
        const errors = depart.validate();
        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }

        const query = `
            INSERT INTO departs_collaborateurs (
                id, collaborateur_id, type_depart, date_effet, motif, 
                preavis, documentation, remarques, created_at
            ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await pool.query(query, [
            depart.collaborateur_id,
            depart.type_depart,
            depart.date_effet,
            depart.motif,
            depart.preavis,
            depart.documentation,
            depart.remarques
        ]);

        return new DepartCollaborateur(result.rows[0]);
    }

    static async findByCollaborateur(collaborateurId) {
        const query = `
            SELECT * FROM departs_collaborateurs 
            WHERE collaborateur_id = $1 
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(query, [collaborateurId]);
        return result.rows.map(row => new DepartCollaborateur(row));
    }

    static async findById(id) {
        const query = `
            SELECT * FROM departs_collaborateurs 
            WHERE id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new DepartCollaborateur(result.rows[0]) : null;
    }
}

module.exports = DepartCollaborateur;