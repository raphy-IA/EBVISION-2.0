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
            `SELECT c.*, 
                    pcc.status, 
                    pcc.sent_at, 
                    pcc.response_at,
                    pcc.validation_status,
                    pcc.execution_status,
                    pcc.converted_to_opportunity,
                    pcc.opportunity_id,
                    pcc.execution_date,
                    pcc.execution_notes
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
                'SELECT collaborateur_id FROM users WHERE id = $1',
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

            // Vérifier qu'un responsable est défini pour le niveau demandé
            const Manager = require('./Manager');
            const validator = await Manager.getValidatorForCampaign(
                campaignData.business_unit_id,
                campaignData.division_id,
                validationLevel
            );
            
            if (!validator) {
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

    static async processValidation(validationId, validateurId, decision, comment, companyValidations = []) {
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

            // Sauvegarder les validations par entreprise et mettre à jour les statuts
            if (companyValidations && companyValidations.length > 0) {
                console.log('💾 Sauvegarde des validations par entreprise:', companyValidations);
                
                // Supprimer les anciennes validations par entreprise pour cette validation
                await pool.query(`
                    DELETE FROM prospecting_campaign_validation_companies 
                    WHERE validation_id = $1
                `, [validationId]);
                
                // Insérer les nouvelles validations par entreprise et mettre à jour les statuts
                for (const companyValidation of companyValidations) {
                    // Sauvegarder la validation dans la table de validation
                    await pool.query(`
                        INSERT INTO prospecting_campaign_validation_companies 
                        (validation_id, company_id, validation, note)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        validationId,
                        companyValidation.company_id,
                        companyValidation.validation,
                        companyValidation.note || null
                    ]);
                    
                    // Mettre à jour le statut de validation de l'entreprise dans la campagne
                    const validationStatus = companyValidation.validation === 'OK' ? 'APPROVED' : 'REJECTED';
                    await pool.query(`
                        UPDATE prospecting_campaign_companies 
                        SET validation_status = $1
                        WHERE campaign_id = $2 AND company_id = $3
                    `, [validationStatus, validation.rows[0].campaign_id, companyValidation.company_id]);
                }
                
                console.log('✅ Validations par entreprise sauvegardées et statuts mis à jour');
            }

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

    // Méthodes pour l'exécution des campagnes
    static async updateCompanyExecutionStatus(campaignId, companyId, executionStatus, notes = null) {
        try {
            // Vérifier que la campagne est validée
            const campaign = await pool.query(`
                SELECT validation_statut FROM prospecting_campaigns WHERE id = $1
            `, [campaignId]);
            
            if (campaign.rows.length === 0) {
                return { success: false, error: 'Campagne non trouvée' };
            }
            
            if (campaign.rows[0].validation_statut !== 'VALIDE') {
                return { success: false, error: 'La campagne doit être validée pour pouvoir exécuter' };
            }
            
            // Vérifier que l'entreprise est approuvée dans cette campagne
            const companyStatus = await pool.query(`
                SELECT validation_status FROM prospecting_campaign_companies 
                WHERE campaign_id = $1 AND company_id = $2
            `, [campaignId, companyId]);
            
            if (companyStatus.rows.length === 0) {
                return { success: false, error: 'Entreprise non trouvée dans cette campagne' };
            }
            
            if (companyStatus.rows[0].validation_status !== 'APPROVED') {
                return { success: false, error: 'L\'entreprise doit être approuvée pour pouvoir être exécutée' };
            }
            
            // Mettre à jour le statut d'exécution
            const executionDate = executionStatus === 'deposed' || executionStatus === 'sent' ? 'CURRENT_TIMESTAMP' : null;
            
            await pool.query(`
                UPDATE prospecting_campaign_companies 
                SET execution_status = $1, 
                    execution_date = ${executionDate},
                    execution_notes = $2
                WHERE campaign_id = $3 AND company_id = $4
            `, [executionStatus, notes, campaignId, companyId]);
            
            return { success: true };
        } catch (e) {
            console.error('Erreur mise à jour statut exécution:', e);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }
    }

    static async convertToOpportunity(campaignId, companyId, opportunityData) {
        try {
            // Vérifier que l'entreprise a été exécutée
            const companyExecution = await pool.query(`
                SELECT execution_status, converted_to_opportunity 
                FROM prospecting_campaign_companies 
                WHERE campaign_id = $1 AND company_id = $2
            `, [campaignId, companyId]);
            
            if (companyExecution.rows.length === 0) {
                return { success: false, error: 'Entreprise non trouvée dans cette campagne' };
            }
            
            if (companyExecution.rows[0].converted_to_opportunity) {
                return { success: false, error: 'Cette entreprise a déjà été convertie en opportunité' };
            }
            
            if (!['deposed', 'sent'].includes(companyExecution.rows[0].execution_status)) {
                return { success: false, error: 'L\'entreprise doit être exécutée (déposée ou envoyée) pour être convertie' };
            }
            
            // Créer l'opportunité (ici vous devrez adapter selon votre modèle d'opportunités)
            // Pour l'instant, on simule la création
            const opportunityId = 'temp-opportunity-id'; // À remplacer par la vraie création
            
            // Marquer comme convertie
            await pool.query(`
                UPDATE prospecting_campaign_companies 
                SET converted_to_opportunity = TRUE, opportunity_id = $1
                WHERE campaign_id = $2 AND company_id = $3
            `, [opportunityId, campaignId, companyId]);
            
            return { success: true, opportunityId };
        } catch (e) {
            console.error('Erreur conversion opportunité:', e);
            return { success: false, error: 'Erreur lors de la conversion' };
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
                       div.nom as division_nom
                FROM prospecting_campaign_validations pcv
                JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                JOIN collaborateurs d ON pcv.demandeur_id = d.id
                LEFT JOIN collaborateurs v ON pcv.validateur_id = v.id
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                LEFT JOIN divisions div ON d.division_id = div.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;
            
            // Filtrer par statut si nécessaire
            if (!includeAllStatuses) {
                query += ` AND pcv.statut_validation = 'EN_ATTENTE'`;
            }
            
            // Filtrer par responsabilités du validateur
            query += ` AND (d.business_unit_id = $${paramIndex} OR d.division_id = $${paramIndex + 1})`;
            params.push(collaborateur.rows[0].business_unit_id, collaborateur.rows[0].division_id);
            
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
}

module.exports = { CompanySource, Company, ProspectingTemplate, ProspectingCampaign };


