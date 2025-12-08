const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/009_add_type_column_to_clients.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 009...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

runMigration();
