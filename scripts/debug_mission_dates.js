require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugDateCols() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Date Columns ---');

        try {
            await client.query("SELECT date_fin_prevue FROM missions LIMIT 1");
            console.log("✅ date_fin_prevue works.");
        } catch (e) {
            console.log("❌ date_fin_prevue failed:", e.message);
        }

        try {
            await client.query("SELECT date_fin FROM missions LIMIT 1");
            console.log("✅ date_fin works.");
        } catch (e) {
            console.log("❌ date_fin failed:", e.message);
        }

        try {
            await client.query("SELECT end_date FROM missions LIMIT 1");
            console.log("✅ end_date works.");
        } catch (e) {
            console.log("❌ end_date failed:", e.message);
        }

    } catch (e) {
        console.error('Fatal Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

debugDateCols();
