const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runSimplePermissionsMigration() {
    console.log('🚀 Début de la migration du système de permissions simple...');
    
    try {
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données établie');
        
        // Étape 1: Structure des tables
        console.log('\n📋 Étape 1: Création de la structure des tables...');
        const structureSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/047_create_simple_permissions_system.sql'), 
            'utf8'
        );
        await client.query(structureSQL);
        console.log('✅ Structure des tables créée avec succès');
        
        // Étape 2: Peuplement des données
        console.log('\n📋 Étape 2: Peuplement des données...');
        const dataSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/048_populate_simple_permissions.sql'), 
            'utf8'
        );
        await client.query(dataSQL);
        console.log('✅ Données peuplées avec succès');
        
        // Vérification finale
        console.log('\n🔍 Vérification de la migration...');
        
        const rolesCount = await client.query('SELECT COUNT(*) FROM roles');
        const permissionsCount = await client.query('SELECT COUNT(*) FROM permissions');
        const rolePermissionsCount = await client.query('SELECT COUNT(*) FROM role_permissions');
        const usersWithRoles = await client.query('SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL');
        const buAccessCount = await client.query('SELECT COUNT(*) FROM user_business_unit_access');
        
        console.log(`📊 Résultats de la migration:`);
        console.log(`   - Rôles créés: ${rolesCount.rows[0].count}`);
        console.log(`   - Permissions créées: ${permissionsCount.rows[0].count}`);
        console.log(`   - Liaisons rôles-permissions: ${rolePermissionsCount.rows[0].count}`);
        console.log(`   - Utilisateurs avec rôles: ${usersWithRoles.rows[0].count}`);
        console.log(`   - Accès BU configurés: ${buAccessCount.rows[0].count}`);
        
        // Affichage des rôles créés
        const roles = await client.query('SELECT name, description FROM roles ORDER BY name');
        console.log('\n📋 Rôles disponibles:');
        roles.rows.forEach(role => {
            console.log(`   - ${role.name}: ${role.description}`);
        });
        
        // Affichage des catégories de permissions
        const categories = await client.query('SELECT DISTINCT category FROM permissions ORDER BY category');
        console.log('\n📋 Catégories de permissions:');
        categories.rows.forEach(cat => {
            console.log(`   - ${cat.category}`);
        });
        
        // Vérifier les utilisateurs et leurs rôles
        const users = await client.query(`
            SELECT u.username, u.role, r.name as new_role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LIMIT 10
        `);
        
        console.log('\n📋 Exemples d\'utilisateurs et leurs rôles:');
        users.rows.forEach(user => {
            console.log(`   - ${user.username}: ancien=${user.role}, nouveau=${user.new_role_name || 'Non assigné'}`);
        });
        
        client.release();
        console.log('\n🎉 Migration du système de permissions terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

runSimplePermissionsMigration()
    .then(() => {
        console.log('✅ Migration complétée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la migration:', error);
        process.exit(1);
    });
