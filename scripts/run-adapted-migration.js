const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runAdaptedMigration() {
    console.log('🚀 Début de la migration adaptée du système de permissions...');
    
    try {
        // Test de connexion
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données établie');
        
        // Lecture et exécution de la migration de structure adaptée
        console.log('📋 Exécution de la migration de structure adaptée...');
        const structureSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/044_adapt_permissions_system.sql'), 
            'utf8'
        );
        
        await client.query(structureSQL);
        console.log('✅ Structure des tables adaptée avec succès');
        
        // Lecture et exécution de la migration des données
        console.log('📋 Exécution de la migration des données...');
        const dataSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/045_populate_permissions_data.sql'), 
            'utf8'
        );
        
        await client.query(dataSQL);
        console.log('✅ Données migrées avec succès');
        
        // Vérification de la migration
        console.log('🔍 Vérification de la migration...');
        
        const rolesCount = await client.query('SELECT COUNT(*) FROM roles');
        const permissionsCount = await client.query('SELECT COUNT(*) FROM permissions');
        const rolePermissionsCount = await client.query('SELECT COUNT(*) FROM role_permissions');
        const usersWithRoles = await client.query('SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL');
        
        console.log(`📊 Résultats de la migration:`);
        console.log(`   - Rôles créés: ${rolesCount.rows[0].count}`);
        console.log(`   - Permissions créées: ${permissionsCount.rows[0].count}`);
        console.log(`   - Liaisons rôles-permissions: ${rolePermissionsCount.rows[0].count}`);
        console.log(`   - Utilisateurs avec rôles: ${usersWithRoles.rows[0].count}`);
        
        // Affichage des rôles créés
        const roles = await client.query('SELECT nom, description FROM roles ORDER BY nom');
        console.log('\n📋 Rôles disponibles:');
        roles.rows.forEach(role => {
            console.log(`   - ${role.nom}: ${role.description}`);
        });
        
        // Affichage des catégories de permissions
        const categories = await client.query('SELECT DISTINCT category FROM permissions ORDER BY category');
        console.log('\n📋 Catégories de permissions:');
        categories.rows.forEach(cat => {
            console.log(`   - ${cat.category}`);
        });
        
        // Vérifier les utilisateurs et leurs rôles
        const users = await client.query(`
            SELECT u.username, u.role, r.nom as new_role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LIMIT 10
        `);
        
        console.log('\n📋 Exemples d\'utilisateurs et leurs rôles:');
        users.rows.forEach(user => {
            console.log(`   - ${user.username}: ancien=${user.role}, nouveau=${user.new_role_name || 'Non assigné'}`);
        });
        
        client.release();
        console.log('\n🎉 Migration adaptée terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

// Exécution de la migration
runAdaptedMigration()
    .then(() => {
        console.log('✅ Migration adaptée complétée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la migration adaptée:', error);
        process.exit(1);
    });
