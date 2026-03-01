const { pool } = require('../utils/database');

class Opportunity {
    constructor(data) {
        this.id = data.id;
        this.nom = data.nom;
        this.description = data.description;
        this.client_id = data.client_id;
        this.collaborateur_id = data.collaborateur_id;
        this.business_unit_id = data.business_unit_id;
        this.opportunity_type_id = data.opportunity_type_id;
        this.statut = data.statut;
        this.type_opportunite = data.type_opportunite;
        this.source = data.source;
        this.probabilite = data.probabilite;
        this.montant_estime = data.montant_estime;
        this.devise = data.devise;
        this.date_fermeture_prevue = data.date_fermeture_prevue;
        this.date_fermeture_reelle = data.date_fermeture_reelle;
        this.etape_vente = data.etape_vente;
        this.notes = data.notes;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.updated_by = data.updated_by;
        this.updated_at = data.updated_at;

        // Données jointes
        this.client_nom = data.client_nom;
        this.client_email = data.client_email;
        this.client_telephone = data.client_telephone;
        this.collaborateur_nom = data.collaborateur_nom;
        this.collaborateur_prenom = data.collaborateur_prenom;
        this.collaborateur_email = data.collaborateur_email;
        this.business_unit_nom = data.business_unit_nom;
        this.business_unit_code = data.business_unit_code;
        this.opportunity_type_nom = data.opportunity_type_nom;
        this.opportunity_type_description = data.opportunity_type_description;
    }

