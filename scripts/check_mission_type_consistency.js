require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkMissionTypes() {
    const client = await pool.connect();
    try {
        console.log("🔍 Checking consistency between 'type_mission' and 'mission_type_id'...");

        // Found via debug_schema: 'codification' and 'libelle'
        const codeCol = 'codification';
        const nameCol = 'libelle';

        console.log(`ℹ️ Comparison columns: '${codeCol}' & '${nameCol}'`);

        const res = await client.query(`
            SELECT 
                m.id, 
                m.type_mission AS string_type, 
                m.mission_type_id AS fk_id,
                mt.${codeCol} AS fk_code,
                mt.${nameCol} AS fk_name
            FROM missions m
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            WHERE m.mission_type_id IS NOT NULL OR m.type_mission IS NOT NULL
            LIMIT 20;
        `);

        if (res.rows.length === 0) {
            console.log("No missions found.");
        } else {
            console.table(res.rows.map(r => ({
                id: r.id.substring(0, 8) + '...',
                string_type: r.string_type,
                fk_id: r.fk_id ? r.fk_id.substring(0, 8) + '...' : 'NULL',
                fk_code: r.fk_code,
                fk_name: r.fk_name,
                // Soft match: standardizing string (uppercase, trim)
                match: (r.string_type || '').trim().toUpperCase() === (r.fk_code || '').trim().toUpperCase() ? '✅' : '❌'
            })));
        }

        const countMismatch = await client.query(`
            SELECT count(*) 
            FROM missions m
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            WHERE m.mission_type_id IS NOT NULL 
            AND m.type_mission IS NOT NULL
            AND BTRIM(UPPER(m.type_mission)) != BTRIM(UPPER(mt.${codeCol}));
        `);
        console.log(`\n⚠️ Total mismatches (String vs FK Code): ${countMismatch.rows[0].count}`);

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkMissionTypes();
