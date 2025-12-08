require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugInsert() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Attempting Full Insert...");

        const query = `
            INSERT INTO missions (
                    nom, description, client_id, statut,
                    date_debut, date_fin, 
                    business_unit_id, division_id, 
                    collaborateur_id, manager_id, associe_id, 
                    created_by, fiscal_year_id,
                    created_at, updated_at
            ) VALUES (
                'Test Full', 'Desc', (SELECT id FROM companies LIMIT 1), 'en_cours',
                CURRENT_DATE, CURRENT_DATE,
                (SELECT id FROM business_units LIMIT 1), (SELECT id FROM divisions LIMIT 1),
                (SELECT id FROM collaborateurs LIMIT 1), (SELECT id FROM collaborateurs LIMIT 1), (SELECT id FROM collaborateurs LIMIT 1),
                NULL, (SELECT id FROM fiscal_years LIMIT 1),
                NOW(), NOW()
            )
        `;

        await client.query(query);
        console.log('✅ Insert Successful (Rolled back)');
        await client.query('ROLLBACK');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Insert Failed:', e.message);
        console.error('   Position:', e.position);
    } finally {
        client.release();
        await pool.end();
    }
}

debugInsert();
