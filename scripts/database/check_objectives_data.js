
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function check() {
    try {
        const units = await pool.query('SELECT count(*) FROM objective_units');
        const types = await pool.query('SELECT count(*) FROM objective_types');
        console.log('Units count:', units.rows[0].count);
        console.log('Types count:', types.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
