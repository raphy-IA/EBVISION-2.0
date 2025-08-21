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
        const res = await pool.query(`
            SELECT pt.*, 
                   bu.nom as business_unit_name,
                   d.nom as division_name
            FROM prospecting_templates pt
            LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
            LEFT JOIN divisions d ON pt.division_id = d.id
            WHERE pt.id = $1
        `, [id]);
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
            // Vérifier si le modèle existe
            const template = await this.findById(id);
            if (!template) {
                return { success: false, error: 'Modèle non trouvé' };
            }

            // Vérifier si le modèle est utilisé dans des campagnes
            const usedInCampaigns = await pool.query(
                'SELECT COUNT(*)::int as count FROM prospecting_campaigns WHERE template_id = $1',
                [id]
            );

            if (usedInCampaigns.rows[0].count > 0) {
                return { success: false, error: 'Ce modèle ne peut pas être supprimé car il est utilisé dans des campagnes' };
            }

            // Supprimer le modèle
            await pool.query('DELETE FROM prospecting_templates WHERE id = $1', [id]);
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression modèle:', error);
            return { success: false, error: 'Erreur lors de la suppression' };
        }
    }
}

class ProspectingCampaign {
    static async create(data) {
        const res = await pool.query(
            `INSERT INTO prospecting_campaigns(name, channel, template_id, business_unit_id, division_id, status, scheduled_date, created_by, responsible_id, priority, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
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
                data.priority || 'NORMAL',
                data.description || null
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
            console.log('🔥 [MODEL] removeCompany appelé avec:', { campaignId, companyId });
            
            // Vérifier d'abord si la campagne existe
            const campaignExists = await pool.query(
                'SELECT id FROM prospecting_campaigns WHERE id = $1',
                [campaignId]
            );
            
            if (campaignExists.rows.length === 0) {
                return { success: false, error: 'Campagne non trouvée' };
            }
            
            // Vérifier si l'entreprise est associée à la campagne
            const associationExists = await pool.query(
                'SELECT * FROM prospecting_campaign_companies WHERE campaign_id = $1 AND company_id = $2',
                [campaignId, companyId]
            );
            
            if (associationExists.rows.length === 0) {
                return { success: false, error: 'Entreprise non associée à cette campagne' };
            }
            
            // Supprimer l'association
            await pool.query(
                'DELETE FROM prospecting_campaign_companies WHERE campaign_id = $1 AND company_id = $2',
                [campaignId, companyId]
            );
            
            console.log('🔥 [MODEL] Entreprise supprimée avec succès');
            return { success: true };
            
        } catch (error) {
            console.error('🔥 [MODEL] Erreur dans removeCompany:', error);
            return { success: false, error: 'Erreur lors de la suppression' };
        }
    }

    static async findAll({ limit = 20, offset = 0 }) {
        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM prospecting_campaigns`);
        const data = await pool.query(
            `SELECT pc.*, 
                    COALESCE(cnt.total,0)::int AS companies_count
             FROM prospecting_campaigns pc
             LEFT JOIN (
               SELECT campaign_id, COUNT(*) AS total 
               FROM prospecting_campaign_companies 
               GROUP BY campaign_id
             ) cnt ON cnt.campaign_id = pc.id
             ORDER BY pc.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return { campaigns: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async findAll() {
        const res = await pool.query(`
            SELECT pc.*,
                   pt.name as template_name,
                   bu.nom as business_unit_name,
                   d.nom as division_name,
                   c.prenom || ' ' || c.nom as responsible_name,
                   COALESCE(cnt.total,0)::int AS companies_count
            FROM prospecting_campaigns pc
            LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
            LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
            LEFT JOIN divisions d ON pc.division_id = d.id
            LEFT JOIN collaborateurs c ON pc.responsible_id = c.id
            LEFT JOIN (
                SELECT campaign_id, COUNT(*) AS total 
                FROM prospecting_campaign_companies 
                GROUP BY campaign_id
            ) cnt ON cnt.campaign_id = pc.id
            ORDER BY pc.created_at DESC
        `);
        return res.rows;
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
        try {
            console.log('🔥 [MODEL] getCompanies appelé avec:', { id, limit, offset });
            
            // Vérifier d'abord si la campagne existe
            const campaignExists = await pool.query(
                'SELECT id FROM prospecting_campaigns WHERE id = $1',
                [id]
            );
            
            console.log('🔥 [MODEL] Campagne existe:', campaignExists.rows.length > 0);
            
            if (campaignExists.rows.length === 0) {
                throw new Error('Campagne non trouvée');
            }
            
            // Compter les entreprises associées
            const count = await pool.query(
                `SELECT COUNT(*)::int AS total FROM prospecting_campaign_companies WHERE campaign_id = $1`,
                [id]
            );
            
            console.log('🔥 [MODEL] Nombre d\'entreprises associées:', count.rows[0].total);
            
            // Si aucune entreprise associée, retourner un résultat vide
            if (count.rows[0].total === 0) {
                console.log('🔥 [MODEL] Aucune entreprise associée, retour vide');
                return { companies: [], pagination: { total: 0, limit, offset } };
            }
            
            // Récupérer les entreprises avec leurs détails
            const data = await pool.query(
                `SELECT c.*, pcc.status, pcc.sent_at, pcc.response_at, pcc.notes
                 FROM prospecting_campaign_companies pcc
                 JOIN companies c ON c.id = pcc.company_id
                 WHERE pcc.campaign_id = $1
                 ORDER BY c.name
                 LIMIT $2 OFFSET $3`,
                [id, limit, offset]
            );
            
            console.log('🔥 [MODEL] Entreprises récupérées:', data.rows.length);
            console.log('🔥 [MODEL] Première entreprise:', data.rows[0] || 'Aucune');
            
            return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
        } catch (error) {
            console.error('🔥 [MODEL] Erreur dans getCompanies:', error);
            throw error;
        }
    }

    static async update(id, data) {
        const allowed = ['name','channel','template_id','business_unit_id','division_id','status','scheduled_date','responsible_id','priority','description'];
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
                   resp.nom as responsible_nom, resp.prenom as responsible_prenom
            FROM prospecting_campaigns pc 
            LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
            LEFT JOIN collaborateurs c ON pc.created_by = c.id
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
        if (campaign.responsible_nom) {
            campaign.responsible_name = `${campaign.responsible_prenom} ${campaign.responsible_nom}`;
        }
        
        return campaign;
    }

    static async delete(id) {
        try {
            // Vérifier que la campagne existe
            const campaign = await this.findById(id);
            if (!campaign) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            // Vérifier si la campagne a des entreprises associées
            const companiesCount = await pool.query(
                'SELECT COUNT(*)::int as count FROM prospecting_campaign_companies WHERE campaign_id = $1',
                [id]
            );

            if (companiesCount.rows[0].count > 0) {
                return { success: false, error: 'Cette campagne ne peut pas être supprimée car elle contient des entreprises associées' };
            }

            // Vérifier si la campagne a des validations
            const validationsCount = await pool.query(
                'SELECT COUNT(*)::int as count FROM prospecting_campaign_validations WHERE campaign_id = $1',
                [id]
            );

            if (validationsCount.rows[0].count > 0) {
                return { success: false, error: 'Cette campagne ne peut pas être supprimée car elle a des validations associées' };
            }

            // Supprimer la campagne
            await pool.query('DELETE FROM prospecting_campaigns WHERE id = $1', [id]);
                    return { success: true };
    } catch (error) {
        console.error('Erreur suppression campagne:', error);
        return { success: false, error: 'Erreur lors de la suppression' };
    }
}

    // =====================================================
    // MÉTHODES DE VALIDATION
    // =====================================================

    /**
     * Récupérer les campagnes à valider pour un utilisateur
     */
    static async getValidationsForUser(userId) {
        try {
            const query = `
                SELECT DISTINCT pc.*, pt.name as template_name, pt.subject as template_subject,
                       bu.nom as business_unit_name, d.nom as division_name,
                       c.nom as creator_name, c.prenom as creator_prenom,
                       resp.nom as responsible_nom, resp.prenom as responsible_prenom,
                       pcv.statut_validation as validation_status, pcv.commentaire_validateur as validation_note,
                       pcv.date_validation as validated_at, pcv.validateur_id as validated_by,
                       (SELECT COUNT(*) FROM prospecting_campaign_companies WHERE campaign_id = pc.id) as companies_count
                FROM prospecting_campaigns pc 
                LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
                LEFT JOIN collaborateurs c ON pc.created_by = c.id
                LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
                LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
                LEFT JOIN divisions d ON pt.division_id = d.id
                LEFT JOIN prospecting_campaign_validations pcv ON pc.id = pcv.campaign_id
                WHERE pc.status = 'READY' 
                AND (
                    (bu.responsable_principal_id = $1 OR bu.responsable_adjoint_id = $1)
                    OR (d.responsable_principal_id = $1 OR d.responsable_adjoint_id = $1)
                )
                ORDER BY pc.created_at DESC
            `;
            
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur récupération validations:', error);
            throw error;
        }
    }

    /**
     * Soumettre une campagne pour validation
     */
    static async submitForValidation(campaignId) {
        try {
            // Vérifier que la campagne existe et a des entreprises
            const campaign = await this.findByIdWithDetails(campaignId);
            if (!campaign) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            // Compter les entreprises associées
            const companiesCount = await pool.query(
                'SELECT COUNT(*)::int as count FROM prospecting_campaign_companies WHERE campaign_id = $1',
                [campaignId]
            );

            if (companiesCount.rows[0].count === 0) {
                return { success: false, error: 'La campagne doit contenir au moins une entreprise pour être soumise' };
            }

            // Mettre à jour le statut de la campagne
            await pool.query(
                'UPDATE prospecting_campaigns SET status = $1, submitted_at = NOW() WHERE id = $2',
                ['READY', campaignId]
            );

            // Créer les entrées de validation pour les responsables
            const template = await pool.query(
                'SELECT pt.business_unit_id, pt.division_id FROM prospecting_templates pt ' +
                'JOIN prospecting_campaigns pc ON pc.template_id = pt.id WHERE pc.id = $1',
                [campaignId]
            );

            if (template.rows.length > 0) {
                const { business_unit_id, division_id } = template.rows[0];
                
                // Ajouter validation pour la Business Unit
                if (business_unit_id) {
                    const buManagers = await pool.query(
                        'SELECT responsable_principal_id, responsable_adjoint_id FROM business_units WHERE id = $1',
                        [business_unit_id]
                    );
                    
                    if (buManagers.rows.length > 0) {
                        const { responsable_principal_id, responsable_adjoint_id } = buManagers.rows[0];
                        
                        if (responsable_principal_id) {
                            await pool.query(
                                'INSERT INTO prospecting_campaign_validations (campaign_id, demandeur_id, validateur_id, niveau_validation, statut_validation, date_demande) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING',
                                [campaignId, campaign.created_by, responsable_principal_id, 'BU_PRINCIPAL', 'EN_ATTENTE']
                            );
                        }
                        
                        if (responsable_adjoint_id) {
                            await pool.query(
                                'INSERT INTO prospecting_campaign_validations (campaign_id, demandeur_id, validateur_id, niveau_validation, statut_validation, date_demande) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING',
                                [campaignId, campaign.created_by, responsable_adjoint_id, 'BU_ADJOINT', 'EN_ATTENTE']
                            );
                        }
                    }
                }
                
                // Ajouter validation pour la Division
                if (division_id) {
                    const divManagers = await pool.query(
                        'SELECT responsable_principal_id, responsable_adjoint_id FROM divisions WHERE id = $1',
                        [division_id]
                    );
                    
                    if (divManagers.rows.length > 0) {
                        const { responsable_principal_id, responsable_adjoint_id } = divManagers.rows[0];
                        
                        if (responsable_principal_id) {
                            await pool.query(
                                'INSERT INTO prospecting_campaign_validations (campaign_id, demandeur_id, validateur_id, niveau_validation, statut_validation, date_demande) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING',
                                [campaignId, campaign.created_by, responsable_principal_id, 'DIVISION_PRINCIPAL', 'EN_ATTENTE']
                            );
                        }
                        
                        if (responsable_adjoint_id) {
                            await pool.query(
                                'INSERT INTO prospecting_campaign_validations (campaign_id, demandeur_id, validateur_id, niveau_validation, statut_validation, date_demande) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING',
                                [campaignId, campaign.created_by, responsable_adjoint_id, 'DIVISION_ADJOINT', 'EN_ATTENTE']
                            );
                        }
                    }
                }
            }

            return { success: true, data: campaign };
        } catch (error) {
            console.error('Erreur soumission validation:', error);
            return { success: false, error: 'Erreur lors de la soumission' };
        }
    }

    /**
     * Valider ou rejeter une campagne
     */
    static async validateCampaign(campaignId, validatorId, action, note, companyValidations = []) {
        try {
            // Vérifier que le validateur a le droit de valider cette campagne
            const validation = await pool.query(
                'SELECT * FROM prospecting_campaign_validations WHERE campaign_id = $1 AND validateur_id = $2 AND statut_validation = $3',
                [campaignId, validatorId, 'EN_ATTENTE']
            );

            if (validation.rows.length === 0) {
                return { success: false, error: 'Vous n\'êtes pas autorisé à valider cette campagne' };
            }

            // Mettre à jour la validation
            const newStatus = action === 'APPROVED' ? 'APPROUVEE' : 'REJETEE';
            await pool.query(
                'UPDATE prospecting_campaign_validations SET statut_validation = $1, commentaire_validateur = $2, date_validation = NOW() WHERE campaign_id = $3 AND validateur_id = $4',
                [newStatus, note, campaignId, validatorId]
            );

            // Si c'est un rejet, mettre à jour le statut de la campagne
            if (action === 'REJECTED') {
                await pool.query(
                    'UPDATE prospecting_campaigns SET status = $1 WHERE id = $2',
                    ['DRAFT', campaignId]
                );
            }

            // Traiter les validations d'entreprises si fournies
            if (companyValidations && companyValidations.length > 0) {
                for (const companyValidation of companyValidations) {
                    await pool.query(
                        'UPDATE prospecting_campaign_companies SET validation_status = $1, validation_note = $2, validated_at = NOW() WHERE campaign_id = $3 AND company_id = $4',
                        [companyValidation.status, companyValidation.note, campaignId, companyValidation.company_id]
                    );
                }
            }

            // Vérifier si toutes les validations sont terminées
            const pendingValidations = await pool.query(
                'SELECT COUNT(*)::int as count FROM prospecting_campaign_validations WHERE campaign_id = $1 AND statut_validation = $2',
                [campaignId, 'EN_ATTENTE']
            );

            if (pendingValidations.rows[0].count === 0) {
                // Toutes les validations sont terminées
                const rejectedValidations = await pool.query(
                    'SELECT COUNT(*)::int as count FROM prospecting_campaign_validations WHERE campaign_id = $1 AND statut_validation = $2',
                    [campaignId, 'REJETEE']
                );

                if (rejectedValidations.rows[0].count === 0) {
                    // Toutes les validations sont approuvées
                    await pool.query(
                        'UPDATE prospecting_campaigns SET status = $1 WHERE id = $2',
                        ['APPROVED', campaignId]
                    );
                }
            }

            return { success: true, data: { campaign_id: campaignId, action, note } };
        } catch (error) {
            console.error('Erreur validation campagne:', error);
            return { success: false, error: 'Erreur lors de la validation' };
        }
    }

    /**
     * Récupérer les détails d'une campagne pour validation
     */
    static async getValidationDetails(campaignId, validatorId) {
        try {
            // Vérifier que le validateur a le droit de voir cette campagne
            const validation = await pool.query(
                'SELECT * FROM prospecting_campaign_validations WHERE campaign_id = $1 AND validateur_id = $2',
                [campaignId, validatorId]
            );

            if (validation.rows.length === 0) {
                return { success: false, error: 'Vous n\'êtes pas autorisé à voir cette campagne' };
            }

            // Récupérer les détails de la campagne
            const campaign = await this.findByIdWithDetails(campaignId);
            if (!campaign) {
                return { success: false, error: 'Campagne non trouvée' };
            }

            // Récupérer les entreprises de la campagne
            const companies = await pool.query(`
                SELECT c.*, pcc.validation_status, pcc.validation_note, pcc.validated_at
                FROM companies c
                JOIN prospecting_campaign_companies pcc ON c.id = pcc.company_id
                WHERE pcc.campaign_id = $1
                ORDER BY c.nom
            `, [campaignId]);

            return {
                success: true,
                data: {
                    campaign,
                    companies: companies.rows,
                    validation: validation.rows[0]
                }
            };
        } catch (error) {
            console.error('Erreur récupération détails validation:', error);
            return { success: false, error: 'Erreur lors de la récupération des détails' };
        }
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


