const { pool } = require('../src/utils/database');

async function cleanAllPermissions() {
    try {
        const client = await pool.connect();
        console.log('🧹 Nettoyage complet du système de permissions...');
        
        // Vérifier l'état actuel
        const tables = [
            'permission_audit_log',
            'user_business_unit_access', 
            'user_permissions',
            'role_permissions',
            'permissions',
            'roles'
        ];
        
        console.log('📊 État actuel des tables:');
        for (const table of tables) {
            try {
                const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   - ${table}: ${count.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`   - ${table}: table inexistante`);
            }
        }
        
        console.log('\n🗑️ Suppression de toutes les données...');
        
        // Supprimer dans l'ordre pour éviter les contraintes de clés étrangères
        const deleteQueries = [
            'DELETE FROM permission_audit_log',
            'DELETE FROM user_business_unit_access',
            'DELETE FROM user_permissions', 
            'DELETE FROM role_permissions',
            'DELETE FROM permissions',
            'DELETE FROM roles'
        ];
        
        for (const query of deleteQueries) {
            try {
                await client.query(query);
                console.log(`   ✅ ${query.split(' ')[2]} nettoyé`);
            } catch (error) {
                console.log(`   ⚠️ ${query.split(' ')[2]}: ${error.message}`);
            }
        }
        
        // Vérifier l'état final
        console.log('\n📊 État final des tables:');
        for (const table of tables) {
            try {
                const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   - ${table}: ${count.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`   - ${table}: table inexistante`);
            }
        }
        
        client.release();
        console.log('\n✅ Nettoyage complet terminé !');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
}

cleanAllPermissions()
    .then(() => {
        console.log('✅ Nettoyage complété');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec du nettoyage:', error);
        process.exit(1);
    });
