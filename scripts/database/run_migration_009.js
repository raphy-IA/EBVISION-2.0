const { pool } = require('../src/utils/database');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    try {
        console.log('Running migration 009...');
        const sql = await fs.readFile(path.join(__dirname, '../migrations/009_update_objectives_structure.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Migration 009 completed successfully.');
    } catch (error) {
        console.error('❌ Error running migration:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
