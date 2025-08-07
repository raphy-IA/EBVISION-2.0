const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
});

async function cleanTimeTables() {
    try {
        console.log('🧹 Nettoyage des tables de temps...\n');
        
        // 1. Vérifier le contenu actuel
        console.log('📊 1. Contenu actuel des tables:');
        
        const timeSheetsCount = await pool.query('SELECT COUNT(*) as count FROM time_sheets');
        const timeEntriesCount = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        
        console.log(`  - time_sheets: ${timeSheetsCount.rows[0].count} feuilles`);
        console.log(`  - time_entries: ${timeEntriesCount.rows[0].count} entrées`);
        console.log('');
        
        // 2. Demander confirmation
        console.log('⚠️ ATTENTION: Cette opération va supprimer TOUTES les données de temps !');
        console.log('   - Toutes les feuilles de temps seront supprimées');
        console.log('   - Toutes les entrées de temps seront supprimées');
        console.log('   - Les utilisateurs et autres données seront conservés');
        console.log('');
        
        // 3. Supprimer les données dans l'ordre (time_entries d'abord à cause des clés étrangères)
        console.log('🗑️ 2. Suppression des entrées de temps...');
        const deleteEntriesResult = await pool.query('DELETE FROM time_entries');
        console.log(`  ✅ ${deleteEntriesResult.rowCount} entrées de temps supprimées`);
        
        console.log('🗑️ 3. Suppression des feuilles de temps...');
        const deleteSheetsResult = await pool.query('DELETE FROM time_sheets');
        console.log(`  ✅ ${deleteSheetsResult.rowCount} feuilles de temps supprimées`);
        
        // 4. Vérifier le résultat
        console.log('\n📊 4. Vérification du nettoyage:');
        
        const finalSheetsCount = await pool.query('SELECT COUNT(*) as count FROM time_sheets');
        const finalEntriesCount = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        
        console.log(`  - time_sheets: ${finalSheetsCount.rows[0].count} feuilles`);
        console.log(`  - time_entries: ${finalEntriesCount.rows[0].count} entrées`);
        
        if (finalSheetsCount.rows[0].count === 0 && finalEntriesCount.rows[0].count === 0) {
            console.log('\n✅ Nettoyage réussi ! Les tables de temps sont vides.');
            console.log('🎯 Vous pouvez maintenant repartir sur des bases propres pour les tests.');
        } else {
            console.log('\n⚠️ Attention: Il reste encore des données dans les tables.');
        }
        
        // 5. Vérifier que les autres tables sont intactes
        console.log('\n🔍 5. Vérification des autres tables (doivent être intactes):');
        
        const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const missionsCount = await pool.query('SELECT COUNT(*) as count FROM missions');
        const tasksCount = await pool.query('SELECT COUNT(*) as count FROM tasks');
        const internalActivitiesCount = await pool.query('SELECT COUNT(*) as count FROM internal_activities');
        
        console.log(`  - users: ${usersCount.rows[0].count} utilisateurs`);
        console.log(`  - missions: ${missionsCount.rows[0].count} missions`);
        console.log(`  - tasks: ${tasksCount.rows[0].count} tâches`);
        console.log(`  - internal_activities: ${internalActivitiesCount.rows[0].count} activités internes`);
        
        console.log('\n🎉 Nettoyage terminé avec succès !');
        console.log('✅ Les tables de temps sont vides');
        console.log('✅ Les autres données sont conservées');
        console.log('🚀 Vous pouvez maintenant tester les fonctionnalités de saisie de temps');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await pool.end();
    }
}

cleanTimeTables();
