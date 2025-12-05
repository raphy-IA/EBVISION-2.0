const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/bank-accounts
 * Liste des comptes bancaires
 */
router.get('/', async (req, res) => {
    try {
        const { business_unit_id, is_active } = req.query;

        let query = `
            SELECT 
                ba.*,
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                fi.name as institution_name,
                fi.type as institution_type
            FROM bank_accounts ba
            JOIN business_units bu ON ba.business_unit_id = bu.id
            JOIN financial_institutions fi ON ba.financial_institution_id = fi.id
            WHERE 1=1
        `;
        const params = [];

        if (business_unit_id) {
            params.push(business_unit_id);
            query += ` AND ba.business_unit_id = $${params.length}`;
        }

        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` AND ba.is_active = $${params.length}`;
        }

        query += ' ORDER BY bu.nom, ba.is_default DESC, ba.account_name';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erreur récupération comptes bancaires:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/bank-accounts
 * Créer un compte bancaire
 */
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            business_unit_id,
            financial_institution_id,
            account_number,
            account_name,
            iban,
            currency,
            is_default,
            notes
        } = req.body;

        if (!business_unit_id || !financial_institution_id || !account_number || !account_name) {
            return res.status(400).json({
                success: false,
                error: 'Les champs BU, établissement, numéro et nom de compte sont obligatoires'
            });
        }

        await client.query('BEGIN');

        // Si is_default = true, désactiver les autres comptes par défaut de cette BU
        if (is_default) {
            await client.query(`
                UPDATE bank_accounts
                SET is_default = false
                WHERE business_unit_id = $1
            `, [business_unit_id]);
        }

        const query = `
            INSERT INTO bank_accounts (
                business_unit_id, financial_institution_id, account_number,
                account_name, iban, currency, is_default, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await client.query(query, [
            business_unit_id,
            financial_institution_id,
            account_number,
            account_name,
            iban,
            currency || 'XAF',
            is_default || false,
            notes,
            req.user.id
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Compte bancaire créé'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur création compte bancaire:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Un compte avec ce numéro existe déjà pour cette BU'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/bank-accounts/:id
 * Modifier un compte bancaire
 */
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            account_number,
            account_name,
            iban,
            currency,
            is_default,
            is_active,
            notes
        } = req.body;

        await client.query('BEGIN');

        // Vérifier que le compte existe
        const checkQuery = `SELECT * FROM bank_accounts WHERE id = $1`;
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Compte bancaire introuvable'
            });
        }

        const account = checkResult.rows[0];

        // Si is_default = true, désactiver les autres comptes par défaut de cette BU
        if (is_default) {
            await client.query(`
                UPDATE bank_accounts
                SET is_default = false
                WHERE business_unit_id = $1 AND id != $2
            `, [account.business_unit_id, id]);
        }

        const updateQuery = `
            UPDATE bank_accounts
            SET
                account_number = COALESCE($1, account_number),
                account_name = COALESCE($2, account_name),
                iban = COALESCE($3, iban),
                currency = COALESCE($4, currency),
                is_default = COALESCE($5, is_default),
                is_active = COALESCE($6, is_active),
                notes = COALESCE($7, notes),
                updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            account_number,
            account_name,
            iban,
            currency,
            is_default,
            is_active,
            notes,
            req.user.id,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Compte bancaire mis à jour'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur mise à jour compte bancaire:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/bank-accounts/:id
 * Désactiver un compte bancaire (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE bank_accounts
            SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [req.user.id, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Compte bancaire introuvable'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Compte bancaire désactivé'
        });

    } catch (error) {
        console.error('Erreur désactivation compte bancaire:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
