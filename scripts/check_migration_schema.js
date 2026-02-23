const { pool } = require('../src/utils/database');

async function checkMigrations() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 10;");
        console.table(res.rows);
    } catch (error) {
        console.error(error);
    } finally {
        client.release();
        pool.end();
    }
}

checkMigrations();
