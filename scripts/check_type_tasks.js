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
        console.log("Checking for Mission Type Tasks...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%type_task%';
        `);
        console.table(res.rows);

        console.log("Checking task_assignments count again...");
        const count = await pool.query("SELECT count(*) FROM task_assignments");
        console.log("Count:", count.rows[0].count);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
