#!/usr/bin/env node

/**
 * Script de remise à zéro de la base de données
 * Offre plusieurs niveaux de nettoyage avec préservation sélective des données
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');
const chalk = require('chalk');

// Configuration de la connexion
const pool = new Pool({
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

// Types de remise à zéro disponibles
const RESET_TYPES = {
    LIGHT: {
        name: '🧹 LÉGÈRE - Supprimer uniquement les données de test/demo',
        value: 'light',
        description: 'Conserve : Tables, Rôles, Super Admins, Permissions, Business Units'
    },
    MODERATE: {
        name: '⚠️  MODÉRÉE - Supprimer les données opérationnelles',
        value: 'moderate',
        description: 'Conserve : Tables, Rôles, Super Admins, Permissions, BU, Divisions, Clients, Missions\nSupprime : Collaborateurs, Opportunités, Campagnes, Contrats, etc.'
    },
    MODERATE_PLUS: {
        name: '🔥 MODÉRÉE+ - Données opérationnelles + Clients/Missions',
        value: 'moderate_plus',
        description: 'Conserve : Tables, Rôles, Super Admins, Permissions, BU, Divisions\nSupprime : Collaborateurs, Opportunités, Campagnes, Clients, Missions, etc.'
    },
    HEAVY: {
        name: '💥 COMPLÈTE - Supprimer toutes les données',
        value: 'heavy',
        description: 'Conserve : Tables, Rôles, Super Admins\nSupprime : Permissions, BU, Divisions, tous les autres utilisateurs'
    },
    BRUTAL: {
        name: '💀 BRUTALE - Tout supprimer et recréer',
        value: 'brutal',
        description: '⚠️  ATTENTION : Supprime TOUT (tables, données, rôles, permissions)'
    }
};

async function resetDatabase() {
    try {
        console.log(chalk.yellow.bold('\n╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.yellow.bold('║         REMISE À ZÉRO DE LA BASE DE DONNÉES                  ║'));
        console.log(chalk.yellow.bold('╚══════════════════════════════════════════════════════════════╝\n'));

        // Test de connexion
        console.log(chalk.cyan('📡 Connexion à la base de données...'));
        await pool.query('SELECT NOW()');
        console.log(chalk.green(`✓ Connecté à: ${process.env.DB_NAME}`));
        console.log(chalk.gray(`  Hôte: ${process.env.DB_HOST}:${process.env.DB_PORT}`));
        console.log(chalk.gray(`  Utilisateur: ${process.env.DB_USER}\n`));

        // Afficher les statistiques actuelles
        const stats = await getDatabaseStats();
        console.log(chalk.cyan('📊 ÉTAT ACTUEL DE LA BASE DE DONNÉES'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(`   Utilisateurs: ${stats.users}`));
        console.log(chalk.white(`   Collaborateurs: ${stats.collaborateurs}`));
        console.log(chalk.white(`   Opportunités: ${stats.opportunities}`));
        console.log(chalk.white(`   Campagnes: ${stats.campaigns}`));
        console.log(chalk.white(`   Business Units: ${stats.business_units}`));
        console.log(chalk.white(`   Permissions: ${stats.permissions}\n`));

        // Choix du type de remise à zéro
        const { resetType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'resetType',
                message: 'Quel type de remise à zéro souhaitez-vous effectuer ?',
                choices: Object.values(RESET_TYPES).map(type => ({
                    name: type.name,
                    value: type.value,
                    short: type.value.toUpperCase()
                })),
                pageSize: 10
            }
        ]);

        // Afficher la description
        const selectedType = Object.values(RESET_TYPES).find(t => t.value === resetType);
        console.log(chalk.yellow('\n⚠️  ATTENTION:'));
        console.log(chalk.white(selectedType.description));

        // Confirmation de sécurité
        const { confirmation } = await inquirer.prompt([
            {
                type: 'input',
                name: 'confirmation',
                message: `Tapez "${resetType.toUpperCase()}" pour confirmer:`,
                validate: (input) => {
                    if (input === resetType.toUpperCase()) {
                        return true;
                    }
                    return 'Confirmation incorrecte. Opération annulée.';
                }
            }
        ]);

        // Double confirmation pour les niveaux moderate_plus, heavy et brutal
        if (resetType === 'moderate_plus' || resetType === 'heavy' || resetType === 'brutal') {
            const { doubleConfirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'doubleConfirm',
                    message: chalk.red.bold('⚠️  DERNIÈRE CHANCE: Êtes-vous ABSOLUMENT SÛR ?'),
                    default: false
                }
            ]);

            if (!doubleConfirm) {
                console.log(chalk.yellow('\n✋ Opération annulée par l\'utilisateur.\n'));
                return;
            }
        }

        console.log(chalk.cyan('\n🔄 Démarrage de la remise à zéro...\n'));

        // Exécuter la remise à zéro selon le type
        switch (resetType) {
            case 'light':
                await resetLight();
                break;
            case 'moderate':
                await resetModerate();
                break;
            case 'moderate_plus':
                await resetModeratePlus();
                break;
            case 'heavy':
                await resetHeavy();
                break;
            case 'brutal':
                await resetBrutal();
                break;
        }

        // Afficher les statistiques finales
        const finalStats = await getDatabaseStats();
        console.log(chalk.cyan('\n📊 ÉTAT FINAL DE LA BASE DE DONNÉES'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(`   Utilisateurs: ${finalStats.users} (${stats.users - finalStats.users} supprimés)`));
        console.log(chalk.white(`   Collaborateurs: ${finalStats.collaborateurs} (${stats.collaborateurs - finalStats.collaborateurs} supprimés)`));
        console.log(chalk.white(`   Opportunités: ${finalStats.opportunities} (${stats.opportunities - finalStats.opportunities} supprimés)`));
        console.log(chalk.white(`   Campagnes: ${finalStats.campaigns} (${stats.campaigns - finalStats.campaigns} supprimés)`));
        console.log(chalk.white(`   Business Units: ${finalStats.business_units} (${stats.business_units - finalStats.business_units} supprimés)`));
        console.log(chalk.white(`   Permissions: ${finalStats.permissions} (${stats.permissions - finalStats.permissions} supprimés)\n`));

        console.log(chalk.green.bold('✅ REMISE À ZÉRO TERMINÉE AVEC SUCCÈS!\n'));

    } catch (error) {
        console.error(chalk.red('❌ Erreur lors de la remise à zéro:'), error);
        throw error;
    } finally {
        await pool.end();
    }
}

async function getDatabaseStats() {
    const stats = {
        users: 0,
        collaborateurs: 0,
        opportunities: 0,
        campaigns: 0,
        business_units: 0,
        permissions: 0
    };

    // Requêtes individuelles avec try-catch pour chacune
    try {
        const usersResult = await pool.query('SELECT COUNT(*) FROM users');
        stats.users = parseInt(usersResult.rows[0].count);
    } catch (error) {
        // Table users n'existe pas ou erreur
    }

    try {
        const collabResult = await pool.query('SELECT COUNT(*) FROM collaborateurs');
        stats.collaborateurs = parseInt(collabResult.rows[0].count);
    } catch (error) {
        // Table collaborateurs n'existe pas ou erreur
    }

    try {
        const oppsResult = await pool.query('SELECT COUNT(*) FROM opportunities');
        stats.opportunities = parseInt(oppsResult.rows[0].count);
    } catch (error) {
        // Table opportunities n'existe pas ou erreur
    }

    try {
        const campaignsResult = await pool.query('SELECT COUNT(*) FROM prospecting_campaigns');
        stats.campaigns = parseInt(campaignsResult.rows[0].count);
    } catch (error) {
        // Table prospecting_campaigns n'existe pas ou erreur
    }

    try {
        const buResult = await pool.query('SELECT COUNT(*) FROM business_units');
        stats.business_units = parseInt(buResult.rows[0].count);
    } catch (error) {
        // Table business_units n'existe pas ou erreur
    }

    try {
        const permsResult = await pool.query('SELECT COUNT(*) FROM permissions');
        stats.permissions = parseInt(permsResult.rows[0].count);
    } catch (error) {
        // Table permissions n'existe pas ou erreur
    }

    return stats;
}

async function resetLight() {
    console.log(chalk.cyan('🧹 REMISE À ZÉRO LÉGÈRE\n'));

    // Supprimer uniquement les campagnes de test et opportunités de démo
    let count = 0;

    console.log(chalk.gray('   → Suppression des campagnes de test...'));
    const campaignsResult = await pool.query(`
        DELETE FROM prospecting_campaigns 
        WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR status = 'BROUILLON'
        RETURNING id
    `);
    count += campaignsResult.rowCount;
    console.log(chalk.green(`   ✓ ${campaignsResult.rowCount} campagnes supprimées`));

    console.log(chalk.gray('   → Suppression des opportunités de démo...'));
    const oppsResult = await pool.query(`
        DELETE FROM opportunities 
        WHERE nom ILIKE '%test%' OR nom ILIKE '%demo%' OR statut = 'BROUILLON'
        RETURNING id
    `);
    count += oppsResult.rowCount;
    console.log(chalk.green(`   ✓ ${oppsResult.rowCount} opportunités supprimées`));

    console.log(chalk.gray('   → Suppression des notifications...'));
    const notifsResult = await pool.query('DELETE FROM notifications RETURNING id');
    count += notifsResult.rowCount;
    console.log(chalk.green(`   ✓ ${notifsResult.rowCount} notifications supprimées`));

    console.log(chalk.green(`\n✅ ${count} enregistrements supprimés`));
}

async function resetModerate() {
    console.log(chalk.cyan('⚠️  REMISE À ZÉRO MODÉRÉE\n'));

    let count = 0;

    // Ordre de suppression respectant les contraintes FK (enfants avant parents)
    const tablesToClean = [
        // Notifications et tâches (pas de FK critiques)
        { name: 'notifications', hasId: true },
        { name: 'tasks', hasId: true },
        
        // Relations campagnes (enfants en premier)
        { name: 'prospecting_campaign_validation_companies', hasId: false },
        { name: 'prospecting_campaign_companies', hasId: false },
        { name: 'prospecting_campaign_validations', hasId: true },
        { name: 'prospecting_campaigns', hasId: true },
        
        // Relations opportunités
        { name: 'opportunity_comments', hasId: true },
        { name: 'opportunity_steps', hasId: true },
        { name: 'opportunities', hasId: true },
        
        // Documents et contrats
        { name: 'documents', hasId: true },
        { name: 'invoices', hasId: true },
        { name: 'contracts', hasId: true },
        
        // Temps et RH
        { name: 'time_entries', hasId: true },
        { name: 'rh_formations', hasId: true },
        { name: 'rh_competences', hasId: true },
        { name: 'rh_evolutions', hasId: true },
        
        // Collaborateurs (avant users car FK)
        { name: 'collaborateurs', hasId: true },
        
        // Settings utilisateurs (AVANT de supprimer les users)
        { name: 'notification_settings', hasId: true },
        { name: 'user_settings', hasId: true }
    ];

    for (const table of tablesToClean) {
        try {
            console.log(chalk.gray(`   → Nettoyage de ${table.name}...`));
            const result = table.hasId 
                ? await pool.query(`DELETE FROM ${table.name} RETURNING id`)
                : await pool.query(`DELETE FROM ${table.name}`);
            count += result.rowCount;
            console.log(chalk.green(`   ✓ ${result.rowCount} enregistrements supprimés`));
        } catch (error) {
            console.log(chalk.yellow(`   ⚠ ${table.name} : ${error.message}`));
        }
    }

    // Supprimer les utilisateurs non-admin (après collaborateurs)
    console.log(chalk.gray('   → Suppression des utilisateurs non-admin...'));
    try {
        const usersResult = await pool.query(`
            DELETE FROM users 
            WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')
            AND id NOT IN (
                SELECT DISTINCT user_id 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
            RETURNING id
        `);
        count += usersResult.rowCount;
        console.log(chalk.green(`   ✓ ${usersResult.rowCount} utilisateurs supprimés`));
    } catch (error) {
        console.log(chalk.yellow(`   ⚠ Utilisateurs : ${error.message}`));
    }

    console.log(chalk.green(`\n✅ ${count} enregistrements supprimés`));
}

async function resetModeratePlus() {
    console.log(chalk.cyan('🔥 REMISE À ZÉRO MODÉRÉE+\n'));

    let count = 0;

    // Ordre de suppression respectant les contraintes FK (enfants avant parents)
    const tablesToClean = [
        // Notifications et tâches
        { name: 'notifications', hasId: true },
        { name: 'tasks', hasId: true },
        
        // Relations campagnes (enfants en premier)
        { name: 'prospecting_campaign_validation_companies', hasId: false },
        { name: 'prospecting_campaign_companies', hasId: false },
        { name: 'prospecting_campaign_validations', hasId: true },
        { name: 'prospecting_campaigns', hasId: true },
        
        // Relations opportunités
        { name: 'opportunity_comments', hasId: true },
        { name: 'opportunity_steps', hasId: true },
        { name: 'opportunities', hasId: true },
        
        // Documents et contrats
        { name: 'documents', hasId: true },
        { name: 'invoices', hasId: true },
        { name: 'contracts', hasId: true },
        
        // Temps et RH
        { name: 'time_entries', hasId: true },
        { name: 'rh_formations', hasId: true },
        { name: 'rh_competences', hasId: true },
        { name: 'rh_evolutions', hasId: true },
        
        // Missions et Clients (AJOUT pour MODÉRÉE+)
        { name: 'missions', hasId: true },
        { name: 'clients', hasId: true },
        
        // Collaborateurs (avant users car FK)
        { name: 'collaborateurs', hasId: true },
        
        // Settings utilisateurs (AVANT de supprimer les users)
        { name: 'notification_settings', hasId: true },
        { name: 'user_settings', hasId: true }
    ];

    for (const table of tablesToClean) {
        try {
            console.log(chalk.gray(`   → Nettoyage de ${table.name}...`));
            const result = table.hasId 
                ? await pool.query(`DELETE FROM ${table.name} RETURNING id`)
                : await pool.query(`DELETE FROM ${table.name}`);
            count += result.rowCount;
            console.log(chalk.green(`   ✓ ${result.rowCount} enregistrements supprimés`));
        } catch (error) {
            console.log(chalk.yellow(`   ⚠ ${table.name} : ${error.message}`));
        }
    }

    // Supprimer les utilisateurs non-admin (après collaborateurs)
    console.log(chalk.gray('   → Suppression des utilisateurs non-admin...'));
    try {
        const usersResult = await pool.query(`
            DELETE FROM users 
            WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')
            AND id NOT IN (
                SELECT DISTINCT user_id 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
            RETURNING id
        `);
        count += usersResult.rowCount;
        console.log(chalk.green(`   ✓ ${usersResult.rowCount} utilisateurs supprimés`));
    } catch (error) {
        console.log(chalk.yellow(`   ⚠ Utilisateurs : ${error.message}`));
    }

    console.log(chalk.green(`\n✅ ${count} enregistrements supprimés`));
}

async function resetHeavy() {
    console.log(chalk.cyan('🔥 REMISE À ZÉRO COMPLÈTE\n'));

    let count = 0;

    // Ordre de suppression respectant les contraintes FK (enfants avant parents)
    const tablesToClean = [
        // Notifications et tâches
        'notifications',
        'tasks',
        
        // Relations campagnes (enfants en premier)
        'prospecting_campaign_validation_companies',
        'prospecting_campaign_companies',
        'prospecting_campaign_validations',
        'prospecting_campaigns',
        
        // Relations opportunités
        'opportunity_comments',
        'opportunity_steps',
        'opportunities',
        
        // Documents et contrats
        'documents',
        'invoices',
        'contracts',
        
        // Temps et RH
        'time_entries',
        'rh_formations',
        'rh_competences',
        'rh_evolutions',
        
        // Collaborateurs (avant divisions/secteurs/business_units car FK)
        'collaborateurs',
        
        // Modèles de prospection uniquement (AVANT BU/Divisions car FK)
        'prospecting_templates',
        
        // Taux horaires (AVANT divisions car FK sur divisions)
        'taux_horaires',
        
        // Structure organisationnelle
        'divisions',
        'secteurs',
        'business_units',
        
        // Settings utilisateurs (AVANT users car FK sur users)
        'notification_settings',
        'user_settings',
        
        // Permissions (supprimer AVANT user_roles)
        'role_permissions',
        'permissions'
    ];

    for (const table of tablesToClean) {
        try {
            console.log(chalk.gray(`   → Nettoyage de ${table}...`));
            const result = await pool.query(`DELETE FROM ${table}`);
            count += result.rowCount;
            console.log(chalk.green(`   ✓ ${result.rowCount} enregistrements supprimés`));
        } catch (error) {
            console.log(chalk.yellow(`   ⚠ ${table} : ${error.message}`));
        }
    }

    // Supprimer les user_roles pour les non-admin
    console.log(chalk.gray('   → Nettoyage des rôles utilisateurs non-admin...'));
    try {
        const userRolesResult = await pool.query(`
            DELETE FROM user_roles 
            WHERE user_id IN (
                SELECT id FROM users 
                WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')
                AND id NOT IN (
                    SELECT DISTINCT user_id 
                    FROM user_roles ur 
                    JOIN roles r ON ur.role_id = r.id 
                    WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
                )
            )
        `);
        count += userRolesResult.rowCount;
        console.log(chalk.green(`   ✓ ${userRolesResult.rowCount} rôles utilisateurs supprimés`));
    } catch (error) {
        console.log(chalk.yellow(`   ⚠ user_roles : ${error.message}`));
    }

    // Supprimer les utilisateurs non-admin (GARDER les SUPER_ADMIN)
    console.log(chalk.gray('   → Suppression des utilisateurs non-admin...'));
    try {
        const usersResult = await pool.query(`
            DELETE FROM users 
            WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')
            AND id NOT IN (
                SELECT DISTINCT user_id 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
            RETURNING id
        `);
        count += usersResult.rowCount;
        console.log(chalk.green(`   ✓ ${usersResult.rowCount} utilisateurs supprimés`));
    } catch (error) {
        console.log(chalk.yellow(`   ⚠ users : ${error.message}`));
    }

    console.log(chalk.yellow('\n⚠️  Les utilisateurs SUPER_ADMIN et ADMIN ont été conservés'));
    console.log(chalk.cyan('💡 Vous pouvez vous reconnecter avec vos comptes administrateurs\n'));

    console.log(chalk.green(`✅ ${count} enregistrements supprimés`));
}

async function resetBrutal() {
    console.log(chalk.red.bold('💀 REMISE À ZÉRO BRUTALE\n'));

    // Récupérer toutes les tables
    const tablesResult = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);

    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(chalk.gray(`   → ${tables.length} tables trouvées\n`));

    // Supprimer toutes les tables
    console.log(chalk.gray('   → Suppression de toutes les tables...'));
    for (const table of tables) {
        try {
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(chalk.green(`   ✓ Table ${table} supprimée`));
        } catch (error) {
            console.log(chalk.red(`   ✗ Erreur sur ${table}: ${error.message}`));
        }
    }

    console.log(chalk.red.bold('\n💀 BASE DE DONNÉES COMPLÈTEMENT VIDÉE!'));
    console.log(chalk.yellow('⚠️  Toutes les tables ont été supprimées!'));
    console.log(chalk.cyan('\n💡 Conseil: Exécutez maintenant les scripts d\'initialisation:'));
    console.log(chalk.white('   1. node scripts/database/1-init-database-tables.js'));
    console.log(chalk.white('   2. node scripts/database/2-create-super-admin.js\n'));
}

// Menu principal
async function main() {
    try {
        await resetDatabase();
    } catch (error) {
        console.error(chalk.red('\n❌ Erreur fatale:'), error);
        process.exit(1);
    }
}

// Gestion du Ctrl+C
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n✋ Opération annulée par l\'utilisateur.\n'));
    await pool.end();
    process.exit(0);
});

main();

