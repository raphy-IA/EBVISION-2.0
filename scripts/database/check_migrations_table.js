
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

async function inspect() {
    try {
        const client = await pool.connect();

        // Check columns
        const resCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'schema_migrations'");
        console.log('Columns:', JSON.stringify(resCols.rows, null, 2));

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();
