#!/usr/bin/env node

/**
 * SCRIPT D'INITIALISATION COMPLÈTE - SUPER ADMIN
 * ==============================================
 * 
 * Ce script initialise une nouvelle base de données avec :
 * - Tables nécessaires (roles, permissions, user_roles, role_permissions)
 * - Rôles de base
 * - Toutes les permissions (menu + API)
 * - Utilisateur SUPER_ADMIN avec tous les droits
 * 
 * Usage: node scripts/init-super-admin-complete.js
 * 
 * IMPORTANT: Configurez le .env avec les bonnes informations de base de données
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuration de la connexion
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  INITIALISATION COMPLÈTE - SUPER ADMIN + PERMISSIONS       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function initSuperAdmin() {
    try {
        // ===============================================
        // ÉTAPE 1: Connexion et vérification
        // ===============================================
        console.log('📡 ÉTAPE 1/7 : Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie à la base de données\n');

        // ===============================================
        // ÉTAPE 2: Création/Vérification des tables
        // ===============================================
        console.log('🗄️  ÉTAPE 2/7 : Vérification et création des tables...');
        
        // Table users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                login VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'COLLABORATEUR',
                statut VARCHAR(50) DEFAULT 'ACTIF',
                collaborateur_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table users');

        // Table roles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                is_system_role BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table roles');

        // Table permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table permissions');

        // Table user_roles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, role_id)
            );
        `);
        console.log('   ✓ Table user_roles');

        // Table role_permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, permission_id)
            );
        `);
        console.log('   ✓ Table role_permissions\n');

        // ===============================================
        // ÉTAPE 3: Création des rôles de base
        // ===============================================
        console.log('👥 ÉTAPE 3/7 : Création des rôles de base...');
        
        const baseRoles = [
            { name: 'SUPER_ADMIN', description: 'Super Administrateur - Accès total au système', is_system: true },
            { name: 'ADMIN', description: 'Administrateur général', is_system: true },
            { name: 'DIRECTEUR', description: 'Directeur - Accès stratégique', is_system: false },
            { name: 'MANAGER', description: 'Manager - Gestion d\'équipe', is_system: false },
            { name: 'CONSULTANT', description: 'Consultant', is_system: false },
            { name: 'COLLABORATEUR', description: 'Collaborateur standard', is_system: false },
            { name: 'ASSOCIE', description: 'Associé', is_system: false }
        ];

        for (const role of baseRoles) {
            await pool.query(`
                INSERT INTO roles (name, description, is_system_role)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO NOTHING
            `, [role.name, role.description, role.is_system]);
        }
        console.log(`   ✅ ${baseRoles.length} rôles créés\n`);

        // ===============================================
        // ÉTAPE 4: Création de toutes les permissions
        // ===============================================
        console.log('🔐 ÉTAPE 4/7 : Création des permissions...');
        
        const allPermissions = [
            // Permissions de menu - DASHBOARD
            { name: 'Dashboard - Tableau de bord principal', code: 'menu.dashboard.tableau_de_bord_principal', category: 'menu' },
            { name: 'Dashboard - Dashboard personnel', code: 'menu.dashboard.dashboard_personnel', category: 'menu' },
            { name: 'Dashboard - Dashboard équipe', code: 'menu.dashboard.dashboard_equipe', category: 'menu' },
            { name: 'Dashboard - Dashboard direction', code: 'menu.dashboard.dashboard_direction', category: 'menu' },
            { name: 'Dashboard - Dashboard recouvrement', code: 'menu.dashboard.dashboard_recouvrement', category: 'menu' },
            { name: 'Dashboard - Dashboard rentabilité', code: 'menu.dashboard.dashboard_rentabilite', category: 'menu' },
            { name: 'Dashboard - Dashboard chargeabilité', code: 'menu.dashboard.dashboard_chargeabilite', category: 'menu' },
            { name: 'Dashboard - Analytics & Indicateurs', code: 'menu.dashboard.analytics_indicateurs', category: 'menu' },
            { name: 'Dashboard - Dashboard optimisé', code: 'menu.dashboard.dashboard_optimise', category: 'menu' },
            
            // Permissions de menu - RAPPORTS
            { name: 'Rapports - Rapports de temps', code: 'menu.rapports.rapports_generaux', category: 'menu' },
            { name: 'Rapports - Rapports missions', code: 'menu.rapports.rapports_missions', category: 'menu' },
            { name: 'Rapports - Rapports opportunités', code: 'menu.rapports.rapports_opportunites', category: 'menu' },
            { name: 'Rapports - Rapports RH', code: 'menu.rapports.rapports_rh', category: 'menu' },
            { name: 'Rapports - Rapports de prospection', code: 'menu.rapports.rapports_de_prospection', category: 'menu' },
            
            // Permissions de menu - GESTION DES TEMPS
            { name: 'Temps - Saisie des temps', code: 'menu.temps.saisie_des_temps', category: 'menu' },
            { name: 'Temps - Feuilles de temps', code: 'menu.temps.feuilles_de_temps', category: 'menu' },
            { name: 'Temps - Approbation des feuilles de temps', code: 'menu.temps.approbation_feuilles_temps', category: 'menu' },
            
            // Permissions de menu - GESTION
            { name: 'Gestion - Clients', code: 'menu.gestion.clients', category: 'menu' },
            { name: 'Gestion - Collaborateurs', code: 'menu.gestion.collaborateurs', category: 'menu' },
            { name: 'Gestion - Missions', code: 'menu.gestion.missions', category: 'menu' },
            { name: 'Gestion - Opportunités', code: 'menu.gestion.opportunites', category: 'menu' },
            { name: 'Gestion - Factures', code: 'menu.gestion.factures', category: 'menu' },
            
            // Permissions de menu - PROSPECTION
            { name: 'Prospection - Campagnes de prospection', code: 'menu.prospection.campagnes_prospection', category: 'menu' },
            { name: 'Prospection - Validation des campagnes', code: 'menu.prospection.validation_campagnes', category: 'menu' },
            { name: 'Prospection - Exécution des campagnes', code: 'menu.prospection.execution_campagnes', category: 'menu' },
            { name: 'Prospection - Sources de prospection', code: 'menu.prospection.sources_prospection', category: 'menu' },
            { name: 'Prospection - Templates de prospection', code: 'menu.prospection.templates_prospection', category: 'menu' },
            
            // Permissions de menu - PARAMÈTRES
            { name: 'Paramètres - Utilisateurs', code: 'menu.parametres.utilisateurs', category: 'menu' },
            { name: 'Paramètres - Types d\'opportunités', code: 'menu.parametres.types_opportunites', category: 'menu' },
            { name: 'Paramètres - Configuration des types d\'opportunités', code: 'menu.parametres.config_types_opportunites', category: 'menu' },
            { name: 'Paramètres - Étapes d\'opportunités', code: 'menu.parametres.etapes_opportunites', category: 'menu' },
            { name: 'Paramètres - Types de missions', code: 'menu.parametres.types_missions', category: 'menu' },
            { name: 'Paramètres - Business Units', code: 'menu.parametres.business_units', category: 'menu' },
            { name: 'Paramètres - Responsables BU', code: 'menu.parametres.responsables_bu', category: 'menu' },
            { name: 'Paramètres - Divisions', code: 'menu.parametres.divisions', category: 'menu' },
            { name: 'Paramètres - Postes', code: 'menu.parametres.postes', category: 'menu' },
            { name: 'Paramètres - Grades', code: 'menu.parametres.grades', category: 'menu' },
            { name: 'Paramètres - Taux horaires', code: 'menu.parametres.taux_horaires', category: 'menu' },
            { name: 'Paramètres - Secteurs d\'activité', code: 'menu.parametres.secteurs_activite', category: 'menu' },
            { name: 'Paramètres - Pays', code: 'menu.parametres.pays', category: 'menu' },
            { name: 'Paramètres - Activités internes', code: 'menu.parametres.activites_internes', category: 'menu' },
            { name: 'Paramètres - Années fiscales', code: 'menu.parametres.annees_fiscales', category: 'menu' },
            { name: 'Paramètres - Templates de tâches', code: 'menu.parametres.templates_taches', category: 'menu' },
            { name: 'Paramètres - Paramètres de notifications', code: 'menu.parametres.parametres_notifications', category: 'menu' },
            { name: 'Paramètres - Gestion des permissions', code: 'menu.parametres.gestion_permissions', category: 'menu' },
            
            // Permissions API
            { name: 'API - Gestion des permissions', code: 'permission.manage', category: 'api' },
            { name: 'API - Assigner des permissions', code: 'permission.assign', category: 'api' },
            { name: 'API - Révoquer des permissions', code: 'permission.revoke', category: 'api' },
            { name: 'API - Gestion des rôles', code: 'role.manage', category: 'api' },
            { name: 'API - Lecture des permissions', code: 'api.permissions.read', category: 'api' },
            { name: 'API - Écriture des permissions', code: 'api.permissions.write', category: 'api' },
            { name: 'API - Gestion des utilisateurs', code: 'api.users.manage', category: 'api' },
            { name: 'API - Gestion des clients', code: 'api.clients.manage', category: 'api' },
            { name: 'API - Gestion des missions', code: 'api.missions.manage', category: 'api' },
            { name: 'API - Gestion des opportunités', code: 'api.opportunities.manage', category: 'api' }
        ];

        let createdPermissions = 0;
        for (const perm of allPermissions) {
            try {
                await pool.query(`
                    INSERT INTO permissions (name, code, description, category)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (code) DO NOTHING
                `, [perm.name, perm.code, perm.name, perm.category]);
                createdPermissions++;
            } catch (error) {
                if (!error.message.includes('duplicate')) {
                    console.log(`   ⚠️ ${perm.name}: ${error.message}`);
                }
            }
        }
        console.log(`   ✅ ${createdPermissions} permissions créées\n`);

        // ===============================================
        // ÉTAPE 5: Création de l'utilisateur SUPER_ADMIN
        // ===============================================
        console.log('👤 ÉTAPE 5/7 : Création de l\'utilisateur SUPER_ADMIN...');
        
        const adminUser = {
            nom: 'Administrateur',
            prenom: 'Système',
            login: 'admin',
            email: 'admin@system.local',
            password: 'Admin@2025!',
            role: 'SUPER_ADMIN'
        };

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await pool.query(
            'SELECT id, login, email FROM users WHERE login = $1 OR email = $2',
            [adminUser.login, adminUser.email]
        );

        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
            console.log('   ⚠️  Utilisateur admin existant trouvé');
            console.log(`   → ID: ${userId}`);
        } else {
            // Hasher le mot de passe
            const passwordHash = await bcrypt.hash(adminUser.password, 12);
            
            // Créer l'utilisateur
            const result = await pool.query(`
                INSERT INTO users (nom, prenom, login, email, password_hash, role, statut)
                VALUES ($1, $2, $3, $4, $5, $6, 'ACTIF')
                RETURNING id, nom, prenom, login, email, role
            `, [
                adminUser.nom,
                adminUser.prenom,
                adminUser.login,
                adminUser.email,
                passwordHash,
                adminUser.role
            ]);
            
            userId = result.rows[0].id;
            console.log('   ✅ Utilisateur SUPER_ADMIN créé');
            console.log(`   → ID: ${userId}`);
            console.log(`   → Login: ${adminUser.login}`);
            console.log(`   → Email: ${adminUser.email}`);
        }
        console.log('');

        // ===============================================
        // ÉTAPE 6: Association du rôle SUPER_ADMIN
        // ===============================================
        console.log('🔗 ÉTAPE 6/7 : Association du rôle SUPER_ADMIN à l\'utilisateur...');
        
        // Récupérer l'ID du rôle SUPER_ADMIN
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['SUPER_ADMIN']);
        const superAdminRoleId = roleResult.rows[0].id;

        // Associer le rôle à l'utilisateur
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, superAdminRoleId]);
        console.log('   ✅ Rôle SUPER_ADMIN associé à l\'utilisateur\n');

        // ===============================================
        // ÉTAPE 7: Association de toutes les permissions
        // ===============================================
        console.log('🔐 ÉTAPE 7/7 : Association de toutes les permissions au rôle SUPER_ADMIN...');
        
        // Récupérer toutes les permissions
        const allPermsResult = await pool.query('SELECT id FROM permissions');
        
        let associatedCount = 0;
        for (const perm of allPermsResult.rows) {
            try {
                await pool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                `, [superAdminRoleId, perm.id]);
                associatedCount++;
            } catch (error) {
                if (!error.message.includes('duplicate')) {
                    console.log(`   ⚠️ Erreur: ${error.message}`);
                }
            }
        }
        console.log(`   ✅ ${associatedCount} permissions associées au rôle SUPER_ADMIN\n`);

        // ===============================================
        // RÉSUMÉ FINAL
        // ===============================================
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                   ✅ INITIALISATION TERMINÉE                 ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Tables créées/vérifiées`);
        console.log(`   ✓ ${baseRoles.length} rôles créés`);
        console.log(`   ✓ ${allPermissions.length} permissions créées`);
        console.log(`   ✓ Utilisateur SUPER_ADMIN créé`);
        console.log(`   ✓ Toutes les permissions associées`);
        
        console.log('\n🔑 INFORMATIONS DE CONNEXION :');
        console.log('══════════════════════════════');
        console.log(`   📧 Email    : ${adminUser.email}`);
        console.log(`   🔐 Login    : ${adminUser.login}`);
        console.log(`   🔑 Password : ${adminUser.password}`);
        
        console.log('\n⚠️  IMPORTANT : Changez le mot de passe après la première connexion !');
        console.log('\n🚀 Vous pouvez maintenant démarrer l\'application :');
        console.log('   npm start\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n💡 Vérifiez :');
        console.error('   - Les informations de connexion dans le fichier .env');
        console.error('   - Que la base de données existe');
        console.error('   - Que PostgreSQL est démarré\n');
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution du script
initSuperAdmin().catch((error) => {
    console.error('\n❌ Échec de l\'initialisation');
    process.exit(1);
});

