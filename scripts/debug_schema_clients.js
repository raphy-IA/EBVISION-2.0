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
        const res = await client.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'missions'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { client.release(); pool.end(); }
}
run();
