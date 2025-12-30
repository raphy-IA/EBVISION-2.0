const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MISSION_CODE = process.argv[2] || 'MIS-20251226-391';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkClient() {
    const client = await pool.connect();
    try {
        console.log(`Checking Client for Mission Code: ${MISSION_CODE}`);

        const res = await client.query(`
            SELECT 
                m.id as mission_id, 
                m.nom as mission_nom, 
                m.code as mission_code,
                c.id as client_id,
                c.nom as client_nom,
                c.sigle as client_sigle
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE m.code = $1 OR m.nom ILIKE $1
        `, [MISSION_CODE]);

        if (res.rows.length === 0) {
            console.log("❌ Mission not found.");
        } else {
            const row = res.rows[0];
            console.log("✅ Mission Found:");
            console.table(row);

            console.log("\nFrontend Logic Simulation:");
            console.log(`mission.client_sigle || mission.client_nom`);
            console.log(`Result: "${row.client_sigle || row.client_nom}"`);

            if (row.client_sigle === 'ACDP22E2') {
                console.log("\n❌ DIAGNOSIS: The 'sigle' is indeed 'ACDP22E2'. Frontend prioritizes sigle.");
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkClient();
