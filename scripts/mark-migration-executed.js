const { pool } = require('../src/utils/database.js');

async function markMigrationExecuted() {
    try {
        const migrations = [
            '032_create_departs_collaborateurs.sql',
            '033_remove_poste_type_dependency.sql'
        ];
        
        for (const migration of migrations) {
            await pool.query('INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [migration]);
            console.log(`✅ Migration ${migration} marquée comme exécutée`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

markMigrationExecuted(); 