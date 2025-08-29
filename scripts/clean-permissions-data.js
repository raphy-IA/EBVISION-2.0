const { pool } = require('../src/utils/database');

async function cleanPermissionsData() {
    try {
        const client = await pool.connect();
        console.log('🧹 Nettoyage des données existantes...');
        
        // Vérifier les données existantes
        const permissionsCount = await client.query('SELECT COUNT(*) FROM permissions');
        const rolesCount = await client.query('SELECT COUNT(*) FROM roles');
        const rolePermissionsCount = await client.query('SELECT COUNT(*) FROM role_permissions');
        
        console.log(`📊 Données existantes:`);
        console.log(`   - Permissions: ${permissionsCount.rows[0].count}`);
        console.log(`   - Rôles: ${rolesCount.rows[0].count}`);
        console.log(`   - Liaisons rôles-permissions: ${rolePermissionsCount.rows[0].count}`);
        
        // Nettoyer les données dans l'ordre inverse des dépendances
        console.log('\n🗑️ Suppression des données existantes...');
        
        await client.query('DELETE FROM role_permissions');
        console.log('   ✅ role_permissions nettoyé');
        
        await client.query('DELETE FROM user_permissions');
        console.log('   ✅ user_permissions nettoyé');
        
        await client.query('DELETE FROM permissions');
        console.log('   ✅ permissions nettoyé');
        
        await client.query('DELETE FROM roles');
        console.log('   ✅ roles nettoyé');
        
        // Vérifier le nettoyage
        const permissionsCountAfter = await client.query('SELECT COUNT(*) FROM permissions');
        const rolesCountAfter = await client.query('SELECT COUNT(*) FROM roles');
        
        console.log(`\n📊 Données après nettoyage:`);
        console.log(`   - Permissions: ${permissionsCountAfter.rows[0].count}`);
        console.log(`   - Rôles: ${rolesCountAfter.rows[0].count}`);
        
        client.release();
        console.log('\n✅ Nettoyage terminé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
}

cleanPermissionsData()
    .then(() => {
        console.log('✅ Nettoyage complété');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec du nettoyage:', error);
        process.exit(1);
    });
