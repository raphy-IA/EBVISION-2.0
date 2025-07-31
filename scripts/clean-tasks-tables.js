const { pool } = require('../src/utils/database');

async function cleanTasksTables() {
    try {
        console.log('🧹 Nettoyage des tables tâches existantes');
        console.log('=========================================');

        // Supprimer les tables dans l'ordre inverse des dépendances
        const tables = [
            'task_assignments',
            'mission_tasks', 
            'task_mission_types',
            'tasks'
        ];

        for (const table of tables) {
            try {
                await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`✅ Table ${table} supprimée`);
            } catch (error) {
                console.log(`⚠️ Table ${table} n'existait pas ou erreur: ${error.message}`);
            }
        }

        console.log('✅ Nettoyage terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await pool.end();
    }
}

cleanTasksTables(); 