require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSchema() {
    console.log('🔍 Checking schema for table: companies');
    try {
        const res = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name LIKE 'admin_%'"
        );
        console.log('Found Columns:', res.rows.map(r => r.column_name));

        if (res.rows.length === 3) {
            console.log('✅ Success: All 3 admin columns found.');
        } else {
            console.error('❌ Failure: Missing columns.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkSchema();
