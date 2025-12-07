const { pool } = require('../utils/database');

class Mission {
    constructor(data) {
        this.id = data.id;
        this.titre = data.titre || data.nom;
        this.description = data.description;
        this.client_id = data.client_id;
        this.statut = data.statut;
        this.type_mission = data.type_mission;
        this.date_debut = data.date_debut;
        this.date_fin_prevue = data.date_fin_prevue;
        this.date_fin_reelle = data.date_fin_reelle;
        this.budget_prevue = data.budget_prevue;
        this.budget_reel = data.budget_reel;
        this.taux_horaire_moyen = data.taux_horaire_moyen;
        this.montant_total = data.montant_total;
        this.priorite = data.priorite;
        this.division_id = data.division_id;
        this.responsable_id = data.responsable_id;
        this.manager_id = data.manager_id;
        this.fiscal_year_id = data.fiscal_year_id;
        this.notes = data.notes;
        this.date_creation = data.date_creation;
        this.date_modification = data.date_modification;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;

        // Champs joints
        this.client_nom = data.client_nom;
        this.client_statut = data.client_statut;
        this.responsable_nom = data.responsable_nom;
        this.responsable_prenom = data.responsable_prenom;
        this.responsable_initiales = data.responsable_initiales;
        this.manager_nom = data.manager_nom;
        this.manager_prenom = data.manager_prenom;
        this.manager_initiales = data.manager_initiales;
        this.division_nom = data.division_nom;
        this.business_unit_nom = data.business_unit_nom;
        this.associe_nom = data.associe_nom;
        this.associe_prenom = data.associe_prenom;
        this.associe_initiales = data.associe_initiales;
        this.nombre_collaborateurs = data.nombre_collaborateurs;
        this.total_taux_horaire = data.total_taux_horaire;
    }

