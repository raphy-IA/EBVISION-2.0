require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkStatus() {
    const client = await pool.connect();
    try {
        console.log("--- Existing TimeSheet Statuses ---");
        const res = await client.query("SELECT DISTINCT statut FROM time_sheets");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkStatus();
