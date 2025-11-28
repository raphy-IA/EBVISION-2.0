const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Exécution de la migration 010...');

        const migrationPath = path.join(__dirname, '../migrations/010_add_parent_objectives.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Migration 010 exécutée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
