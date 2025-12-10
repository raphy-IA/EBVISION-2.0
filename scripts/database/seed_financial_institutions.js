const { Pool } = require('pg');
require('dotenv').config();

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const banks = [
    { code: 'AFB', name: 'Afriland First Bank', type: 'BANK', country: 'CMR', swift_code: 'AFRICMCA' },
    { code: 'SGC', name: 'Société Générale Cameroun', type: 'BANK', country: 'CMR', swift_code: 'SOGECMCA' },
    { code: 'BICEC', name: 'Banque Internationale du Cameroun pour l\'Epargne et le Crédit', type: 'BANK', country: 'CMR', swift_code: 'BICECCMA' },
    { code: 'UBA', name: 'United Bank for Africa', type: 'BANK', country: 'CMR', swift_code: 'UBACCMXXX' },
    { code: 'ECO', name: 'Ecobank Cameroun', type: 'BANK', country: 'CMR', swift_code: 'ECOBCMCA' },
    { code: 'BGFI', name: 'BGFI Bank', type: 'BANK', country: 'CMR', swift_code: 'BGFICMCA' },
    { code: 'SCB', name: 'SCB Cameroun', type: 'BANK', country: 'CMR', swift_code: 'SCBCMCA' }
];

async function seedFinancialInstitutions() {
    const client = await pool.connect();
    try {
        console.log('Seeding financial institutions...');
        await client.query('BEGIN');

        for (const bank of banks) {
            // Check if exists by code
            const checkRes = await client.query('SELECT id FROM financial_institutions WHERE code = $1', [bank.code]);

            if (checkRes.rows.length === 0) {
                await client.query(
                    `INSERT INTO financial_institutions (id, code, name, type, country, swift_code, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, true)`,
                    [uuidv4(), bank.code, bank.name, bank.type, bank.country, bank.swift_code]
                );
                console.log(`Included: ${bank.name}`);
            } else {
                console.log(`Skipped (already exists): ${bank.name}`);
            }
        }

        await client.query('COMMIT');
        console.log('Done!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error seeding data:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedFinancialInstitutions();