    static async findAll(options = {}) {
        try {
            let query = `
                SELECT 
                    o.*,
                    c.nom as client_nom,
                    c.email as client_email,
                    col.nom as collaborateur_nom,
                    col.prenom as collaborateur_prenom,
                    bu.nom as business_unit_nom,
                    bu.code as business_unit_code,
                    ot.name as opportunity_type_nom,
                    ot.description as opportunity_type_description
                FROM opportunities o
                LEFT JOIN clients c ON o.client_id = c.id
                LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filtres
            if (options.statut) {
                query += ` AND o.statut = $${paramIndex++}`;
                params.push(options.statut);
            }

            if (options.client_id) {
                query += ` AND o.client_id = $${paramIndex++}`;
                params.push(options.client_id);
            }

            if (options.collaborateur_id) {
                query += ` AND o.collaborateur_id = $${paramIndex++}`;
                params.push(options.collaborateur_id);
            }

            if (options.business_unit_id) {
                query += ` AND o.business_unit_id = $${paramIndex++}`;
                params.push(options.business_unit_id);
            } else if (options.userBusinessUnitIds && options.userBusinessUnitIds.length > 0) {
                // Filtrer par les Business Units de l'utilisateur
                const placeholders = options.userBusinessUnitIds.map((_, index) => `$${paramIndex + index}`).join(',');
                query += ` AND o.business_unit_id IN (${placeholders})`;
                params.push(...options.userBusinessUnitIds);
                paramIndex += options.userBusinessUnitIds.length;
            }

            if (options.opportunity_type_id) {
                query += ` AND o.opportunity_type_id = $${paramIndex++}`;
                params.push(options.opportunity_type_id);
            }

            if (options.fiscal_year_id) {
                query += ` AND o.fiscal_year_id = $${paramIndex++}`;
                params.push(options.fiscal_year_id);
            }

            if (options.search) {
                query += ` AND (o.nom ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`;
                params.push(`%${options.search}%`);
                paramIndex++;
            }

            // Tri
            const sortField = options.sortBy || 'created_at';
            const sortOrder = options.sortOrder || 'DESC';
            query += ` ORDER BY o.${sortField} ${sortOrder}`;

            // Pagination
            if (options.limit) {
                query += ` LIMIT $${paramIndex++}`;
                params.push(options.limit);
            }

            if (options.offset) {
                query += ` OFFSET $${paramIndex++}`;
                params.push(options.offset);
            }

            const result = await pool.query(query, params);

            // Requête pour le total avec les mêmes filtres
            let countQuery = `SELECT COUNT(*) as total FROM opportunities o WHERE 1=1`;
            const countParams = [];
            let countParamIndex = 1;

            if (options.statut) {
                countQuery += ` AND o.statut = $${countParamIndex++}`;
                countParams.push(options.statut);
            }

            if (options.client_id) {
                countQuery += ` AND o.client_id = $${countParamIndex++}`;
                countParams.push(options.client_id);
            }

            if (options.collaborateur_id) {
                countQuery += ` AND o.collaborateur_id = $${countParamIndex++}`;
                countParams.push(options.collaborateur_id);
            }

            if (options.business_unit_id) {
                countQuery += ` AND o.business_unit_id = $${countParamIndex++}`;
                countParams.push(options.business_unit_id);
            } else if (options.userBusinessUnitIds && options.userBusinessUnitIds.length > 0) {
                // Filtrer par les Business Units de l'utilisateur
                const placeholders = options.userBusinessUnitIds.map((_, index) => `$${countParamIndex + index}`).join(',');
                countQuery += ` AND o.business_unit_id IN (${placeholders})`;
                countParams.push(...options.userBusinessUnitIds);
                countParamIndex += options.userBusinessUnitIds.length;
            }

            if (options.opportunity_type_id) {
                countQuery += ` AND o.opportunity_type_id = $${countParamIndex++}`;
                countParams.push(options.opportunity_type_id);
            }

            if (options.fiscal_year_id) {
                countQuery += ` AND o.fiscal_year_id = $${countParamIndex++}`;
                countParams.push(options.fiscal_year_id);
            }

            if (options.search) {
                countQuery += ` AND (o.nom ILIKE $${countParamIndex} OR o.description ILIKE $${countParamIndex})`;
                countParams.push(`%${options.search}%`);
                countParamIndex++;
            }

            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            return {
                opportunities: result.rows.map(row => new Opportunity(row)),
                total: total
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des opportunités:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT 
                    o.*,
                    c.nom as client_nom,
                    c.email as client_email,
                    c.telephone as client_telephone,
                    col.nom as collaborateur_nom,
                    col.prenom as collaborateur_prenom,
                    col.email as collaborateur_email,
                    bu.nom as business_unit_nom,
                    bu.code as business_unit_code,
                    ot.name as opportunity_type_nom,
                    ot.description as opportunity_type_description
                FROM opportunities o
                LEFT JOIN clients c ON o.client_id = c.id
                LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
                WHERE o.id = $1
            `;

            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new Opportunity(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'opportunité:', error);
            throw error;
        }
    }

    static async create(data) {
        try {
            let finalFiscalYearId = data.fiscal_year_id;
            if (!finalFiscalYearId) {
                const FiscalYear = require('./FiscalYear');
                const activeFy = await FiscalYear.getCurrent();
                finalFiscalYearId = activeFy ? activeFy.id : null;
            }

            const query = `
                INSERT INTO opportunities (
                    nom, description, client_id, collaborateur_id, business_unit_id, 
                    opportunity_type_id, statut, type_opportunite, source, probabilite,
                    montant_estime, devise, date_fermeture_prevue, notes, created_by, fiscal_year_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `;

            const values = [
                data.nom,
                data.description,
                data.client_id,
                data.collaborateur_id,
                data.business_unit_id,
                data.opportunity_type_id,
                data.statut || 'NOUVELLE',
                data.type_opportunite,
                data.source,
                data.probabilite || 0,
                data.montant_estime,
                data.devise || 'FCFA',
                data.date_fermeture_prevue,
                data.notes,
                data.created_by || null,
                finalFiscalYearId
            ];

            const result = await pool.query(query, values);
            const opportunity = new Opportunity(result.rows[0]);

            return opportunity;
        } catch (error) {
            console.error('Erreur lors de la création de l\'opportunité:', error);
            throw error;
        }
    }

    async update(data) {
        try {
            const query = `
                UPDATE opportunities SET
                    nom = COALESCE($1, nom),
                    description = COALESCE($2, description),
                    client_id = COALESCE($3, client_id),
                    collaborateur_id = COALESCE($4, collaborateur_id),
                    business_unit_id = COALESCE($5, business_unit_id),
                    opportunity_type_id = COALESCE($6, opportunity_type_id),
                    statut = COALESCE($7, statut),
                    type_opportunite = COALESCE($8, type_opportunite),
                    source = COALESCE($9, source),
                    probabilite = COALESCE($10, probabilite),
                    montant_estime = COALESCE($11, montant_estime),
                    devise = COALESCE($12, devise),
                    date_fermeture_prevue = COALESCE($13, date_fermeture_prevue),
                    date_fermeture_reelle = COALESCE($14, date_fermeture_reelle),
                    etape_vente = COALESCE($15, etape_vente),
                    notes = COALESCE($16, notes),
                    updated_by = $17,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $18
                RETURNING *
            `;

            const values = [
                data.nom,
                data.description,
                data.client_id,
                data.collaborateur_id,
                data.business_unit_id,
                data.opportunity_type_id,
                data.statut,
                data.type_opportunite,
                data.source,
                data.probabilite,
                data.montant_estime,
                data.devise,
                data.date_fermeture_prevue,
                data.date_fermeture_reelle,
                data.etape_vente,
                data.notes,
                data.updated_by,
                this.id
            ];

            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
            }
            return this;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'opportunité:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const query = 'DELETE FROM opportunities WHERE id = $1';
            const result = await pool.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'opportunité:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_opportunities,
                    COUNT(CASE WHEN statut = 'GAGNEE' THEN 1 END) as won_opportunities,
                    COUNT(CASE WHEN statut = 'PERDUE' THEN 1 END) as lost_opportunities,
                    COUNT(CASE WHEN statut = 'EN_COURS' THEN 1 END) as active_opportunities,
                    SUM(CASE WHEN statut = 'GAGNEE' THEN montant_estime ELSE 0 END) as total_won_amount,
                    AVG(CASE WHEN statut = 'EN_COURS' THEN probabilite ELSE NULL END) as avg_probability
                FROM opportunities
            `;

            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Récupérer les étapes de l'opportunité
    async getStages() {
        try {
            const OpportunityStage = require('./OpportunityStage');
            return await OpportunityStage.findByOpportunityId(this.id);
        } catch (error) {
            console.error('Erreur lors de la récupération des étapes:', error);
            throw error;
        }
    }

    // Récupérer les statistiques des étapes
    async getStageStats() {
        try {
            const OpportunityStage = require('./OpportunityStage');
            return await OpportunityStage.getStageStats(this.id);
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques des étapes:', error);
            throw error;
        }
    }
}

module.exports = Opportunity; 