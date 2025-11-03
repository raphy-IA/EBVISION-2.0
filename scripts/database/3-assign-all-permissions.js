#!/usr/bin/env node

/**
 * SCRIPT 3/3 : AFFECTATION DE TOUTES LES PERMISSIONS
 * ===================================================
 * 
 * Ce script affecte toutes les permissions (menu + API) à un utilisateur
 * Il crée les permissions si elles n'existent pas, puis les associe
 * au rôle SUPER_ADMIN de l'utilisateur sélectionné
 * 
 * Usage: node scripts/3-assign-all-permissions.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     ÉTAPE 3/3 : AFFECTATION DES PERMISSIONS                ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Liste complète des permissions
const ALL_PERMISSIONS = [
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

async function assignAllPermissions() {
    let pool;
    
    try {
        // ===============================================
        // Connexion à la base de données
        // ===============================================
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
        // Récupérer les utilisateurs avec rôle SUPER_ADMIN
        // ===============================================
        console.log('👥 Recherche des utilisateurs Super Admin...\n');
        
        const usersResult = await pool.query(`
            SELECT DISTINCT u.id, u.nom, u.prenom, u.email, u.login, u.created_at
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.role = 'SUPER_ADMIN' OR r.name = 'SUPER_ADMIN'
            ORDER BY u.created_at DESC
        `);

        if (usersResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur Super Admin trouvé');
            console.log('💡 Exécutez d\'abord: node scripts/2-create-super-admin.js\n');
            await pool.end();
            return;
        }

        // Créer la liste pour le prompt
        const userChoices = usersResult.rows.map(user => ({
            name: `${user.nom} ${user.prenom} (${user.email}) - Login: ${user.login}`,
            value: user.id,
            short: `${user.nom} ${user.prenom}`
        }));

        // ===============================================
        // Sélectionner l'utilisateur
        // ===============================================
        const userAnswer = await inquirer.prompt([
            {
                type: 'list',
                name: 'userId',
                message: 'Sélectionnez l\'utilisateur:',
                choices: userChoices
            }
        ]);

        const selectedUser = usersResult.rows.find(u => u.id === userAnswer.userId);
        
        console.log(`\n✅ Utilisateur sélectionné: ${selectedUser.nom} ${selectedUser.prenom}`);
        console.log(`   → Email: ${selectedUser.email}`);
        console.log(`   → ID: ${selectedUser.id}\n`);

        // ===============================================
        // Confirmation
        // ===============================================
        const confirmAnswer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Affecter TOUTES les permissions (${ALL_PERMISSIONS.length}) à cet utilisateur?`,
                default: true
            }
        ]);

        if (!confirmAnswer.proceed) {
            console.log('\n❌ Opération annulée\n');
            await pool.end();
            return;
        }

        // ===============================================
        // Créer les permissions
        // ===============================================
        console.log('\n🔐 Création des permissions...');
        
        let createdCount = 0;
        let existingCount = 0;
        
        for (const perm of ALL_PERMISSIONS) {
            try {
                await pool.query(`
                    INSERT INTO permissions (name, code, description, category)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (code) DO NOTHING
                `, [perm.name, perm.code, perm.name, perm.category]);
                
                const checkNew = await pool.query('SELECT id FROM permissions WHERE code = $1', [perm.code]);
                if (checkNew.rows.length > 0) {
                    createdCount++;
                }
            } catch (error) {
                if (error.message.includes('duplicate')) {
                    existingCount++;
                } else {
                    console.log(`   ⚠️ ${perm.name}: ${error.message}`);
                }
            }
        }
        
        console.log(`   ✅ ${createdCount} permissions disponibles`);
        if (existingCount > 0) {
            console.log(`   ℹ️  ${existingCount} permissions existaient déjà`);
        }

        // ===============================================
        // Récupérer le rôle SUPER_ADMIN
        // ===============================================
        console.log('\n🔍 Récupération du rôle SUPER_ADMIN...');
        
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['SUPER_ADMIN']);
        if (roleResult.rows.length === 0) {
            console.log('❌ Rôle SUPER_ADMIN non trouvé\n');
            await pool.end();
            return;
        }
        
        const superAdminRoleId = roleResult.rows[0].id;
        console.log(`   ✅ Rôle trouvé (ID: ${superAdminRoleId})`);

        // S'assurer que l'utilisateur a le rôle
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
        `, [selectedUser.id, superAdminRoleId]);

        // ===============================================
        // Associer toutes les permissions au rôle
        // ===============================================
        console.log('\n🔗 Association des permissions au rôle SUPER_ADMIN...');
        
        const allPermsResult = await pool.query('SELECT id, name FROM permissions');
        
        let associatedCount = 0;
        let skippedCount = 0;
        
        for (const perm of allPermsResult.rows) {
            try {
                const insertResult = await pool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                    RETURNING id
                `, [superAdminRoleId, perm.id]);
                
                if (insertResult.rows.length > 0) {
                    associatedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                if (!error.message.includes('duplicate')) {
                    console.log(`   ⚠️ ${perm.name}: ${error.message}`);
                }
            }
        }
        
        console.log(`   ✅ ${associatedCount} nouvelles permissions associées`);
        if (skippedCount > 0) {
            console.log(`   ℹ️  ${skippedCount} permissions déjà associées`);
        }

        // ===============================================
        // Vérification finale
        // ===============================================
        console.log('\n📊 Vérification finale...');
        
        const finalCheck = await pool.query(`
            SELECT COUNT(DISTINCT p.id) as total_permissions
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1
        `, [superAdminRoleId]);
        
        const totalPermissions = parseInt(finalCheck.rows[0].total_permissions);

        // ===============================================
        // RÉSUMÉ FINAL
        // ===============================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ PERMISSIONS AFFECTÉES AVEC SUCCÈS                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   👤 Utilisateur : ${selectedUser.nom} ${selectedUser.prenom}`);
        console.log(`   📧 Email       : ${selectedUser.email}`);
        console.log(`   🆔 ID          : ${selectedUser.id}`);
        console.log(`   👑 Rôle        : SUPER_ADMIN`);
        console.log(`   🔐 Permissions : ${totalPermissions} / ${ALL_PERMISSIONS.length} affectées`);
        
        if (totalPermissions < ALL_PERMISSIONS.length) {
            console.log(`\n   ⚠️  ATTENTION: Seulement ${totalPermissions} permissions sur ${ALL_PERMISSIONS.length} ont été affectées`);
        } else {
            console.log(`\n   ✅ TOUTES les permissions ont été affectées avec succès!`);
        }
        
        console.log('\n🎯 CONFIGURATION TERMINÉE :');
        console.log('═══════════════════════════');
        console.log('   ✅ Base de données initialisée');
        console.log('   ✅ Super Admin créé');
        console.log('   ✅ Toutes les permissions affectées');
        console.log('\n🚀 Vous pouvez maintenant démarrer l\'application :');
        console.log('   npm start\n');

        await pool.end();

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        if (pool) await pool.end();
        process.exit(1);
    }
}

// Exécution
assignAllPermissions().catch(console.error);

