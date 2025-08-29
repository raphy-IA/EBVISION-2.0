const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigration() {
    console.log('🚀 Début de la migration du système de permissions...');
    
    try {
        // Test de connexion
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données établie');
        
        // Lecture et exécution de la première migration (structure)
        console.log('📋 Exécution de la migration de structure...');
        const structureSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/042_create_permissions_system.sql'), 
            'utf8'
        );
        
        await client.query(structureSQL);
        console.log('✅ Structure des tables créée avec succès');
        
        // Lecture et exécution de la deuxième migration (données)
        console.log('📋 Exécution de la migration des données...');
        const dataSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/043_migrate_permissions_data.sql'), 
            'utf8'
        );
        
        await client.query(dataSQL);
        console.log('✅ Données migrées avec succès');
        
        // Vérification de la migration
        console.log('🔍 Vérification de la migration...');
        
        const rolesCount = await client.query('SELECT COUNT(*) FROM user_roles');
        const permissionsCount = await client.query('SELECT COUNT(*) FROM permissions');
        const rolePermissionsCount = await client.query('SELECT COUNT(*) FROM role_permissions');
        const usersWithRoles = await client.query('SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL');
        
        console.log(`📊 Résultats de la migration:`);
        console.log(`   - Rôles créés: ${rolesCount.rows[0].count}`);
        console.log(`   - Permissions créées: ${permissionsCount.rows[0].count}`);
        console.log(`   - Liaisons rôles-permissions: ${rolePermissionsCount.rows[0].count}`);
        console.log(`   - Utilisateurs avec rôles: ${usersWithRoles.rows[0].count}`);
        
        // Affichage des rôles créés
        const roles = await client.query('SELECT name, description FROM user_roles ORDER BY name');
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
        
        client.release();
        console.log('\n🎉 Migration terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

// Exécution de la migration
runMigration()
    .then(() => {
        console.log('✅ Migration complétée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la migration:', error);
        process.exit(1);
    });
