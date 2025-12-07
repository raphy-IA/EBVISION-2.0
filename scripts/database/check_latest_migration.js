
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

async function checkTable() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT to_regclass('public.validation_companies') as exists");
        console.log('Table validation_companies exists:', res.rows[0].exists !== null);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkTable();
