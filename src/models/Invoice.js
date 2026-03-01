const { pool } = require('../utils/database');

class Invoice {
    constructor(data) {
        this.id = data.id;
        this.numero_facture = data.numero_facture;
        this.mission_id = data.mission_id;
        this.client_id = data.client_id;
        this.date_emission = data.date_emission;
        this.date_echeance = data.date_echeance;
        this.statut = data.statut;
        this.montant_ht = parseFloat(data.montant_ht || 0);
        this.montant_tva = parseFloat(data.montant_tva || 0);
        this.montant_ttc = parseFloat(data.montant_ttc || 0);
        this.montant_paye = parseFloat(data.montant_paye || 0);
        this.montant_restant = parseFloat(data.montant_restant || 0);
        this.conditions_paiement = data.conditions_paiement;
        this.taux_tva = parseFloat(data.taux_tva || 19.25);
        this.adresse_facturation = data.adresse_facturation;
        this.notes_facture = data.notes_facture;
        this.date_premier_paiement = data.date_premier_paiement;
        this.date_dernier_paiement = data.date_dernier_paiement;
        this.nombre_paiements = parseInt(data.nombre_paiements || 0);
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;

        // Champs joints
        this.mission_nom = data.mission_nom;
        this.client_nom = data.client_nom;
        this.client_code = data.client_code;
        this.created_by_nom = data.created_by_nom;
        this.created_by_prenom = data.created_by_prenom;
        // Contexte organisationnel de la mission liée
        this.business_unit_id = data.business_unit_id;
        this.business_unit_nom = data.business_unit_nom;
        this.business_unit_code = data.business_unit_code;
        this.division_id = data.division_id;
        this.division_nom = data.division_nom;
        this.division_nom = data.division_nom;
        this.division_code = data.division_code;

        // Champs Historique
        this.submitted_for_validation_at = data.submitted_for_validation_at;
        this.submitted_by_nom = data.submitted_by_nom;
        this.submitted_by_prenom = data.submitted_by_prenom;

        this.validated_at = data.validated_at;
        this.validated_by_nom = data.validated_by_nom;
        this.validated_by_prenom = data.validated_by_prenom;

        this.emission_validated_at = data.emission_validated_at;
        this.approved_by_nom = data.approved_by_nom;
        this.approved_by_prenom = data.approved_by_prenom;

        this.emitted_at = data.emitted_at;
        this.emitted_by_nom = data.emitted_by_nom;
        this.emitted_by_prenom = data.emitted_by_prenom;

        this.rejected_at = data.rejected_at;
        this.rejected_by_nom = data.rejected_by_nom;
        this.rejected_by_prenom = data.rejected_by_prenom;
        this.rejection_reason = data.rejection_reason;
    }

