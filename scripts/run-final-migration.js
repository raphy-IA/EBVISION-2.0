const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runFinalMigration() {
    console.log('🚀 Début de la migration finale du système de permissions...');
    
    try {
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données établie');
        
        // Étape 1: Structure
        console.log('\n📋 Étape 1: Migration de la structure...');
        const structureSQL = fs.readFileSync(
            path.join(__dirname, '../database/migrations/044_adapt_permissions_system.sql'), 
            'utf8'
        );
        
        await client.query(structureSQL);
        console.log('✅ Structure des tables adaptée avec succès');
        
        // Étape 2: Rôles
        console.log('\n📋 Étape 2: Insertion des rôles...');
        const rolesSQL = `
            INSERT INTO roles (nom, name, description, is_system_role) VALUES
            ('SUPER_ADMIN', 'SUPER_ADMIN', 'Super administrateur - Accès total à toutes les fonctionnalités', true),
            ('ADMIN_IT', 'ADMIN_IT', 'Administrateur IT - Gestion technique et maintenance', true),
            ('IT', 'IT', 'Technicien IT - Support technique et maintenance', true),
            ('ADMIN', 'ADMIN', 'Administrateur - Gestion métier et configuration', true),
            ('MANAGER', 'MANAGER', 'Manager - Gestion d''équipe et supervision', true),
            ('CONSULTANT', 'CONSULTANT', 'Consultant - Utilisateur standard avec accès complet aux données', true),
            ('COLLABORATEUR', 'COLLABORATEUR', 'Collaborateur - Accès limité aux données de sa BU', true)
            ON CONFLICT (nom) DO NOTHING;
        `;
        
        await client.query(rolesSQL);
        console.log('✅ Rôles insérés avec succès');
        
        // Étape 3: Permissions (par catégorie)
        console.log('\n📋 Étape 3: Insertion des permissions...');
        
        const permissionsData = fs.readFileSync(
            path.join(__dirname, '../database/migrations/046_generated_permissions.sql'), 
            'utf8'
        );
        
        await client.query(permissionsData);
        console.log('✅ Permissions insérées avec succès');
        
        // Étape 4: Liaisons rôles-permissions
        console.log('\n📋 Étape 4: Configuration des permissions par rôle...');
        
        // SUPER_ADMIN - Toutes les permissions
        await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id as role_id, p.id as permission_id
            FROM roles r
            CROSS JOIN permissions p
            WHERE r.nom = 'SUPER_ADMIN'
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
        console.log('   ✅ SUPER_ADMIN configuré');
        
        // ADMIN - Permissions métier
        await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id as role_id, p.id as permission_id
            FROM roles r
            JOIN permissions p ON p.code IN (
                'dashboard.view', 'dashboard.edit',
                'opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.delete', 'opportunities.validate',
                'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.execute', 'campaigns.validate',
                'missions.view', 'missions.create', 'missions.edit', 'missions.delete', 'missions.assign',
                'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
                'users.view', 'users.create', 'users.edit',
                'reports.view', 'reports.create', 'reports.export',
                'config.view', 'config.edit'
            )
            WHERE r.nom = 'ADMIN'
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
        console.log('   ✅ ADMIN configuré');
        
        // MANAGER - Permissions de gestion
        await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id as role_id, p.id as permission_id
            FROM roles r
            JOIN permissions p ON p.code IN (
                'dashboard.view', 'dashboard.edit',
                'opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.validate',
                'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
                'missions.view', 'missions.create', 'missions.edit', 'missions.assign',
                'clients.view', 'clients.create', 'clients.edit',
                'reports.view', 'reports.create', 'reports.export'
            )
            WHERE r.nom = 'MANAGER'
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
        console.log('   ✅ MANAGER configuré');
        
        // CONSULTANT - Permissions standard
        await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id as role_id, p.id as permission_id
            FROM roles r
            JOIN permissions p ON p.code IN (
                'dashboard.view',
                'opportunities.view', 'opportunities.create', 'opportunities.edit',
                'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
                'missions.view', 'missions.create', 'missions.edit',
                'clients.view', 'clients.create', 'clients.edit',
                'reports.view', 'reports.export'
            )
            WHERE r.nom = 'CONSULTANT'
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
        console.log('   ✅ CONSULTANT configuré');
        
        // COLLABORATEUR - Permissions limitées
        await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id as role_id, p.id as permission_id
            FROM roles r
            JOIN permissions p ON p.code IN (
                'dashboard.view',
                'opportunities.view', 'opportunities.create',
                'campaigns.view', 'campaigns.execute',
                'missions.view', 'missions.create',
                'clients.view',
                'reports.view'
            )
            WHERE r.nom = 'COLLABORATEUR'
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
        console.log('   ✅ COLLABORATEUR configuré');
        
        // Étape 5: Migration des utilisateurs
        console.log('\n📋 Étape 5: Migration des utilisateurs...');
        
        await client.query(`
            UPDATE users 
            SET role_id = (SELECT id FROM roles WHERE nom = 'ADMIN')
            WHERE role = 'ADMIN' AND role_id IS NULL;
        `);
        
        await client.query(`
            UPDATE users 
            SET role_id = (SELECT id FROM roles WHERE nom = 'MANAGER')
            WHERE role = 'MANAGER' AND role_id IS NULL;
        `);
        
        await client.query(`
            UPDATE users 
            SET role_id = (SELECT id FROM roles WHERE nom = 'CONSULTANT')
            WHERE role = 'CONSULTANT' AND role_id IS NULL;
        `);
        
        await client.query(`
            UPDATE users 
            SET role_id = (SELECT id FROM roles WHERE nom = 'COLLABORATEUR')
            WHERE role_id IS NULL;
        `);
        
        console.log('✅ Utilisateurs migrés avec succès');
        
        // Vérification finale
        console.log('\n🔍 Vérification finale...');
        
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
        
        client.release();
        console.log('\n🎉 Migration finale terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

// Exécution de la migration
runFinalMigration()
    .then(() => {
        console.log('✅ Migration finale complétée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la migration finale:', error);
        process.exit(1);
    });
