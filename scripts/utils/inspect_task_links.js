require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    console.log('Inspecting Task Linkages...');
    try {
        // 1. Check GT Task
        const taskRes = await pool.query("SELECT * FROM tasks WHERE code = 'GT'");
        console.log('GT Task found:', taskRes.rows.length);
        if (taskRes.rows.length > 0) console.log(taskRes.rows[0]);

        // 2. Check Task Mission Types
        console.log('\n--- Task Mission Types ---');
        const tmtRes = await pool.query(`
            SELECT tmt.*, mt.libelle as mission_type, t.code as task_code
            FROM task_mission_types tmt
            LEFT JOIN mission_types mt ON tmt.mission_type_id = mt.id
            LEFT JOIN tasks t ON tmt.task_id = t.id
        `);
        console.log(tmtRes.rows);

        // 3. Check Mission Tasks
        console.log('\n--- Mission Tasks (Sample) ---');
        const mtRes = await pool.query(`
            SELECT mt.*, m.nom as mission, t.code as task_code
            FROM mission_tasks mt
            LEFT JOIN missions m ON mt.mission_id = m.id
            LEFT JOIN tasks t ON mt.task_id = t.id
            LIMIT 5
        `);
        console.log(mtRes.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
