#!/usr/bin/env node

/**
 * Script de migration des utilisateurs vers le système de rôles multiples
 * 
 * Ce script migre tous les utilisateurs existants qui ont un rôle dans users.role
 * vers le nouveau système de rôles multiples (table user_roles)
 * 
 * Usage:
 *   node scripts/migrate-to-multi-roles.js
 *   node scripts/migrate-to-multi-roles.js --dry-run  (simulation sans modifications)
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '006_migrate_users_to_multi_roles.sql');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logBox(title, color = colors.cyan) {
    const line = '═'.repeat(68);
    log(`╔${line}╗`, color);
    log(`║  ${title.padEnd(64)}  ║`, color);
    log(`╚${line}╝`, color);
}

async function checkPrerequisites() {
    log('\n🔍 Vérification des prérequis...', colors.blue);
    
    try {
        // Vérifier la connexion à la base de données
        await pool.query('SELECT 1');
        log('✅ Connexion à la base de données: OK', colors.green);
        
        // Vérifier l'existence de la table users
        const usersTableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (!usersTableCheck.rows[0].exists) {
            throw new Error('La table "users" n\'existe pas');
        }
        log('✅ Table "users": OK', colors.green);
        
        // Vérifier l'existence de la table roles
        const rolesTableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);
        
        if (!rolesTableCheck.rows[0].exists) {
            throw new Error('La table "roles" n\'existe pas');
        }
        log('✅ Table "roles": OK', colors.green);
        
        // Vérifier le fichier de migration
        if (!fs.existsSync(MIGRATION_FILE)) {
            throw new Error(`Fichier de migration non trouvé: ${MIGRATION_FILE}`);
        }
        log('✅ Fichier de migration: OK', colors.green);
        
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la vérification: ${error.message}`, colors.red);
        return false;
    }
}

async function getStatisticsBefore() {
    log('\n📊 Statistiques AVANT migration:', colors.cyan);
    
    try {
        // Nombre total d'utilisateurs actifs
        const totalUsersResult = await pool.query(`
            SELECT COUNT(*) as count FROM users WHERE statut = 'ACTIF'
        `);
        const totalUsers = parseInt(totalUsersResult.rows[0].count);
        log(`   Utilisateurs actifs: ${totalUsers}`, colors.yellow);
        
        // Utilisateurs avec rôles multiples
        const usersWithMultiRolesResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_roles
        `);
        const usersWithMultiRoles = parseInt(usersWithMultiRolesResult.rows[0].count);
        log(`   Utilisateurs avec rôles multiples: ${usersWithMultiRoles}`, colors.yellow);
        
        // Utilisateurs sans rôles multiples
        const usersWithoutMultiRolesResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.statut = 'ACTIF'
            AND NOT EXISTS (
                SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
            )
        `);
        const usersWithoutMultiRoles = parseInt(usersWithoutMultiRolesResult.rows[0].count);
        log(`   Utilisateurs à migrer: ${usersWithoutMultiRoles}`, colors.yellow);
        
        // Utilisateurs sans rôle défini
        const usersWithoutRoleResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.statut = 'ACTIF'
            AND (u.role IS NULL OR u.role = '')
            AND NOT EXISTS (
                SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
            )
        `);
        const usersWithoutRole = parseInt(usersWithoutRoleResult.rows[0].count);
        if (usersWithoutRole > 0) {
            log(`   ⚠️  Utilisateurs sans rôle défini: ${usersWithoutRole}`, colors.red);
        }
        
        return {
            totalUsers,
            usersWithMultiRoles,
            usersWithoutMultiRoles,
            usersWithoutRole
        };
    } catch (error) {
        log(`❌ Erreur lors de la récupération des statistiques: ${error.message}`, colors.red);
        throw error;
    }
}

async function runMigration() {
    log('\n🚀 Exécution de la migration...', colors.green);
    
    try {
        // Lire le fichier SQL
        const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
        
        if (DRY_RUN) {
            log('⚠️  MODE DRY-RUN: La migration ne sera PAS exécutée', colors.yellow);
            log('   Pour exécuter réellement, lancez sans --dry-run', colors.yellow);
            return { success: true, dryRun: true };
        }
        
        // Exécuter la migration
        log('   Exécution du script SQL...', colors.blue);
        await pool.query(migrationSQL);
        
        log('✅ Migration exécutée avec succès!', colors.green);
        return { success: true, dryRun: false };
    } catch (error) {
        log(`❌ Erreur lors de l'exécution de la migration: ${error.message}`, colors.red);
        throw error;
    }
}

async function getStatisticsAfter() {
    log('\n📊 Statistiques APRÈS migration:', colors.cyan);
    
    try {
        // Nombre total d'utilisateurs actifs
        const totalUsersResult = await pool.query(`
            SELECT COUNT(*) as count FROM users WHERE statut = 'ACTIF'
        `);
        const totalUsers = parseInt(totalUsersResult.rows[0].count);
        log(`   Utilisateurs actifs: ${totalUsers}`, colors.yellow);
        
        // Utilisateurs avec rôles multiples
        const usersWithMultiRolesResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_roles
        `);
        const usersWithMultiRoles = parseInt(usersWithMultiRolesResult.rows[0].count);
        log(`   Utilisateurs avec rôles multiples: ${usersWithMultiRoles}`, colors.yellow);
        
        // Utilisateurs sans rôles multiples
        const usersWithoutMultiRolesResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.statut = 'ACTIF'
            AND NOT EXISTS (
                SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
            )
        `);
        const usersWithoutMultiRoles = parseInt(usersWithoutMultiRolesResult.rows[0].count);
        
        if (usersWithoutMultiRoles > 0) {
            log(`   ⚠️  Utilisateurs restants à migrer: ${usersWithoutMultiRoles}`, colors.red);
            
            // Lister les utilisateurs concernés
            const usersListResult = await pool.query(`
                SELECT id, nom, prenom, email, role
                FROM users u
                WHERE u.statut = 'ACTIF'
                AND NOT EXISTS (
                    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
                )
                LIMIT 10
            `);
            
            log('\n   Utilisateurs non migrés:', colors.yellow);
            usersListResult.rows.forEach(user => {
                log(`     - ${user.prenom} ${user.nom} (${user.email}) - Rôle: ${user.role || 'NULL'}`, colors.yellow);
            });
            
            if (usersWithoutMultiRoles > 10) {
                log(`     ... et ${usersWithoutMultiRoles - 10} autre(s)`, colors.yellow);
            }
        } else {
            log(`   ✅ Tous les utilisateurs ont été migrés!`, colors.green);
        }
        
        // Total d'assignations de rôles
        const totalAssignmentsResult = await pool.query(`
            SELECT COUNT(*) as count FROM user_roles
        `);
        const totalAssignments = parseInt(totalAssignmentsResult.rows[0].count);
        log(`   Total d'assignations de rôles: ${totalAssignments}`, colors.yellow);
        
        // Utilisateurs avec plusieurs rôles
        const usersWithMultipleRolesResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM (
                SELECT user_id
                FROM user_roles
                GROUP BY user_id
                HAVING COUNT(*) > 1
            ) AS multi
        `);
        const usersWithMultipleRoles = parseInt(usersWithMultipleRolesResult.rows[0].count);
        log(`   Utilisateurs avec plusieurs rôles: ${usersWithMultipleRoles}`, colors.yellow);
        
        return {
            totalUsers,
            usersWithMultiRoles,
            usersWithoutMultiRoles,
            totalAssignments,
            usersWithMultipleRoles
        };
    } catch (error) {
        log(`❌ Erreur lors de la récupération des statistiques: ${error.message}`, colors.red);
        throw error;
    }
}

async function main() {
    try {
        logBox('MIGRATION VERS SYSTÈME DE RÔLES MULTIPLES', colors.magenta);
        
        if (DRY_RUN) {
            log('\n⚠️  MODE DRY-RUN ACTIVÉ', colors.yellow);
            log('   La migration sera simulée sans modifications réelles\n', colors.yellow);
        }
        
        // Vérification des prérequis
        const prereqsOk = await checkPrerequisites();
        if (!prereqsOk) {
            log('\n❌ Les prérequis ne sont pas satisfaits. Migration annulée.', colors.red);
            process.exit(1);
        }
        
        // Statistiques avant
        const statsBefore = await getStatisticsBefore();
        
        if (statsBefore.usersWithoutMultiRoles === 0) {
            log('\n✅ Tous les utilisateurs ont déjà des rôles multiples!', colors.green);
            log('   Aucune migration nécessaire.', colors.green);
            process.exit(0);
        }
        
        // Confirmation si pas en dry-run
        if (!DRY_RUN) {
            log('\n⚠️  ATTENTION: Cette migration va modifier la base de données', colors.yellow);
            log(`   ${statsBefore.usersWithoutMultiRoles} utilisateur(s) seront migré(s)`, colors.yellow);
            log('\n   Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes...', colors.yellow);
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Exécution de la migration
        const result = await runMigration();
        
        if (!result.dryRun) {
            // Statistiques après
            const statsAfter = await getStatisticsAfter();
            
            // Résumé
            log('\n', colors.reset);
            logBox('RÉSUMÉ DE LA MIGRATION', colors.green);
            log(`   Utilisateurs migrés: ${statsAfter.usersWithMultiRoles - statsBefore.usersWithMultiRoles}`, colors.green);
            log(`   Total d'utilisateurs avec rôles multiples: ${statsAfter.usersWithMultiRoles}`, colors.green);
            log(`   Utilisateurs restants sans rôles: ${statsAfter.usersWithoutMultiRoles}`, colors.yellow);
        }
        
        log('\n✅ Migration terminée avec succès!\n', colors.green);
        process.exit(0);
        
    } catch (error) {
        log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    } finally {
        // Fermer la connexion
        await pool.end();
    }
}

// Exécution
main();










