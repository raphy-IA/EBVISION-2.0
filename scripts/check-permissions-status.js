const { pool } = require('../src/utils/database');

async function checkPermissionsStatus() {
    try {
        const client = await pool.connect();
        console.log('🔍 Vérification de l\'état des permissions...');
        
        // Vérifier les données existantes
        const permissionsCount = await client.query('SELECT COUNT(*) FROM permissions');
        const rolesCount = await client.query('SELECT COUNT(*) FROM roles');
        const rolePermissionsCount = await client.query('SELECT COUNT(*) FROM role_permissions');
        
        console.log(`📊 Données actuelles:`);
        console.log(`   - Permissions: ${permissionsCount.rows[0].count}`);
        console.log(`   - Rôles: ${rolesCount.rows[0].count}`);
        console.log(`   - Liaisons rôles-permissions: ${rolePermissionsCount.rows[0].count}`);
        
        // Vérifier les permissions existantes
        if (permissionsCount.rows[0].count > 0) {
            const permissions = await client.query('SELECT nom, code FROM permissions LIMIT 10');
            console.log('\n📋 Permissions existantes:');
            permissions.rows.forEach(perm => {
                console.log(`   - ${perm.nom} (${perm.code})`);
            });
        }
        
        // Vérifier les rôles existants
        if (rolesCount.rows[0].count > 0) {
            const roles = await client.query('SELECT nom, name FROM roles LIMIT 10');
            console.log('\n📋 Rôles existants:');
            roles.rows.forEach(role => {
                console.log(`   - ${role.nom} (${role.name})`);
            });
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkPermissionsStatus()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la vérification:', error);
        process.exit(1);
    });
