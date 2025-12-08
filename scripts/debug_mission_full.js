require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function inspectMission() {
    const client = await pool.connect();
    try {
        console.log("--- Single Mission Dump ---");
        const res = await client.query("SELECT * FROM missions ORDER BY created_at DESC LIMIT 1");
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectMission();