    // Créer une nouvelle facture
    static async create(invoiceData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Générer un numéro unique au format FACT-<BUCODE>-YYYYMM-XXXX (séquence par BU et mois)
            const now = new Date(invoiceData.date_emission || new Date());
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');

            // Récupérer le code BU depuis la mission liée
            const buQuery = `
                SELECT bu.code AS bu_code
                FROM missions m
                LEFT JOIN business_units bu ON m.business_unit_id = bu.id
                WHERE m.id = $1
            `;
            const buRes = await client.query(buQuery, [invoiceData.mission_id]);
            const buCode = (buRes.rows[0]?.bu_code || 'GEN').toUpperCase();

            const prefix = `FACT-${buCode}-${year}${month}-`;

            // Séquence par BU et mois
            const seqQuery = `
                SELECT COALESCE(MAX(CAST(RIGHT(numero_facture, 4) AS INTEGER)), 0) AS last_seq
                FROM invoices
                WHERE numero_facture LIKE $1
            `;
            const seqResult = await client.query(seqQuery, [prefix + '%']);
            const nextSeq = (seqResult.rows[0]?.last_seq || 0) + 1;
            const numeroFacture = prefix + String(nextSeq).padStart(4, '0');

            // Déterminer l'année fiscale de la facture
            let fiscalYearId = null;
            try {
                if (invoiceData.mission_id) {
                    const fyFromMission = await client.query(
                        'SELECT fiscal_year_id FROM missions WHERE id = $1',
                        [invoiceData.mission_id]
                    );
                    fiscalYearId = fyFromMission.rows[0]?.fiscal_year_id || null;
                }
                if (!fiscalYearId) {
                    const fyCurrent = await client.query(`
                        SELECT id FROM fiscal_years 
                        WHERE date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE 
                        AND statut = 'EN_COURS' 
                        LIMIT 1
                    `);
                    fiscalYearId = fyCurrent.rows[0]?.id || null;
                }
            } catch (_) { }

            const query = `
                INSERT INTO invoices (
                    numero_facture, mission_id, client_id, date_emission, date_echeance, statut,
                    conditions_paiement, taux_tva, adresse_facturation, notes_facture,
                    created_by, fiscal_year_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const values = [
                numeroFacture,
                invoiceData.mission_id,
                invoiceData.client_id,
                invoiceData.date_emission || new Date(),
                invoiceData.date_echeance,
                invoiceData.statut || 'BROUILLON',
                invoiceData.conditions_paiement,
                invoiceData.taux_tva || 19.25,
                invoiceData.adresse_facturation,
                invoiceData.notes_facture,
                invoiceData.created_by,
                fiscalYearId
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');
            return new Invoice(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Trouver une facture par ID avec les informations jointes
    static async findById(id) {
        const query = `
            SELECT 
                i.*,
                m.nom as mission_nom,
                c.nom as client_nom,
                c.code as client_code,
                u1.nom as created_by_nom,
                u1.prenom as created_by_prenom,
                u_val.nom as validated_by_nom,
                u_val.prenom as validated_by_prenom,
                u_app.nom as approved_by_nom,
                u_app.prenom as approved_by_prenom,
                u_emit.nom as emitted_by_nom,
                u_emit.prenom as emitted_by_prenom,
                u_sub.nom as submitted_by_nom,
                u_sub.prenom as submitted_by_prenom,
                u_rej.nom as rejected_by_nom,
                u_rej.prenom as rejected_by_prenom,
                m.business_unit_id,
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                m.division_id,
                d.nom as division_nom,
                d.code as division_code,
                m.associe_id,
                m.manager_id
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN users u1 ON i.created_by = u1.id
            LEFT JOIN users u_val ON i.validated_by = u_val.id
            LEFT JOIN users u_app ON i.emission_validated_by = u_app.id
            LEFT JOIN users u_emit ON i.emitted_by = u_emit.id
            LEFT JOIN users u_sub ON i.submitted_for_validation_by = u_sub.id
            LEFT JOIN users u_rej ON i.rejected_by = u_rej.id
            WHERE i.id = $1
        `;

        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return null;

        // Instancier l'objet Invoice et lui attacher les noms supplémentaires
        const invoice = new Invoice(result.rows[0]);

        return invoice;
    }

    // Trouver toutes les factures avec pagination et filtres
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            statut,
            client_id,
            mission_id,
            business_unit_id,
            division_id,
            date_debut,
            date_fin,
            search,
            view,
            user // Used for scoping
        } = options;

        let conditions = [];
        let values = [];
        let valueIndex = 1;

        let extraJoins = "";

        // 1. Gestion des Vues (Scoping & Presets)
        // Access Control Logic
        if (user) {
            const userRoles = user.roles || [];
            const isUnrestricted = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_FINANCE'].includes(r));
            const isFinancesBu = userRoles.includes('FINANCES_BU');

            if (!isUnrestricted) {
                // Common Joins for Security
                extraJoins += ` LEFT JOIN users u_req ON u_req.id = $${valueIndex} `;
                values.push(user.id);
                valueIndex++;

                extraJoins += ` LEFT JOIN collaborateurs c_req ON u_req.collaborateur_id = c_req.id `;
                extraJoins += ` LEFT JOIN user_business_unit_access ubua ON ubua.user_id = u_req.id AND ubua.business_unit_id = m.business_unit_id AND ubua.granted = true `;

                if (isFinancesBu) {
                    // FINANCES_BU: Can see invoices for their BUs (explicit access or implicitly via their own BU)
                    conditions.push(`(
                        ubua.business_unit_id IS NOT NULL OR
                        m.business_unit_id = c_req.business_unit_id
                    )`);
                } else {
                    // Standard User / Partner / Director: Can see invoices for missions they are involved in
                    conditions.push(`(
                        m.collaborateur_id = c_req.id OR
                        m.manager_id = c_req.id OR
                        m.associe_id = c_req.id
                    )`);
                }
            }
        }

        if (view === 'my_scope' && user) {
            // Even for unrestricted users, 'my_scope' should show "My" stuff.
            // But for Invoices, "My Scope" usually means "My Missions" for managers, or "All" for Finance.
            // For consistency with existing logic:
            // If restricted, the filter above already handles it.
            // If unrestricted, 'my_scope' implies we WANT to filter by personal involvement? 
            // Or typically Finance people don't use 'my_scope' to see only their own invoices, they use it to see "My Work" vs "All".
            // Let's leave 'my_scope' as adding NO EXTRA filters for unrestricted users (viewing all is their "scope"),
            // and reliance on the security filter above for restricted users.
        }
        else if (view === 'action_needed') {
            // Factures en attente d'une action Workflow (hors Brouillon, hors Emise/Payée)
            conditions.push(`i.statut IN ('EN_ATTENTE_VALIDATION', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_EMISSION')`);
        }
        else if (view === 'emitted') {
            conditions.push(`i.statut IN ('EMISE', 'PAYEE', 'EN_RETARD')`);
        }
        else if (view === 'suggestions') {
            // Cas spécial : si géré par backend, sinon vide ou false
            // Ici on retourne liste vide car c'est géré en frontend via un autre endpoint ?
            // Ou alors on laisse le frontend gérer l'affichage de la section suggestions et on ne liste rien ici.
            // Pour l'instant, on assume que ce view filtre la liste principale pour ne rien montrer ou les brouillons ?
            // On va dire : ne rien montrer dans la liste principale, ou montrer les brouillons qui pourraient être liés.
            // Mais l'utilisateur a dit "affiche toutes les suggestion... certte zone a été ajoutée".
            // Donc la liste principale n'est pas concernée.
            conditions.push('1=0'); // Force empty result for main list in suggestions view
        }
        else if (view === 'late') {
            conditions.push(`(
                i.statut = 'EN_RETARD' OR 
                (i.statut = 'EMISE' AND i.date_echeance < CURRENT_DATE)
            )`);
        }

        // Construire les conditions de filtrage standards
        if (statut) {
            conditions.push(`i.statut = $${valueIndex}`);
            values.push(statut);
            valueIndex++;
        }

        if (client_id) {
            conditions.push(`i.client_id = $${valueIndex}`);
            values.push(client_id);
            valueIndex++;
        }

        if (mission_id) {
            conditions.push(`i.mission_id = $${valueIndex}`);
            values.push(mission_id);
            valueIndex++;
        }

        if (business_unit_id) {
            conditions.push(`m.business_unit_id = $${valueIndex}`);
            values.push(business_unit_id);
            valueIndex++;
        }

        if (division_id) {
            conditions.push(`m.division_id = $${valueIndex}`);
            values.push(division_id);
            valueIndex++;
        }

        if (date_debut) {
            conditions.push(`i.date_emission >= $${valueIndex}`);
            values.push(date_debut);
            valueIndex++;
        }

        if (date_fin) {
            conditions.push(`i.date_emission <= $${valueIndex}`);
            values.push(date_fin);
            valueIndex++;
        }

        if (search) {
            conditions.push(`(
                i.numero_facture ILIKE $${valueIndex} OR
                m.nom ILIKE $${valueIndex} OR
                c.nom ILIKE $${valueIndex}
            )`);
            values.push(`%${search}%`);
            valueIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ${extraJoins}
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        // Requête principale avec pagination
        const offset = (page - 1) * limit;
        const query = `
        SELECT
        i.*,
            m.nom as mission_nom,
            c.nom as client_nom,
            c.code as client_code,
            u1.nom as created_by_nom,
            u1.prenom as created_by_prenom,
            m.business_unit_id,
            bu.nom as business_unit_nom,
            bu.code as business_unit_code,
            m.division_id,
            d.nom as division_nom,
            d.code as division_code
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN users u1 ON i.created_by = u1.id
            ${extraJoins}
            ${whereClause}
            ORDER BY i.created_at DESC
            LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
        `;

        values.push(limit, offset);
        const result = await pool.query(query, values);

        return {
            invoices: result.rows.map(row => new Invoice(row)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Mettre à jour une facture
    async update(updateData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                UPDATE invoices
        SET
        date_emission = $1,
            date_echeance = $2,
            statut = $3,
            conditions_paiement = $4,
            taux_tva = $5,
            adresse_facturation = $6,
            notes_facture = $7,
            updated_by = $8,
            updated_at = CURRENT_TIMESTAMP
                WHERE id = $9 AND statut = 'BROUILLON'
        RETURNING *
            `;

            if (this.statut !== 'BROUILLON') {
                throw new Error('Impossible de modifier une facture qui n\'est pas au statut BROUILLON');
            }
            const values = [
                updateData.date_emission || this.date_emission,
                updateData.date_echeance || this.date_echeance,
                updateData.statut || this.statut,
                updateData.conditions_paiement || this.conditions_paiement,
                updateData.taux_tva || this.taux_tva,
                updateData.adresse_facturation || this.adresse_facturation,
                updateData.notes_facture || this.notes_facture,
                updateData.updated_by,
                this.id
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');

            // Mettre à jour l'instance
            Object.assign(this, new Invoice(result.rows[0]));
            return this;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Supprimer une facture
    async delete() {
        const query = 'DELETE FROM invoices WHERE id = $1';
        const result = await pool.query(query, [this.id]);
        return result.rowCount > 0;
    }

    // Obtenir les lignes de facture
    async getItems() {
        const query = `
        SELECT
        ii.*,
            t.libelle as task_libelle,
            t.code as task_code
            FROM invoice_items ii
            LEFT JOIN tasks t ON ii.task_id = t.id
            WHERE ii.invoice_id = $1
            ORDER BY ii.created_at
            `;

        const result = await pool.query(query, [this.id]);
        return result.rows;
    }

    // Ajouter une ligne de facture
    async addItem(itemData) {
        const query = `
            INSERT INTO invoice_items(
                invoice_id, description, quantite, unite, prix_unitaire,
                taux_tva, task_id
            ) VALUES($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
            `;

        const values = [
            this.id,
            itemData.description,
            itemData.quantite || 1,
            itemData.unite || 'heure',
            itemData.prix_unitaire,
            itemData.taux_tva || this.taux_tva,
            itemData.task_id || null
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Supprimer une ligne de facture
    async removeItem(itemId) {
        const query = 'DELETE FROM invoice_items WHERE id = $1 AND invoice_id = $2';
        const result = await pool.query(query, [itemId, this.id]);
        return result.rowCount > 0;
    }

    // Obtenir les paiements
    async getPayments() {
        const query = `
        SELECT
        p.id,
            p.payment_number,
            p.payment_date,
            pa.allocated_amount as montant,
            p.payment_mode,
            p.reference,
            p.notes,
            u.nom as created_by_nom,
            u.prenom as created_by_prenom
            FROM payment_allocations pa
            JOIN payments p ON pa.payment_id = p.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE pa.invoice_id = $1
            ORDER BY p.payment_date DESC
            `;

        const result = await pool.query(query, [this.id]);
        return result.rows;
    }

    // Ajouter un paiement
    async addPayment(paymentData) {
        const query = `
            INSERT INTO invoice_payments(
                invoice_id, numero_paiement, date_paiement, montant,
                mode_paiement, reference_paiement, statut, notes, created_by
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
            `;

        const values = [
            this.id,
            paymentData.numero_paiement,
            paymentData.date_paiement,
            paymentData.montant,
            paymentData.mode_paiement,
            paymentData.reference_paiement,
            paymentData.statut || 'EN_ATTENTE',
            paymentData.notes,
            paymentData.created_by
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Mettre à jour un paiement
    async updatePayment(paymentId, updateData) {
        const query = `
            UPDATE invoice_payments
        SET
        numero_paiement = $1,
            date_paiement = $2,
            montant = $3,
            mode_paiement = $4,
            reference_paiement = $5,
            statut = $6,
            notes = $7,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 AND invoice_id = $9
        RETURNING *
            `;

        const values = [
            updateData.numero_paiement,
            updateData.date_paiement,
            updateData.montant,
            updateData.mode_paiement,
            updateData.reference_paiement,
            updateData.statut,
            updateData.notes,
            paymentId,
            this.id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Supprimer un paiement (allocation)
    async removePayment(paymentId) {
        const query = 'DELETE FROM payment_allocations WHERE payment_id = $1 AND invoice_id = $2';
        const result = await pool.query(query, [paymentId, this.id]);
        return result.rowCount > 0;
    }

    // Générer automatiquement les lignes de facture basées sur les conditions de paiement de la mission
    async generateItemsFromMission() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Récupérer les informations de la mission avec les conditions de paiement
            const missionQuery = `
        SELECT
        m.conditions_paiement,
            m.montant_honoraires,
            m.montant_debours,
            m.devise,
            m.nom as mission_nom
                FROM missions m
                WHERE m.id = $1
            `;

            const missionResult = await client.query(missionQuery, [this.mission_id]);

            if (missionResult.rows.length === 0) {
                throw new Error('Mission non trouvée');
            }

            const mission = missionResult.rows[0];

            // Supprimer les lignes existantes
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [this.id]);

            // Parser les conditions de paiement avec fallback
            let paymentConditions = [];
            let useFallbackFromTotals = false;
            if (mission.conditions_paiement) {
                try {
                    // Essayer de parser comme un tableau JSON
                    paymentConditions = JSON.parse(mission.conditions_paiement);

                    // Si c'est un objet avec des clés numériques, le convertir en tableau
                    if (typeof paymentConditions === 'object' && !Array.isArray(paymentConditions)) {
                        paymentConditions = Object.values(paymentConditions).map(condition => {
                            if (typeof condition === 'string') {
                                return JSON.parse(condition);
                            }
                            return condition;
                        });
                    }
                    // Si après parsing ce n'est toujours pas un tableau, fallback
                    if (!Array.isArray(paymentConditions)) {
                        useFallbackFromTotals = true;
                    }
                } catch (parseError) {
                    console.warn('Erreur parsing conditions_paiement, fallback montants totaux:', parseError);
                    useFallbackFromTotals = true;
                }
            } else {
                useFallbackFromTotals = true;
            }

            if (useFallbackFromTotals) {
                // Générer 1 à 2 lignes à partir des montants totaux honoraires/débours
                const deviseTaux = this.taux_tva;
                const hon = parseFloat(mission.montant_honoraires || 0);
                const deb = parseFloat(mission.montant_debours || 0);
                if (hon > 0) {
                    const montantHT = hon;
                    await client.query(
                        `INSERT INTO invoice_items(invoice_id, description, quantite, unite, prix_unitaire, taux_tva)
        VALUES($1, $2, $3, $4, $5, $6)`,
                        [
                            this.id,
                            `Honoraires - ${mission.mission_nom || ''} `.trim(),
                            1,
                            'forfait',
                            montantHT,
                            deviseTaux
                        ]
                    );
                }
                if (deb > 0) {
                    const montantHT = deb;
                    await client.query(
                        `INSERT INTO invoice_items(invoice_id, description, quantite, unite, prix_unitaire, taux_tva)
        VALUES($1, $2, $3, $4, $5, $6)`,
                        [
                            this.id,
                            `Débours - ${mission.mission_nom || ''} `.trim(),
                            1,
                            'forfait',
                            montantHT,
                            deviseTaux
                        ]
                    );
                }
            } else {
                // Générer les lignes de facture basées sur les conditions de paiement
                for (const condition of paymentConditions) {
                    // Ligne pour les honoraires
                    if (condition.montant_honoraires && condition.montant_honoraires > 0) {
                        const honorairesItemQuery = `
                        INSERT INTO invoice_items(
            invoice_id, description, quantite, unite, prix_unitaire, taux_tva
        ) VALUES($1, $2, $3, $4, $5, $6)
                    `;

                        const montantHT = parseFloat(condition.montant_honoraires);
                        const montantTVA = montantHT * (this.taux_tva / 100);
                        const honorairesValues = [
                            this.id,
                            `Honoraires - ${condition.details || 'Tranche ' + (condition.numero || '')} `,
                            1,
                            'forfait',
                            montantHT,
                            this.taux_tva
                        ];

                        await client.query(honorairesItemQuery, honorairesValues);
                    }

                    // Ligne pour les débours
                    if (condition.montant_debours && condition.montant_debours > 0) {
                        const deboursItemQuery = `
                        INSERT INTO invoice_items(
            invoice_id, description, quantite, unite, prix_unitaire, taux_tva
        ) VALUES($1, $2, $3, $4, $5, $6)
                    `;

                        const montantHT = parseFloat(condition.montant_debours);
                        const montantTVA = montantHT * (this.taux_tva / 100);
                        const deboursValues = [
                            this.id,
                            `Débours - ${condition.details || 'Tranche ' + (condition.numero || '')} `,
                            1,
                            'forfait',
                            montantHT,
                            this.taux_tva
                        ];

                        await client.query(deboursItemQuery, deboursValues);
                    }
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Obtenir les statistiques de facturation
    static async getStats(user = null) {
        let conditions = [];
        let values = [];
        let valueIndex = 1;
        let joins = "";

        if (user) {
            const userRoles = user.roles || [];
            const isUnrestricted = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_FINANCE'].includes(r));
            const isFinancesBu = userRoles.includes('FINANCES_BU');

            if (!isUnrestricted) {
                joins = `
                    LEFT JOIN missions m ON i.mission_id = m.id
                    LEFT JOIN business_units bu ON m.business_unit_id = bu.id
                    LEFT JOIN users u_req ON u_req.id = $${valueIndex}
                `;
                values.push(user.id);
                valueIndex++;

                joins += ` LEFT JOIN collaborateurs c_req ON u_req.collaborateur_id = c_req.id `;
                joins += ` LEFT JOIN user_business_unit_access ubua ON ubua.user_id = u_req.id AND ubua.business_unit_id = m.business_unit_id AND ubua.granted = true `;

                if (isFinancesBu) {
                    conditions.push(`(
                        ubua.business_unit_id IS NOT NULL OR
                        m.business_unit_id = c_req.business_unit_id
                    )`);
                } else {
                    conditions.push(`(
                        m.collaborateur_id = c_req.id OR
                        m.manager_id = c_req.id OR
                        m.associe_id = c_req.id
                    )`);
                }
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                COUNT(*) as total_factures,
                COUNT(CASE WHEN i.statut = 'EMISE' THEN 1 END) as factures_emises,
                COUNT(CASE WHEN i.statut = 'PAYEE' THEN 1 END) as factures_payees,
                COUNT(CASE WHEN i.statut = 'BROUILLON' THEN 1 END) as factures_brouillon,
                COALESCE(SUM(i.montant_ttc), 0) as total_montant_ttc,
                COALESCE(SUM(i.montant_paye), 0) as total_montant_paye,
                COALESCE(SUM(i.montant_restant), 0) as total_montant_restant
            FROM invoices i
            ${joins}
            ${whereClause}
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Obtenir les factures en retard
    static async getOverdueInvoices() {
        const query = `
        SELECT
        i.*,
            m.nom as mission_nom,
            c.nom as client_nom,
            c.code as client_code
            FROM invoices i
            LEFT JOIN missions m ON i.mission_id = m.id
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.date_echeance < CURRENT_DATE 
            AND i.statut = 'EMISE'
            AND i.montant_restant > 0
            ORDER BY i.date_echeance ASC
        `;

        const result = await pool.query(query);
        return result.rows.map(row => new Invoice(row));
    }

    // =========================================================================
    // WORKFLOW INVOICE
    // =========================================================================

    /**
     * Soumettre la facture pour validation (BROUILLON → EN_ATTENTE_VALIDATION)
     */
    async submit(submittedBy) {
        if (this.statut !== 'BROUILLON') {
            throw new Error(`Impossible de soumettre une facture en statut ${this.statut} `);
        }

        // Vérification élémentaire
        const items = await this.getItems();
        if (items.length === 0) {
            throw new Error('La facture doit contenir au moins une ligne');
        }

        const newStatus = 'EN_ATTENTE_VALIDATION';
        await this.updateStatus(newStatus, submittedBy);

        // Notification
        const NotificationService = require('../services/notificationService');
        await NotificationService.sendInvoiceSubmittedNotification(this.id, submittedBy);

        return this;
    }

    /**
     * Valider la facture (EN_ATTENTE_VALIDATION → EN_ATTENTE_APPROBATION)
     */
    async validate(validatedBy) {
        if (this.statut !== 'EN_ATTENTE_VALIDATION') {
            throw new Error(`Impossible de valider une facture en statut ${this.statut} `);
        }

        // Vérification des permissions (Responsable BU ou Associé)
        const authorized = await this.checkValidationPermission(validatedBy);
        if (!authorized) {
            throw new Error('Vous n\'êtes pas autorisé à valider cette facture');
        }

        const newStatus = 'EN_ATTENTE_APPROBATION';
        await this.updateStatus(newStatus, validatedBy);

        // Notification aux Approbateurs (Senior Partners)
        const NotificationService = require('../services/notificationService');
        await NotificationService.sendInvoiceValidatedNotification(this.id, validatedBy);

        return this;
    }

    /**
     * Approuver la facture (EN_ATTENTE_APPROBATION → EN_ATTENTE_EMISSION)
     */
    async approve(approvedBy) {
        if (this.statut !== 'EN_ATTENTE_APPROBATION') {
            throw new Error(`Impossible d'approuver une facture en statut ${this.statut}`);
        }

        // Vérification permissions (Senior Partner)
        const isSeniorPartner = await this.checkRole(approvedBy, 'SENIOR_PARTNER');
        if (!isSeniorPartner) {
            throw new Error('Seul un Senior Partner peut approuver cette facture');
        }

        const newStatus = 'EN_ATTENTE_EMISSION';
        await this.updateStatus(newStatus, approvedBy);

        // Notification aux émetteurs (Finance/Admin)
        const NotificationService = require('../services/notificationService');
        await NotificationService.sendInvoiceApprovedNotification(this.id, approvedBy);

        return this;
    }

    /**
     * Rejeter la facture (→ BROUILLON)
     */
    async reject(rejectedBy, reason) {
        if (!['EN_ATTENTE_VALIDATION', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_EMISSION'].includes(this.statut)) {
            throw new Error(`Impossible de rejeter une facture en statut ${this.statut}`);
        }

        if (!reason) {
            throw new Error('Le motif de rejet est obligatoire');
        }

        // Vérification des permissions selon le statut
        if (this.statut === 'EN_ATTENTE_VALIDATION') {
            const authorized = await this.checkValidationPermission(rejectedBy);
            if (!authorized) throw new Error('Action non autorisée');
        } else if (this.statut === 'EN_ATTENTE_APPROBATION') {
            const isSP = await this.checkRole(rejectedBy, 'SENIOR_PARTNER');
            if (!isSP) throw new Error('Action non autorisée');
        }

        const query = `
            UPDATE invoices 
            SET statut = 'BROUILLON', 
                rejection_reason = $1,
                rejected_by = $2,
                rejected_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;
        await pool.query(query, [reason, rejectedBy, this.id]);
        this.statut = 'BROUILLON';

        // Notification au créateur
        const NotificationService = require('../services/notificationService');
        await NotificationService.sendInvoiceRejectedNotification(this.id, rejectedBy, reason);

        return this;
    }

    /**
     * Emettre la facture (EN_ATTENTE_EMISSION → EMISE)
     */
    async emit(emittedBy, dateEcheance = null) {
        if (this.statut !== 'EN_ATTENTE_EMISSION') {
            throw new Error(`Impossible d'émettre une facture en statut ${this.statut}`);
        }

        // Permissions: Admin ou Créateur (si autorisé)
        // Pour l'instant, on laisse ouvert ou on restreint aux ADMINS
        // const isAdmin = await this.checkRole(emittedBy, 'ADMIN');

        const newStatus = 'EMISE';

        // Si une nouvelle date d'échéance est fournie, on la met à jour
        let extraUpdate = "";
        let params = [newStatus, emittedBy, this.id];
        let paramIndex = 4;

        if (dateEcheance) {
            extraUpdate = `, date_echeance = $${paramIndex}`;
            params.push(dateEcheance);
        }

        const query = `
            UPDATE invoices 
            SET statut = $1, 
                date_emission = CURRENT_DATE,
                emitted_by = $2,
                emitted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
                ${extraUpdate}
            WHERE id = $3
        `;

        await pool.query(query, params);

        this.statut = 'EMISE';
        if (dateEcheance) {
            this.date_echeance = dateEcheance;
        }

        // Notification (optionnel, peut-être au client ou retour créateur)

        return this;
    }

    async updateStatus(newStatus, userId) {
        console.log(`[Invoice.updateStatus] ID: ${this.id}, Status: ${newStatus}, UserId: ${userId}`);

        // Déterminer les champs temporels à mettre à jour selon la transition
        let extraSet = "";

        // Validation (Action: Valider)
        // Transition typique : EN_ATTENTE_VALIDATION -> EN_ATTENTE_APPROBATION
        if (newStatus === 'EN_ATTENTE_APPROBATION') {
            extraSet = ", validated_at = CURRENT_TIMESTAMP, validated_by = $2";
        }
        // Approbation (Action: Approuver)
        // Transition typique : EN_ATTENTE_APPROBATION -> EN_ATTENTE_EMISSION
        else if (newStatus === 'EN_ATTENTE_EMISSION') {
            extraSet = ", emission_validated_at = CURRENT_TIMESTAMP, emission_validated_by = $2";
        }
        // Emission (Action: Emettre)
        // Transition typique : EN_ATTENTE_EMISSION -> EMISE
        else if (newStatus === 'EMISE') {
            extraSet = ", emitted_at = CURRENT_TIMESTAMP, emitted_by = $2, date_emission = CURRENT_DATE";
        }
        // Soumission (Action: Soumettre) - souvent géré ailleurs, mais au cas où
        else if (newStatus === 'EN_ATTENTE_VALIDATION' && this.statut === 'BROUILLON') {
            extraSet = ", submitted_for_validation_at = CURRENT_TIMESTAMP, submitted_for_validation_by = $2";
        }

        const query = `
            UPDATE invoices 
            SET statut = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP ${extraSet}
            WHERE id = $3
        `;
        await pool.query(query, [newStatus, userId, this.id]);
        this.statut = newStatus;
    }

    // Helpers de permissions

    async checkValidationPermission(userId) {
        // Vérifie si l'utilisateur est Associé de la mission OU Responsable de la BU
        // Attention: m.associe_id et bu.responsable_*_id référencent la table `collaborateurs`
        // Il faut donc faire le lien user -> collaborateur
        const query = `
            SELECT 1 
            FROM invoices i
            JOIN missions m ON i.mission_id = m.id
            JOIN business_units bu ON m.business_unit_id = bu.id
            JOIN users u ON u.id = $2
            WHERE i.id = $1 
            AND (
                u.collaborateur_id IN (m.associe_id, bu.responsable_principal_id, bu.responsable_adjoint_id)
            )
         `;
        const result = await pool.query(query, [this.id, userId]);
        return result.rows.length > 0;
    }

    async checkRole(userId, roleCode) {
        const query = `
            SELECT 1 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.id = $1 AND r.name = $2
         `;
        const result = await pool.query(query, [userId, roleCode]);
        return result.rows.length > 0;
    }
}

module.exports = Invoice;