    // Récupérer toutes les missions avec pagination et filtres
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            statut,
            client_id,
            division_id,
            responsable_id,
            type_mission,
            priorite,
            fiscal_year_id,
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
            conditions.push(`m.statut = $${paramIndex++}`);
            params.push(statut);
        }

        if (client_id) {
            conditions.push(`m.client_id = $${paramIndex++}`);
            params.push(client_id);
        }

        if (division_id) {
            conditions.push(`m.division_id = $${paramIndex++}`);
            params.push(division_id);
        }

        if (responsable_id) {
            conditions.push(`m.collaborateur_id = $${paramIndex++}`);
            params.push(responsable_id);
        }

        if (type_mission) {
            conditions.push(`m.type_mission = $${paramIndex++}`);
            params.push(type_mission);
        }

        if (priorite) {
            conditions.push(`m.priorite = $${paramIndex++}`);
            params.push(priorite);
        }

        if (fiscal_year_id) {
            conditions.push(`m.fiscal_year_id = $${paramIndex++}`);
            params.push(fiscal_year_id);
        }

        if (search) {
            conditions.push(`(m.titre ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex} OR c.nom ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                m.*,
                c.nom as client_nom,
                c.statut as client_statut,
                col.nom as responsable_nom,
                col.initiales as responsable_initiales,
                col_mgr.nom as manager_nom,
                col_mgr.initiales as manager_initiales,
                d.nom as division_nom,
                fy.annee as fiscal_year_annee,
                COUNT(em.id) as nombre_collaborateurs,
                COALESCE(SUM(em.taux_horaire_mission), 0) as total_taux_horaire
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN collaborateurs col ON m.collaborateur_id = col.id
            LEFT JOIN collaborateurs col_mgr ON m.manager_id = col_mgr.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN fiscal_years fy ON m.fiscal_year_id = fy.id
            LEFT JOIN equipes_mission em ON m.id = em.mission_id
            ${whereClause}
            GROUP BY m.id, c.nom, c.statut, col.nom, col.initiales, col_mgr.nom, col_mgr.initiales, d.nom, fy.annee
            ORDER BY m.${sortBy} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const countQuery = `
            SELECT COUNT(DISTINCT m.id) as total
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            ${whereClause}
        `;

        try {
            const [result, countResult] = await Promise.all([
                pool.query(query, [...params, limit, offset]),
                pool.query(countQuery, params)
            ]);

            const missions = result.rows.map(row => new Mission(row));
            const total = parseInt(countResult.rows[0].total);

            return {
                missions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des missions:', error);
            throw error;
        }
    }

    // Récupérer une mission par ID
    static async findById(id) {
        const query = `
            SELECT 
                m.*,
                c.nom as client_nom,
                c.statut as client_statut,
                col_resp.nom as responsable_nom,
                col_resp.prenom as responsable_prenom,
                col_resp.initiales as responsable_initiales,
                col_mgr.nom as manager_nom,
                col_mgr.prenom as manager_prenom,
                col_mgr.initiales as manager_initiales,
                d.nom as division_nom,
                bu.nom as business_unit_nom,
                col_assoc.nom as associe_nom,
                col_assoc.prenom as associe_prenom,
                col_assoc.initiales as associe_initiales,
                COUNT(em.id) as nombre_collaborateurs,
                COALESCE(SUM(em.taux_horaire_mission), 0) as total_taux_horaire
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN collaborateurs col_resp ON m.collaborateur_id = col_resp.id
            LEFT JOIN collaborateurs col_mgr ON m.manager_id = col_mgr.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN collaborateurs col_assoc ON m.associe_id = col_assoc.id
            LEFT JOIN equipes_mission em ON m.id = em.mission_id
            WHERE m.id = $1
            GROUP BY m.id, c.nom, c.statut, col_resp.nom, col_resp.prenom, col_resp.initiales, col_mgr.nom, col_mgr.prenom, col_mgr.initiales, d.nom, bu.nom, col_assoc.nom, col_assoc.prenom, col_assoc.initiales
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Mission(result.rows[0]) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération de la mission:', error);
            throw error;
        }
    }

    // Créer une nouvelle mission
    static async create(missionData) {
        const {
            titre, description, client_id, statut, type_mission,
            date_debut, date_fin_prevue, budget_prevue, priorite,
            division_id, responsable_id, manager_id, notes, created_by, fiscal_year_id
        } = missionData;

        // Si aucune année fiscale n'est spécifiée, utiliser l'année active
        let finalFiscalYearId = fiscal_year_id;
        if (!finalFiscalYearId) {
            const FiscalYear = require('./FiscalYear');
            const activeFiscalYear = await FiscalYear.getActiveForNewItems();
            finalFiscalYearId = activeFiscalYear ? activeFiscalYear.id : null;
        }

        const query = `
            INSERT INTO missions (
                titre, description, client_id, statut, type_mission,
                date_debut, date_fin_prevue, budget_prevue, priorite,
                division_id, collaborateur_id, manager_id, notes, created_by, fiscal_year_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const values = [
            titre, description, client_id, statut, type_mission,
            date_debut, date_fin_prevue, budget_prevue, priorite,
            division_id, responsable_id, manager_id, notes, created_by, finalFiscalYearId
        ];

        try {
            const result = await pool.query(query, values);
            return new Mission(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création de la mission:', error);
            throw error;
        }
    }

    // Mettre à jour une mission
    async update(updateData) {
        const {
            titre, description, statut, type_mission,
            date_debut, date_fin_prevue, date_fin_reelle,
            budget_prevue, budget_reel, taux_horaire_moyen,
            montant_total, priorite, division_id, responsable_id, manager_id,
            notes, updated_by
        } = updateData;

        const query = `
            UPDATE missions SET
                titre = COALESCE($1, titre),
                description = COALESCE($2, description),
                statut = COALESCE($3, statut),
                type_mission = COALESCE($4, type_mission),
                date_debut = COALESCE($5, date_debut),
                date_fin_prevue = COALESCE($6, date_fin_prevue),
                date_fin_reelle = COALESCE($7, date_fin_reelle),
                budget_prevue = COALESCE($8, budget_prevue),
                budget_reel = COALESCE($9, budget_reel),
                taux_horaire_moyen = COALESCE($10, taux_horaire_moyen),
                montant_total = COALESCE($11, montant_total),
                priorite = COALESCE($12, priorite),
                division_id = COALESCE($13, division_id),
                collaborateur_id = COALESCE($14, responsable_id),
                manager_id = COALESCE($15, manager_id),
                notes = COALESCE($16, notes),
                updated_by = $17
            WHERE id = $18
            RETURNING *
        `;

        const values = [
            titre, description, statut, type_mission,
            date_debut, date_fin_prevue, date_fin_reelle,
            budget_prevue, budget_reel, taux_horaire_moyen,
            montant_total, priorite, division_id, responsable_id, manager_id,
            notes, updated_by, this.id
        ];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
                return this;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la mission:', error);
            throw error;
        }
    }

    // Supprimer une mission
    async delete() {
        const query = 'DELETE FROM missions WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [this.id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression de la mission:', error);
            throw error;
        }
    }

    // Changer le statut d'une mission
    async changeStatut(newStatut, updated_by) {
        const query = `
            UPDATE missions SET
                statut = $1,
                updated_by = $2,
                date_fin_reelle = CASE 
                    WHEN $1 = 'termine' THEN CURRENT_DATE
                    ELSE date_fin_reelle
                END
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

    // Récupérer l'équipe d'une mission
    async getEquipe() {
        const query = `
            SELECT 
                em.*,
                col.nom as collaborateur_nom,
                col.initiales as collaborateur_initiales,
                col.email as collaborateur_email,
                g.nom as grade_nom
            FROM equipes_mission em
            JOIN collaborateurs col ON em.collaborateur_id = col.id
            LEFT JOIN grades g ON col.grade_id = g.id
            WHERE em.mission_id = $1
            ORDER BY em.date_creation
        `;

        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'équipe:', error);
            throw error;
        }
    }

    // Ajouter un collaborateur à l'équipe
    async addCollaborateur(collaborateurData) {
        const {
            collaborateur_id, role, taux_horaire_mission,
            date_debut_participation, date_fin_participation,
            pourcentage_charge
        } = collaborateurData;

        const query = `
            INSERT INTO equipes_mission (
                mission_id, collaborateur_id, role, taux_horaire_mission,
                date_debut_participation, date_fin_participation, pourcentage_charge
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            this.id, collaborateur_id, role, taux_horaire_mission,
            date_debut_participation, date_fin_participation, pourcentage_charge
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de l\'ajout du collaborateur:', error);
            throw error;
        }
    }

    // Retirer un collaborateur de l'équipe
    async removeCollaborateur(collaborateur_id) {
        const query = `
            DELETE FROM equipes_mission 
            WHERE mission_id = $1 AND collaborateur_id = $2
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [this.id, collaborateur_id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors du retrait du collaborateur:', error);
            throw error;
        }
    }

    // Calculer le taux horaire moyen de l'équipe
    async calculerTauxHoraireMoyen() {
        const query = `
            SELECT AVG(taux_horaire_mission) as taux_moyen
            FROM equipes_mission
            WHERE mission_id = $1 AND taux_horaire_mission > 0
        `;

        try {
            const result = await pool.query(query, [this.id]);
            const taux_moyen = result.rows[0].taux_moyen;

            if (taux_moyen) {
                await this.update({ taux_horaire_moyen: parseFloat(taux_moyen) });
            }

            return taux_moyen;
        } catch (error) {
            console.error('Erreur lors du calcul du taux horaire moyen:', error);
            throw error;
        }
    }

    // Statistiques des missions
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_missions,
                COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) as en_cours,
                COUNT(CASE WHEN statut = 'termine' THEN 1 END) as terminees,
                COUNT(CASE WHEN statut = 'suspendu' THEN 1 END) as suspendues,
                COUNT(CASE WHEN statut = 'annule' THEN 1 END) as annulees,
                COUNT(CASE WHEN date_fin_prevue < CURRENT_DATE AND statut != 'termine' THEN 1 END) as en_retard,
                COALESCE(SUM(montant_total), 0) as chiffre_affaires_total,
                COALESCE(AVG(budget_reel), 0) as budget_moyen
            FROM missions
        `;

        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Récupérer les missions par statut
    static async getByStatut(statut, options = {}) {
        return this.findAll({ ...options, statut });
    }

    // Récupérer les missions d'un client
    static async getByClient(client_id, options = {}) {
        return this.findAll({ ...options, client_id });
    }

    // Rechercher des missions
    static async search(searchTerm, options = {}) {
        return this.findAll({ ...options, search: searchTerm });
    }

    // Validation des données
    static validate(data) {
        const errors = [];

        if (!data.titre || data.titre.trim().length === 0) {
            errors.push('Le titre de la mission est requis');
        }

        if (!data.client_id) {
            errors.push('Le client est requis');
        }

        if (data.statut && !['en_cours', 'termine', 'suspendu', 'annule'].includes(data.statut)) {
            errors.push('Statut invalide');
        }

        if (data.priorite && !['basse', 'normale', 'haute', 'urgente'].includes(data.priorite)) {
            errors.push('Priorité invalide');
        }

        if (data.date_debut && data.date_fin_prevue && new Date(data.date_debut) > new Date(data.date_fin_prevue)) {
            errors.push('La date de fin prévue doit être postérieure à la date de début');
        }

        return errors;
    }
}

module.exports = Mission; 