require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugMission() {
    try {
        const missionCode = 'EB--25-327';
        console.log(`Analyzing Mission: ${missionCode}`);

        // 1. Mission
        const mParams = [missionCode];
        const mRes = await pool.query("SELECT id, nom, mission_type_id FROM missions WHERE code = $1", mParams);
        if (mRes.rowCount === 0) {
            console.log("❌ Mission NOT FOUND");
            return;
        }
        const mission = mRes.rows[0];
        console.log("✅ Mission Found:", mission);

        // 2. Mission Tasks
        const mtRes = await pool.query("SELECT id, task_id, statut FROM mission_tasks WHERE mission_id = $1", [mission.id]);
        console.table(mtRes.rows);

        if (mtRes.rowCount > 0) {
            const mtId = mtRes.rows[0].id;
            // 3. Assignments
            const assignRes = await pool.query("SELECT * FROM task_assignments WHERE mission_task_id = $1", [mtId]);
            console.log(`Assignments for MT ${mtId}:`, assignRes.rowCount);
            console.table(assignRes.rows);
        }

        // 4. Time Entries
        const teRes = await pool.query("SELECT count(*) as count, user_id FROM time_entries WHERE mission_id = $1 GROUP BY user_id", [mission.id]);
        console.log("Time Entries (Contributors):");
        console.table(teRes.rows);

        // 5. Check Task Mission Types
        console.log("Checking task_mission_types for PREVIOUS ENGAGEMENT...");
        const typeRes = await pool.query("SELECT id FROM mission_types WHERE libelle = 'PREVIOUS ENGAGEMENT'");
        if (typeRes.rowCount > 0) {
            const typeId = typeRes.rows[0].id;
            const tmtRes = await pool.query("SELECT * FROM task_mission_types WHERE mission_type_id = $1", [typeId]);
            console.log(`Configured Tasks for Type ${typeId}:`, tmtRes.rowCount);
            console.table(tmtRes.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugMission();
