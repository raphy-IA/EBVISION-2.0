require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    const client = await pool.connect();
    try {
        const cols = ['mission_id'];
        const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = ANY($1)`, [cols]);
        console.log("TIME_ENTRIES MISSION_ID:", JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { client.release(); pool.end(); }
}
run();
