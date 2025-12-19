const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigrations() {
    console.log('🚀 Starting migrations 030 and 031...');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Run Migration 030
        console.log('▶️ Running 030_add_default_folder_structure_to_mission_types.sql...');
        const migration30Path = path.join(__dirname, '../migrations/030_add_default_folder_structure_to_mission_types.sql');
        const migration30Sql = fs.readFileSync(migration30Path, 'utf8');
        await client.query(migration30Sql);
        console.log('✅ Migration 030 completed.');

        // Run Migration 031
        console.log('▶️ Running 031_create_mission_documents_table.sql...');
        const migration31Path = path.join(__dirname, '../migrations/031_create_mission_documents_table.sql');
        const migration31Sql = fs.readFileSync(migration31Path, 'utf8');
        await client.query(migration31Sql);
        console.log('✅ Migration 031 completed.');

        await client.query('COMMIT');
        console.log('🎉 All migrations applied successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error applying migrations:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit();
    }
}

runMigrations();
