require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    const client = await pool.connect();
    try {
        console.log("--- CLIENTS TABLE COLUMNS ---");
        const res = await client.query(`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clients'
            ORDER BY ordinal_position
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
check();
