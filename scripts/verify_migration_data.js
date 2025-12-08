require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verifyData() {
    const client = await pool.connect();
    try {
        console.log("--- 🕵️‍♂️ INDEPENDENT DATA VERIFICATION 🕵️‍♂️ ---");

        // 1. Clients (business_unit_id removed)
        const clients = await client.query("SELECT count(*) FROM clients");
        console.log(`\n📋 CLIENTS Total: ${clients.rows[0].count}`);
        const clientSample = await client.query("SELECT id, nom, statut, created_at FROM clients ORDER BY created_at DESC LIMIT 5");
        console.table(clientSample.rows);

        // 2. Missions
        const missions = await client.query("SELECT count(*) FROM missions");
        console.log(`\n🚀 MISSIONS Total: ${missions.rows[0].count}`);
        // Check if business_unit_id exists in missions before querying
        const mSchema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'business_unit_id'");
        let mQuery = "SELECT id, nom, statut, client_id, created_at FROM missions ORDER BY created_at DESC LIMIT 5";
        if (mSchema.rows.length > 0) {
            mQuery = "SELECT id, nom, statut, client_id, business_unit_id, created_at FROM missions ORDER BY created_at DESC LIMIT 5";
        }
        const missionSample = await client.query(mQuery);
        console.table(missionSample.rows);

        // 3. TimeSheets
        const timesheets = await client.query("SELECT count(*) FROM time_sheets");
        console.log(`\nPm TIMESHEETS Total: ${timesheets.rows[0].count}`);
        const tsSample = await client.query("SELECT id, user_id, week_start, statut, created_at FROM time_sheets ORDER BY created_at DESC LIMIT 5");
        console.table(tsSample.rows);

        // 4. TimeEntries
        const entries = await client.query("SELECT count(*) FROM time_entries");
        console.log(`\n⏱️ TIME ENTRIES Total: ${entries.rows[0].count}`);

        // 5. Users
        const users = await client.query("SELECT count(*) FROM users");
        console.log(`\n👤 USERS Total: ${users.rows[0].count}`);

    } catch (e) {
        console.error("❌ Verification Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyData();
