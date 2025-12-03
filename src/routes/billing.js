const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// Fonction utilitaire pour parser les conditions de paiement
function parsePaymentConditions(conditions) {
    if (!conditions) return [];

    try {
        // Cas 1: C'est déjà un objet/tableau JS
        if (typeof conditions === 'object') {
            if (Array.isArray(conditions)) return conditions;
            return Object.values(conditions);
        }

        // Cas 2: C'est une chaîne
        if (typeof conditions === 'string') {
            // Nettoyage préliminaire
            let cleanStr = conditions.trim();

            // Cas spécial: Format tableau PostgreSQL stringifié "{"...","..."}"
            if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
                if (cleanStr.includes(':')) {
                    try {
                        const parsed = JSON.parse(cleanStr);
                        if (!Array.isArray(parsed)) return Object.values(parsed);
                        return parsed;
                    } catch (e) { }
                }

                try {
                    const arrayStr = cleanStr.replace(/^\{/, '[').replace(/\}$/, ']');
                    const parsedArray = JSON.parse(arrayStr);

                    if (Array.isArray(parsedArray)) {
                        return parsedArray.map(item => {
                            if (typeof item === 'string') {
                                try { return JSON.parse(item); } catch (e) { return item; }
                            }
                            return item;
                        });
                    }
                } catch (e) {
                    console.warn('Echec conversion tableau PG -> JSON:', e);
                }
            }

            // Tentative de parsing standard
            let parsed = JSON.parse(cleanStr);

            // Gestion double encodage
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { }
            }

            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed);
        }

        return [];
    } catch (error) {
        console.error('Erreur parsing conditions paiement:', error);
        return [];
    }
}

