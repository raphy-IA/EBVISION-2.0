const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function quickCheck() {
    const client = await pool.connect();

    // Vérifications simples
    const checks = [
        ['prospecting_campaign_validation_companies', 'create_validation_companies_table.sql'],
        ['payments', '019_create_payments.sql'],
        ['bank_accounts', '018_create_bank_accounts.sql'],
        ['financial_institutions', '017_create_financial_institutions.sql']
    ];

    let missing = [];

    for (const [table, migration] of checks) {
        const res = await client.query(`SELECT to_regclass('public.${table}') as exists`);
        if (res.rows[0].exists === null) {
            missing.push({ table, migration });
        }
    }

    // Check manager_id column
    const managerCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'manager_id'
    `);

    if (managerCheck.rows.length === 0) {
        missing.push({ table: 'missions.manager_id', migration: '023_add_manager_id_to_missions.sql' });
    }

    console.log(`\nÉléments manquants dans schema-structure-only.sql: ${missing.length}`);
    if (missing.length > 0) {
        console.log('\nDÉTAIL:');
        missing.forEach(m => console.log(`  ❌ ${m.table} (${m.migration})`));
        console.log('\n⚠️  CONFIRMATION: schema-structure-only.sql est OBSOLÈTE');
    } else {
        console.log('✅ Le schéma est complet');
    }

    client.release();
    pool.end();
}

quickCheck().catch(console.error);
