const path = require('path');
const fs = require('fs');
const { pool } = require('../src/utils/database');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Applying migration 029_add_mission_documents_columns.sql...');
        const sqlPath = path.join(__dirname, '..', 'migrations', '029_add_mission_documents_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        client.release();
        // Force exit because pool keeps connection open
        process.exit(0);
    }
}

runMigration();

