const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
    try {
        console.log('--- SCHEMA DE TIME_ENTRIES ---');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
