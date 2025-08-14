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
        this.division_code = data.division_code;
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

            const query = `
                INSERT INTO invoices (
                    numero_facture, mission_id, client_id, date_emission, date_echeance, statut,
                    conditions_paiement, taux_tva, adresse_facturation, notes_facture,
                    created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
                invoiceData.created_by
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
            WHERE i.id = $1
        `;

        const result = await pool.query(query, [id]);
        return result.rows.length > 0 ? new Invoice(result.rows[0]) : null;
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
            search
        } = options;

        let conditions = [];
        let values = [];
        let valueIndex = 1;

        // Construire les conditions de filtrage
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
                WHERE id = $9
                RETURNING *
            `;

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
            INSERT INTO invoice_items (
                invoice_id, description, quantite, unite, prix_unitaire,
                taux_tva, task_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
                ip.*,
                u.nom as created_by_nom,
                u.prenom as created_by_prenom
            FROM invoice_payments ip
            LEFT JOIN users u ON ip.created_by = u.id
            WHERE ip.invoice_id = $1
            ORDER BY ip.date_paiement DESC
        `;

        const result = await pool.query(query, [this.id]);
        return result.rows;
    }

    // Ajouter un paiement
    async addPayment(paymentData) {
        const query = `
            INSERT INTO invoice_payments (
                invoice_id, numero_paiement, date_paiement, montant,
                mode_paiement, reference_paiement, statut, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    // Supprimer un paiement
    async removePayment(paymentId) {
        const query = 'DELETE FROM invoice_payments WHERE id = $1 AND invoice_id = $2';
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
                        `INSERT INTO invoice_items (invoice_id, description, quantite, unite, prix_unitaire, taux_tva)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            this.id,
                            `Honoraires - ${mission.mission_nom || ''}`.trim(),
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
                        `INSERT INTO invoice_items (invoice_id, description, quantite, unite, prix_unitaire, taux_tva)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            this.id,
                            `Débours - ${mission.mission_nom || ''}`.trim(),
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
                        INSERT INTO invoice_items (
                            invoice_id, description, quantite, unite, prix_unitaire, taux_tva
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `;

                    const montantHT = parseFloat(condition.montant_honoraires);
                    const montantTVA = montantHT * (this.taux_tva / 100);
                    const honorairesValues = [
                        this.id,
                        `Honoraires - ${condition.details || 'Tranche ' + (condition.numero || '')}`,
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
                        INSERT INTO invoice_items (
                            invoice_id, description, quantite, unite, prix_unitaire, taux_tva
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `;

                    const montantHT = parseFloat(condition.montant_debours);
                    const montantTVA = montantHT * (this.taux_tva / 100);
                    const deboursValues = [
                        this.id,
                        `Débours - ${condition.details || 'Tranche ' + (condition.numero || '')}`,
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
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_factures,
                COUNT(CASE WHEN statut = 'EMISE' THEN 1 END) as factures_emises,
                COUNT(CASE WHEN statut = 'PAYEE' THEN 1 END) as factures_payees,
                COUNT(CASE WHEN statut = 'BROUILLON' THEN 1 END) as factures_brouillon,
                SUM(montant_ttc) as total_montant_ttc,
                SUM(montant_paye) as total_montant_paye,
                SUM(montant_restant) as total_montant_restant
            FROM invoices
        `;

        const result = await pool.query(query);
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
}

module.exports = Invoice; 