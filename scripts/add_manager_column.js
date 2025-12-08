require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addManagerColumn() {
    const client = await pool.connect();
    try {
        console.log('--- Adding manager_id to missions ---');
        await client.query('BEGIN');

        // Check if exists first
        const check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'manager_id' AND table_schema = 'public'");

        if (check.rows.length === 0) {
            console.log("Adding column manager_id (UUID)...");
            await client.query("ALTER TABLE missions ADD COLUMN manager_id UUID REFERENCES collaborateurs(id)");
            console.log("✅ Column manager_id added.");
        } else {
            console.log("ℹ️ Column manager_id already exists.");
        }

        await client.query('COMMIT');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Fatal Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

addManagerColumn();
