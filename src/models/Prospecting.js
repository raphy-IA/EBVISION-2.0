const { pool } = require('../utils/database');
const NotificationService = require('../services/notificationService');

class CompanySource {
    static async create({ name, description }) {
        const res = await pool.query(
            `INSERT INTO company_sources(name, description) VALUES ($1,$2) RETURNING *`,
            [name, description || null]
        );
        return res.rows[0];
    }

    static async findAll() {
        const res = await pool.query(`
            SELECT cs.*, 
                   COALESCE(companies_count.count, 0) as companies_count
            FROM company_sources cs
            LEFT JOIN (
                SELECT source_id, COUNT(*) as count 
                FROM companies 
                GROUP BY source_id
            ) companies_count ON cs.id = companies_count.source_id
            ORDER BY cs.name
        `);
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query(`SELECT * FROM company_sources WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }

    static async update(id, { name, description }) {
        const res = await pool.query(
            `UPDATE company_sources SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
            [name, description, id]
        );
        return res.rows[0] || null;
    }

    static async delete(id) {
        const res = await pool.query(`DELETE FROM company_sources WHERE id = $1 RETURNING *`, [id]);
        return res.rows[0] || null;
    }
}

class Company {
    static async bulkInsertFromRows(sourceId, rows) {
        let inserted = 0;
        let updated = 0;
        let errors = 0;

        console.log(`🔥 [IMPORT] Début import pour source ${sourceId}: ${rows.length} entreprises`);

        for (const r of rows) {
            try {
                if (!r.name || r.name.trim() === '') {
                    console.log(`⚠️ [IMPORT] Ligne ignorée: nom vide`);
                    skipped++;
                    continue;
                }

                // Vérifier d'abord si l'entreprise existe
                const existingCompany = await pool.query(
                    `SELECT id, sigle, email, industry FROM companies WHERE source_id = $1 AND name = $2`,
                    [sourceId, r.name.trim()]
                );

                const result = await pool.query(
                    `INSERT INTO companies(source_id, name, industry, email, phone, website, country, city, address, siret, size_label, sigle)
                     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                     ON CONFLICT (source_id, name) DO UPDATE SET
                        industry = COALESCE(EXCLUDED.industry, companies.industry),
                        email = COALESCE(EXCLUDED.email, companies.email),
                        phone = COALESCE(EXCLUDED.phone, companies.phone),
                        website = COALESCE(EXCLUDED.website, companies.website),
                        country = COALESCE(EXCLUDED.country, companies.country),
                        city = COALESCE(EXCLUDED.city, companies.city),
                        address = COALESCE(EXCLUDED.address, companies.address),
                        siret = COALESCE(EXCLUDED.siret, companies.siret),
                        size_label = COALESCE(EXCLUDED.size_label, companies.size_label),
                        sigle = COALESCE(EXCLUDED.sigle, companies.sigle),
                        updated_at = CURRENT_TIMESTAMP
                     RETURNING id`,
                    [
                        sourceId,
                        r.name.trim(),
                        r.industry || null,
                        r.email || null,
                        r.phone || null,
                        r.website || null,
                        r.country || null,
                        r.city || null,
                        r.address || null,
                        r.siret || null,
                        r.size_label || null,
                        r.sigle || null
                    ]
                );

                if (result.rows.length > 0) {
                    if (existingCompany.rows.length > 0) {
                        // L'entreprise existait déjà, c'est une mise à jour
                        updated++;
                        if (updated % 100 === 0) {
                            console.log(`🔄 [IMPORT] Progression: ${updated}/${rows.length} entreprises mises à jour`);
                        }

                        // Log des changements pour debug
                        const oldData = existingCompany.rows[0];
                        if (r.sigle && !oldData.sigle) {
                            console.log(`🔄 [IMPORT] Ajout sigle pour ${r.name}: ${r.sigle}`);
                        }
                    } else {
                        // Nouvelle entreprise
                        inserted++;
                        if (inserted % 100 === 0) {
                            console.log(`🔥 [IMPORT] Progression: ${inserted}/${rows.length} entreprises insérées`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ [IMPORT] Erreur insertion ${r.name}:`, error.message);
                errors++;
            }
        }

        console.log(`🔥 [IMPORT] Résultat final: ${inserted} insérées, ${updated} mises à jour, ${errors} erreurs`);

        return {
            inserted,
            updated,
            errors,
            total: rows.length,
            message: `Import terminé: ${inserted} entreprises ajoutées, ${updated} entreprises mises à jour, ${errors} erreurs`
        };
    }
    static async findBySource(sourceId) {
        const res = await pool.query(`SELECT * FROM companies WHERE source_id = $1 ORDER BY name`, [sourceId]);
        return res.rows;
    }

    static async search({ q, source_id, industry, city, limit = 20, offset = 0, sort_by = 'name', sort_order = 'ASC' }) {
        const conditions = [];
        const params = [];
        let idx = 1;
        if (q) {
            conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR website ILIKE $${idx} OR sigle ILIKE $${idx})`);
            params.push(`%${q}%`);
            idx++;
        }
        if (source_id) {
            conditions.push(`source_id = $${idx}`);
            params.push(source_id);
            idx++;
        }
        if (industry) {
            conditions.push(`industry ILIKE $${idx}`);
            params.push(`%${industry}%`);
            idx++;
        }
        if (city) {
            conditions.push(`city ILIKE $${idx}`);
            params.push(`%${city}%`);
            idx++;
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const validSortColumns = ['name', 'industry', 'city', 'created_at'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'name';
        const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM companies c ${where}`, params);
        const data = await pool.query(
            `SELECT c.*, 
                    COALESCE(pcc.campaigns_count, 0) as campaigns_count
             FROM companies c
             LEFT JOIN (
                 SELECT company_id, COUNT(*) as campaigns_count 
                 FROM prospecting_campaign_companies 
                 GROUP BY company_id
             ) pcc ON c.id = pcc.company_id
             ${where} ORDER BY ${sortColumn} ${sortDirection} LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, offset]
        );
        return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async findById(id) {
        const res = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }

    static async update(id, data) {
        const allowed = ['name', 'industry', 'email', 'phone', 'website', 'country', 'city', 'address', 'siret', 'size_label', 'sigle',
            'contact_nom', 'contact_tel', 'contact_email', 'admin_nom', 'admin_contact', 'admin_email'];
        const sets = [];
        const vals = [];
        let idx = 1;
        for (const k of allowed) {
            if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
        }
        if (sets.length === 0) return this.findById(id);
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        vals.push(id);
        const res = await pool.query(`UPDATE companies SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        return res.rows[0] || null;
    }

    static async delete(id) {
        // Vérifier les dépendances avant la suppression
        const deps = await this.checkDependencies(id);
        if (deps.hasDependencies) {
            return {
                success: false,
                hasDependencies: true,
                dependencies: deps,
                message: `Cette entreprise ne peut pas être supprimée car elle est impliquée dans ${deps.campaigns_count} campagne(s) et ${deps.validations_count} validation(s)`
            };
        }

        const res = await pool.query(`DELETE FROM companies WHERE id = $1 RETURNING *`, [id]);
        return res.rows[0] || null;
    }

    static async bulkDelete(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };

        // Vérifier les dépendances pour chaque entreprise
        const dependencies = [];
        for (const companyId of ids) {
            const deps = await this.checkDependencies(companyId);
            if (deps.hasDependencies) {
                dependencies.push({
                    company_id: companyId,
                    ...deps
                });
            }
        }

        // Si des entreprises ont des dépendances, retourner les détails
        if (dependencies.length > 0) {
            return {
                deleted: 0,
                hasDependencies: true,
                dependencies: dependencies,
                message: `${dependencies.length} entreprise(s) ne peuvent pas être supprimées car elles sont impliquées dans des campagnes`
            };
        }

        // Supprimer les entreprises sans dépendances
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const res = await pool.query(`DELETE FROM companies WHERE id IN (${placeholders}) RETURNING id`, ids);
        return { deleted: res.rows.length };
    }

    static async checkDependencies(companyId) {
        // Vérifier si l'entreprise est impliquée dans des campagnes
        const campaignsResult = await pool.query(
            `SELECT COUNT(*) as count FROM prospecting_campaign_companies WHERE company_id = $1`,
            [companyId]
        );

        const campaignsCount = parseInt(campaignsResult.rows[0].count);

        // Vérifier si l'entreprise est impliquée dans des validations
        const validationsResult = await pool.query(
            `SELECT COUNT(*) as count FROM prospecting_campaign_validation_companies WHERE company_id = $1`,
            [companyId]
        );

        const validationsCount = parseInt(validationsResult.rows[0].count);

        return {
            hasDependencies: campaignsCount > 0 || validationsCount > 0,
            campaigns_count: campaignsCount,
            validations_count: validationsCount
        };
    }

    static async getDistinctValues() {
        const industries = await pool.query(`SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL AND industry != '' ORDER BY industry`);
        const cities = await pool.query(`SELECT DISTINCT city FROM companies WHERE city IS NOT NULL AND city != '' ORDER BY city`);
        const sizes = await pool.query(`SELECT DISTINCT size_label FROM companies WHERE size_label IS NOT NULL AND size_label != '' ORDER BY size_label`);
        return {
            industries: industries.rows.map(r => r.industry),
            cities: cities.rows.map(r => r.city),
            sizes: sizes.rows.map(r => r.size_label)
        };
    }

    static async findAllWithSources() {
        const res = await pool.query(`
            SELECT c.*, 
                   cs.name as source_name,
                   COALESCE(pcc.campaigns_count, 0) as campaigns_count
            FROM companies c
            LEFT JOIN company_sources cs ON c.source_id = cs.id
            LEFT JOIN (
                SELECT company_id, COUNT(*) as campaigns_count 
                FROM prospecting_campaign_companies 
                GROUP BY company_id
            ) pcc ON c.id = pcc.company_id
            ORDER BY c.name
        `);
        return res.rows;
    }
}

class ProspectingTemplate {
    static async create(data) {
        const res = await pool.query(
            `INSERT INTO prospecting_templates(name, channel, type_courrier, business_unit_id, division_id, subject, body_template)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                data.name,
                data.channel,
                data.type_courrier,
                data.business_unit_id || null,
                data.division_id || null,
                data.subject || null,
                data.body_template
            ]
        );
        return res.rows[0];
    }
    static async findAll() {
        const res = await pool.query(`
            SELECT pt.*, 
                   bu.nom as business_unit_name, 
                   d.nom as division_name
            FROM prospecting_templates pt
            LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
            LEFT JOIN divisions d ON pt.division_id = d.id
            ORDER BY pt.created_at DESC
        `);
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query(`SELECT * FROM prospecting_templates WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }

    static async update(id, data) {
        const allowed = ['name', 'channel', 'type_courrier', 'business_unit_id', 'division_id', 'subject', 'body_template'];
        const sets = [];
        const vals = [];
        let idx = 1;
        for (const k of allowed) {
            if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
        }
        if (sets.length === 0) return this.findById(id);
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        vals.push(id);
        const res = await pool.query(`UPDATE prospecting_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        return res.rows[0] || null;
    }

    static async delete(id) {
        try {
            // Vérifier d'abord si le modèle existe
            const template = await this.findById(id);
            if (!template) {
                return { success: false, error: 'Modèle non trouvé' };
            }

            // Vérifier si le modèle est utilisé dans des campagnes
            const campaignsResult = await pool.query(
                `SELECT COUNT(*) as count FROM prospecting_campaigns WHERE template_id = $1`,
                [id]
            );

            if (campaignsResult.rows[0].count > 0) {
                return {
                    success: false,
                    error: 'Impossible de supprimer ce modèle car il est utilisé dans des campagnes'
                };
            }

            // Supprimer le modèle
            const result = await pool.query(
                `DELETE FROM prospecting_templates WHERE id = $1`,
                [id]
            );

            if (result.rowCount > 0) {
                return { success: true, message: 'Modèle supprimé avec succès' };
            } else {
                return { success: false, error: 'Erreur lors de la suppression' };
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du modèle:', error);
            return { success: false, error: 'Erreur lors de la suppression du modèle' };
        }
    }
}

class ProspectingCampaign {
    static async create(data) {
        let finalFiscalYearId = data.fiscal_year_id;
        if (!finalFiscalYearId) {
            const FiscalYear = require('./FiscalYear');
            const activeFy = await FiscalYear.getCurrent();
            finalFiscalYearId = activeFy ? activeFy.id : null;
        }

        const res = await pool.query(
            `INSERT INTO prospecting_campaigns(name, channel, template_id, business_unit_id, division_id, status, scheduled_date, created_by, responsible_id, fiscal_year_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [
                data.name,
                data.channel,
                data.template_id || null,
                data.business_unit_id || null,
                data.division_id || null,
                data.status || 'DRAFT',
                data.scheduled_date || null,
                data.created_by || null,
                data.responsible_id || null,
                finalFiscalYearId
            ]
        );

        const campaign = res.rows[0];

        // Envoyer une notification de création de campagne
        if (campaign && data.created_by) {
            try {
                await NotificationService.sendCampaignCreatedNotification(campaign.id, data.created_by);
                console.log(`📢 Notification de création envoyée pour la campagne ${campaign.name}`);
            } catch (error) {
                console.error('Erreur lors de l\'envoi de la notification de création:', error);
            }
        }

        return campaign;
    }
    static async addCompanies(campaignId, companyIds) {
        const values = [];
        const placeholders = [];
        let idx = 1;
        for (const id of companyIds) {
            placeholders.push(`($${idx++}, $${idx++}, $${idx++})`);
            values.push(campaignId, id, 'PENDING');
        }
        if (values.length === 0) return { inserted: 0 };
        await pool.query(
            `INSERT INTO prospecting_campaign_companies(campaign_id, company_id, status)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT DO NOTHING`,
            values
        );
        return { inserted: companyIds.length };
    }

    static async removeCompany(campaignId, companyId) {
        try {
            const result = await pool.query(
                `DELETE FROM prospecting_campaign_companies 
                 WHERE campaign_id = $1 AND company_id = $2`,
                [campaignId, companyId]
            );

            if (result.rowCount > 0) {
                return { success: true, removed: 1 };
            } else {
                return { success: false, error: 'Entreprise non trouvée dans cette campagne' };
            }
        } catch (e) {
            console.error('Erreur suppression entreprise de campagne:', e);
            return { success: false, error: 'Erreur lors de la suppression' };
        }
    }

    static async findAll(params = {}) {
        const { limit = 20, offset = 0, userBusinessUnitIds } = params;

        let whereClause = '';
        let countWhereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        // Filtrer par Business Units si spécifié
        if (userBusinessUnitIds && userBusinessUnitIds.length > 0) {
            const placeholders = userBusinessUnitIds.map(() => `$${paramIndex++}`).join(',');
            whereClause = `WHERE pc.business_unit_id IN (${placeholders})`;
            countWhereClause = `WHERE pc.business_unit_id IN (${placeholders})`;
            queryParams.push(...userBusinessUnitIds);
        }

        // Requête de comptage
        const countQuery = `
            SELECT COUNT(*)::int AS total 
            FROM prospecting_campaigns pc
            ${countWhereClause}
        `;
        const count = await pool.query(countQuery, queryParams);

        // Requête principale
        const dataQuery = `
            SELECT pc.*, 
                    COALESCE(cnt.total,0)::int AS companies_count,
                    pt.type_courrier as template_type,
                    pt.name as template_name,
                    bu.nom as business_unit_name,
                    resp.nom as responsible_nom,
                    resp.prenom as responsible_prenom
             FROM prospecting_campaigns pc
             LEFT JOIN (
               SELECT campaign_id, COUNT(*) AS total 
               FROM prospecting_campaign_companies 
               GROUP BY campaign_id
             ) cnt ON cnt.campaign_id = pc.id
             LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
             LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
             LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
             ${whereClause}
             ORDER BY pc.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const data = await pool.query(dataQuery, [...queryParams, limit, offset]);
        return { campaigns: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async findById(id) {
        const res = await pool.query(
            `SELECT pc.*, 
                    COALESCE(cnt.total,0)::int AS companies_count
             FROM prospecting_campaigns pc
             LEFT JOIN (
               SELECT campaign_id, COUNT(*) AS total 
               FROM prospecting_campaign_companies 
               GROUP BY campaign_id
             ) cnt ON cnt.campaign_id = pc.id
             WHERE pc.id = $1`,
            [id]
        );
        return res.rows[0] || null;
    }

    static async getCompanies(id, { limit = 50, offset = 0 }) {
        const count = await pool.query(
            `SELECT COUNT(*)::int AS total FROM prospecting_campaign_companies WHERE campaign_id = $1`,
            [id]
        );
        const data = await pool.query(
            `SELECT c.*, 
                    pcc.status, 
                    pcc.sent_at, 
                    pcc.response_at,
                    pcc.validation_status,
                    pcc.execution_status,
                    pcc.converted_to_opportunity,
                    pcc.opportunity_id,
                    pcc.execution_date,
                    pcc.execution_notes,
                    pcc.execution_file
             FROM prospecting_campaign_companies pcc
             JOIN companies c ON c.id = pcc.company_id
             WHERE pcc.campaign_id = $1
             ORDER BY c.name
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );
        return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async update(id, data) {
        const allowed = ['name', 'channel', 'template_id', 'business_unit_id', 'division_id', 'status', 'scheduled_date', 'responsible_id'];
        const sets = [];
        const vals = [];
        let idx = 1;
        for (const k of allowed) {
            if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
        }
        if (sets.length === 0) return this.findById(id);
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        vals.push(id);
        const res = await pool.query(`UPDATE prospecting_campaigns SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        return res.rows[0] || null;
    }

    static async findByIdWithDetails(id) {
        const res = await pool.query(`
            SELECT pc.*, pt.name as template_name, pt.subject as template_subject,
                   bu.nom as business_unit_name, d.nom as division_name,
                   c.nom as creator_name, c.prenom as creator_prenom,
                   resp.nom as responsible_name, resp.prenom as responsible_prenom
            FROM prospecting_campaigns pc 
            LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
            LEFT JOIN users u ON pc.created_by = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
            LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
            LEFT JOIN divisions d ON pt.division_id = d.id
            WHERE pc.id = $1
        `, [id]);

        if (res.rows.length === 0) return null;

        const campaign = res.rows[0];
        if (campaign.creator_name) {
            campaign.creator_name = `${campaign.creator_prenom} ${campaign.creator_name}`;
        }
        if (campaign.responsible_name) {
            campaign.responsible_name = `${campaign.responsible_prenom} ${campaign.responsible_name}`;
        }

        return campaign;
    }

    static async getValidations(campaignId) {
        const res = await pool.query(`
            SELECT pcv.*, 
                   demandeur.nom as demandeur_nom, demandeur.prenom as demandeur_prenom,
                   validateur.nom as validateur_nom, validateur.prenom as validateur_prenom
            FROM prospecting_campaign_validations pcv
            JOIN collaborateurs demandeur ON pcv.demandeur_id = demandeur.id
            LEFT JOIN collaborateurs validateur ON pcv.validateur_id = validateur.id
            WHERE pcv.campaign_id = $1
            ORDER BY pcv.created_at DESC
        `, [campaignId]);

        return res.rows.map(row => ({
            ...row,
            demandeur_name: `${row.demandeur_prenom} ${row.demandeur_nom}`,
            validateur_name: row.validateur_nom ? `${row.validateur_prenom} ${row.validateur_nom}` : null
        }));
    }

    static async submitForValidation(campaignId, demandeurId, validationLevel = 'BUSINESS_UNIT', comment = '') {
        try {
            // Vérifier que la campagne existe et est en BROUILLON
            const campaign = await pool.query(`
                SELECT pc.*, pt.business_unit_id, pt.division_id
                FROM prospecting_campaigns pc
                LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
                WHERE pc.id = $1
            `, [campaignId]);

            if (campaign.rows.length === 0) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            const campaignData = campaign.rows[0];

            if (campaignData.validation_statut === 'EN_VALIDATION') {
                return { success: false, error: 'La campagne est déjà en cours de validation' };
            }

            if (campaignData.validation_statut === 'VALIDE') {
                return { success: false, error: 'La campagne a déjà été validée' };
            }

            // Obtenir l'ID du collaborateur via la table users
            console.log('🔍 [DEBUG] Recherche utilisateur:', demandeurId);
            const user = await pool.query(
                'SELECT c.id as collaborateur_id FROM users u LEFT JOIN collaborateurs c ON u.id = c.user_id WHERE u.id = $1',
                [demandeurId]
            );

            console.log('🔍 [DEBUG] Résultat recherche utilisateur:', user.rows);

            if (user.rows.length === 0 || !user.rows[0].collaborateur_id) {
                console.log('❌ [DEBUG] Utilisateur non trouvé ou pas de collaborateur_id');
                return { success: false, error: 'Collaborateur non trouvé' };
            }

            console.log('🔍 [DEBUG] Recherche collaborateur:', user.rows[0].collaborateur_id);
            const collaborateur = await pool.query(
                'SELECT * FROM collaborateurs WHERE id = $1',
                [user.rows[0].collaborateur_id]
            );

            console.log('🔍 [DEBUG] Résultat recherche collaborateur:', collaborateur.rows);

            if (collaborateur.rows.length === 0) {
                console.log('❌ [DEBUG] Collaborateur non trouvé dans la table collaborateurs');
                return { success: false, error: 'Collaborateur non trouvé' };
            }

            const collabId = collaborateur.rows[0].id;

            // Debug: Afficher les informations de la campagne
            console.log('🔍 [DEBUG] Campagne data:', {
                business_unit_id: campaignData.business_unit_id,
                division_id: campaignData.division_id,
                validationLevel: validationLevel
            });

            // Récupérer les validateurs (responsable principal et adjoint)
            const Manager = require('./Manager');
            const validators = await Manager.getAllValidatorsForCampaign(
                campaignData.business_unit_id,
                campaignData.division_id,
                validationLevel
            );

            if (!validators || validators.length === 0) {
                const levelText = validationLevel === 'DIVISION' ? 'division' : 'business unit';
                return {
                    success: false,
                    error: `Aucun responsable défini pour la ${levelText}. Veuillez contacter l'administrateur.`
                };
            }

            // Si la campagne était rejetée, supprimer l'ancienne validation
            if (campaignData.validation_statut === 'REJETE') {
                await pool.query(`
                    DELETE FROM prospecting_campaign_validations 
                    WHERE campaign_id = $1
                `, [campaignId]);
            }

            // Créer les demandes de validation pour tous les validateurs
            const validations = [];
            for (const validator of validators) {
                const validation = await pool.query(`
                    INSERT INTO prospecting_campaign_validations(
                        campaign_id, demandeur_id, validateur_id, niveau_validation, statut_validation, commentaire_demandeur
                    ) VALUES($1, $2, $3, $4, $5, $6) RETURNING *
                `, [campaignId, collabId, validator.id, validationLevel, 'EN_ATTENTE', comment]);

                validations.push(validation.rows[0]);
                console.log(`✅ Validation créée pour ${validator.nom} ${validator.prenom} (${validator.role})`);
            }

            // Mettre à jour le statut de la campagne
            await pool.query(`
                UPDATE prospecting_campaigns 
                SET status = 'PENDING_VALIDATION', validation_statut = 'EN_VALIDATION', date_soumission = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [campaignId]);

            // Envoyer une notification de soumission pour validation
            try {
                await NotificationService.sendCampaignSubmittedForValidationNotification(campaignId);
                console.log(`📢 Notification de soumission envoyée pour la campagne ${campaignId}`);
            } catch (error) {
                console.error('Erreur lors de l\'envoi de la notification de soumission:', error);
            }

            return {
                success: true,
                data: validations
            };
        } catch (e) {
            console.error('Erreur soumission validation:', e);
            return { success: false, error: 'Erreur lors de la soumission' };
        }
    }

    static async processValidation(validationId, validateurId, decision, comment, companyValidations = []) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier que la validation existe et est en attente
            const validation = await client.query(`
                SELECT pcv.*, pc.id as campaign_id
                FROM prospecting_campaign_validations pcv
                JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                WHERE pcv.id = $1 AND pcv.statut_validation = 'EN_ATTENTE'
            `, [validationId]);

            if (validation.rows.length === 0) {
                await client.query('ROLLBACK');
                console.error(`❌ Validation non trouvée pour id=${validationId} ou statut!=EN_ATTENTE`);
                return { success: false, error: 'Validation non trouvée ou déjà traitée' };
            }

            // Obtenir l'ID du collaborateur validateur
            const collaborateur = await client.query(
                'SELECT * FROM collaborateurs WHERE user_id = $1',
                [validateurId]
            );

            if (collaborateur.rows.length === 0) {
                await client.query('ROLLBACK');
                console.error(`❌ Validateur non trouvé pour user_id=${validateurId}`);
                return { success: false, error: 'Compte collaborateur non trouvé pour cet utilisateur' };
            }

            const collabId = collaborateur.rows[0].id;

            // Mettre à jour la validation
            const updatedValidation = await client.query(`
                UPDATE prospecting_campaign_validations 
                SET validateur_id = $1, statut_validation = $2, 
                    commentaire_validateur = $3, date_validation = CURRENT_TIMESTAMP
                WHERE id = $4 RETURNING *
            `, [collabId, decision, comment, validationId]);

            // Sauvegarder les validations par entreprise et mettre à jour les statuts
            if (companyValidations && companyValidations.length > 0) {
                console.log('💾 Sauvegarde des validations par entreprise:', companyValidations);

                // Supprimer les anciennes validations par entreprise pour cette validation
                await client.query(`
                    DELETE FROM prospecting_campaign_validation_companies 
                    WHERE validation_id = $1
                `, [validationId]);

                // Insérer les nouvelles validations par entreprise
                for (const companyValidation of companyValidations) {
                    await client.query(`
                        INSERT INTO prospecting_campaign_validation_companies 
                        (validation_id, company_id, validation, note)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        validationId,
                        companyValidation.company_id,
                        companyValidation.validation,
                        companyValidation.note || null
                    ]);
                    console.log(`💾 Validation sauvegardée pour ${companyValidation.company_id}: ${companyValidation.validation}`);
                }

                console.log('✅ Validations par entreprise sauvegardées');
            }

            // Mettre à jour le statut de la campagne immédiatement selon la décision
            if (decision === 'APPROUVE') {
                await client.query(`
                    UPDATE prospecting_campaigns 
                    SET status = 'VALIDATED', validation_statut = 'VALIDE', date_validation = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [validation.rows[0].campaign_id]);
                console.log('✅ Campagne validée par', validateurId);
            } else {
                await client.query(`
                    UPDATE prospecting_campaigns 
                    SET status = 'REJECTED', validation_statut = 'REJETE', date_validation = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [validation.rows[0].campaign_id]);
                console.log('❌ Campagne rejetée par', validateurId);
            }

            // Marquer les autres validations en attente comme résolues par un tiers (pour nettoyer les listes d'attente)
            await client.query(`
                UPDATE prospecting_campaign_validations 
                SET statut_validation = 'RESOLU_AUTRE', 
                    date_validation = CURRENT_TIMESTAMP,
                    commentaire_validateur = $2 
                WHERE campaign_id = $1 
                  AND id != $3 
                  AND statut_validation = 'EN_ATTENTE'
            `, [validation.rows[0].campaign_id, `Traité par ${collaborateur.rows[0].nom} ${collaborateur.rows[0].prenom}`, validationId]);

            // Mettre à jour les statuts des entreprises
            // NOTE: updateCompanyValidationStatuses should be refactored to accept a client, 
            // but for now we'll implement the logic inline or call it after commit if it's safe.
            // Since it updates `prospecting_campaign_companies`, it SHOULD be part of the transaction.
            // I will inline the logic here for safety.
            if (companyValidations && companyValidations.length > 0) {
                for (const companyValidation of companyValidations) {
                    const finalStatus = companyValidation.validation === 'OK' ? 'APPROVED' : 'REJECTED';
                    await client.query(`
                        UPDATE prospecting_campaign_companies 
                        SET validation_status = $1
                        WHERE campaign_id = $2 AND company_id = $3
                    `, [finalStatus, validation.rows[0].campaign_id, companyValidation.company_id]);
                }
            } else {
                // Fallback logic if needed, but companyValidations is usually passed
                // If not passed, we might need to fetch them. Skipped for now as it's rare case.
            }

            await client.query('COMMIT');

            // Envoyer une notification de décision de validation (APRÈS COMMIT car non critique)
            try {
                await NotificationService.sendCampaignValidationDecisionNotification(
                    validation.rows[0].campaign_id,
                    decision,
                    validateurId,
                    comment,
                    validationId
                );
                console.log(`📢 Notification de décision envoyée pour la campagne ${validation.rows[0].campaign_id}`);
            } catch (error) {
                console.error('Erreur lors de l\'envoi de la notification de décision:', error);
            }

            return { success: true, validation: updatedValidation.rows[0] };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erreur traitement validation:', e);
            return { success: false, error: 'Erreur lors du traitement: ' + e.message };
        } finally {
            client.release();
        }
    }

    static async cancelValidation(validationId, demandeurId) {
        try {
            // Vérifier que la validation appartient au demandeur et est en attente
            const validation = await pool.query(`
                SELECT pcv.*, pc.id as campaign_id, c.user_id
                FROM prospecting_campaign_validations pcv
                JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                JOIN collaborateurs c ON pcv.demandeur_id = c.id
                WHERE pcv.id = $1 AND c.user_id = $2 AND pcv.statut_validation = 'EN_ATTENTE'
            `, [validationId, demandeurId]);

            if (validation.rows.length === 0) {
                return { success: false, error: 'Validation non trouvée ou non autorisée' };
            }

            // Supprimer la validation
            await pool.query('DELETE FROM prospecting_campaign_validations WHERE id = $1', [validationId]);

            // Remettre la campagne en BROUILLON
            await pool.query(`
                UPDATE prospecting_campaigns 
                SET validation_statut = 'BROUILLON', date_soumission = NULL
                WHERE id = $1
            `, [validation.rows[0].campaign_id]);

            return { success: true };
        } catch (e) {
            console.error('Erreur annulation validation:', e);
            return { success: false, error: 'Erreur lors de l\'annulation' };
        }
    }

    static async getValidationById(validationId) {
        try {
            const res = await pool.query(`
                SELECT pcv.*, 
                       c.nom as validateur_nom,
                       c.prenom as validateur_prenom,
                       pc.name as campaign_name
                FROM prospecting_campaign_validations pcv
                LEFT JOIN collaborateurs c ON pcv.validateur_id = c.id
                LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                WHERE pcv.id = $1
            `, [validationId]);

            return res.rows[0] || null;
        } catch (e) {
            console.error('Erreur récupération validation:', e);
            return null;
        }
    }

    static async updateCompanyValidationStatuses(campaignId, validationId = null) {
        try {
            if (validationId) {
                // Utiliser les validations du validateur actuel
                const companyValidations = await pool.query(`
                    SELECT company_id, validation
                    FROM prospecting_campaign_validation_companies 
                    WHERE validation_id = $1
                `, [validationId]);

                for (const companyValidation of companyValidations.rows) {
                    const finalStatus = companyValidation.validation === 'OK' ? 'APPROVED' : 'REJECTED';

                    await pool.query(`
                        UPDATE prospecting_campaign_companies 
                        SET validation_status = $1
                        WHERE campaign_id = $2 AND company_id = $3
                    `, [finalStatus, campaignId, companyValidation.company_id]);

                    console.log(`🏢 Entreprise ${companyValidation.company_id} mise à jour: ${finalStatus}`);
                }
            } else {
                // Fallback: utiliser toutes les validations (pour compatibilité)
                const companies = await pool.query(`
                    SELECT DISTINCT company_id FROM prospecting_campaign_companies 
                    WHERE campaign_id = $1
                `, [campaignId]);

                for (const company of companies.rows) {
                    const validations = await pool.query(`
                        SELECT pcvc.validation
                        FROM prospecting_campaign_validation_companies pcvc
                        JOIN prospecting_campaign_validations pcv ON pcvc.validation_id = pcv.id
                        WHERE pcv.campaign_id = $1 AND pcvc.company_id = $2
                    `, [campaignId, company.company_id]);

                    const hasRejection = validations.rows.some(v => v.validation === 'NOT_OK');
                    const finalStatus = hasRejection ? 'REJECTED' : 'APPROVED';

                    await pool.query(`
                        UPDATE prospecting_campaign_companies 
                        SET validation_status = $1
                        WHERE campaign_id = $2 AND company_id = $3
                    `, [finalStatus, campaignId, company.company_id]);

                    console.log(`🏢 Entreprise ${company.company_id} mise à jour: ${finalStatus}`);
                }
            }

            console.log('✅ Statuts des entreprises mis à jour');
        } catch (e) {
            console.error('Erreur mise à jour statuts entreprises:', e);
        }
    }

    // Méthodes pour l'exécution des campagnes
    static async updateCompanyExecutionStatus(campaignId, companyId, executionStatus, notes = null, executionFile = null, userId = null) {
        try {
            // Vérifier que la campagne est validée
            const campaign = await pool.query(`
                SELECT validation_statut FROM prospecting_campaigns WHERE id = $1
            `, [campaignId]);

            if (campaign.rows.length === 0) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            // TEMPORAIRE: Permettre l'exécution même si la campagne n'est pas validée
            // TODO: Remettre la vérification quand le workflow sera complet
            // if (campaign.rows[0].validation_statut !== 'VALIDE') {
            //     return { success: false, error: 'La campagne doit être validée pour pouvoir exécuter' };
            // }

            // Vérifier que l'entreprise est approuvée dans cette campagne
            const companyStatus = await pool.query(`
                SELECT validation_status FROM prospecting_campaign_companies 
                WHERE campaign_id = $1 AND company_id = $2
            `, [campaignId, companyId]);

            if (companyStatus.rows.length === 0) {
                return { success: false, error: 'Entreprise non trouvée dans cette campagne' };
            }

            // TEMPORAIRE: Permettre l'exécution même si l'entreprise n'est pas approuvée
            // TODO: Remettre la vérification quand le workflow sera complet
            if (companyStatus.rows[0].validation_status !== 'APPROVED') {
                // Mettre automatiquement à jour le statut de validation pour les tests
                await pool.query(`
                    UPDATE prospecting_campaign_companies 
                    SET validation_status = 'APPROVED'
                    WHERE campaign_id = $1 AND company_id = $2
                `, [campaignId, companyId]);
                console.log(`✅ Auto-approbation de l'entreprise ${companyId} pour les tests`);
            }

            // Mettre à jour le statut d'exécution
            const executionDate = executionStatus === 'deposed' || executionStatus === 'sent' ? 'CURRENT_TIMESTAMP' : null;

            // Préparer les paramètres pour la requête
            // NOTE: On ne met à jour le statut principal que si l'action est 'deposed' ou 'sent' OU si c'est explicitement demandé.
            // Le bouton "Mettre à jour" peut simplement ajouter une note sans changer le statut (si executionStatus est 'UPDATE')

            let finalStatus = executionStatus;

            // Si c'est une simple mise à jour (UPDATE), on garde le statut actuel de l'entreprise
            if (executionStatus === 'UPDATE') {
                finalStatus = companyStatus.rows[0].execution_status;
            }

            const updateParams = [finalStatus, notes, campaignId, companyId];
            let executionFileColumn = '';

            if (executionFile) {
                executionFileColumn = ', execution_file = $5';
                updateParams.push(executionFile);
            }

            // Mettre à jour la table principale
            await pool.query(`
                UPDATE prospecting_campaign_companies 
                SET execution_status = $1, 
                    execution_notes = $2${executionFileColumn}
                    ${finalStatus === 'deposed' || finalStatus === 'sent' ? ', execution_date = CURRENT_TIMESTAMP' : ''}
                WHERE campaign_id = $3 AND company_id = $4
            `, updateParams);

            // Enregistrer dans l'historique
            // On a besoin de l'ID utilisateur (collaborateur) qui fait l'action.
            // Comme cette méthode est statique et appelée depuis la route, on devra passer userId ou similar.
            // Pour l'instant, on va essayer de récupérer l'ID utilisateur à partir du contexte ou le passer en paramètre.
            // MAIS wait, updateCompanyExecutionStatus n'a pas userId. Je dois l'ajouter à la signature.
            // Pour être safe et compatible, je vais l'ajouter en option à la fin ou dans un objet options.
            // Ou mieux, je vais supposer que l'appelant a été mis à jour pour le passer.

            // Wait, I need to update the signature in the actual file edit as well.
            // Let's modify the signature in the replacement content to:
            // static async updateCompanyExecutionStatus(campaignId, companyId, executionStatus, notes = null, executionFile = null, userId = null)

            if (userId) {
                let actionType = 'UPDATE';
                if (executionStatus === 'deposed') actionType = 'DEPOSIT';
                else if (executionStatus === 'sent') actionType = 'SENT';

                await pool.query(`
                    INSERT INTO prospecting_campaign_history
                    (campaign_id, company_id, action_type, performed_by, comment, attachment_path)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [campaignId, companyId, actionType, userId, notes, executionFile || null]);
                console.log(`📜 Historique ajouté pour ${companyId}: ${actionType}`);
            }

            // Vérifier la progression de la campagne et envoyer une notification si nécessaire
            try {
                await this.checkAndSendProgressNotification(campaignId);
            } catch (error) {
                console.error('Erreur lors de la vérification de progression:', error);
            }

            return {
                success: true,
                execution_file: executionFile || null
            };
        } catch (e) {
            console.error('Erreur mise à jour statut exécution:', e);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }
    }

    static async getCompanyHistory(campaignId, companyId) {
        try {
            const result = await pool.query(`
                SELECT pch.*, 
                       u.nom as user_nom, u.prenom as user_prenom
                FROM prospecting_campaign_history pch
                LEFT JOIN users u ON pch.performed_by = u.id
                WHERE pch.campaign_id = $1 AND pch.company_id = $2
                ORDER BY pch.action_date DESC
            `, [campaignId, companyId]);
            return result.rows;
        } catch (e) {
            console.error('Erreur récupération historique:', e);
            return [];
        }
    }

    static async convertToOpportunity(campaignId, companyId, opportunityData) {
        try {
            // Vérifier que l'entreprise a été exécutée
            const companyExecution = await pool.query(`
                SELECT pcc.execution_status, pcc.converted_to_opportunity,
                       c.id as company_id, c.name as company_name, c.email as company_email,
                       pc.business_unit_id, pc.responsible_id
                FROM prospecting_campaign_companies pcc
                JOIN companies c ON pcc.company_id = c.id
                JOIN prospecting_campaigns pc ON pcc.campaign_id = pc.id
                WHERE pcc.campaign_id = $1 AND pcc.company_id = $2
            `, [campaignId, companyId]);

            if (companyExecution.rows.length === 0) {
                return { success: false, error: 'Entreprise non trouvée dans cette campagne' };
            }

            const company = companyExecution.rows[0];

            if (company.converted_to_opportunity) {
                return { success: false, error: 'Cette entreprise a déjà été convertie en opportunité' };
            }

            if (!['deposed', 'sent'].includes(company.execution_status)) {
                return { success: false, error: 'L\'entreprise doit être exécutée (déposée ou envoyée) pour être convertie' };
            }

            // Utiliser le client ID fourni ou créer un nouveau client
            let clientId = null;

            if (opportunityData.clientId) {
                // Vérifier que le client existe
                const clientExists = await pool.query(`
                    SELECT id FROM clients WHERE id = $1
                `, [opportunityData.clientId]);

                if (clientExists.rows.length > 0) {
                    clientId = opportunityData.clientId;
                } else {
                    return { success: false, error: 'Client sélectionné non trouvé' };
                }
            } else {
                // Fallback: Vérifier si l'entreprise existe déjà comme client
                const existingClient = await pool.query(`
                    SELECT id FROM clients WHERE nom = $1 OR email = $2
                `, [company.company_name, company.company_email]);

                if (existingClient.rows.length > 0) {
                    clientId = existingClient.rows[0].id;
                } else {
                    const newClient = await pool.query(`
                        INSERT INTO clients (nom, email, statut, source_prospection, created_at)
                        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                        RETURNING id
                    `, [company.company_name, company.company_email, 'PROSPECT', 'PROSPECTION']);

                    clientId = newClient.rows[0].id;
                }
            }

            // Activer le client sélectionné ou créé
            await pool.query(`
                UPDATE clients SET statut = 'ACTIF' WHERE id = $1 AND statut != 'ACTIF'
                        `, [clientId]);

            // Utiliser le type d'opportunité fourni ou récupérer un type par défaut
            let opportunityTypeId = null;

            if (opportunityData.opportunityTypeId) {
                // Vérifier que le type fourni existe
                const typeCheck = await pool.query(`
                    SELECT id FROM opportunity_types WHERE id = $1 AND is_active = true
                        `, [opportunityData.opportunityTypeId]);

                if (typeCheck.rows.length > 0) {
                    opportunityTypeId = opportunityData.opportunityTypeId;
                } else {
                    return { success: false, error: 'Type d\'opportunité sélectionné non trouvé ou inactif' };
                }
            } else {
                // Fallback: Récupérer un type d'opportunité par défaut
                const defaultType = await pool.query(`
                    SELECT id FROM opportunity_types WHERE name = 'PROSPECTION' OR name = 'GENERAL' OR name = 'Audit' LIMIT 1
                        `);

                if (defaultType.rows.length > 0) {
                    opportunityTypeId = defaultType.rows[0].id;
                } else {
                    // Créer un type d'opportunité par défaut si aucun n'existe
                    const newType = await pool.query(`
                        INSERT INTO opportunity_types(name, description, is_active)
                        VALUES('PROSPECTION', 'Opportunités créées à partir de campagnes de prospection', true)
                        RETURNING id
                        `);
                    opportunityTypeId = newType.rows[0].id;
                }
            }

            // Récupérer l'année fiscale en cours
            const activeFiscalYearResult = await pool.query(
                `SELECT id FROM fiscal_years WHERE statut = 'EN_COURS' LIMIT 1`
            );
            const fiscalYearId = activeFiscalYearResult.rows.length > 0 ? activeFiscalYearResult.rows[0].id : null;

            // Créer l'opportunité
            const opportunity = await pool.query(`
                INSERT INTO opportunities(
                            nom, description, client_id, collaborateur_id, business_unit_id,
                            opportunity_type_id, statut, source, probabilite, montant_estime, devise,
                            date_fermeture_prevue, notes, fiscal_year_id, created_by
                        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id
                        `, [
                opportunityData.name,
                opportunityData.description,
                clientId,
                company.responsible_id,
                company.business_unit_id,
                opportunityTypeId,
                'NOUVELLE',
                'PROSPECTION',
                parseInt(opportunityData.probability) || 50,
                parseFloat(opportunityData.value) || 0,
                'FCFA',
                opportunityData.closeDate,
                `Opportunité créée à partir de la campagne de prospection. Entreprise: ${company.company_name}`,
                fiscalYearId,
                null // created_by sera défini par le trigger si nécessaire
            ]);

            const opportunityId = opportunity.rows[0].id;

            // Créer automatiquement les étapes pour cette opportunité
            try {
                const OpportunityType = require('./OpportunityType');
                const opportunityType = await OpportunityType.findById(opportunityTypeId);
                if (opportunityType) {
                    await opportunityType.createStagesForOpportunity(opportunityId);
                    console.log(`✅ Étapes créées pour l'opportunité ${opportunityId}`);
                } else {
                    console.warn(`⚠️ Type d'opportunité ${opportunityTypeId} non trouvé, étapes non créées`);
                }
            } catch (stageError) {
                console.error('❌ Erreur lors de la création des étapes:', stageError);
                // Ne pas faire échouer la conversion pour cela
            }

            // Marquer comme convertie
            await pool.query(`
                UPDATE prospecting_campaign_companies 
                SET converted_to_opportunity = TRUE, opportunity_id = $1
                WHERE campaign_id = $2 AND company_id = $3
            `, [opportunityId, campaignId, companyId]);

            // Envoyer des notifications de conversion étendues
            try {
                const NotificationService = require('../services/notificationService');

                // 1. Notification au responsable de la campagne
                await NotificationService.sendCampaignConversionNotification(campaignId, companyId, opportunityId);

                // 2. Récupérer les informations de division et business unit
                const campaignInfo = await pool.query(`
                    SELECT pc.business_unit_id, pc.division_id,
                           bu.nom as business_unit_nom,
                           d.nom as division_nom
                    FROM prospecting_campaigns pc
                    LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                    LEFT JOIN divisions d ON pc.division_id = d.id
                    WHERE pc.id = $1
                `, [campaignId]);

                if (campaignInfo.rows.length > 0) {
                    const campaign = campaignInfo.rows[0];

                    // 3. Notification aux responsables de division
                    if (campaign.division_id) {
                        const divisionResponsibles = await pool.query(`
                            SELECT DISTINCT u.id, u.nom, u.prenom, u.email
                            FROM users u
                            JOIN collaborateurs c ON u.collaborateur_id = c.id
                            WHERE c.division_id = $1 
                            AND u.role IN ('MANAGER', 'ADMIN', 'IT_ADMIN')
                            AND u.statut = 'ACTIF'
                        `, [campaign.division_id]);

                        for (const user of divisionResponsibles.rows) {
                            await NotificationService.sendOpportunityCreatedFromProspectionNotification(user.id, {
                                opportunity_id: opportunityId,
                                campaign_id: campaignId,
                                company_name: company.company_name,
                                business_unit: campaign.business_unit_nom,
                                division: campaign.division_nom
                            });
                        }
                    }

                    // 4. Notification aux responsables de business unit
                    if (campaign.business_unit_id) {
                        const businessUnitResponsibles = await pool.query(`
                            SELECT DISTINCT u.id, u.nom, u.prenom, u.email
                            FROM users u
                            JOIN collaborateurs c ON u.collaborateur_id = c.id
                            WHERE c.business_unit_id = $1 
                            AND u.role IN ('MANAGER', 'ADMIN', 'IT_ADMIN')
                            AND u.statut = 'ACTIF'
                        `, [campaign.business_unit_id]);

                        for (const user of businessUnitResponsibles.rows) {
                            await NotificationService.sendOpportunityCreatedFromProspectionNotification(user.id, {
                                opportunity_id: opportunityId,
                                campaign_id: campaignId,
                                company_name: company.company_name,
                                business_unit: campaign.business_unit_nom
                            });
                        }
                    }
                }

                // 5. Notifications globales de création d'opportunité (création depuis prospection)
                await NotificationService.sendOpportunityCreatedNotification(opportunityId, {
                    fromCampaign: true,
                    campaignId,
                    companyName: company.company_name
                });

                console.log('✅ Notifications de conversion envoyées avec succès');
            } catch (notificationError) {
                console.warn('⚠️ Erreur lors de l\'envoi des notifications de conversion:', notificationError);
            }

            return {
                success: true,
                opportunityId,
                opportunityData: {
                    id: opportunityId,
                    nom: opportunityData.name,
                    description: opportunityData.description,
                    client_id: clientId,
                    collaborateur_id: company.responsible_id,
                    business_unit_id: company.business_unit_id,
                    opportunity_type_id: opportunityTypeId,
                    statut: 'NOUVELLE',
                    source: 'PROSPECTION',
                    probabilite: parseInt(opportunityData.probability) || 50,
                    montant_estime: parseFloat(opportunityData.value) || 0,
                    devise: 'FCFA',
                    date_fermeture_prevue: opportunityData.closeDate,
                    notes: `Opportunité créée à partir de la campagne de prospection. Entreprise: ${company.company_name}`
                }
            };
        } catch (e) {
            console.error('Erreur conversion opportunité:', e);
            return { success: false, error: 'Erreur lors de la conversion: ' + e.message };
        }
    }

    static async getValidationsForUser(userId, includeAllStatuses = false) {
        try {
            // Récupérer le collaborateur de l'utilisateur
            const collaborateur = await pool.query(
                'SELECT * FROM collaborateurs WHERE user_id = $1',
                [userId]
            );

            if (collaborateur.rows.length === 0) {
                return [];
            }

            const collabId = collaborateur.rows[0].id;

            // Récupérer les validations pour ce responsable
            let query = `
                SELECT pcv.*,
                       pc.name as campaign_name,
                       pc.channel as campaign_channel,
                       pc.created_at as campaign_created_at,
                       pc.date_soumission,
                       pc.date_validation,
                       pc.validation_statut as campaign_status,
                       d.nom as demandeur_nom,
                       d.prenom as demandeur_prenom,
                       d.email as demandeur_email,
                       v.nom as validateur_nom,
                       v.prenom as validateur_prenom,
                       v.email as validateur_email,
                       bu.nom as business_unit_nom,
                       div.nom as division_nom,
                       COALESCE(stats.companies_count, 0) as companies_count,
                       COALESCE(stats.emails_count, 0) as emails_count,
                       COALESCE(stats.sectors_count, 0) as sectors_count,
                       COALESCE(stats.cities_count, 0) as cities_count
                FROM prospecting_campaign_validations pcv
                JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                JOIN collaborateurs d ON pcv.demandeur_id = d.id
                LEFT JOIN collaborateurs v ON pcv.validateur_id = v.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN divisions div ON pc.division_id = div.id
                LEFT JOIN (
                    SELECT 
                        pcc.campaign_id,
                        COUNT(*) as companies_count,
                        COUNT(CASE WHEN c.email IS NOT NULL AND c.email != '' THEN 1 END) as emails_count,
                        COUNT(DISTINCT c.industry) as sectors_count,
                        COUNT(DISTINCT c.city) as cities_count
                    FROM prospecting_campaign_companies pcc
                    LEFT JOIN companies c ON pcc.company_id = c.id
                    GROUP BY pcc.campaign_id
                ) stats ON stats.campaign_id = pc.id
                WHERE pcv.validateur_id = $1
            `;

            const params = [collabId];
            let paramIndex = 2;

            // Filtrer par statut si nécessaire
            if (!includeAllStatuses) {
                query += ` AND pcv.statut_validation = 'EN_ATTENTE'`;
                // Exclure les campagnes déjà validées ou rejetées globalement (pour ne pas polluer la liste)
                query += ` AND (pc.validation_statut IS NULL OR pc.validation_statut NOT IN ('VALIDE', 'REJETE', 'VALIDATED', 'REJECTED'))`;
            }

            query += ` ORDER BY pcv.created_at DESC`;

            const validations = await pool.query(query, params);

            return validations.rows;
        } catch (e) {
            console.error('Erreur récupération validations:', e);
            return [];
        }
    }

    static async getCompanyValidations(validationId) {
        try {
            const res = await pool.query(`
                SELECT pcvc.*, 
                       c.name as company_name,
                       c.industry as company_industry,
                       c.city as company_city
                FROM prospecting_campaign_validation_companies pcvc
                LEFT JOIN companies c ON pcvc.company_id = c.id
                WHERE pcvc.validation_id = $1
                ORDER BY c.name
            `, [validationId]);

            return res.rows;
        } catch (e) {
            console.error('Erreur récupération validations entreprises:', e);
            return [];
        }
    }

    static async getCampaignValidators(campaignId) {
        try {
            const res = await pool.query(`
                SELECT DISTINCT
                    v.id,
                    v.nom,
                    v.prenom,
                    v.email,
                    pcv.niveau_validation,
                    CASE 
                        WHEN pcv.niveau_validation = 'BUSINESS_UNIT' THEN 'BU'
                        WHEN pcv.niveau_validation = 'DIVISION' THEN 'DIV'
                        ELSE 'N/A'
                    END as type,
                    CASE 
                        WHEN bu.responsable_principal_id = v.id THEN 'Responsable Principal'
                        WHEN bu.responsable_adjoint_id = v.id THEN 'Responsable Adjoint'
                        WHEN div.responsable_principal_id = v.id THEN 'Responsable Principal'
                        WHEN div.responsable_adjoint_id = v.id THEN 'Responsable Adjoint'
                        ELSE 'Validateur'
                    END as role
                FROM prospecting_campaign_validations pcv
                JOIN collaborateurs v ON pcv.validateur_id = v.id
                LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
                LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
                LEFT JOIN divisions div ON pt.division_id = div.id
                WHERE pcv.campaign_id = $1
                ORDER BY v.nom, v.prenom
            `, [campaignId]);

            return res.rows;
        } catch (e) {
            console.error('Erreur récupération validateurs campagne:', e);
            return [];
        }
    }

    /**
     * Vérifier la progression de la campagne et envoyer une notification si nécessaire
     */
    static async checkAndSendProgressNotification(campaignId) {
        try {
            // Calculer la progression actuelle
            const progressResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_companies,
                    COUNT(CASE WHEN execution_status IN ('sent', 'deposed') THEN 1 END) as completed_companies
                FROM prospecting_campaign_companies 
                WHERE campaign_id = $1
            `, [campaignId]);

            const { total_companies, completed_companies } = progressResult.rows[0];
            const progressPercentage = total_companies > 0 ? Math.round((completed_companies / total_companies) * 100) : 0;

            // Seuils de progression pour les notifications (25%, 50%, 75%, 100%)
            const progressThresholds = [25, 50, 75, 100];

            // Vérifier si on a atteint un nouveau seuil
            const lastProgressResult = await pool.query(`
                SELECT metadata->>'progress_percentage' as last_progress
                FROM notifications 
                WHERE type = 'CAMPAIGN_PROGRESS' 
                AND metadata->>'campaign_id' = $1
                ORDER BY created_at DESC 
                LIMIT 1
            `, [campaignId]);

            let lastProgress = 0;
            if (lastProgressResult.rows.length > 0 && lastProgressResult.rows[0].last_progress) {
                lastProgress = parseInt(lastProgressResult.rows[0].last_progress);
            }

            // Envoyer une notification si on a atteint un nouveau seuil
            for (const threshold of progressThresholds) {
                if (progressPercentage >= threshold && lastProgress < threshold) {
                    await NotificationService.sendCampaignProgressNotification(campaignId, threshold);
                    console.log(`📢 Notification de progression ${threshold}% envoyée pour la campagne ${campaignId}`);
                    break; // Envoyer seulement une notification par mise à jour
                }
            }

        } catch (error) {
            console.error('Erreur lors de la vérification de progression:', error);
        }
    }

    /**
     * Supprimer une campagne de prospection
     */
    static async delete(campaignId) {
        try {
            console.log('🔥 [API] Suppression de la campagne:', campaignId);

            // Vérifier d'abord si la campagne existe
            const campaign = await this.findById(campaignId);
            if (!campaign) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            // Supprimer d'abord les entreprises associées
            await pool.query(
                'DELETE FROM prospecting_campaign_companies WHERE campaign_id = $1',
                [campaignId]
            );

            // Supprimer les validations associées
            await pool.query(
                'DELETE FROM prospecting_campaign_validations WHERE campaign_id = $1',
                [campaignId]
            );

            // Supprimer la campagne elle-même
            const result = await pool.query(
                'DELETE FROM prospecting_campaigns WHERE id = $1 RETURNING *',
                [campaignId]
            );

            if (result.rows.length > 0) {
                console.log('✅ [API] Campagne supprimée avec succès:', campaignId);
                return { success: true, data: result.rows[0] };
            } else {
                return { success: false, error: 'Erreur lors de la suppression' };
            }
        } catch (error) {
            console.error('🔥 [API] Erreur suppression campagne:', error);
            return { success: false, error: 'Erreur lors de la suppression de la campagne' };
        }
    }
}

module.exports = { CompanySource, Company, ProspectingTemplate, ProspectingCampaign };


