const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkId() {
    try {
        const taskId = 'f26173a4-7d62-4849-9db3-04dad00d42fa';
        console.log(`Checking ID: ${taskId}`);

        const genericRes = await pool.query('SELECT id, libelle FROM tasks WHERE id = $1', [taskId]);
        if (genericRes.rows.length > 0) {
            console.log('✅ Found in TASKS (Generic):', genericRes.rows[0]);
        } else {
            console.log('❌ Not found in TASKS');
        }

        const missionTaskRes = await pool.query('SELECT id, task_id, mission_id FROM mission_tasks WHERE id = $1', [taskId]);
        if (missionTaskRes.rows.length > 0) {
            console.log('✅ Found in MISSION_TASKS:', missionTaskRes.rows[0]);
        } else {
            console.log('❌ Not found in MISSION_TASKS');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkId();
