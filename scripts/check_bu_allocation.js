require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- Schema: collaborators ---');
        const colSchema = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' AND column_name = 'business_unit_id'
        `);
        console.log('Has business_unit_id:', colSchema.rows.length > 0);

        console.log('\n--- Data Check ---');
        console.log('Checking a few users...');
        const res = await client.query(`
            SELECT u.email, u.business_unit_id as user_bu, c.business_unit_id as col_bu
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE c.business_unit_id IS NOT NULL
            LIMIT 5
        `);
        console.table(res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
check();
