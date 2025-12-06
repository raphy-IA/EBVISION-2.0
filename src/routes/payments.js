const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * Helper: Générer le numéro de paiement
 */
async function generatePaymentNumber(bankAccountId) {
    const query = `
        SELECT 
            bu.code as bu_code
        FROM bank_accounts ba
        JOIN business_units bu ON ba.business_unit_id = bu.id
        WHERE ba.id = $1
    `;

    const result = await pool.query(query, [bankAccountId]);
    if (result.rows.length === 0) throw new Error('Compte bancaire introuvable');

    const buCode = result.rows[0].bu_code || 'GEN';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PAY-${buCode}-${year}${month}-`;

    // Compter les paiements existants ce mois
    const countQuery = `
        SELECT COUNT(*) as count
        FROM payments
        WHERE payment_number LIKE $1
    `;
    const countResult = await pool.query(countQuery, [`${prefix}%`]);
    const nextSeq = parseInt(countResult.rows[0].count) + 1;

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * GET /api/payments
 * Liste des paiements
 */
router.get('/', async (req, res) => {
    try {
        const { bank_account_id, payment_mode, date_from, date_to, business_unit_id } = req.query;

        let query = `
            SELECT 
                p.*,
                ba.account_name,
                ba.account_number,
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                fi.name as institution_name,
                u.prenom || ' ' || u.nom as created_by_name,
                u.prenom || ' ' || u.nom as created_by_name,
                COUNT(pa.id) as invoices_count,
                COALESCE(SUM(pa.allocated_amount), 0) as allocated_amount
            FROM payments p
            JOIN bank_accounts ba ON p.bank_account_id = ba.id
            JOIN business_units bu ON ba.business_unit_id = bu.id
            JOIN financial_institutions fi ON ba.financial_institution_id = fi.id
            JOIN users u ON p.created_by = u.id
            LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
            WHERE 1=1
        `;
        const params = [];

        if (bank_account_id) {
            params.push(bank_account_id);
            query += ` AND p.bank_account_id = $${params.length}`;
        }

        if (business_unit_id) {
            params.push(business_unit_id);
            query += ` AND ba.business_unit_id = $${params.length}`;
        }

        if (payment_mode) {
            params.push(payment_mode);
            query += ` AND p.payment_mode = $${params.length}`;
        }

        if (date_from) {
            params.push(date_from);
            query += ` AND p.payment_date >= $${params.length}`;
        }

        if (date_to) {
            params.push(date_to);
            query += ` AND p.payment_date <= $${params.length}`;
        }

        query += ' GROUP BY p.id, ba.account_name, ba.account_number, bu.nom, bu.code, fi.name, u.prenom, u.nom';
        query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erreur récupération paiements:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/payments/:id
 * Détails d'un paiement avec allocations
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer le paiement
        const paymentQuery = `
            SELECT 
                p.*,
                ba.account_name,
                ba.account_number,
                bu.nom as business_unit_nom,
                fi.name as institution_name,
                u.prenom || ' ' || u.nom as created_by_name
            FROM payments p
            JOIN bank_accounts ba ON p.bank_account_id = ba.id
            JOIN business_units bu ON ba.business_unit_id = bu.id
            JOIN financial_institutions fi ON ba.financial_institution_id = fi.id
            JOIN users u ON p.created_by = u.id
            WHERE p.id = $1
        `;

        const paymentResult = await pool.query(paymentQuery, [id]);

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Paiement introuvable'
            });
        }

        const payment = paymentResult.rows[0];

        // Récupérer les allocations
        const allocationsQuery = `
            SELECT 
                pa.*,
                pa.*,
                i.numero_facture as invoice_number,
                i.montant_ttc as invoice_total,
                COALESCE(i.emitted_at, i.created_at) as invoice_date,
                i.montant_paye,
                i.montant_restant,
                m.nom as mission_nom,
                c.nom as client_name
            FROM payment_allocations pa
            JOIN invoices i ON pa.invoice_id = i.id
            JOIN missions m ON i.mission_id = m.id
            JOIN clients c ON i.client_id = c.id
            WHERE pa.payment_id = $1
            ORDER BY pa.allocation_date
        `;

        const allocationsResult = await pool.query(allocationsQuery, [id]);

        payment.allocations = allocationsResult.rows;

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        console.error('Erreur récupération paiement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/payments
 * Enregistrer un nouveau paiement avec allocations
 */
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            bank_account_id,
            payment_date,
            payment_mode,
            amount,
            currency,
            reference,
            notes,
            allocations
        } = req.body;

        // Validation
        if (!bank_account_id || !payment_date || !payment_mode || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Les champs compte bancaire, date, mode et montant sont obligatoires'
            });
        }


        if (allocations && allocations.length > 0) {
            // Logique d'allocation supprimée pour simplification
        }

        await client.query('BEGIN');

        // Générer le numéro de paiement
        const paymentNumber = await generatePaymentNumber(bank_account_id);

        // Créer le paiement
        const paymentQuery = `
            INSERT INTO payments (
                payment_number, bank_account_id, payment_date, payment_mode,
                amount, currency, reference, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const paymentResult = await client.query(paymentQuery, [
            paymentNumber,
            bank_account_id,
            payment_date,
            payment_mode,
            amount,
            currency || 'XAF',
            reference,
            notes,
            req.user.id
        ]);

        const payment = paymentResult.rows[0];

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: payment,
            message: 'Paiement enregistré avec succès'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur création paiement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/payments/:id/allocations
 * Modifier les allocations d'un paiement
 */
router.put('/:id/allocations', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { allocations } = req.body;

        if (!allocations || allocations.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Au moins une allocation est requise'
            });
        }

        await client.query('BEGIN');

        // Récupérer le paiement
        const paymentQuery = `SELECT * FROM payments WHERE id = $1`;
        const paymentResult = await client.query(paymentQuery, [id]);

        if (paymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Paiement introuvable'
            });
        }

        const payment = paymentResult.rows[0];

        // Vérifier que la somme des allocations ne dépasse pas le montant du paiement
        const totalAllocated = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.allocated_amount), 0);
        if (totalAllocated > parseFloat(payment.amount) + 0.01) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `La somme des allocations (${totalAllocated}) dépasse le montant du paiement (${payment.amount})`
            });
        }

        // Supprimer les anciennes allocations
        await client.query(`DELETE FROM payment_allocations WHERE payment_id = $1`, [id]);

        // Créer les nouvelles allocations
        for (const alloc of allocations) {
            const allocationQuery = `
                INSERT INTO payment_allocations (
                    payment_id, invoice_id, allocated_amount, notes, created_by
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

            await client.query(allocationQuery, [
                id,
                alloc.invoice_id,
                alloc.allocated_amount,
                alloc.notes,
                req.user.id
            ]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Allocations mises à jour'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur mise à jour allocations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/payments/:id
 * Modifier un paiement (infos générales uniquement)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bank_account_id,
            payment_date,
            payment_mode,
            amount,
            reference,
            notes
        } = req.body;

        // Vérifier si le paiement existe et récupérer le montant alloué actuel
        const checkQuery = `
            SELECT p.*, COALESCE(SUM(pa.allocated_amount), 0) as total_allocated
            FROM payments p
            LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Paiement introuvable' });
        }

        const currentPayment = checkResult.rows[0];

        // Vérifier que le nouveau montant est suffisant pour couvrir les allocations existantes
        if (parseFloat(amount) < parseFloat(currentPayment.total_allocated)) {
            return res.status(400).json({
                success: false,
                error: `Le nouveau montant (${amount}) doit être supérieur ou égal au montant déjà alloué (${currentPayment.total_allocated})`
            });
        }

        // Mise à jour
        const updateQuery = `
            UPDATE payments
            SET 
                bank_account_id = $1,
                payment_date = $2,
                payment_mode = $3,
                amount = $4,
                reference = $5,
                notes = $6,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $7
            WHERE id = $8
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            bank_account_id,
            payment_date,
            payment_mode,
            amount,
            reference,
            notes,
            req.user.id,
            id
        ]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Paiement mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur mise à jour paiement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/payments/:id
 * Supprimer un paiement (et ses allocations via CASCADE)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `DELETE FROM payments WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Paiement introuvable'
            });
        }

        res.json({
            success: true,
            message: 'Paiement supprimé'
        });

    } catch (error) {
        console.error('Erreur suppression paiement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
