// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données avec les variables d'environnement
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function migrateProduction() {
    console.log('🚀 Migration de la base de données pour la production...\n');
    
    try {
        // 1. Vérifier la connexion à la base de données
        console.log('1️⃣ Test de connexion à la base de données...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure serveur: ${testResult.rows[0].current_time}`);
        
        // 2. Créer les tables si elles n'existent pas
        console.log('\n2️⃣ Création des tables...');
        
        // Table users (doit être créée en premier car référencée par d'autres tables)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                prenom VARCHAR(255) NOT NULL,
                login VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'COLLABORATEUR',
                statut VARCHAR(20) DEFAULT 'ACTIF',
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table users créée/vérifiée');
        
        // Table business_units
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_units (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                statut VARCHAR(20) DEFAULT 'ACTIF',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table business_units créée/vérifiée');
        
        // Table roles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table roles créée/vérifiée');
        
        // Table permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table permissions créée/vérifiée');
        
        // Table role_permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
                permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, permission_id)
            )
        `);
        console.log('✅ Table role_permissions créée/vérifiée');
        
        // Table user_permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
                granted BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, permission_id)
            )
        `);
        console.log('✅ Table user_permissions créée/vérifiée');
        
        // Table user_business_unit_access
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_business_unit_access (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
                access_level VARCHAR(20) DEFAULT 'READ',
                granted BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, business_unit_id)
            )
        `);
        console.log('✅ Table user_business_unit_access créée/vérifiée');
        
        // Table permission_audit_log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permission_audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(50) NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_id UUID,
                details JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table permission_audit_log créée/vérifiée');
        
        // 3. Insérer les données de base
        console.log('\n3️⃣ Insertion des données de base...');
        
        // Business Units de base
        const businessUnits = [
            { nom: 'Direction Générale', code: 'DG', description: 'Direction générale de l\'entreprise' },
            { nom: 'EB-AUDIT', code: 'AU01', description: 'Division Audit' },
            { nom: 'EB-DOUANE', code: 'DOU01', description: 'Division Douane' },
            { nom: 'EB-LAW', code: 'TL01', description: 'Division Legal' },
            { nom: 'EB-RH', code: 'RH01', description: 'Division Ressources Humaines' },
            { nom: 'EB-SERVICE', code: 'SERV', description: 'Division Services' },
            { nom: 'Finance', code: 'FIN', description: 'Division Finance' },
            { nom: 'Ressources Humaines', code: 'RH', description: 'Division RH' }
        ];
        
        for (const bu of businessUnits) {
            await pool.query(`
                INSERT INTO business_units (nom, code, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO NOTHING
            `, [bu.nom, bu.code, bu.description]);
        }
        console.log('✅ Business Units de base insérées');
        
        // Rôles de base
        const roles = [
            { name: 'SUPER_ADMIN', description: 'Super administrateur avec tous les droits' },
            { name: 'ADMIN_IT', description: 'Administrateur IT' },
            { name: 'IT', description: 'Technicien IT' },
            { name: 'ADMIN', description: 'Administrateur' },
            { name: 'MANAGER', description: 'Manager' },
            { name: 'CONSULTANT', description: 'Consultant' },
            { name: 'COLLABORATEUR', description: 'Collaborateur' },
            { name: 'ASSOCIE', description: 'Associé' },
            { name: 'DIRECTEUR', description: 'Directeur' },
            { name: 'SUPER_USER', description: 'Super utilisateur' },
            { name: 'SUPERVISEUR', description: 'Superviseur' }
        ];
        
        for (const role of roles) {
            await pool.query(`
                INSERT INTO roles (name, description)
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING
            `, [role.name, role.description]);
        }
        console.log('✅ Rôles de base insérés');
        
        // Permissions de base
        const permissions = [
            // Dashboard
            { code: 'dashboard.view', name: 'Voir le dashboard', category: 'dashboard' },
            { code: 'menu.dashboard', name: 'Accès au menu Dashboard', category: 'menu' },
            { code: 'menu.dashboard.main', name: 'Accès au lien principal Dashboard', category: 'menu' },
            
            // Opportunités
            { code: 'opportunities.view', name: 'Voir les opportunités', category: 'opportunities' },
            { code: 'opportunities.create', name: 'Créer des opportunités', category: 'opportunities' },
            { code: 'opportunities.edit', name: 'Modifier les opportunités', category: 'opportunities' },
            { code: 'opportunities.delete', name: 'Supprimer les opportunités', category: 'opportunities' },
            { code: 'menu.opportunities', name: 'Accès au menu Opportunités', category: 'menu' },
            
            // Prospection
            { code: 'campaigns.view', name: 'Voir les campagnes', category: 'campaigns' },
            { code: 'campaigns.create', name: 'Créer des campagnes', category: 'campaigns' },
            { code: 'campaigns.edit', name: 'Modifier les campagnes', category: 'campaigns' },
            { code: 'campaigns.delete', name: 'Supprimer les campagnes', category: 'campaigns' },
            { code: 'menu.prospecting', name: 'Accès au menu Prospection', category: 'menu' },
            
            // Missions
            { code: 'missions.view', name: 'Voir les missions', category: 'missions' },
            { code: 'missions.create', name: 'Créer des missions', category: 'missions' },
            { code: 'missions.edit', name: 'Modifier les missions', category: 'missions' },
            { code: 'missions.delete', name: 'Supprimer les missions', category: 'missions' },
            { code: 'menu.missions', name: 'Accès au menu Missions', category: 'menu' },
            
            // Clients
            { code: 'clients.view', name: 'Voir les clients', category: 'clients' },
            { code: 'clients.create', name: 'Créer des clients', category: 'clients' },
            { code: 'clients.edit', name: 'Modifier les clients', category: 'clients' },
            { code: 'clients.delete', name: 'Supprimer les clients', category: 'clients' },
            { code: 'menu.clients', name: 'Accès au menu Clients', category: 'menu' },
            
            // Rapports
            { code: 'reports.view', name: 'Voir les rapports', category: 'reports' },
            { code: 'reports.create', name: 'Créer des rapports', category: 'reports' },
            { code: 'menu.reports', name: 'Accès au menu Rapports', category: 'menu' },
            { code: 'menu.reports.general', name: 'Accès au lien Rapports généraux', category: 'menu' },
            
            // Administration
            { code: 'admin.users', name: 'Gérer les utilisateurs', category: 'admin' },
            { code: 'admin.roles', name: 'Gérer les rôles', category: 'admin' },
            { code: 'admin.permissions', name: 'Gérer les permissions', category: 'admin' },
            { code: 'admin.business_units', name: 'Gérer les Business Units', category: 'admin' },
            { code: 'menu.admin', name: 'Accès au menu Administration', category: 'menu' }
        ];
        
        for (const perm of permissions) {
            await pool.query(`
                INSERT INTO permissions (code, name, category)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO NOTHING
            `, [perm.code, perm.name, perm.category]);
        }
        console.log('✅ Permissions de base insérées');
        
        // 4. Assigner les permissions aux rôles
        console.log('\n4️⃣ Attribution des permissions aux rôles...');
        
        // SUPER_ADMIN - Toutes les permissions
        const superAdminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['SUPER_ADMIN']);
        if (superAdminRole.rows.length > 0) {
            const allPermissions = await pool.query('SELECT id FROM permissions');
            for (const perm of allPermissions.rows) {
                await pool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                `, [superAdminRole.rows[0].id, perm.id]);
            }
            console.log('✅ Permissions attribuées au rôle SUPER_ADMIN');
        }
        
        // COLLABORATEUR - Permissions limitées
        const collaborateurRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['COLLABORATEUR']);
        if (collaborateurRole.rows.length > 0) {
            const collaborateurPermissions = [
                'dashboard.view', 'menu.dashboard', 'menu.dashboard.main',
                'opportunities.view', 'menu.opportunities',
                'campaigns.view', 'menu.prospecting',
                'missions.view', 'menu.missions',
                'clients.view', 'menu.clients',
                'reports.view', 'menu.reports', 'menu.reports.general'
            ];
            
            for (const permCode of collaborateurPermissions) {
                const perm = await pool.query('SELECT id FROM permissions WHERE code = $1', [permCode]);
                if (perm.rows.length > 0) {
                    await pool.query(`
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES ($1, $2)
                        ON CONFLICT (role_id, permission_id) DO NOTHING
                    `, [collaborateurRole.rows[0].id, perm.rows[0].id]);
                }
            }
            console.log('✅ Permissions attribuées au rôle COLLABORATEUR');
        }
        
        console.log('\n🎉 Migration terminée avec succès !');
        console.log('\n📊 Résumé :');
        console.log('   - Tables créées/vérifiées');
        console.log('   - Business Units de base insérées');
        console.log('   - Rôles de base insérés');
        console.log('   - Permissions de base insérées');
        console.log('   - Permissions attribuées aux rôles');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

migrateProduction().catch(console.error);


