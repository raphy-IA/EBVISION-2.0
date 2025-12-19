const { pool } = require('./src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const migrationFile = path.join(__dirname, 'migrations', '032_add_is_locked_to_mission_documents.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('▶️ Running 032_add_is_locked_to_mission_documents.sql...');

    try {
        await pool.query(sql);
        console.log('✅ Migration 032 completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
