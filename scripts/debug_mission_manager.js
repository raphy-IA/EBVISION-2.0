require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugManager() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Manager/Associe Columns ---');

        try {
            await client.query("SELECT manager_id FROM missions LIMIT 1");
            console.log("✅ manager_id works.");
        } catch (e) {
            console.log("❌ manager_id failed:", e.message);
        }

        try {
            await client.query("SELECT associe_id FROM missions LIMIT 1");
            console.log("✅ associe_id works.");
        } catch (e) {
            console.log("❌ associe_id failed:", e.message);
        }

    } catch (e) {
        console.error('Fatal Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

debugManager();
