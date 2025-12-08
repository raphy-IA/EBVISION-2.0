require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function analyzeBU() {
    const client = await pool.connect();
    try {
        console.log("--- Business Unit Analysis ---");

        // 1. Get BU Names
        const bus = await client.query("SELECT id, nom FROM business_units");
        const buMap = new Map();
        bus.rows.forEach(r => buMap.set(r.id, r.nom));
        console.log("BUs:", JSON.stringify(bus.rows, null, 2));

        // 2. Missions Distribution
        const mDist = await client.query(`
            SELECT business_unit_id, count(*) 
            FROM missions 
            GROUP BY business_unit_id
        `);
        console.log("\nMissions per BU:");
        mDist.rows.forEach(r => {
            console.log(`   ${buMap.get(r.business_unit_id) || r.business_unit_id}: ${r.count}`);
        });

        // 3. User Assignments (Sample)
        const users = await client.query(`
            SELECT u.email, c.nom, c.prenom, c.business_unit_id 
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id
            ORDER BY u.created_at ASC
        `);
        console.log("\nUsers and their BUs:");
        users.rows.forEach(r => {
            console.log(`   ${r.email} (${r.nom} ${r.prenom}) -> BU: ${buMap.get(r.business_unit_id) || 'NULL'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

analyzeBU();
