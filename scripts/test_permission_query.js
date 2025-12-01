// Test de la requête SQL de permissions
const { query } = require('../src/utils/database');

async function testPermissionQuery() {
    console.log('🔍 Test de la requête de permissions\n');

    const userId = '785c341e-0c3e-427c-8f33-294dd40e3fcf'; // rngos1
    const permission = 'OBJECTIVES_CONFIG_EDIT';

    // Test 2: Vérifier les permissions directes seules
    console.log('\nTest 2: Permissions directes uniquement...');
    const query2 = `
            SELECT p.code, p.name
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = $1 AND p.code = $2
        `;
    const result2 = await query(query2, [userId, permission]);
    console.log(`✅ Résultat: ${result2.rows.length} ligne(s)`);
    if (result2.rows.length > 0) {
        console.log('   Permission trouvée:', result2.rows[0]);
    }

    // Test 3: Vérifier via rôles
    console.log('\nTest 3: Permissions via rôles...');
    const query3 = `
            SELECT p.code, p.name, r.name as role_name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1 AND p.code = $2
        `;
    const result3 = await query(query3, [userId, permission]);
    console.log(`✅ Résultat: ${result3.rows.length} ligne(s)`);
    if (result3.rows.length > 0) {
        console.log('   Permission trouvée via rôle:', result3.rows[0]);
    }

    process.exit(0);
} catch (error) {
    console.error('\n❌ ERREUR SQL:', error.message);
    console.error('Détails:', error);
    process.exit(1);
}
}

testPermissionQuery();
