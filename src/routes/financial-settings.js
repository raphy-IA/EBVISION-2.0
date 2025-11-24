const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// Table de configuration financière globale
const FINANCIAL_SETTINGS_TABLE = 'financial_settings';

async function createFinancialSettingsTableIfNotExists() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${FINANCIAL_SETTINGS_TABLE} (
            id SERIAL PRIMARY KEY,
            default_currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
            active_currencies JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

// Récupérer les paramètres financiers
router.get('/', authenticateToken, async (req, res) => {
    try {
        await createFinancialSettingsTableIfNotExists();

        const result = await pool.query(`
            SELECT default_currency, active_currencies
            FROM ${FINANCIAL_SETTINGS_TABLE}
            ORDER BY id ASC
            LIMIT 1
        `);

        let settings;
        if (result.rows.length === 0) {
            // Valeurs par défaut
            settings = {
                defaultCurrency: 'XAF',
                activeCurrencies: ['XAF', 'EUR', 'USD', 'GBP', 'CHF']
            };
        } else {
            const row = result.rows[0];
            settings = {
                defaultCurrency: row.default_currency || 'XAF',
                activeCurrencies: Array.isArray(row.active_currencies) ? row.active_currencies : ['XAF', 'EUR', 'USD', 'GBP', 'CHF']
            };
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres financiers:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des paramètres financiers' });
    }
});

// Mettre à jour les paramètres financiers (réservé aux utilisateurs authentifiés; on pourra restreindre aux admins plus tard)
router.put('/', authenticateToken, async (req, res) => {
    try {
        await createFinancialSettingsTableIfNotExists();

        const { defaultCurrency, activeCurrencies } = req.body;

        const safeDefault = defaultCurrency || 'XAF';
        const safeList = Array.isArray(activeCurrencies) && activeCurrencies.length > 0
            ? activeCurrencies
            : ['XAF', 'EUR', 'USD', 'GBP', 'CHF'];

        // Upsert sur une unique ligne (id = 1)
        await pool.query(`
            INSERT INTO ${FINANCIAL_SETTINGS_TABLE} (id, default_currency, active_currencies, updated_at)
            VALUES (1, $1, $2::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                default_currency = EXCLUDED.default_currency,
                active_currencies = EXCLUDED.active_currencies,
                updated_at = CURRENT_TIMESTAMP
        `, [safeDefault, JSON.stringify(safeList)]);

        res.json({ success: true, message: 'Paramètres financiers sauvegardés', data: { defaultCurrency: safeDefault, activeCurrencies: safeList } });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres financiers:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde des paramètres financiers' });
    }
});

module.exports = router;
