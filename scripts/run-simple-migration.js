const { pool } = require('../src/utils/database');

async function runSimpleMigration() {
    console.log('🚀 Début de la migration simplifiée du système de permissions...');
    
    try {
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données établie');
        
        // Étape 1: Structure
        console.log('\n📋 Étape 1: Migration de la structure...');
        const structureSQL = `
            -- Vérifier et compléter la table roles existante
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'name') THEN
                    ALTER TABLE roles ADD COLUMN name VARCHAR(50) UNIQUE NOT NULL;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'description') THEN
                    ALTER TABLE roles ADD COLUMN description TEXT;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'is_system_role') THEN
                    ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN DEFAULT false;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'created_at') THEN
                    ALTER TABLE roles ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'updated_at') THEN
                    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;

            -- Vérifier et compléter la table permissions existante
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'code') THEN
                    ALTER TABLE permissions ADD COLUMN code VARCHAR(100) UNIQUE NOT NULL;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'name') THEN
                    ALTER TABLE permissions ADD COLUMN name VARCHAR(100) NOT NULL;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'description') THEN
                    ALTER TABLE permissions ADD COLUMN description TEXT;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'category') THEN
                    ALTER TABLE permissions ADD COLUMN category VARCHAR(50) NOT NULL;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'created_at') THEN
                    ALTER TABLE permissions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'updated_at') THEN
                    ALTER TABLE permissions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;

            -- Créer les tables manquantes si elles n'existent pas
            CREATE TABLE IF NOT EXISTS user_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
                granted BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, permission_id)
            );

            CREATE TABLE IF NOT EXISTS user_business_unit_access (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
                access_level VARCHAR(20) DEFAULT 'READ',
                granted BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, business_unit_id)
            );

            -- Ajouter les index manquants
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
            CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
            CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
            CREATE INDEX IF NOT EXISTS idx_user_bu_access_user_id ON user_business_unit_access(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_bu_access_bu_id ON user_business_unit_access(business_unit_id);
            CREATE INDEX IF NOT EXISTS idx_permission_audit_user_id ON permission_audit_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at ON permission_audit_log(created_at);

            -- Ajouter les triggers pour updated_at
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
            CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
            CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_user_bu_access_updated_at ON user_business_unit_access;
            CREATE TRIGGER update_user_bu_access_updated_at BEFORE UPDATE ON user_business_unit_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;
        
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
        
        // Étape 3: Permissions (insérées une par une pour éviter les problèmes de syntaxe)
        console.log('\n📋 Étape 3: Insertion des permissions...');
        
        const permissions = [
            // Dashboard
            { code: 'dashboard.view', name: 'Voir le dashboard', nom: 'Voir le dashboard', description: 'Accès au tableau de bord principal', category: 'dashboard', module: 'dashboard' },
            { code: 'dashboard.edit', name: 'Modifier le dashboard', nom: 'Modifier le dashboard', description: 'Modification des widgets et configuration', category: 'dashboard', module: 'dashboard' },
            { code: 'dashboard.admin', name: 'Administrer le dashboard', nom: 'Administrer le dashboard', description: 'Configuration complète du dashboard', category: 'dashboard', module: 'dashboard' },
            
            // Opportunities
            { code: 'opportunities.view', name: 'Voir les opportunités', nom: 'Voir les opportunités', description: 'Lecture des opportunités', category: 'opportunities', module: 'opportunities' },
            { code: 'opportunities.create', name: 'Créer des opportunités', nom: 'Créer des opportunités', description: 'Création de nouvelles opportunités', category: 'opportunities', module: 'opportunities' },
            { code: 'opportunities.edit', name: 'Modifier les opportunités', nom: 'Modifier les opportunités', description: 'Modification des opportunités existantes', category: 'opportunities', module: 'opportunities' },
            { code: 'opportunities.delete', name: 'Supprimer les opportunités', nom: 'Supprimer les opportunités', description: 'Suppression d''opportunités', category: 'opportunities', module: 'opportunities' },
            { code: 'opportunities.validate', name: 'Valider les étapes', nom: 'Valider les étapes', description: 'Validation des étapes d''opportunités', category: 'opportunities', module: 'opportunities' },
            
            // Campaigns
            { code: 'campaigns.view', name: 'Voir les campagnes', nom: 'Voir les campagnes', description: 'Lecture des campagnes de prospection', category: 'campaigns', module: 'campaigns' },
            { code: 'campaigns.create', name: 'Créer des campagnes', nom: 'Créer des campagnes', description: 'Création de nouvelles campagnes', category: 'campaigns', module: 'campaigns' },
            { code: 'campaigns.edit', name: 'Modifier les campagnes', nom: 'Modifier les campagnes', description: 'Modification des campagnes existantes', category: 'campaigns', module: 'campaigns' },
            { code: 'campaigns.delete', name: 'Supprimer les campagnes', nom: 'Supprimer les campagnes', description: 'Suppression de campagnes', category: 'campaigns', module: 'campaigns' },
            { code: 'campaigns.execute', name: 'Exécuter les campagnes', nom: 'Exécuter les campagnes', description: 'Exécution des campagnes de prospection', category: 'campaigns', module: 'campaigns' },
            { code: 'campaigns.validate', name: 'Valider les campagnes', nom: 'Valider les campagnes', description: 'Validation des campagnes', category: 'campaigns', module: 'campaigns' },
            
            // Missions
            { code: 'missions.view', name: 'Voir les missions', nom: 'Voir les missions', description: 'Lecture des missions', category: 'missions', module: 'missions' },
            { code: 'missions.create', name: 'Créer des missions', nom: 'Créer des missions', description: 'Création de nouvelles missions', category: 'missions', module: 'missions' },
            { code: 'missions.edit', name: 'Modifier les missions', nom: 'Modifier les missions', description: 'Modification des missions existantes', category: 'missions', module: 'missions' },
            { code: 'missions.delete', name: 'Supprimer les missions', nom: 'Supprimer les missions', description: 'Suppression de missions', category: 'missions', module: 'missions' },
            { code: 'missions.assign', name: 'Assigner des missions', nom: 'Assigner des missions', description: 'Assignation de missions aux collaborateurs', category: 'missions', module: 'missions' },
            
            // Clients
            { code: 'clients.view', name: 'Voir les clients', nom: 'Voir les clients', description: 'Lecture des données clients', category: 'clients', module: 'clients' },
            { code: 'clients.create', name: 'Créer des clients', nom: 'Créer des clients', description: 'Création de nouveaux clients', category: 'clients', module: 'clients' },
            { code: 'clients.edit', name: 'Modifier les clients', nom: 'Modifier les clients', description: 'Modification des données clients', category: 'clients', module: 'clients' },
            { code: 'clients.delete', name: 'Supprimer les clients', nom: 'Supprimer les clients', description: 'Suppression de clients', category: 'clients', module: 'clients' },
            
            // Users
            { code: 'users.view', name: 'Voir les utilisateurs', nom: 'Voir les utilisateurs', description: 'Lecture des données utilisateurs', category: 'users', module: 'users' },
            { code: 'users.create', name: 'Créer des utilisateurs', nom: 'Créer des utilisateurs', description: 'Création de nouveaux utilisateurs', category: 'users', module: 'users' },
            { code: 'users.edit', name: 'Modifier les utilisateurs', nom: 'Modifier les utilisateurs', description: 'Modification des données utilisateurs', category: 'users', module: 'users' },
            { code: 'users.delete', name: 'Supprimer les utilisateurs', nom: 'Supprimer les utilisateurs', description: 'Suppression d''utilisateurs', category: 'users', module: 'users' },
            { code: 'users.permissions', name: 'Gérer les permissions', nom: 'Gérer les permissions', description: 'Gestion des permissions utilisateurs', category: 'users', module: 'users' },
            
            // Reports
            { code: 'reports.view', name: 'Voir les rapports', nom: 'Voir les rapports', description: 'Accès aux rapports', category: 'reports', module: 'reports' },
            { code: 'reports.create', name: 'Créer des rapports', nom: 'Créer des rapports', description: 'Création de nouveaux rapports', category: 'reports', module: 'reports' },
            { code: 'reports.export', name: 'Exporter les rapports', nom: 'Exporter les rapports', description: 'Export des rapports', category: 'reports', module: 'reports' },
            { code: 'reports.admin', name: 'Administrer les rapports', nom: 'Administrer les rapports', description: 'Configuration des rapports', category: 'reports', module: 'reports' },
            
            // Config
            { code: 'config.view', name: 'Voir la configuration', nom: 'Voir la configuration', description: 'Lecture de la configuration système', category: 'config', module: 'config' },
            { code: 'config.edit', name: 'Modifier la configuration', nom: 'Modifier la configuration', description: 'Modification de la configuration', category: 'config', module: 'config' },
            { code: 'config.admin', name: 'Administrer la configuration', nom: 'Administrer la configuration', description: 'Configuration complète du système', category: 'config', module: 'config' },
            { code: 'permissions.manage', name: 'Gérer les permissions', nom: 'Gérer les permissions', description: 'Gestion du système de permissions', category: 'config', module: 'config' }
        ];
        
        for (const perm of permissions) {
            const insertSQL = `
                INSERT INTO permissions (code, name, nom, description, category, module) 
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (code) DO NOTHING;
            `;
            await client.query(insertSQL, [perm.code, perm.name, perm.nom, perm.description, perm.category, perm.module]);
        }
        
        console.log(`✅ ${permissions.length} permissions insérées avec succès`);
        
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
        console.log('\n🎉 Migration simplifiée terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

// Exécution de la migration
runSimpleMigration()
    .then(() => {
        console.log('✅ Migration simplifiée complétée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la migration simplifiée:', error);
        process.exit(1);
    });
