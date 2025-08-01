const { pool } = require('./src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration031() {
    try {
        console.log('🚀 Exécution de la migration 031...');
        
        const migrationPath = path.join(__dirname, 'database/migrations/031_add_opportunity_id_to_missions.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        
        await pool.query(migration);
        
        console.log('✅ Migration 031 exécutée avec succès');
        
        // Marquer la migration comme exécutée
        await pool.query(`
            INSERT INTO migrations (name, executed_at) 
            VALUES ('031_add_opportunity_id_to_missions.sql', CURRENT_TIMESTAMP)
            ON CONFLICT (name) DO NOTHING
        `);
        
        console.log('✅ Migration marquée comme exécutée');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

runMigration031(); 