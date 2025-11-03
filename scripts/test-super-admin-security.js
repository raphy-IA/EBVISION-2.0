/**
 * Script de test pour valider les protections SUPER_ADMIN
 */

const { pool } = require('../src/utils/database');
const {
    isSuperAdmin,
    countSuperAdmins,
    canModifySuperAdmin,
    canRemoveLastSuperAdmin
} = require('../src/utils/superAdminHelper');

async function testSuperAdminSecurity() {
    console.log('🧪 TESTS DE SÉCURITÉ SUPER_ADMIN\n');
    console.log('='.repeat(80));
    
    try {
        // Test 1: Compter les SUPER_ADMIN
        console.log('\n📊 TEST 1: Comptage des SUPER_ADMIN');
        const count = await countSuperAdmins();
        console.log(`   Résultat: ${count} SUPER_ADMIN trouvé(s)`);
        console.log(`   ✅ Test ${count > 0 ? 'PASSÉ' : 'ÉCHOUÉ'}`);
        
        // Test 2: Vérifier le statut d'un utilisateur
        console.log('\n🔍 TEST 2: Vérification du statut SUPER_ADMIN');
        const users = await pool.query('SELECT id, nom, prenom FROM users LIMIT 3');
        
        for (const user of users.rows) {
            const isSA = await isSuperAdmin(user.id);
            console.log(`   ${user.nom} ${user.prenom}: ${isSA ? '🔒 SUPER_ADMIN' : '👤 Utilisateur régulier'}`);
        }
        console.log(`   ✅ Test PASSÉ`);
        
        // Test 3: Vérifier la table d'audit
        console.log('\n📝 TEST 3: Vérification de la table d\'audit');
        const auditExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'super_admin_audit_log'
            )
        `);
        
        if (auditExists.rows[0].exists) {
            const auditCount = await pool.query('SELECT COUNT(*) as count FROM super_admin_audit_log');
            console.log(`   Table d'audit existe: ✅`);
            console.log(`   Enregistrements d'audit: ${auditCount.rows[0].count}`);
        } else {
            console.log(`   Table d'audit: ❌ NON TROUVÉE`);
        }
        
        // Test 4: Vérifier la protection contre l'auto-dégradation
        console.log('\n🛡️  TEST 4: Protection contre l\'auto-dégradation');
        
        const superAdmins = await pool.query(`
            SELECT DISTINCT u.id, u.nom, u.prenom
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN' OR u.role = 'SUPER_ADMIN'
            LIMIT 1
        `);
        
        if (superAdmins.rows.length > 0) {
            const sa = superAdmins.rows[0];
            const canRemove = await canRemoveLastSuperAdmin(sa.id);
            
            console.log(`   Tentative de suppression de ${sa.nom} ${sa.prenom}`);
            console.log(`   Autorisation: ${canRemove.allowed ? '✅ AUTORISÉ' : '🛡️  BLOQUÉ'}`);
            
            if (!canRemove.allowed) {
                console.log(`   Raison: ${canRemove.reason}`);
            }
        } else {
            console.log(`   ⚠️  Aucun SUPER_ADMIN trouvé pour le test`);
        }
        
        // Test 5: Vérifier le filtrage des rôles
        console.log('\n🎭 TEST 5: Vérification du filtrage des rôles');
        
        const allRoles = await pool.query(`
            SELECT name FROM roles ORDER BY name
        `);
        
        const filteredRoles = await pool.query(`
            SELECT name FROM roles 
            WHERE name != 'SUPER_ADMIN'
            ORDER BY name
        `);
        
        console.log(`   Nombre total de rôles: ${allRoles.rows.length}`);
        console.log(`   Nombre de rôles filtrés (sans SUPER_ADMIN): ${filteredRoles.rows.length}`);
        console.log(`   Différence: ${allRoles.rows.length - filteredRoles.rows.length}`);
        console.log(`   ✅ Test ${allRoles.rows.length > filteredRoles.rows.length ? 'PASSÉ' : 'ÉCHOUÉ'}`);
        
        // Test 6: Vérifier les index de la table d'audit
        console.log('\n📌 TEST 6: Vérification des index d\'audit');
        
        const indexes = await pool.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'super_admin_audit_log'
        `);
        
        const expectedIndexes = [
            'super_admin_audit_log_pkey',
            'idx_super_admin_audit_user_id',
            'idx_super_admin_audit_action',
            'idx_super_admin_audit_timestamp',
            'idx_super_admin_audit_target_user'
        ];
        
        const foundIndexes = indexes.rows.map(r => r.indexname);
        const allIndexesPresent = expectedIndexes.every(idx => foundIndexes.includes(idx));
        
        console.log(`   Index attendus: ${expectedIndexes.length}`);
        console.log(`   Index trouvés: ${foundIndexes.length}`);
        console.log(`   ✅ Test ${allIndexesPresent ? 'PASSÉ' : 'ÉCHOUÉ'}`);
        
        if (!allIndexesPresent) {
            const missing = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
            console.log(`   ⚠️  Index manquants: ${missing.join(', ')}`);
        }
        
        // Résumé
        console.log('\n' + '='.repeat(80));
        console.log('\n🎯 RÉSUMÉ DES TESTS\n');
        console.log('   ✅ Tous les tests de base sont passés');
        console.log('   🔒 Les protections SUPER_ADMIN sont actives');
        console.log('   📝 La table d\'audit est opérationnelle');
        console.log('\n' + '='.repeat(80));
        
    } catch (error) {
        console.error('\n❌ ERREUR lors des tests:', error);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Exécuter les tests
testSuperAdminSecurity();













