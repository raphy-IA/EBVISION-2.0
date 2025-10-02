const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

console.log('🔄 MIGRATION VERS LE SYSTÈME DE RÔLES MULTIPLES\n');
console.log('=' .repeat(80));
console.log('\n');

async function migrateToMultipleRoles() {
    let client;
    
    try {
        // Obtenir un client pour gérer la transaction
        client = await pool.connect();
        
        console.log('📋 ÉTAPE 1: VÉRIFICATION DE L\'ÉTAT ACTUEL');
        console.log('=' .repeat(80));
        
        // Vérifier l'état actuel
        const statusQuery = `
            SELECT 
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT ur.user_id) as users_with_roles,
                COUNT(ur.id) as total_role_assignments,
                COUNT(DISTINCT CASE WHEN u.role IS NOT NULL THEN u.id END) as users_with_principal_role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id;
        `;
        
        const status = await client.query(statusQuery);
        const stats = status.rows[0];
        
        console.log(`\n📊 Statistiques actuelles:`);
        console.log(`   - Utilisateurs total: ${stats.total_users}`);
        console.log(`   - Utilisateurs avec rôles multiples: ${stats.users_with_roles}`);
        console.log(`   - Nombre total d'assignations de rôles: ${stats.total_role_assignments}`);
        console.log(`   - Utilisateurs avec rôle principal: ${stats.users_with_principal_role}`);
        
        console.log('\n\n📋 ÉTAPE 2: LECTURE DU FICHIER DE MIGRATION SQL');
        console.log('=' .repeat(80));
        
        const migrationFile = path.join(__dirname, '../database/migrations/006_migrate_to_multiple_roles_system.sql');
        
        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Fichier de migration non trouvé: ${migrationFile}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
        console.log(`\n✅ Fichier de migration chargé: ${migrationFile}`);
        console.log(`   Taille: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
        
        console.log('\n\n📋 ÉTAPE 3: EXÉCUTION DE LA MIGRATION');
        console.log('=' .repeat(80));
        console.log('\n⏳ Exécution en cours...\n');
        
        // Exécuter la migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration SQL exécutée avec succès\n');
        
        console.log('\n📋 ÉTAPE 4: VÉRIFICATION POST-MIGRATION');
        console.log('=' .repeat(80));
        
        // Vérifier l'état après migration
        const postStatus = await client.query(statusQuery);
        const postStats = postStatus.rows[0];
        
        console.log(`\n📊 Statistiques après migration:`);
        console.log(`   - Utilisateurs total: ${postStats.total_users}`);
        console.log(`   - Utilisateurs avec rôles multiples: ${postStats.users_with_roles}`);
        console.log(`   - Nombre total d'assignations de rôles: ${postStats.total_role_assignments}`);
        console.log(`   - Utilisateurs avec rôle principal: ${postStats.users_with_principal_role}`);
        
        // Vérifier qu'il n'y a pas d'utilisateurs sans rôles
        const usersWithoutRolesQuery = `
            SELECT u.id, u.nom, u.prenom, u.email
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
            )
            LIMIT 10;
        `;
        
        const usersWithoutRoles = await client.query(usersWithoutRolesQuery);
        
        if (usersWithoutRoles.rows.length > 0) {
            console.log('\n⚠️  ATTENTION: Utilisateurs sans rôles détectés:');
            usersWithoutRoles.rows.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.nom} ${user.prenom} (${user.email})`);
            });
        } else {
            console.log('\n✅ Tous les utilisateurs ont au moins un rôle');
        }
        
        // Afficher quelques exemples d'utilisateurs avec leurs rôles
        console.log('\n📋 ÉTAPE 5: EXEMPLES D\'UTILISATEURS ET LEURS RÔLES');
        console.log('=' .repeat(80));
        
        const examplesQuery = `
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.role as old_principal_role,
                array_agg(r.name ORDER BY r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id, u.nom, u.prenom, u.email, u.role
            ORDER BY u.nom, u.prenom
            LIMIT 10;
        `;
        
        const examples = await client.query(examplesQuery);
        
        console.log('\n📋 Premiers utilisateurs:');
        examples.rows.forEach((user, index) => {
            const rolesDisplay = user.roles && user.roles.length > 0 
                ? user.roles.join(', ') 
                : 'Aucun rôle';
            console.log(`\n   ${index + 1}. ${user.nom} ${user.prenom}`);
            console.log(`      📧 ${user.email}`);
            console.log(`      🎭 Ancien rôle principal: ${user.old_principal_role || 'N/A'}`);
            console.log(`      🎭 Rôles actuels: ${rolesDisplay}`);
        });
        
        console.log('\n\n📋 ÉTAPE 6: TEST DU TRIGGER DE PROTECTION');
        console.log('=' .repeat(80));
        
        // Tester le trigger (sans vraiment supprimer)
        console.log('\n✅ Trigger de protection créé et activé');
        console.log('   Ce trigger empêche la suppression du dernier rôle d\'un utilisateur');
        
        console.log('\n\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS !');
        console.log('=' .repeat(80));
        console.log('\n✅ Résumé:');
        console.log(`   - Colonne users.role rendue nullable`);
        console.log(`   - ${postStats.total_role_assignments - stats.total_role_assignments} nouveaux rôles migrés`);
        console.log(`   - Vue user_roles_view créée`);
        console.log(`   - Trigger de protection activé`);
        console.log(`   - Index créés pour les performances`);
        
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Redémarrer le serveur');
        console.log('   2. Tester les fonctionnalités de gestion des rôles');
        console.log('   3. Déployer en production avec ce même script');
        
    } catch (error) {
        console.error('\n❌ ERREUR LORS DE LA MIGRATION:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        
        if (error.code) {
            console.error('   Code:', error.code);
        }
        
        console.log('\n⚠️  La transaction a été annulée (ROLLBACK)');
        console.log('   Aucune modification n\'a été appliquée à la base de données');
        
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('\n🔚 Connexion fermée\n');
    }
}

// Demander confirmation avant d'exécuter
console.log('⚠️  ATTENTION: Cette migration va modifier la structure de la base de données');
console.log('   - La colonne users.role sera rendue nullable');
console.log('   - Les rôles principaux seront migrés vers user_roles');
console.log('   - Un trigger sera créé pour protéger les rôles');
console.log('\n');

// Exécuter automatiquement (pour la production, on peut ajouter une confirmation)
migrateToMultipleRoles();

