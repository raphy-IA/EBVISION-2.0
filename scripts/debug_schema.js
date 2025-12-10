require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listColumns() {
    const client = await pool.connect();
    try {
        console.log("🔍 Checking columns for 'mission_types'...");
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mission_types'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

listColumns();
