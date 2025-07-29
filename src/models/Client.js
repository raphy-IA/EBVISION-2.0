const { pool } = require('../utils/database');

class Client {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.sigle = data.sigle;
        this.email = data.email;
        this.telephone = data.telephone;
        this.adresse = data.adresse;
        this.ville = data.ville;
        this.code_postal = data.code_postal;
        this.pays = data.pays;
        this.pays_id = data.pays_id;
        this.secteur_activite = data.secteur_activite;
        this.secteur_activite_id = data.secteur_activite_id;
        this.sous_secteur_activite_id = data.sous_secteur_activite_id;
        this.taille_entreprise = data.taille_entreprise;
        this.statut = data.statut;
        this.source_prospection = data.source_prospection;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.date_derniere_activite = data.date_derniere_activite;
        this.collaborateur_id = data.collaborateur_id;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;
        this.numero_contribuable = data.numero_contribuable;
        this.forme_juridique = data.forme_juridique;
        this.effectif = data.effectif;
        this.chiffre_affaires = data.chiffre_affaires;
        this.resultat_net = data.resultat_net;
        this.notation = data.notation;
        this.risque_client = data.risque_client;
        this.groupe_id = data.groupe_id;
        this.est_filiale = data.est_filiale;
        this.latitude = data.latitude;
        this.longitude = data.longitude;
        this.site_web = data.site_web;
        this.linkedin_url = data.linkedin_url;
        this.date_creation_entreprise = data.date_creation_entreprise;
        this.secteur_geographique = data.secteur_geographique;
        this.classification_abc = data.classification_abc;
        this.nombre_missions = data.nombre_missions;
        this.nombre_opportunites = data.nombre_opportunites;
        this.chiffre_affaires_total = data.chiffre_affaires_total;
        
