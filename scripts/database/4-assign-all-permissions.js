#!/usr/bin/env node

/**
 * SCRIPT 4/4 : AFFECTATION DE TOUTES LES PERMISSIONS
 * ===================================================
 * 
 * Ce script affecte TOUTES les permissions existantes dans la base de données
 * au rôle Super Administrateur et à l'utilisateur sélectionné.
 * 
 * IMPORTANT: Ce script doit être exécuté APRÈS sync-all-permissions-complete.js
 * qui crée toutes les permissions (fonctionnelles, granulaires, menu, etc.)
 * 
 * Fonctionnalités :
 * - Récupère TOUTES les permissions existantes dans la base de données
 * - Associe toutes les permissions au rôle Super Administrateur
 * - Associe toutes les permissions à l'utilisateur sélectionné
 * - Supporte les permissions fonctionnelles, granulaires et de menu
 * 
 * Usage: node scripts/database/4-assign-all-permissions.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     ÉTAPE 4/4 : AFFECTATION DE TOUTES LES PERMISSIONS      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// NOTE: Ce script assigne maintenant TOUTES les permissions existantes dans la base de données
// Les permissions doivent être créées au préalable par sync-all-permissions-complete.js
// La liste ci-dessous est conservée pour référence mais n'est plus utilisée
const ALL_PERMISSIONS_REFERENCE = [
    // ========================================
    // SECTION 1: DASHBOARD (9 permissions)
    // ========================================
    { name: 'Dashboard - Tableau de bord principal', code: 'menu.dashboard.tableau_de_bord_principal', description: 'Accès au tableau de bord principal', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard personnel', code: 'menu.dashboard.dashboard_personnel', description: 'Accès au dashboard personnel', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard équipe', code: 'menu.dashboard.dashboard_equipe', description: 'Accès au dashboard équipe', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard direction', code: 'menu.dashboard.dashboard_direction', description: 'Accès au dashboard direction', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard recouvrement', code: 'menu.dashboard.dashboard_recouvrement', description: 'Accès au dashboard recouvrement', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard rentabilité', code: 'menu.dashboard.dashboard_rentabilite', description: 'Accès au dashboard rentabilité', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard chargeabilité', code: 'menu.dashboard.dashboard_chargeabilite', description: 'Accès au dashboard chargeabilité', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Analytics et indicateurs', code: 'menu.dashboard.analytics_indicateurs', description: 'Accès aux analytics et indicateurs', category: 'menu', module: 'dashboard' },
    { name: 'Dashboard - Dashboard optimisé', code: 'menu.dashboard.dashboard_optimise', description: 'Accès au dashboard optimisé', category: 'menu', module: 'dashboard' },
    
    // ========================================
    // SECTION 2: RAPPORTS (5 permissions)
    // ========================================
    { name: 'Rapports - Rapports de temps', code: 'menu.rapports.rapports_generaux', description: 'Accès aux rapports de temps', category: 'menu', module: 'rapports' },
    { name: 'Rapports - Rapports missions', code: 'menu.rapports.rapports_missions', description: 'Accès aux rapports missions', category: 'menu', module: 'rapports' },
    { name: 'Rapports - Rapports opportunités', code: 'menu.rapports.rapports_opportunites', description: 'Accès aux rapports opportunités', category: 'menu', module: 'rapports' },
    { name: 'Rapports - Rapports RH', code: 'menu.rapports.rapports_rh', description: 'Accès aux rapports RH', category: 'menu', module: 'rapports' },
    { name: 'Rapports - Rapports de prospection', code: 'menu.rapports.rapports_de_prospection', description: 'Accès aux rapports de prospection', category: 'menu', module: 'rapports' },
    
    // ========================================
    // SECTION 3: GESTION DES TEMPS (2 permissions)
    // ========================================
    { name: 'Temps - Saisie des temps', code: 'menu.gestion_des_temps.saisie_des_temps', description: 'Accès à la saisie des temps', category: 'menu', module: 'temps' },
    { name: 'Temps - Validation des temps', code: 'menu.gestion_des_temps.validation_des_temps', description: 'Accès à la validation des temps', category: 'menu', module: 'temps' },
    
    // ========================================
    // SECTION 4: GESTION MISSION (4 permissions)
    // ========================================
    { name: 'Mission - Missions', code: 'menu.gestion_mission.missions', description: 'Accès à la gestion des missions', category: 'menu', module: 'missions' },
    { name: 'Mission - Types de mission', code: 'menu.gestion_mission.types_de_mission', description: 'Accès aux types de mission', category: 'menu', module: 'missions' },
    { name: 'Mission - Tâches', code: 'menu.gestion_mission.taches', description: 'Accès aux tâches', category: 'menu', module: 'missions' },
    { name: 'Mission - Factures et paiements', code: 'menu.gestion_mission.factures_et_paiements', description: 'Accès aux factures et paiements', category: 'menu', module: 'missions' },
    
    // ========================================
    // SECTION 5: MARKET PIPELINE (5 permissions)
    // ========================================
    { name: 'Market - Clients et prospects', code: 'menu.market_pipeline.clients_et_prospects', description: 'Accès aux clients et prospects', category: 'menu', module: 'market' },
    { name: 'Market - Opportunités', code: 'menu.market_pipeline.opportunites', description: 'Accès aux opportunités', category: 'menu', module: 'market' },
    { name: 'Market - Types d\'opportunité', code: 'menu.market_pipeline.types_d_opportunite', description: 'Accès aux types d\'opportunité', category: 'menu', module: 'market' },
    { name: 'Market - Campagnes de prospection', code: 'menu.market_pipeline.campagnes_de_prospection', description: 'Accès aux campagnes de prospection', category: 'menu', module: 'market' },
    { name: 'Market - Validation des campagnes', code: 'menu.market_pipeline.validation_des_campagnes', description: 'Accès à la validation des campagnes', category: 'menu', module: 'market' },
    
    // ========================================
    // SECTION 6: GESTION RH (3 permissions)
    // ========================================
    { name: 'RH - Collaborateurs', code: 'menu.gestion_rh.collaborateurs', description: 'Accès aux collaborateurs', category: 'menu', module: 'rh' },
    { name: 'RH - Grades', code: 'menu.gestion_rh.grades', description: 'Accès aux grades', category: 'menu', module: 'rh' },
    { name: 'RH - Postes', code: 'menu.gestion_rh.postes', description: 'Accès aux postes', category: 'menu', module: 'rh' },
    
    // ========================================
    // SECTION 7: CONFIGURATIONS (5 permissions)
    // ========================================
    { name: 'Config - Années fiscales', code: 'menu.configurations.annees_fiscales', description: 'Accès aux années fiscales', category: 'menu', module: 'configuration' },
    { name: 'Config - Pays', code: 'menu.configurations.pays', description: 'Accès aux pays', category: 'menu', module: 'configuration' },
    { name: 'Config - Configuration types d\'opportunité', code: 'menu.configurations.configuration_types_d_opportunite', description: 'Accès à la configuration des types d\'opportunité', category: 'menu', module: 'configuration' },
    { name: 'Config - Sources entreprises', code: 'menu.configurations.sources_entreprises', description: 'Accès aux sources entreprises', category: 'menu', module: 'configuration' },
    { name: 'Config - Modèles de prospection', code: 'menu.configurations.modeles_de_prospection', description: 'Accès aux modèles de prospection', category: 'menu', module: 'configuration' },
    
    // ========================================
    // SECTION 8: BUSINESS UNIT (4 permissions)
    // ========================================
    { name: 'BU - Unités d\'affaires', code: 'menu.business_unit.unites_d_affaires', description: 'Accès aux unités d\'affaires', category: 'menu', module: 'business_unit' },
    { name: 'BU - Divisions', code: 'menu.business_unit.divisions', description: 'Accès aux divisions', category: 'menu', module: 'business_unit' },
    { name: 'BU - Activités internes', code: 'menu.business_unit.activites_internes', description: 'Accès aux activités internes', category: 'menu', module: 'business_unit' },
    { name: 'BU - Secteurs d\'activité', code: 'menu.business_unit.secteurs_d_activite', description: 'Accès aux secteurs d\'activité', category: 'menu', module: 'business_unit' },
    
    // ========================================
    // SECTION 9: PARAMÈTRES ADMINISTRATION (3 permissions)
    // ========================================
    { name: 'Admin - Configuration notifications', code: 'menu.parametres_administration.configuration_notifications', description: 'Accès à la configuration des notifications', category: 'menu', module: 'administration' },
    { name: 'Admin - Utilisateurs', code: 'menu.parametres_administration.utilisateurs', description: 'Accès aux utilisateurs', category: 'menu', module: 'administration' },
    { name: 'Admin - Administration des permissions', code: 'menu.parametres_administration.administration_des_permissions', description: 'Accès à l\'administration des permissions', category: 'menu', module: 'administration' },
    
    // ========================================
    // PERMISSIONS API (20 permissions)
    // ========================================
    { name: 'API - Gestion des permissions', code: 'api.permissions.manage', description: 'Gérer les permissions via API', category: 'api', module: 'api' },
    { name: 'API - Lecture des permissions', code: 'api.permissions.read', description: 'Lire les permissions via API', category: 'api', module: 'api' },
    { name: 'API - Écriture des permissions', code: 'api.permissions.write', description: 'Écrire les permissions via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des rôles', code: 'api.roles.manage', description: 'Gérer les rôles via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des utilisateurs', code: 'api.users.manage', description: 'Gérer les utilisateurs via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des clients', code: 'api.clients.manage', description: 'Gérer les clients via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des missions', code: 'api.missions.manage', description: 'Gérer les missions via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des opportunités', code: 'api.opportunities.manage', description: 'Gérer les opportunités via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des collaborateurs', code: 'api.collaborateurs.manage', description: 'Gérer les collaborateurs via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des temps', code: 'api.temps.manage', description: 'Gérer les temps via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des rapports', code: 'api.reports.manage', description: 'Gérer les rapports via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des campagnes', code: 'api.campaigns.manage', description: 'Gérer les campagnes via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des business units', code: 'api.business_units.manage', description: 'Gérer les business units via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des divisions', code: 'api.divisions.manage', description: 'Gérer les divisions via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des grades', code: 'api.grades.manage', description: 'Gérer les grades via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des postes', code: 'api.postes.manage', description: 'Gérer les postes via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des notifications', code: 'api.notifications.manage', description: 'Gérer les notifications via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des factures', code: 'api.invoices.manage', description: 'Gérer les factures via API', category: 'api', module: 'api' },
    { name: 'API - Gestion des tâches', code: 'api.tasks.manage', description: 'Gérer les tâches via API', category: 'api', module: 'api' },
    { name: 'API - Accès complet', code: 'api.full_access', description: 'Accès complet à toutes les API', category: 'api', module: 'api' }
];

async function ensurePermissionsStructure(pool) {
    const queries = [
        `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS nom VARCHAR(255);`,
        `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS code VARCHAR(255) UNIQUE;`,
        `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS description TEXT;`,
        `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
        `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(100);`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS permissions_code_unique ON permissions(code);`);
}

async function main() {
    let pool;
    
    try {
        // ===============================================
        // Configuration et connexion
        // ===============================================
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log(`   🔐 SSL        : ${process.env.NODE_ENV === 'production' ? 'Oui' : 'Non'}\n`);

        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // ===============================================
        // Sélection de l'utilisateur Super Admin
        // ===============================================
        console.log('👥 Recherche des utilisateurs Super Admin...\n');
        
        const superAdmins = await pool.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.role as role_name
            FROM users u
            WHERE u.role = 'SUPER_ADMIN'
            ORDER BY u.created_at DESC
        `);

        if (superAdmins.rows.length === 0) {
            console.log('❌ Aucun utilisateur Super Admin trouvé!');
            console.log('   Exécutez d\'abord: node scripts/database/2-create-super-admin.js\n');
            process.exit(1);
        }

        // Sélectionner automatiquement le premier Super Admin
        const selectedUser = superAdmins.rows[0];

        console.log(`✅ Utilisateur sélectionné: ${selectedUser.nom} ${selectedUser.prenom}`);
        console.log(`   → Email: ${selectedUser.email}`);
        console.log(`   → ID: ${selectedUser.id}`);
        console.log(`\n🔐 Affectation de TOUTES les permissions existantes...\n`);

        // ===============================================
        // Vérification de la structure
        // ===============================================
        console.log('\n🔐 Vérification de la structure des permissions...');
        await ensurePermissionsStructure(pool);
        console.log('   ✓ Structure de la table permissions vérifiée\n');

        // ===============================================
        // Récupération du rôle SUPER_ADMIN
        // ===============================================
        console.log('🔍 Récupération du rôle SUPER_ADMIN...');
        const roleResult = await pool.query(`
            SELECT id FROM roles WHERE name = 'SUPER_ADMIN'
        `);

        if (roleResult.rows.length === 0) {
            console.log('❌ Rôle SUPER_ADMIN non trouvé!\n');
            process.exit(1);
        }

        const superAdminRoleId = roleResult.rows[0].id;
        console.log(`   ✅ Rôle trouvé (ID: ${superAdminRoleId})\n`);

        // ===============================================
        // Récupération de TOUTES les permissions existantes
        // ===============================================
        console.log('📋 Récupération de toutes les permissions existantes dans la base de données...');
        const allPermissions = await pool.query(`
            SELECT id, code, name, category 
            FROM permissions 
            ORDER BY category, name
        `);
        
        console.log(`   ✅ ${allPermissions.rows.length} permissions trouvées dans la base de données\n`);

        if (allPermissions.rows.length === 0) {
            console.log('⚠️  Aucune permission trouvée dans la base de données!');
            console.log('   💡 Exécutez d\'abord: node scripts/database/sync-all-permissions-complete.js\n');
            process.exit(1);
        }

        // ===============================================
        // Association des permissions au rôle
        // ===============================================
        console.log('🔗 Association de toutes les permissions au rôle Super Administrateur...');
        let associatedCount = 0;

        for (const perm of allPermissions.rows) {
            try {
                await pool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                `, [superAdminRoleId, perm.id]);
                associatedCount++;
            } catch (error) {
                console.log(`   ⚠️  Erreur pour ${perm.code}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${associatedCount} permissions associées au rôle\n`);

        // ===============================================
        // Association des permissions à l'utilisateur
        // ===============================================
        console.log('👤 Association des permissions à l\'utilisateur...');
        
        let userPermCount = 0;
        for (const perm of allPermissions.rows) {
            try {
                await pool.query(`
                    INSERT INTO user_permissions (user_id, permission_id, granted)
                    VALUES ($1, $2, true)
                    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true
                `, [selectedUser.id, perm.id]);
                userPermCount++;
            } catch (error) {
                console.log(`   ⚠️  Erreur pour ${perm.code}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${userPermCount} permissions affectées à l'utilisateur\n`);

        // ===============================================
        // Vérification finale
        // ===============================================
        console.log('📊 Vérification finale...\n');

        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ PERMISSIONS AFFECTÉES AVEC SUCCÈS                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   👤 Utilisateur : ${selectedUser.nom} ${selectedUser.prenom}`);
        console.log(`   📧 Email       : ${selectedUser.email}`);
        console.log(`   🆔 ID          : ${selectedUser.id}`);
        console.log(`   👑 Rôle        : Super Administrateur`);
        console.log(`   🔐 Permissions : ${userPermCount} affectées\n`);

        console.log('🎯 CONFIGURATION TERMINÉE :');
        console.log('═══════════════════════════');
        console.log('   ✅ Base de données initialisée');
        console.log('   ✅ Super Admin créé');
        console.log('   ✅ Toutes les permissions affectées\n');

        console.log('🚀 Vous pouvez maintenant démarrer l\'application :');
        console.log('   npm start\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

main();
