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
        await client.query("BEGIN");
        // Check if exists
        const res = await client.query("SELECT id FROM tasks WHERE code = 'GT'");
        if (res.rowCount === 0) {
            console.log("Inserting GT...");
            await client.query("INSERT INTO tasks (code, libelle, description, actif) VALUES ('GT', 'Task', 'Def', true)");
        } else {
            console.log("GT exists.");
        }
        await client.query("COMMIT");
        console.log("Pre-seed Complete.");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
