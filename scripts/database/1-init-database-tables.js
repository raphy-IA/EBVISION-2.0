#!/usr/bin/env node

/**
 * SCRIPT 1/3 : INITIALISATION DES TABLES DE LA BASE DE DONNÉES
 * =============================================================
 * 
 * Ce script crée toutes les tables nécessaires pour l'application
 * - Tables de base (users, roles, permissions, etc.)
 * - Tables de gestion (business_units, divisions, collaborateurs, etc.)
 * - Tables métier (missions, opportunités, campagnes, etc.)
 * 
 * Usage: node scripts/1-init-database-tables.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');
const { ensureExtensions, ensureBaseRoles, runMigrationsWithConfig } = require('./utils/schema-initializer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║       ÉTAPE 1/3 : INITIALISATION DES TABLES                ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function initDatabaseTables() {
    try {
        // ===============================================
        // Afficher la configuration depuis .env
        // ===============================================
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log(`   🔐 SSL        : ${process.env.NODE_ENV === 'production' ? 'Oui' : 'Non'}\n`);

        // ===============================================
        // Choix : Nouvelle BD ou existante
        // ===============================================
        const dbChoice = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'Que voulez-vous faire?',
                choices: [
                    {
                        name: '📂 Utiliser une base de données existante (créer uniquement les tables)',
                        value: 'existing',
                        short: 'Base existante'
                    },
                    {
                        name: '🆕 Créer une nouvelle base de données (puis créer les tables)',
                        value: 'new',
                        short: 'Nouvelle base'
                    }
                ]
            }
        ]);

        let targetDatabase;
        let connectionConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        };

        // ===============================================
        // Mode : Nouvelle base de données
        // ===============================================
        if (dbChoice.mode === 'new') {
            console.log('\n🆕 Création d\'une nouvelle base de données\n');
            
            const newDbAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'newDbName',
                    message: 'Nom de la nouvelle base de données:',
                    validate: (input) => {
                        if (input.length === 0) return 'Le nom est requis';
                        if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Caractères autorisés: lettres, chiffres, - et _';
                        return true;
                    }
                },
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: (answers) => `Créer la base de données "${answers.newDbName}"?`,
                    default: true
                }
            ]);

            if (!newDbAnswers.proceed) {
                console.log('\n❌ Opération annulée\n');
                return;
            }

            targetDatabase = newDbAnswers.newDbName;

            // Se connecter à la base "postgres" pour créer la nouvelle BD
            console.log('\n📡 Connexion à PostgreSQL (base "postgres")...');
            const adminPool = new Pool({
                ...connectionConfig,
                database: 'postgres'
            });

            try {
                await adminPool.query('SELECT NOW()');
                console.log('✅ Connexion réussie!');

                // Vérifier si la base existe déjà
                console.log(`\n🔍 Vérification de l'existence de "${targetDatabase}"...`);
                const checkDb = await adminPool.query(
                    `SELECT 1 FROM pg_database WHERE datname = $1`,
                    [targetDatabase]
                );

                if (checkDb.rows.length > 0) {
                    console.log(`⚠️  La base de données "${targetDatabase}" existe déjà`);
                    
                    const overwriteAnswer = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'useExisting',
                            message: 'Voulez-vous l\'utiliser (créer les tables dedans)?',
                            default: true
                        }
                    ]);

                    if (!overwriteAnswer.useExisting) {
                        console.log('\n❌ Opération annulée\n');
                        await adminPool.end();
                        return;
                    }
                } else {
                    // Créer la nouvelle base de données
                    console.log(`\n🏗️  Création de la base de données "${targetDatabase}"...`);
                    await adminPool.query(`CREATE DATABASE "${targetDatabase}"`);
                    console.log('✅ Base de données créée avec succès!');
                }

                await adminPool.end();

            } catch (error) {
                console.error(`\n❌ Erreur lors de la création de la base: ${error.message}`);
                await adminPool.end();
                throw error;
            }

        } else {
            // ===============================================
            // Mode : Base de données existante
            // ===============================================
            console.log('\n📂 Utilisation d\'une base de données existante\n');
            
            const existingDbAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'database',
                    message: 'Nom de la base de données existante:',
                    default: process.env.DB_NAME,
                    validate: (input) => input.length > 0 ? true : 'Le nom de la base de données est requis'
                },
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: (answers) => `Créer les tables dans "${answers.database}"?`,
                    default: true
                }
            ]);

            if (!existingDbAnswers.proceed) {
                console.log('\n❌ Opération annulée\n');
                return;
            }

            targetDatabase = existingDbAnswers.database;
        }

        // ===============================================
        // Connexion à la base de données cible
        // ===============================================
        console.log(`\n📡 Connexion à la base de données "${targetDatabase}"...`);
        
        const pool = new Pool({
            ...connectionConfig,
            database: targetDatabase
        });

        try {
            await pool.query('SELECT NOW()');
            console.log('✅ Connexion réussie!\n');
        } catch (error) {
            console.error(`\n❌ Impossible de se connecter à "${targetDatabase}"`);
            console.error(`   Erreur: ${error.message}`);
            console.error('\n💡 Vérifiez que:');
            console.error('   - La base de données existe');
            console.error('   - L\'utilisateur a les droits d\'accès');
            console.error('   - Les informations dans .env sont correctes\n');
            await pool.end();
            return;
        }

        console.log('\n🧩 Préparation de la structure de base...\n');

        await ensureExtensions(pool);
        console.log('   ✓ Extensions essentielles vérifiées');

        await pool.end();

        console.log('\n🚀 Exécution des migrations officielles...');
        await runMigrationsWithConfig({
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.user,
            password: connectionConfig.password,
            database: targetDatabase
        });
        console.log('   ✓ Migrations exécutées avec succès');

        // Préparer l'environnement pour les scripts de vérification
        process.env.DB_HOST = connectionConfig.host;
        process.env.DB_PORT = String(connectionConfig.port);
        process.env.DB_NAME = targetDatabase;
        process.env.DB_USER = connectionConfig.user;
        process.env.DB_PASSWORD = connectionConfig.password;

        delete require.cache[require.resolve('./verify-and-fix-database')];
        const { verifyAndFixDatabase } = require('./verify-and-fix-database');
        console.log('\n🛠️  Vérification fine de la structure...');
        await verifyAndFixDatabase();

        const postMigrationPool = new Pool({
            ...connectionConfig,
            database: targetDatabase
        });

        await ensureBaseRoles(postMigrationPool);

        const tableCountResult = await postMigrationPool.query(`
            SELECT COUNT(*)::int AS count
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);

        const tablesCreated = tableCountResult.rows[0]?.count || 0;

        const rolesResult = await postMigrationPool.query(`
            SELECT name, badge_bg_class, badge_text_class, badge_hex_color, badge_priority
            FROM roles
            ORDER BY badge_priority DESC, name ASC
        `);

        await postMigrationPool.end();

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ INITIALISATION TERMINÉE                     ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Base de données : ${targetDatabase}`);
        console.log(`   ✓ Hôte             : ${connectionConfig.host}:${connectionConfig.port}`);
        console.log(`   ✓ Utilisateur      : ${connectionConfig.user}`);
        console.log(`   ✓ Tables détectées : ${tablesCreated}`);
        console.log(`   ✓ Rôles synchronisés : ${rolesResult.rowCount}`);

        console.log('\n🎨 Aperçu des rôles et couleurs :');
        rolesResult.rows.forEach(role => {
            console.log(
                `   • ${role.name.padEnd(15)} → badge: ${role.badge_bg_class}/${role.badge_text_class} (${role.badge_hex_color})`
            );
        });
        
        console.log('\n🎯 PROCHAINES ÉTAPES :');
        console.log('══════════════════════');
        console.log('   1. Créer un super administrateur : node scripts/database/2-create-super-admin.js');
        console.log('   2. Synchroniser les permissions : node scripts/database/3-assign-all-permissions.js\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n💡 Vérifiez :');
        console.error('   - Les informations de connexion');
        console.error('   - Que la base de données existe');
        console.error('   - Que PostgreSQL est démarré\n');
        process.exit(1);
    }
}

// Exécution
initDatabaseTables().catch(console.error);

