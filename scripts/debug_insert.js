require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Testing INSERT tasks...");
        const res = await client.query("INSERT INTO tasks (code, libelle, description, actif) VALUES ('GT', 'Task', 'Desc', true) RETURNING id");
        console.log("Success! ID:", res.rows[0].id);

        // Clean up
        await client.query("DELETE FROM tasks WHERE id = $1", [res.rows[0].id]);
        console.log("Cleaned up.");
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
