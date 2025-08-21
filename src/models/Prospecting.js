const { pool } = require('../utils/database');

class CompanySource {
    static async create({ name, description }) {
        const res = await pool.query(
            `INSERT INTO company_sources(name, description) VALUES ($1,$2) RETURNING *`,
            [name, description || null]
        );
        return res.rows[0];
    }
    static async findAll() {
        const res = await pool.query(`SELECT * FROM company_sources ORDER BY name`);
        return res.rows;
    }
}

class Company {
    static async bulkInsertFromRows(sourceId, rows) {
        let inserted = 0;
        for (const r of rows) {
            await pool.query(
                `INSERT INTO companies(source_id, name, industry, email, phone, website, country, city, address, siret, size_label)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT DO NOTHING`,
                [
                    sourceId,
                    r.name,
                    r.industry || null,
                    r.email || null,
                    r.phone || null,
                    r.website || null,
                    r.country || null,
                    r.city || null,
                    r.address || null,
                    r.siret || null,
                    r.size_label || null
                ]
            );
            inserted++;
        }
        return { inserted };
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
            conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR website ILIKE $${idx})`);
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
        
        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM companies ${where}`, params);
        const data = await pool.query(
            `SELECT * FROM companies ${where} ORDER BY ${sortColumn} ${sortDirection} LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, offset]
        );
        return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async findById(id) {
        const res = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }

    static async update(id, data) {
        const allowed = ['name','industry','email','phone','website','country','city','address','siret','size_label'];
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
        const res = await pool.query(`DELETE FROM companies WHERE id = $1 RETURNING *`, [id]);
        return res.rows[0] || null;
    }

    static async bulkDelete(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const res = await pool.query(`DELETE FROM companies WHERE id IN (${placeholders}) RETURNING id`, ids);
        return { deleted: res.rows.length };
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
        const allowed = ['name','channel','type_courrier','business_unit_id','division_id','subject','body_template'];
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
}

class ProspectingCampaign {
    static async create(data) {
        const res = await pool.query(
            `INSERT INTO prospecting_campaigns(name, channel, template_id, business_unit_id, division_id, status, scheduled_date, created_by, responsible_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [
                data.name,
                data.channel,
                data.template_id || null,
                data.business_unit_id || null,
                data.division_id || null,
                data.status || 'DRAFT',
                data.scheduled_date || null,
                data.created_by || null,
                data.responsible_id || null
            ]
        );
        return res.rows[0];
    }
    static async addCompanies(campaignId, companyIds) {
        const values = [];
        const placeholders = [];
        let idx = 1;
        for (const id of companyIds) {
            placeholders.push(`($${idx++}, $${idx++})`);
            values.push(campaignId, id);
        }
        if (values.length === 0) return { inserted: 0 };
        await pool.query(
            `INSERT INTO prospecting_campaign_companies(campaign_id, company_id)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT DO NOTHING`,
            values
        );
        return { inserted: companyIds.length };
    }

    static async findAll(params = {}) {
        const { limit = 20, offset = 0 } = params;
        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM prospecting_campaigns`);
        const data = await pool.query(
            `SELECT pc.*, 
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
             LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
             LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
             ORDER BY pc.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
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
            `SELECT c.*, pcc.status, pcc.sent_at, pcc.response_at
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
        const allowed = ['name','channel','template_id','business_unit_id','division_id','status','scheduled_date','responsible_id'];
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
                   c.nom as creator_name, c.prenom as creator_prenom
            FROM prospecting_campaigns pc 
            LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
            LEFT JOIN collaborateurs c ON pc.created_by = c.id
            LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
            LEFT JOIN divisions d ON pt.division_id = d.id
            WHERE pc.id = $1
        `, [id]);
        
        if (res.rows.length === 0) return null;
        
        const campaign = res.rows[0];
        if (campaign.creator_name) {
            campaign.creator_name = `${campaign.creator_prenom} ${campaign.creator_name}`;
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

    static async submitForValidation(campaignId, demandeurId, validationLevel, comment) {
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
            
            if (campaignData.validation_statut !== 'BROUILLON' && campaignData.validation_statut !== null) {
                return { success: false, error: 'La campagne a déjà été soumise pour validation' };
            }

            // Obtenir l'ID du collaborateur
            const collaborateur = await pool.query(
                'SELECT * FROM collaborateurs WHERE user_id = $1',
                [demandeurId]
            );
            
            if (collaborateur.rows.length === 0) {
                return { success: false, error: 'Collaborateur non trouvé' };
            }
            
            const collabId = collaborateur.rows[0].id;

            // Vérifier qu'un responsable est défini pour le niveau demandé
            const Manager = require('./Manager');
            const validator = await Manager.getValidatorForCampaign(
                campaignData.business_unit_id || campaignData.business_unit_id,
                campaignData.division_id || campaignData.division_id,
                validationLevel
            );
            
            if (!validator) {
                const levelText = validationLevel === 'DIVISION' ? 'division' : 'business unit';
                return { 
                    success: false, 
                    error: `Aucun responsable défini pour la ${levelText}. Veuillez contacter l'administrateur.` 
                };
            }

            // Créer la demande de validation
            const validation = await pool.query(`
                INSERT INTO prospecting_campaign_validations(
                    campaign_id, demandeur_id, validateur_id, niveau_validation, commentaire_demandeur
                ) VALUES($1, $2, $3, $4, $5) RETURNING *
            `, [campaignId, collabId, validator.id, validationLevel, comment]);

            // Mettre à jour le statut de la campagne
            await pool.query(`
                UPDATE prospecting_campaigns 
                SET validation_statut = 'EN_VALIDATION', date_soumission = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [campaignId]);

            return { 
                success: true, 
                validation: validation.rows[0],
                validator: validator
            };
        } catch (e) {
            console.error('Erreur soumission validation:', e);
            return { success: false, error: 'Erreur lors de la soumission' };
        }
    }

    static async processValidation(validationId, validateurId, decision, comment) {
        try {
            // Vérifier que la validation existe et est en attente
            const validation = await pool.query(`
                SELECT pcv.*, pc.id as campaign_id
                FROM prospecting_campaign_validations pcv
                JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                WHERE pcv.id = $1 AND pcv.statut_validation = 'EN_ATTENTE'
            `, [validationId]);
            
            if (validation.rows.length === 0) {
                return { success: false, error: 'Validation non trouvée ou déjà traitée' };
            }

            // Obtenir l'ID du collaborateur validateur
            const collaborateur = await pool.query(
                'SELECT * FROM collaborateurs WHERE user_id = $1',
                [validateurId]
            );
            
            if (collaborateur.rows.length === 0) {
                return { success: false, error: 'Validateur non trouvé' };
            }
            
            const collabId = collaborateur.rows[0].id;

            // Mettre à jour la validation
            const updatedValidation = await pool.query(`
                UPDATE prospecting_campaign_validations 
                SET validateur_id = $1, statut_validation = $2, 
                    commentaire_validateur = $3, date_validation = CURRENT_TIMESTAMP
                WHERE id = $4 RETURNING *
            `, [collabId, decision, comment, validationId]);

            // Mettre à jour le statut de la campagne
            const campaignStatus = decision === 'APPROUVE' ? 'VALIDE' : 'REJETE';
            await pool.query(`
                UPDATE prospecting_campaigns 
                SET validation_statut = $1, date_validation = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [campaignStatus, validation.rows[0].campaign_id]);

            return { success: true, validation: updatedValidation.rows[0] };
        } catch (e) {
            console.error('Erreur traitement validation:', e);
            return { success: false, error: 'Erreur lors du traitement' };
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
}

module.exports = { CompanySource, Company, ProspectingTemplate, ProspectingCampaign };


