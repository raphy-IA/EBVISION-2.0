#!/usr/bin/env node

/**
 * SCRIPT 0 : RÉINITIALISATION PROGRESSIVE DE LA BASE DE DONNÉES
 * ==============================================================
 * 
 * Ce script offre 4 niveaux de suppression progressive selon vos besoins :
 * 
 * NIVEAU 1 - DONNÉES OPÉRATIONNELLES
 * ───────────────────────────────────
 * Supprime uniquement les données métier :
 * ✓ Factures et lignes de facture
 * ✓ Missions et affectations
 * ✓ Opportunités et activités commerciales
 * ✓ Feuilles de temps et validations
 * ✓ Absences et congés
 * ✓ Tâches et activités
 * ✓ Contacts clients
 * 
 * CONSERVE : Structure organisation, collaborateurs, utilisateurs, configuration
 * 
 * 
 * NIVEAU 2 - STRUCTURE ORGANISATIONNELLE
 * ───────────────────────────────────────
 * Supprime NIVEAU 1 + Structure organisationnelle :
 * ✓ Business Units et Divisions
 * ✓ Grades et Postes
 * ✓ Campagnes de prospection
 * ✓ Clients (tous)
 * 
 * CONSERVE : Collaborateurs, utilisateurs, données de configuration, référence
 * 
 * 
 * NIVEAU 3 - UTILISATEURS ET COLLABORATEURS
 * ──────────────────────────────────────────
 * Supprime NIVEAU 1 + 2 + Personnel :
 * ✓ Collaborateurs (historique RH, évolutions)
 * ✓ Utilisateurs (sauf SUPER_ADMIN)
 * ✓ Permissions utilisateurs
 * 
 * CONSERVE : Rôles, permissions système, données de référence, SUPER_ADMIN
 * 
 * 
 * NIVEAU 4 - RESET COMPLET
 * ─────────────────────────
 * Supprime TOUT sans recréer :
 * ✓ Toutes les tables
 * ✓ Tous les types ENUM
 * ✓ Toutes les séquences
 * ✓ Laisse la base de données VIERGE
 * 
 * Note: Utilisez les autres scripts pour recréer la structure
 * 
 * Usage: 
 *   node scripts/database/0-reset-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     🔄 RÉINITIALISATION PROGRESSIVE DE LA BASE             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
    let pool;
    
    try {
        // ===============================================
        // Configuration
        // ===============================================
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log('   🔐 SSL        : ' + (process.env.NODE_ENV === 'production' ? 'Oui' : 'Non') + '\n');

        // ===============================================
        // Sélection du niveau de suppression
        // ===============================================
        const { resetLevel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'resetLevel',
                message: '🎯 Quel niveau de réinitialisation souhaitez-vous ?',
                choices: [
                    {
                        name: '📊 NIVEAU 1 - Données opérationnelles (factures, missions, temps, opportunités)',
                        value: 1,
                        short: 'Niveau 1'
                    },
                    {
                        name: '🏢 NIVEAU 2 - Niveau 1 + Structure organisationnelle (BU, divisions, campagnes)',
                        value: 2,
                        short: 'Niveau 2'
                    },
                    {
                        name: '👥 NIVEAU 3 - Niveau 2 + Utilisateurs et collaborateurs (sauf SUPER_ADMIN)',
                        value: 3,
                        short: 'Niveau 3'
                    },
                    {
                        name: '💣 NIVEAU 4 - RESET COMPLET (supprime TOUT, laisse la base VIERGE)',
                        value: 4,
                        short: 'Niveau 4'
                    },
                    new inquirer.Separator(),
                    {
                        name: '❌ Annuler',
                        value: 0,
                        short: 'Annuler'
                    }
                ]
            }
        ]);

        if (resetLevel === 0) {
            console.log('\n❌ Opération annulée\n');
            process.exit(0);
        }

        // ===============================================
        // Confirmation
        // ===============================================
        console.log('\n' + '═'.repeat(64));
        console.log(`📋 NIVEAU ${resetLevel} SÉLECTIONNÉ`);
        console.log('═'.repeat(64) + '\n');

        const descriptions = {
            1: [
                '✓ Factures et lignes de facture',
                '✓ Missions et affectations',
                '✓ Opportunités et campagnes',
                '✓ Feuilles de temps et validations',
                '✓ Absences et congés',
                '✓ Tâches et activités',
                '✓ Contacts clients',
                '',
                '❌ CONSERVE : Structure, collaborateurs, utilisateurs, configuration'
            ],
            2: [
                '✓ Toutes les suppressions du NIVEAU 1',
                '✓ Business Units et Divisions',
                '✓ Grades et Postes',
                '✓ Campagnes de prospection',
                '✓ Clients (tous)',
                '',
                '❌ CONSERVE : Collaborateurs, utilisateurs, données de référence'
            ],
            3: [
                '✓ Toutes les suppressions du NIVEAU 2',
                '✓ Collaborateurs et historique RH',
                '✓ Utilisateurs (sauf SUPER_ADMIN)',
                '✓ Permissions utilisateurs',
                '',
                '❌ CONSERVE : Rôles système, permissions système, SUPER_ADMIN'
            ],
            4: [
                '✓ SUPPRESSION TOTALE de toutes les tables',
                '✓ Suppression de tous les types ENUM',
                '✓ Suppression de toutes les séquences',
                '',
                '⚠️  BASE DE DONNÉES COMPLÈTEMENT VIERGE',
                '⚠️  AUCUNE RECRÉATION DE STRUCTURE',
                '',
                'ℹ️  Utilisez les autres scripts pour recréer'
            ]
        };

        console.log('Ce qui sera supprimé :\n');
        descriptions[resetLevel].forEach(line => {
            if (line === '') {
                console.log('');
            } else if (line.startsWith('❌')) {
                console.log(`   ${line}`);
            } else {
                console.log(`   ${line}`);
            }
        });
        console.log('');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `⚠️  Confirmer la réinitialisation NIVEAU ${resetLevel} ?`,
                default: false
            }
        ]);

        if (!confirm) {
            console.log('\n❌ Réinitialisation annulée\n');
            process.exit(0);
        }

        // ===============================================
        // Connexion à la base de données
        // ===============================================
        console.log('\n📡 Connexion à la base de données...');
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

        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // ===============================================
        // Exécution de la suppression selon le niveau
        // ===============================================
        console.log(`🗑️  Suppression NIVEAU ${resetLevel} en cours...\n`);

        if (resetLevel === 4) {
            await resetLevel4Complete(pool);
        } else {
            await resetProgressive(pool, resetLevel);
        }

        // ===============================================
        // Résumé final
        // ===============================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ RÉINITIALISATION TERMINÉE AVEC SUCCÈS            ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Niveau de suppression : ${resetLevel}`);
        console.log(`   ✓ Base de données       : ${process.env.DB_NAME}`);
        console.log('');

        if (resetLevel < 4) {
            console.log('💡 PROCHAINES ÉTAPES :');
            console.log('═════════════════════');
            console.log('   1. Vérifier les données conservées');
            console.log('   2. Générer de nouvelles données si nécessaire');
            console.log('   3. Redémarrer l\'application\n');
        } else {
            console.log('💡 PROCHAINES ÉTAPES :');
            console.log('═════════════════════');
            console.log('   1. Réexécuter l\'initialisation complète :');
            console.log('      node scripts/database/0-init-complete.js\n');
        }

        await pool.end();

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        if (pool) await pool.end();
        process.exit(1);
    }
}

// ===============================================
// NIVEAU 4 : RESET COMPLET
// ===============================================
async function resetLevel4Complete(pool) {
    console.log('💣 NIVEAU 4 : Suppression complète de toutes les tables...\n');

    // Désactiver temporairement les contraintes de clés étrangères
    await pool.query('SET session_replication_role = replica;');

    // Récupérer toutes les tables
    const tablesResult = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);

    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`   📋 ${tables.length} table(s) trouvée(s)`);

    // Supprimer toutes les tables
    for (const table of tables) {
        try {
            await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            console.log(`   ✓ Table "${table}" supprimée`);
        } catch (error) {
            console.log(`   ⚠️  Erreur lors de la suppression de "${table}": ${error.message}`);
        }
    }

    // Supprimer tous les types ENUM personnalisés
    const enumsResult = await pool.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);

    for (const enumRow of enumsResult.rows) {
        try {
            await pool.query(`DROP TYPE IF EXISTS "${enumRow.typname}" CASCADE`);
            console.log(`   ✓ Type ENUM "${enumRow.typname}" supprimé`);
        } catch (error) {
            console.log(`   ⚠️  Erreur lors de la suppression du type "${enumRow.typname}": ${error.message}`);
        }
    }

    // Supprimer toutes les séquences
    const sequencesResult = await pool.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    `);

    for (const seqRow of sequencesResult.rows) {
        try {
            await pool.query(`DROP SEQUENCE IF EXISTS "${seqRow.sequence_name}" CASCADE`);
            console.log(`   ✓ Séquence "${seqRow.sequence_name}" supprimée`);
        } catch (error) {
            console.log(`   ⚠️  Erreur lors de la suppression de la séquence "${seqRow.sequence_name}": ${error.message}`);
        }
    }

    // Réactiver les contraintes
    await pool.query('SET session_replication_role = DEFAULT;');

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ BASE DE DONNÉES COMPLÈTEMENT NETTOYÉE            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Résumé:');
    console.log(`   ✓ ${tables.length} table(s) supprimée(s)`);
    console.log(`   ✓ ${enumsResult.rows.length} type(s) ENUM supprimé(s)`);
    console.log(`   ✓ ${sequencesResult.rows.length} séquence(s) supprimée(s)`);
    
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Pour recréer la structure:');
    console.log('      node scripts/database/1-create-structure.js');
    console.log('');
    console.log('   2. Pour initialiser avec les données de base:');
    console.log('      node scripts/database/2-seed-base-data.js');
    console.log('');
    console.log('   3. Pour générer des données de démo:');
    console.log('      node scripts/database/5-generate-demo-data.js');
    console.log('');
    
    console.log('✅ Opération terminée - Base de données VIERGE\n');
}

// ===============================================
// NIVEAUX 1, 2, 3 : RESET PROGRESSIF
// ===============================================
async function resetProgressive(pool, level) {
    let stats = {
        tables: 0,
        rows: 0
    };

    // NIVEAU 1 : Données opérationnelles
    if (level >= 1) {
        console.log('📊 NIVEAU 1 : Suppression des données opérationnelles...\n');
        stats = await deleteLevel1(pool, stats);
    }

    // NIVEAU 2 : Structure organisationnelle
    if (level >= 2) {
        console.log('\n🏢 NIVEAU 2 : Suppression de la structure organisationnelle...\n');
        stats = await deleteLevel2(pool, stats);
    }

    // NIVEAU 3 : Utilisateurs et collaborateurs
    if (level >= 3) {
        console.log('\n👥 NIVEAU 3 : Suppression des utilisateurs et collaborateurs...\n');
        stats = await deleteLevel3(pool, stats);
    }

    console.log(`\n✅ ${stats.tables} table(s) nettoyée(s), ${stats.rows} ligne(s) supprimée(s)`);
}

// ===============================================
// NIVEAU 1 : Données opérationnelles
// ===============================================
async function deleteLevel1(pool, stats) {
    const tables = [
        // Factures (en premier car dépendances)
        'invoice_lines',
        'invoices',
        
        // Feuilles de temps et validations
        'time_entry_validations',
        'time_entries',
        'validation_history',
        
        // Missions et affectations
        'mission_assignments',
        'mission_tasks',
        'missions',
        
        // Opportunités et activités commerciales
        'opportunity_activities',
        'opportunity_contacts',
        'opportunity_history',
        'opportunities',
        
        // Campagnes (contacts liés)
        'campaign_activities',
        'campaign_contacts',
        
        // Tâches et activités
        'tasks',
        'activities',
        
        // Absences et congés
        'absences',
        'conges',
        
        // Contacts clients
        'contacts',
        
        // Événements et notifications
        'events',
        'notifications',
        
        // Documents et pièces jointes
        'documents',
        'attachments'
    ];

    for (const table of tables) {
        try {
            const result = await pool.query(`DELETE FROM ${table}`);
            console.log(`   ✓ ${table}: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  ${table}: ${error.message}`);
        }
    }

    return stats;
}

// ===============================================
// NIVEAU 2 : Structure organisationnelle
// ===============================================
async function deleteLevel2(pool, stats) {
    const tables = [
        // Campagnes de prospection
        'campaigns',
        
        // Clients (toutes les dépendances ont été supprimées au niveau 1)
        'clients',
        
        // Structure organisationnelle (grades, postes, divisions, BU)
        'grades',
        'postes',
        'divisions',
        'business_units'
    ];

    for (const table of tables) {
        try {
            const result = await pool.query(`DELETE FROM ${table}`);
            console.log(`   ✓ ${table}: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  ${table}: ${error.message}`);
        }
    }

    return stats;
}

// ===============================================
// NIVEAU 3 : Utilisateurs et collaborateurs
// ===============================================
async function deleteLevel3(pool, stats) {
    // Récupérer l'ID du rôle SUPER_ADMIN
    const superAdminRoleResult = await pool.query(`
        SELECT id FROM roles WHERE name = 'SUPER_ADMIN'
    `);
    
    const superAdminRoleId = superAdminRoleResult.rows[0]?.id;
    
    // Récupérer les IDs des utilisateurs SUPER_ADMIN à conserver
    let superAdminUserIds = [];
    if (superAdminRoleId) {
        const superAdminUsersResult = await pool.query(`
            SELECT DISTINCT user_id 
            FROM user_roles 
            WHERE role_id = $1
        `, [superAdminRoleId]);
        
        superAdminUserIds = superAdminUsersResult.rows.map(row => row.user_id);
        console.log(`   ℹ️  ${superAdminUserIds.length} compte(s) SUPER_ADMIN conservé(s)\n`);
    }

    // Historique RH des collaborateurs
    const hrTables = [
        'evolution_salaire',
        'evolution_grade',
        'evolution_poste',
        'evolution_organisation',
        'historique_formations',
        'evaluations'
    ];

    for (const table of hrTables) {
        try {
            const result = await pool.query(`DELETE FROM ${table}`);
            console.log(`   ✓ ${table}: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  ${table}: ${error.message}`);
        }
    }

    // Collaborateurs (tous)
    try {
        const result = await pool.query(`DELETE FROM collaborateurs`);
        console.log(`   ✓ collaborateurs: ${result.rowCount} ligne(s) supprimée(s)`);
        stats.tables++;
        stats.rows += result.rowCount;
    } catch (error) {
        console.log(`   ⚠️  collaborateurs: ${error.message}`);
    }

    // Permissions utilisateurs (sauf SUPER_ADMIN)
    if (superAdminUserIds.length > 0) {
        try {
            const result = await pool.query(`
                DELETE FROM user_permissions 
                WHERE user_id NOT IN (${superAdminUserIds.map((_, i) => `$${i + 1}`).join(',')})
            `, superAdminUserIds);
            console.log(`   ✓ user_permissions: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  user_permissions: ${error.message}`);
        }

        // Rôles utilisateurs (sauf SUPER_ADMIN)
        try {
            const result = await pool.query(`
                DELETE FROM user_roles 
                WHERE user_id NOT IN (${superAdminUserIds.map((_, i) => `$${i + 1}`).join(',')})
            `, superAdminUserIds);
            console.log(`   ✓ user_roles: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  user_roles: ${error.message}`);
        }

        // Utilisateurs (sauf SUPER_ADMIN)
        try {
            const result = await pool.query(`
                DELETE FROM users 
                WHERE id NOT IN (${superAdminUserIds.map((_, i) => `$${i + 1}`).join(',')})
            `, superAdminUserIds);
            console.log(`   ✓ users: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables++;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  users: ${error.message}`);
        }
    } else {
        console.log('   ⚠️  Aucun SUPER_ADMIN trouvé, tous les utilisateurs seront supprimés');
        
        // Supprimer toutes les permissions et utilisateurs
        try {
            await pool.query(`DELETE FROM user_permissions`);
            await pool.query(`DELETE FROM user_roles`);
            const result = await pool.query(`DELETE FROM users`);
            console.log(`   ✓ users: ${result.rowCount} ligne(s) supprimée(s)`);
            stats.tables += 3;
            stats.rows += result.rowCount;
        } catch (error) {
            console.log(`   ⚠️  users: ${error.message}`);
        }
    }

    return stats;
}

main();