// GET /api/billing/upcoming - Prochaines facturations
router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT m.id, m.nom, m.code, m.client_id, c.nom as client_nom, m.conditions_paiement
            FROM missions m
            JOIN clients c ON m.client_id = c.id
            WHERE m.conditions_paiement IS NOT NULL
            AND m.statut = 'EN_COURS'
        `;

        const result = await pool.query(query);
        const upcoming = [];

        for (const row of result.rows) {
            const conditions = parsePaymentConditions(row.conditions_paiement);

            conditions.forEach((cond, index) => {
                const datePrevue = cond.date_prevue || cond.datePrevisionnelle;
                if (datePrevue && new Date(datePrevue) > new Date()) {
                    upcoming.push({
                        mission_id: row.id,
                        mission_nom: row.nom,
                        client_nom: row.client_nom,
                        next_condition: {
                            ...cond,
                            date_prevue: datePrevue
                        },
                        index: index
                    });
                }
            });
        }

        upcoming.sort((a, b) => new Date(a.next_condition.date_prevue) - new Date(b.next_condition.date_prevue));
        res.json({ success: true, data: upcoming.slice(0, 10) });

    } catch (error) {
        console.error('Erreur récupération facturations à venir:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/billing/mission/:id/next - Prochaine facturation pour une mission
router.get('/mission/:id/next', authenticateToken, async (req, res) => {
    try {
        const missionId = req.params.id;

        // 1. Récupérer la mission
        const missionResult = await pool.query('SELECT * FROM missions WHERE id = $1', [missionId]);
        if (missionResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Mission non trouvée' });
        }
        const mission = missionResult.rows[0];

        // 2. Récupérer le total déjà facturé
        const invoicesQuery = `
            SELECT SUM(montant_ht) as total_facture
            FROM invoices 
            WHERE mission_id = $1 AND statut != 'ANNULEE'
        `;
        const invoicesResult = await pool.query(invoicesQuery, [missionId]);
        const totalFacture = parseFloat(invoicesResult.rows[0].total_facture || 0);

        // 3. Analyser les conditions de paiement
        const conditions = parsePaymentConditions(mission.conditions_paiement);

        let nextBilling = null;
        let cumulAttendu = 0;

        // Chercher la prochaine condition non atteinte
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];

            const montantHonoraires = parseFloat(cond.montant_honoraires || cond.montantHonoraires || 0);
            const montantDebours = parseFloat(cond.montant_debours || cond.montantDebours || 0);
            const datePrevue = cond.date_prevue || cond.datePrevisionnelle;
            const details = cond.details || cond.description || `Tranche ${i + 1}`;

            const montantPrevu = montantHonoraires + montantDebours;
            cumulAttendu += montantPrevu;

            if (totalFacture < cumulAttendu - 1) { // Marge d'erreur de 1
                nextBilling = {
                    type: 'CONDITION',
                    condition_index: i,
                    description: details,
                    montant_honoraires: montantHonoraires,
                    montant_debours: montantDebours,
                    date_prevue: datePrevue,
                    montant_total: montantPrevu
                };

                const dejaPayeSurTranche = totalFacture - (cumulAttendu - montantPrevu);
                if (dejaPayeSurTranche > 0) {
                    nextBilling.montant_total -= dejaPayeSurTranche;
                    nextBilling.description += ' (Solde tranche)';
                }
                break;
            }
        }

        // Si toutes les conditions sont passées, proposer le solde
        if (!nextBilling) {
            const budgetTotal = parseFloat(mission.montant_honoraires || 0) + parseFloat(mission.montant_debours || 0);
            const resteAFacturer = budgetTotal - totalFacture;

            if (resteAFacturer > 1) {
                nextBilling = {
                    type: 'BALANCE',
                    description: 'Solde de la mission',
                    montant_honoraires: Math.max(0, parseFloat(mission.montant_honoraires || 0) - totalFacture),
                    montant_debours: parseFloat(mission.montant_debours || 0),
                    montant_total: resteAFacturer,
                    date_prevue: null
                };
            }
        }

        res.json({ success: true, data: nextBilling });

    } catch (error) {
        console.error('Erreur lors du calcul de la prochaine facturation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/billing/generate - Générer une facture brouillon
router.post('/generate', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { mission_id, condition_index, type } = req.body;

        await client.query('BEGIN');

        // 1. Récupérer la mission
        const missionRes = await client.query('SELECT * FROM missions WHERE id = $1', [mission_id]);
        if (missionRes.rows.length === 0) throw new Error('Mission introuvable');
        const mission = missionRes.rows[0];

        // 2. Déterminer les montants et la description
        let description = '';
        let montant_ht = 0;
        let items = [];

        if (type === 'CONDITION' && condition_index !== undefined) {
            const conditions = parsePaymentConditions(mission.conditions_paiement);
            const cond = conditions[condition_index];
            if (!cond) throw new Error('Condition de paiement introuvable');

            description = cond.details || cond.description || `Facture Tranche ${parseInt(condition_index) + 1}`;
            const honoraires = parseFloat(cond.montant_honoraires || cond.montantHonoraires || 0);
            const debours = parseFloat(cond.montant_debours || cond.montantDebours || 0);
            montant_ht = honoraires + debours;

            if (honoraires > 0) items.push({ description: `Honoraires - ${description}`, montant: honoraires, type: 'HONORAIRES' });
            if (debours > 0) items.push({ description: `Débours - ${description}`, montant: debours, type: 'DEBOURS' });
        } else {
            description = 'Facture de solde';
            items.push({ description: 'Solde Honoraires', montant: 0, type: 'HONORAIRES' });
        }

        // 3. Générer le numéro de facture (Format: FACT-YYYYMM-XXXX)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `FACT-${year}${month}-`;

        const seqRes = await client.query(`
            SELECT COUNT(*) as count FROM invoices WHERE numero_facture LIKE $1
        `, [`${prefix}%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const numeroFacture = `${prefix}${String(nextSeq).padStart(4, '0')}`;

        // 4. Calculer la date d'échéance (J+30 par défaut)
        const dateEcheance = new Date();
        dateEcheance.setDate(dateEcheance.getDate() + 30);

        // 5. Créer la facture
        // Utilisation de notes_facture au lieu de description/objet qui n'existent pas
        // montant_ht et montant_ttc sont des colonnes générées, on ne les insère pas
        const invoiceQuery = `
            INSERT INTO invoices (
                mission_id, client_id, statut, date_emission, date_echeance,
                notes_facture, numero_facture, created_by, created_at
            ) VALUES (
                $1, $2, 'BROUILLON', CURRENT_DATE, $3,
                $4, $5, $6, CURRENT_TIMESTAMP
            ) RETURNING id, numero_facture
        `;

        const invoiceRes = await client.query(invoiceQuery, [
            mission.id, mission.client_id, dateEcheance,
            description, numeroFacture, req.user.id
        ]);
        const invoice = invoiceRes.rows[0];

        // 6. Créer les lignes de facture
        for (const item of items) {
            await client.query(`
                INSERT INTO invoice_items (
                    invoice_id, description, quantite, prix_unitaire, 
                    montant_ht, montant_ttc, taux_tva, montant_tva
                )
                VALUES ($1, $2, 1, $3, $3, $3, 0, 0)
            `, [invoice.id, item.description, item.montant]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            data: { invoice_id: invoice.id, numero: invoice.numero_facture }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur génération facture:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;
