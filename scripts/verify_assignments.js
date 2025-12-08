require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    try {
        console.log("Checking Task Assignments...");
        const countRes = await pool.query("SELECT count(*) FROM task_assignments");
        console.log(`Total Assignments: ${countRes.rows[0].count}`);

        const sampleRes = await pool.query(`
            SELECT 
                ta.heures_planifiees,
                c.nom as collaborateur,
                m.nom as mission
            FROM task_assignments ta
            JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            JOIN missions m ON mt.mission_id = m.id
            JOIN collaborateurs c ON ta.collaborateur_id = c.id
            LIMIT 5;
        `);
        console.table(sampleRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
