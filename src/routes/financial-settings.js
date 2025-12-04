const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// Table de configuration financière globale
const FINANCIAL_SETTINGS_TABLE = 'financial_settings';

// Récupérer tous les paramètres financiers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT key, value, type, description
            FROM ${FINANCIAL_SETTINGS_TABLE}
        `);

        // Convertir en objet { key: value } avec typage correct
        const settings = {};
        const metadata = {};

        result.rows.forEach(row => {
            let value = row.value;

            // Conversion selon le type
            if (row.type === 'number') {
                value = parseFloat(value);
            } else if (row.type === 'boolean') {
                value = value === 'true';
            } else if (row.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error(`Erreur parsing JSON pour ${row.key}:`, e);
                    value = [];
                }
            }

            settings[row.key] = value;
            metadata[row.key] = {
                description: row.description,
                type: row.type
            };
        });

        // Valeurs par défaut si manquantes
        if (!settings.default_currency) settings.default_currency = 'XAF';
        if (!settings.active_currencies) settings.active_currencies = ['XAF', 'EUR', 'USD'];
        if (!settings.default_tva) settings.default_tva = 19.25;

        res.json({
            success: true,
            data: settings,
            metadata: metadata
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres financiers:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des paramètres financiers' });
    }
});

// Mettre à jour les paramètres financiers
router.put('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updates = req.body; // { key: value, ... }
        const userId = req.user.id;

        for (const [key, value] of Object.entries(updates)) {
            // Déterminer le type (simplifié)
            let type = 'string';
            let stringValue = String(value);

            if (typeof value === 'number') {
                type = 'number';
            } else if (typeof value === 'boolean') {
                type = 'boolean';
            } else if (Array.isArray(value) || typeof value === 'object') {
                type = 'json';
                stringValue = JSON.stringify(value);
            }

            // Upsert
            await client.query(`
                INSERT INTO ${FINANCIAL_SETTINGS_TABLE} (key, value, type, updated_at, updated_by)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    type = EXCLUDED.type,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = EXCLUDED.updated_by
            `, [key, stringValue, type, userId]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Paramètres financiers sauvegardés',
            data: updates
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la sauvegarde des paramètres financiers:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde des paramètres financiers' });
    } finally {
        client.release();
    }
});

// Récupérer un paramètre spécifique (interne ou public)
router.get('/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await pool.query(`
            SELECT value, type
            FROM ${FINANCIAL_SETTINGS_TABLE}
            WHERE key = $1
        `, [key]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Paramètre non trouvé' });
        }

        const row = result.rows[0];
        let value = row.value;

        if (row.type === 'number') value = parseFloat(value);
        else if (row.type === 'boolean') value = value === 'true';
        else if (row.type === 'json') value = JSON.parse(value);

        res.json({ success: true, data: value });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- TAXES CRUD ---

// Lister les taxes
router.get('/taxes/list', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM taxes ORDER BY name ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur lors de la récupération des taxes:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Créer une taxe
router.post('/taxes', authenticateToken, async (req, res) => {
    try {
        const { name, rate, type, description, is_active } = req.body;
        const result = await pool.query(
            'INSERT INTO taxes (name, rate, type, description, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, rate, type, description, is_active]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur création taxe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Mettre à jour une taxe
router.put('/taxes/:id', authenticateToken, async (req, res) => {
    try {
        const { name, rate, type, description, is_active } = req.body;
        const result = await pool.query(
            'UPDATE taxes SET name=$1, rate=$2, type=$3, description=$4, is_active=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
            [name, rate, type, description, is_active, req.params.id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur mise à jour taxe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Supprimer (ou désactiver) une taxe
router.delete('/taxes/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM taxes WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'Taxe supprimée' });
    } catch (error) {
        console.error('Erreur suppression taxe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// --- BU SETTINGS ---

// Lister les BUs (pour le dropdown)
router.get('/bus/list', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nom as name FROM business_units ORDER BY nom ASC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur récupération BUs:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Lister les BUs déjà configurées
router.get('/bu-settings/configured-list', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                bfs.*,
                bu.nom as bu_name
            FROM bu_financial_settings bfs
            JOIN business_units bu ON bfs.business_unit_id = bu.id
            ORDER BY bu.nom ASC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erreur récupération BUs configurées:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Récupérer la config d'une BU
router.get('/bu-settings/:buId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM bu_financial_settings WHERE business_unit_id = $1',
            [req.params.buId]
        );

        if (result.rows.length === 0) {
            // Retourner une config par défaut vide
            return res.json({
                success: true, data: {
                    invoice_prefix: '',
                    invoice_start_number: 1,
                    invoice_footer: '',
                    invoice_template: 'FEES',
                    active_tax_ids: []
                }
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur récupération config BU:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Sauvegarder la config d'une BU
router.put('/bu-settings/:buId', authenticateToken, async (req, res) => {
    try {
        const { invoice_prefix, invoice_start_number, invoice_footer, invoice_template, active_tax_ids } = req.body;
        const buId = req.params.buId;

        const result = await pool.query(`
            INSERT INTO bu_financial_settings (business_unit_id, invoice_prefix, invoice_start_number, invoice_footer, invoice_template, active_tax_ids, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (business_unit_id) DO UPDATE SET
                invoice_prefix = EXCLUDED.invoice_prefix,
                invoice_start_number = EXCLUDED.invoice_start_number,
                invoice_footer = EXCLUDED.invoice_footer,
                invoice_template = EXCLUDED.invoice_template,
                active_tax_ids = EXCLUDED.active_tax_ids,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [buId, invoice_prefix, invoice_start_number, invoice_footer, invoice_template, JSON.stringify(active_tax_ids)]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erreur sauvegarde config BU:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Supprimer la config d'une BU
router.delete('/bu-settings/:buId', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM bu_financial_settings WHERE business_unit_id = $1', [req.params.buId]);
        res.json({ success: true, message: 'Configuration supprimée' });
    } catch (error) {
        console.error('Erreur suppression config BU:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

module.exports = router;
