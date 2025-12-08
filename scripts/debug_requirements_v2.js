require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugReqs() {
    const client = await pool.connect();
    try {
        console.log("--- Missions Columns ---");
        const mCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'missions'");
        const allCols = mCols.rows.map(r => r.column_name);
        console.log("Has 'code'?", allCols.includes('code'));
        console.log("Has 'reference'?", allCols.includes('reference'));
        console.log("All Columns:", allCols.sort().join(', '));

        console.log("\n--- Mission Types (All Rows) ---");
        const mt = await client.query("SELECT * FROM mission_types");
        console.log(JSON.stringify(mt.rows, null, 2));

        console.log("\n--- Fiscal Years (All Rows) ---");
        const fy = await client.query("SELECT * FROM fiscal_years");
        console.log(JSON.stringify(fy.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

debugReqs();