        // Données des relations
        this.pays_nom = data.pays_nom;
        this.pays_code = data.pays_code;
        this.secteur_nom = data.secteur_nom;
        this.secteur_code = data.secteur_code;
        this.secteur_couleur = data.secteur_couleur;
        this.sous_secteur_nom = data.sous_secteur_nom;
        this.sous_secteur_code = data.sous_secteur_code;
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
            sortBy = 'created_at',
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
            conditions.push(`(sa.nom ILIKE $${paramIndex} OR c.secteur_activite ILIKE $${paramIndex})`);
            params.push(`%${secteur_activite}%`);
            paramIndex++;
        }

        if (search) {
            conditions.push(`(c.nom ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.ville ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                c.id, c.nom, c.sigle, c.email, c.telephone, c.adresse, c.ville, c.code_postal, c.pays,
                c.secteur_activite, c.taille_entreprise, c.statut, c.source_prospection, c.notes,
                c.created_at, c.updated_at, c.date_derniere_activite, c.collaborateur_id, c.created_by, c.updated_by,
                c.numero_contribuable, c.forme_juridique, c.effectif, c.chiffre_affaires, c.resultat_net,
                c.notation, c.risque_client, c.groupe_id, c.est_filiale, c.latitude, c.longitude,
                c.site_web, c.linkedin_url, c.date_creation_entreprise, c.secteur_geographique,
                c.classification_abc, c.nombre_missions, c.nombre_opportunites, c.chiffre_affaires_total,
                c.pays_id, c.secteur_activite_id, c.sous_secteur_activite_id,
                p.nom as pays_nom, p.code_pays as pays_code,
                sa.nom as secteur_nom, sa.code as secteur_code, sa.couleur as secteur_couleur,
                ssa.nom as sous_secteur_nom, ssa.code as sous_secteur_code
            FROM clients c
            LEFT JOIN pays p ON c.pays_id = p.id
            LEFT JOIN secteurs_activite sa ON c.secteur_activite_id = sa.id
            LEFT JOIN sous_secteurs_activite ssa ON c.sous_secteur_activite_id = ssa.id
            ${whereClause}
            ORDER BY c.${sortBy} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM clients c
            LEFT JOIN pays p ON c.pays_id = p.id
            LEFT JOIN secteurs_activite sa ON c.secteur_activite_id = sa.id
            LEFT JOIN sous_secteurs_activite ssa ON c.sous_secteur_activite_id = ssa.id
            ${whereClause}
        `;

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
    }

    // Récupérer un client par ID
    static async findById(id) {
        const query = `
            SELECT 
                c.id, c.nom, c.sigle, c.email, c.telephone, c.adresse, c.ville, c.code_postal, c.pays,
                c.secteur_activite, c.taille_entreprise, c.statut, c.source_prospection, c.notes,
                c.created_at, c.updated_at, c.date_derniere_activite, c.collaborateur_id, c.created_by, c.updated_by,
                c.numero_contribuable, c.forme_juridique, c.effectif, c.chiffre_affaires, c.resultat_net,
                c.notation, c.risque_client, c.groupe_id, c.est_filiale, c.latitude, c.longitude,
                c.site_web, c.linkedin_url, c.date_creation_entreprise, c.secteur_geographique,
                c.classification_abc, c.nombre_missions, c.nombre_opportunites, c.chiffre_affaires_total,
                c.pays_id, c.secteur_activite_id, c.sous_secteur_activite_id,
                p.nom as pays_nom, p.code_pays as pays_code,
                sa.nom as secteur_nom, sa.code as secteur_code, sa.couleur as secteur_couleur,
                ssa.nom as sous_secteur_nom, ssa.code as sous_secteur_code
            FROM clients c
            LEFT JOIN pays p ON c.pays_id = p.id
            LEFT JOIN secteurs_activite sa ON c.secteur_activite_id = sa.id
            LEFT JOIN sous_secteurs_activite ssa ON c.sous_secteur_activite_id = ssa.id
            WHERE c.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new Client(result.rows[0]) : null;
    }

    // Créer un nouveau client
    static async create(clientData) {
        const {
            nom, sigle, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, created_by, pays_id, secteur_activite_id,
            sous_secteur_activite_id, forme_juridique, effectif
        } = clientData;

        const query = `
            INSERT INTO clients (
                nom, sigle, email, telephone, adresse, ville, code_postal, pays,
                secteur_activite, taille_entreprise, statut, source_prospection,
                notes, collaborateur_id, created_by, pays_id, secteur_activite_id,
                sous_secteur_activite_id, forme_juridique, effectif
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;

        const values = [
            nom, sigle, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, created_by, pays_id, secteur_activite_id,
            sous_secteur_activite_id, forme_juridique, effectif
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
            nom, sigle, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, updated_by, pays_id, secteur_activite_id,
            sous_secteur_activite_id, forme_juridique, effectif
        } = updateData;

        const query = `
            UPDATE clients SET
                nom = COALESCE($1, nom),
                sigle = COALESCE($2, sigle),
                email = COALESCE($3, email),
                telephone = COALESCE($4, telephone),
                adresse = COALESCE($5, adresse),
                ville = COALESCE($6, ville),
                code_postal = COALESCE($7, code_postal),
                pays = COALESCE($8, pays),
                secteur_activite = COALESCE($9, secteur_activite),
                taille_entreprise = COALESCE($10, taille_entreprise),
                statut = COALESCE($11, statut),
                source_prospection = COALESCE($12, source_prospection),
                notes = COALESCE($13, notes),
                collaborateur_id = COALESCE($14, collaborateur_id),
                pays_id = COALESCE($15, pays_id),
                secteur_activite_id = COALESCE($16, secteur_activite_id),
                sous_secteur_activite_id = COALESCE($17, sous_secteur_activite_id),
                forme_juridique = COALESCE($18, forme_juridique),
                effectif = COALESCE($19, effectif),
                updated_by = $20,
                date_derniere_activite = CURRENT_TIMESTAMP
            WHERE id = $21
            RETURNING *
        `;

        const values = [
            nom, sigle, email, telephone, adresse, ville, code_postal, pays,
            secteur_activite, taille_entreprise, statut, source_prospection,
            notes, collaborateur_id, pays_id, secteur_activite_id, sous_secteur_activite_id, 
            forme_juridique, effectif, updated_by, this.id
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
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nouveaux_30j,
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

        if (data.statut && !['PROSPECT', 'CLIENT', 'CLIENT_FIDELE', 'ACTIF', 'INACTIF', 'ABANDONNE'].includes(data.statut)) {
            errors.push('Statut invalide');
        }

        return errors;
    }
}

module.exports = Client; 