const { pool } = require('../utils/database');

class Contact {
    constructor(data) {
        this.id = data.id;
        this.client_id = data.client_id;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.email = data.email;
        this.telephone = data.telephone;
        this.fonction = data.fonction;
        this.est_principal = data.est_principal;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findAll() {
        try {
            const query = `
                SELECT * FROM contacts 
                ORDER BY nom, prenom
            `;
            const result = await pool.query(query);
            return result.rows.map(row => new Contact(row));
        } catch (error) {
            console.error('Erreur lors de la récupération des contacts:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = 'SELECT * FROM contacts WHERE id = $1';
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Contact(result.rows[0]) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération du contact:', error);
            throw error;
        }
    }

    static async findByClientId(clientId) {
        try {
            const query = `
                SELECT * FROM contacts 
                WHERE client_id = $1 
                ORDER BY est_principal DESC, nom, prenom
            `;
            const result = await pool.query(query, [clientId]);
            return result.rows.map(row => new Contact(row));
        } catch (error) {
            console.error('Erreur lors de la récupération des contacts du client:', error);
            throw error;
        }
    }

    static async create(contactData) {
        try {
            const query = `
                INSERT INTO contacts (client_id, nom, prenom, email, telephone, fonction, est_principal)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [
                contactData.client_id,
                contactData.nom,
                contactData.prenom,
                contactData.email,
                contactData.telephone,
                contactData.fonction,
                contactData.est_principal || false
            ];
            const result = await pool.query(query, values);
            return new Contact(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création du contact:', error);
            throw error;
        }
    }

    async update(updateData) {
        try {
            const query = `
                UPDATE contacts 
                SET nom = $1, prenom = $2, email = $3, telephone = $4, 
                    fonction = $5, est_principal = $6, updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `;
            const values = [
                updateData.nom,
                updateData.prenom,
                updateData.email,
                updateData.telephone,
                updateData.fonction,
                updateData.est_principal,
                this.id
            ];
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
                return this;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du contact:', error);
            throw error;
        }
    }

    async delete() {
        try {
            const query = 'DELETE FROM contacts WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [this.id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression du contact:', error);
            throw error;
        }
    }

    static async search(searchTerm) {
        try {
            const query = `
                SELECT c.*, cl.nom as client_nom 
                FROM contacts c
                JOIN clients cl ON c.client_id = cl.id
                WHERE c.nom ILIKE $1 OR c.prenom ILIKE $1 OR c.email ILIKE $1 OR cl.nom ILIKE $1
                ORDER BY c.nom, c.prenom
            `;
            const result = await pool.query(query, [`%${searchTerm}%`]);
            return result.rows.map(row => new Contact(row));
        } catch (error) {
            console.error('Erreur lors de la recherche de contacts:', error);
            throw error;
        }
    }

    static async getPrincipalContact(clientId) {
        try {
            const query = `
                SELECT * FROM contacts 
                WHERE client_id = $1 AND est_principal = true
                LIMIT 1
            `;
            const result = await pool.query(query, [clientId]);
            return result.rows.length > 0 ? new Contact(result.rows[0]) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération du contact principal:', error);
            throw error;
        }
    }

    static async setPrincipalContact(clientId, contactId) {
        try {
            // D'abord, retirer le statut principal de tous les contacts du client
            await pool.query(
                'UPDATE contacts SET est_principal = false WHERE client_id = $1',
                [clientId]
            );
            
            // Ensuite, définir le nouveau contact principal
            const query = `
                UPDATE contacts 
                SET est_principal = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND client_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [contactId, clientId]);
            return result.rows.length > 0 ? new Contact(result.rows[0]) : null;
        } catch (error) {
            console.error('Erreur lors de la définition du contact principal:', error);
            throw error;
        }
    }

    static async getContactsWithClientInfo() {
        try {
            const query = `
                SELECT c.*, cl.nom as client_nom, cl.raison_sociale
                FROM contacts c
                JOIN clients cl ON c.client_id = cl.id
                ORDER BY cl.nom, c.nom, c.prenom
            `;
            const result = await pool.query(query);
            return result.rows.map(row => ({
                ...new Contact(row),
                client_nom: row.client_nom,
                client_raison_sociale: row.raison_sociale
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des contacts avec info client:', error);
            throw error;
        }
    }

    static async countByClient(clientId) {
        try {
            const query = 'SELECT COUNT(*) FROM contacts WHERE client_id = $1';
            const result = await pool.query(query, [clientId]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Erreur lors du comptage des contacts:', error);
            throw error;
        }
    }

    static async validateEmail(email, excludeId = null) {
        try {
            let query = 'SELECT COUNT(*) FROM contacts WHERE email = $1';
            let values = [email];
            
            if (excludeId) {
                query += ' AND id != $2';
                values.push(excludeId);
            }
            
            const result = await pool.query(query, values);
            return parseInt(result.rows[0].count) === 0;
        } catch (error) {
            console.error('Erreur lors de la validation de l\'email:', error);
            throw error;
        }
    }

    toJSON() {
        return {
            id: this.id,
            client_id: this.client_id,
            nom: this.nom,
            prenom: this.prenom,
            email: this.email,
            telephone: this.telephone,
            fonction: this.fonction,
            est_principal: this.est_principal,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = { Contact }; 