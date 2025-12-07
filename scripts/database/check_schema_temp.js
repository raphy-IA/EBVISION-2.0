
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

async function checkSchema() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'objective_units'");
        console.log('Columns for objective_units:', JSON.stringify(res.rows, null, 2));
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkSchema();
