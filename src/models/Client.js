const { pool } = require('../utils/database');

class Client {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.email = data.email;
        this.telephone = data.telephone;
        this.adresse = data.adresse;
        this.ville = data.ville;
        this.code_postal = data.code_postal;
        this.pays = data.pays;
        this.secteur_activite = data.secteur_activite;
        this.taille_entreprise = data.taille_entreprise;
        this.statut = data.statut;
        this.source_prospection = data.source_prospection;
        this.notes = data.notes;
        this.date_creation = data.date_creation;
        this.date_modification = data.date_modification;
        this.date_derniere_activite = data.date_derniere_activite;
        this.collaborateur_id = data.collaborateur_id;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;
    }

    // Récupérer tous les clients avec pagination et filtres
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            statut,
            collaborateur_id,
            secteur_activite,
            search,
            sortBy = 'date_creation',
            sortOrder = 'DESC'
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Filtres
        if (statut) {
            conditions.push(`c.statut = $${paramIndex++}`);
            params.push(statut);
        }

        if (collaborateur_id) {
            conditions.push(`c.collaborateur_id = $${paramIndex++}`);
            params.push(collaborateur_id);
        }

        if (secteur_activite) {
            conditions.push(`c.secteur_activite = $${paramIndex++}`);
            params.push(secteur_activite);
        }

        if (search) {
            conditions.push(`(c.nom ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.ville ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                c.*,
                col.nom as collaborateur_nom,
                col.initiales as collaborateur_initiales,
                COUNT(m.id) as nombre_missions,
                COUNT(o.id) as nombre_opportunites,
                COALESCE(SUM(m.montant_total), 0) as chiffre_affaires_total
            FROM clients c
            LEFT JOIN collaborateurs col ON c.collaborateur_id = col.id
            LEFT JOIN missions m ON c.id = m.client_id
            LEFT JOIN opportunites o ON c.id = o.client_id
            ${whereClause}
            GROUP BY c.id, col.nom, col.initiales
            ORDER BY c.${sortBy} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const countQuery = `
            SELECT COUNT(DISTINCT c.id) as total
            FROM clients c
            ${whereClause}
        `;

        try {
            const [result, countResult] = await Promise.all([
                pool.query(query, [...params, limit, offset]),
                pool.query(countQuery, params)
            ]);

            const clients = result.rows.map(row => new Client(row));
            const total = parseInt(countResult.rows[0].total);

            return {
                clients,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des clients:', error);
            throw error;
        }
    }

    // Récupérer un client par ID
    static async findById(id) {
        const query = `
            SELECT 
                c.*,
                col.nom as collaborateur_nom,
                col.initiales as collaborateur_initiales,
                COUNT(m.id) as nombre_missions,
                COUNT(o.id) as nombre_opportunites,
                COALESCE(SUM(m.montant_total), 0) as chiffre_affaires_total
            FROM clients c
            LEFT JOIN collaborateurs col ON c.collaborateur_id = col.id
            LEFT JOIN missions m ON c.id = m.client_id
            LEFT JOIN opportunites o ON c.id = o.client_id
            WHERE c.id = $1
            GROUP BY c.id, col.nom, col.initiales
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Client(result.rows[0]) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération du client:', error);
            throw error;
        }
    }

    // Créer un nouveau client
    static async create(clientData) {
        const {
            nom, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, created_by
        } = clientData;

        const query = `
            INSERT INTO clients (
                nom, email, telephone, adresse, ville, code_postal, pays,
                secteur_activite, taille_entreprise, statut, source_prospection,
                notes, collaborateur_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            nom, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, created_by
        ];

        try {
            const result = await pool.query(query, values);
            return new Client(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création du client:', error);
            throw error;
        }
    }

    // Mettre à jour un client
    async update(updateData) {
        const {
            nom, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, updated_by
        } = updateData;

        const query = `
            UPDATE clients SET
                nom = COALESCE($1, nom),
                email = COALESCE($2, email),
                telephone = COALESCE($3, telephone),
                adresse = COALESCE($4, adresse),
                ville = COALESCE($5, ville),
                code_postal = COALESCE($6, code_postal),
                pays = COALESCE($7, pays),
                secteur_activite = COALESCE($8, secteur_activite),
                taille_entreprise = COALESCE($9, taille_entreprise),
                statut = COALESCE($10, statut),
                source_prospection = COALESCE($11, source_prospection),
                notes = COALESCE($12, notes),
                collaborateur_id = COALESCE($13, collaborateur_id),
                updated_by = $14,
                date_derniere_activite = CURRENT_TIMESTAMP
            WHERE id = $15
            RETURNING *
        `;

        const values = [
            nom, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, updated_by, this.id
        ];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
                return this;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du client:', error);
            throw error;
        }
    }

    // Supprimer un client
    async delete() {
        const query = 'DELETE FROM clients WHERE id = $1 RETURNING *';
        
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression du client:', error);
            throw error;
        }
    }

    // Changer le statut d'un client
    async changeStatut(newStatut, updated_by) {
        const query = `
            UPDATE clients SET
                statut = $1,
                updated_by = $2,
                date_derniere_activite = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [newStatut, updated_by, this.id]);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
                return this;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors du changement de statut:', error);
            throw error;
        }
    }

    // Récupérer les missions d'un client
    async getMissions() {
        const query = `
            SELECT m.*, col.nom as responsable_nom
            FROM missions m
            LEFT JOIN collaborateurs col ON m.responsable_id = col.id
            WHERE m.client_id = $1
            ORDER BY m.date_creation DESC
        `;

        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des missions:', error);
            throw error;
        }
    }

    // Récupérer les opportunités d'un client
    async getOpportunites() {
        const query = `
            SELECT o.*, col.nom as collaborateur_nom
            FROM opportunites o
            LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
            WHERE o.client_id = $1
            ORDER BY o.date_creation DESC
        `;

        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des opportunités:', error);
            throw error;
        }
    }

    // Statistiques des clients
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN statut = 'prospect' THEN 1 END) as prospects,
                COUNT(CASE WHEN statut = 'client' THEN 1 END) as clients,
                COUNT(CASE WHEN statut = 'client_fidele' THEN 1 END) as clients_fideles,
                COUNT(CASE WHEN statut = 'abandonne' THEN 1 END) as abandonnes,
                COUNT(CASE WHEN date_creation >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nouveaux_30j,
                COUNT(CASE WHEN date_derniere_activite >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as actifs_7j
            FROM clients
        `;

        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Récupérer les clients par statut
    static async getByStatut(statut, options = {}) {
        return this.findAll({ ...options, statut });
    }

    // Rechercher des clients
    static async search(searchTerm, options = {}) {
        return this.findAll({ ...options, search: searchTerm });
    }

    // Validation des données
    static validate(data) {
        const errors = [];

        if (!data.nom || data.nom.trim().length === 0) {
            errors.push('Le nom du client est requis');
        }

        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Format d\'email invalide');
        }

        if (data.statut && !['prospect', 'client', 'client_fidele', 'abandonne'].includes(data.statut)) {
            errors.push('Statut invalide');
        }

        return errors;
    }
}

module.exports = Client; 