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
        const res = await client.query('SELECT count(*) as count FROM time_entries WHERE heures = 0 OR heures IS NULL');
        console.log("ZERO HOUR ENTRIES COUNT:", res.rows[0].count);

        const countRes = await client.query('SELECT count(*) as total FROM time_entries');
        console.log("TOTAL ENTRIES:", countRes.rows[0].total);
    } catch (e) { console.error(e); }
    finally { client.release(); pool.end(); }
}
run();
