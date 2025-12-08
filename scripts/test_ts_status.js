require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testStatus() {
    const client = await pool.connect();
    try {
        const candidates = ['sauvegardé', 'sauvegarde', 'soumis', 'validé', 'valide', 'rejeté', 'rejete', 'saisie', 'en_cours'];

        // Get a valid user
        const uRes = await client.query('SELECT id FROM collaborateurs LIMIT 1');
        const userId = uRes.rows[0].id;

        for (const status of candidates) {
            try {
                process.stdout.write(`Testing '${status}'... `);
                await client.query('BEGIN');
                await client.query(
                    `INSERT INTO time_sheets (user_id, week_start, week_end, statut, created_at, updated_at)
                     VALUES ($1, '2023-01-01', '2023-01-07', $2, NOW(), NOW())`,
                    [userId, status]
                );
                console.log('✅ SUCCESS');
                await client.query('ROLLBACK');
                break;
            } catch (e) {
                await client.query('ROLLBACK');
                console.log(`❌ Failed (${e.constraint || e.message})`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

testStatus();
