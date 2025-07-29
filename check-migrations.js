const { pool } = require('./src/utils/database');

async function checkMigrations() {
    try {
        console.log('🔍 Vérification des migrations exécutées...');
        
        const query = 'SELECT filename FROM migrations ORDER BY id';
        const result = await pool.query(query);
        
        console.log('📋 Migrations exécutées:');
        result.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.filename}`);
        });
        
        // Vérifier si la migration 016 a été exécutée
        const migration016 = result.rows.find(row => row.filename === '016_enrich_clients_table.sql');
        if (migration016) {
            console.log('✅ Migration 016 exécutée');
        } else {
            console.log('❌ Migration 016 NON exécutée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMigrations(); 