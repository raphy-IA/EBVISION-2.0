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
        console.log("--- Missions Schema (looking for 'code') ---");
        const mSchema = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'code'");
        console.log(mSchema.rows);

        console.log("\n--- Mission Types ---");
        const mt = await client.query("SELECT * FROM mission_types");
        console.table(mt.rows);

        console.log("\n--- Fiscal Years ---");
        const fy = await client.query("SELECT * FROM fiscal_years");
        console.table(fy.rows);

        console.log("\n--- Internal Activities Schema ---");
        const iaSchema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'internal_activities'");
        console.log(iaSchema.rows.map(r => r.column_name));

        console.log("\n--- Payment Conditions (if table exists) ---");
        try {
            const pc = await client.query("SELECT * FROM payment_conditions");
            console.table(pc.rows);
        } catch (e) {
            console.log("No payment_conditions table found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

debugReqs();
