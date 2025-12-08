require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        const sample = await client.query("SELECT password_hash FROM users LIMIT 1");
        console.log("HASH SAMPLE:", sample.rows[0]?.password_hash);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
