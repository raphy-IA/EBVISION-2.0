#!/usr/bin/env node

/**
 * Script d'initialisation de base de données à partir d'un dump de schéma
 * Usage: node scripts/database/init-from-schema.js
 * 
 * Ce script :
 * 1. Crée une nouvelle base de données (ou réinitialise une existante)
 * 2. Applique le schéma complet depuis un fichier SQL
 * 3. Crée les rôles de base avec leurs couleurs
 * 4. Crée un super administrateur
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const bcrypt = require('bcrypt');

// Configuration depuis .env
require('dotenv').config();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     INITIALISATION SIMPLE DE LA BASE DE DONNÉES            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration PostgreSQL (depuis .env):\n');
console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'postgres'}`);
console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
console.log(`   🔐 SSL        : ${process.env.NODE_ENV === 'production' ? 'Oui' : 'Non'}\n`);

async function main() {
    try {
        const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
        
        // Configuration de connexion
        const connectionConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        };

        let targetDatabase;
        let shouldDropAndRecreate = false;

        // ===============================================
        // Choix : Nouvelle BD ou existante
        // ===============================================
        if (!skipConfirm) {
            const dbChoice = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'mode',
                    message: 'Que voulez-vous faire?',
                    choices: [
                        {
                            name: '📂 Réinitialiser une base de données existante (DROP + CREATE)',
                            value: 'existing',
                            short: 'Base existante'
                        },
                        {
                            name: '🆕 Créer une nouvelle base de données',
                            value: 'new',
                            short: 'Nouvelle base'
                        }
                    ]
                }
            ]);

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
                    process.exit(0);
                }

                targetDatabase = newDbAnswers.newDbName;

            } else {
                // ===============================================
                // Mode : Base de données existante
                // ===============================================
                console.log('\n📂 Réinitialisation d\'une base de données existante\n');
                
                // Lister les bases de données disponibles
                console.log('📡 Récupération de la liste des bases de données...');
                const adminPool = new Pool({
                    ...connectionConfig,
                    database: 'postgres'
                });

                try {
                    const dbListResult = await adminPool.query(`
                        SELECT datname 
                        FROM pg_database 
                        WHERE datistemplate = false 
                        AND datname NOT IN ('postgres')
                        ORDER BY datname
                    `);

                    const databases = dbListResult.rows.map(row => row.datname);
                    
                    if (databases.length === 0) {
                        console.log('⚠️  Aucune base de données utilisateur trouvée.');
                        await adminPool.end();
                        process.exit(0);
                    }

                    console.log(`✅ ${databases.length} base(s) de données trouvée(s)\n`);

                    const existingDbAnswers = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'database',
                            message: 'Sélectionnez la base de données à réinitialiser:',
                            choices: databases,
                            default: process.env.DB_NAME
                        },
                        {
                            type: 'confirm',
                            name: 'proceed',
                            message: (answers) => `⚠️  ATTENTION: Toutes les données de "${answers.database}" seront SUPPRIMÉES. Continuer?`,
                            default: false
                        }
                    ]);

                    if (!existingDbAnswers.proceed) {
                        console.log('\n❌ Opération annulée\n');
                        await adminPool.end();
                        process.exit(0);
                    }

                    targetDatabase = existingDbAnswers.database;
                    shouldDropAndRecreate = true;

                } catch (error) {
                    console.error('❌ Erreur lors de la récupération des bases:', error.message);
                    await adminPool.end();
                    process.exit(1);
                } finally {
                    await adminPool.end();
                }
            }
        } else {
            // Mode --yes : utiliser la base de .env
            targetDatabase = process.env.DB_NAME;
            if (!targetDatabase) {
                console.error('❌ DB_NAME non défini dans .env');
                process.exit(1);
            }
        }

        // ===============================================
        // Gestion de la base de données
        // ===============================================
        const adminPool = new Pool({
            ...connectionConfig,
            database: 'postgres'
        });

        try {
            console.log('\n📡 Connexion à PostgreSQL (base "postgres")...');
            await adminPool.query('SELECT NOW()');
            console.log('✅ Connexion réussie!');

            // Vérifier si la base existe
            const checkDb = await adminPool.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [targetDatabase]
            );

            if (checkDb.rows.length > 0) {
                if (shouldDropAndRecreate || skipConfirm) {
                    // Déconnecter tous les utilisateurs
                    console.log(`\n🔌 Déconnexion des utilisateurs de "${targetDatabase}"...`);
                    await adminPool.query(`
                        SELECT pg_terminate_backend(pg_stat_activity.pid)
                        FROM pg_stat_activity
                        WHERE pg_stat_activity.datname = $1
                        AND pid <> pg_backend_pid()
                    `, [targetDatabase]);

                    // Supprimer la base
                    console.log(`🗑️  Suppression de la base "${targetDatabase}"...`);
                    await adminPool.query(`DROP DATABASE "${targetDatabase}"`);
                    console.log('✅ Base supprimée!');

                    // Recréer la base
                    console.log(`🏗️  Création de la base "${targetDatabase}"...`);
                    await adminPool.query(`CREATE DATABASE "${targetDatabase}"`);
                    console.log('✅ Base créée!');
                } else {
                    console.log(`⚠️  La base "${targetDatabase}" existe déjà`);
                }
            } else {
                // Créer la nouvelle base
                console.log(`\n🏗️  Création de la base de données "${targetDatabase}"...`);
                await adminPool.query(`CREATE DATABASE "${targetDatabase}"`);
                console.log('✅ Base de données créée avec succès!');
            }

        } catch (error) {
            console.error(`\n❌ Erreur lors de la gestion de la base: ${error.message}`);
            await adminPool.end();
            process.exit(1);
        } finally {
            await adminPool.end();
        }

        // ===============================================
        // Connexion à la base cible et application du schéma
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
            console.error('❌ Erreur de connexion:', error.message);
            await pool.end();
            process.exit(1);
        }

        // Charger le schéma SQL
        const schemaPath = path.join(__dirname, 'schema-complete.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error(`\n❌ Fichier de schéma introuvable: ${schemaPath}`);
            console.log('\n💡 Pour créer ce fichier, exécutez sur votre base de développement:');
            console.log('   Windows: .\\scripts\\database\\export-schema.ps1');
            console.log('   Linux/Mac: ./scripts/database/export-schema.sh\n');
            await pool.end();
            process.exit(1);
        }

        console.log('📄 Chargement du schéma SQL...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔨 Application du schéma...');
        await pool.query(schemaSql);
        console.log('✅ Schéma appliqué avec succès!\n');

        // Créer les rôles de base avec couleurs
        console.log('👥 Création des rôles de base...');
        await createBaseRoles(pool);
        console.log('✅ Rôles créés!\n');

        // Créer le super admin
        console.log('👤 Création du super administrateur...');
        await createSuperAdmin(pool);
        console.log('✅ Super administrateur créé!\n');

        // Vérification finale
        console.log('📊 Vérification de la base...');
        const tableResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        const rolesResult = await pool.query(`
            SELECT nom, badge_bg_class, badge_text_class, badge_hex_color, badge_priority
            FROM roles
            ORDER BY badge_priority ASC
        `);
        
        const tablesCount = tableResult.rows[0]?.count || 0;

        await pool.end();
        
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ INITIALISATION TERMINÉE                     ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Base de données  : ${targetDatabase}`);
        console.log(`   ✓ Hôte             : ${connectionConfig.host}:${connectionConfig.port}`);
        console.log(`   ✓ Utilisateur      : ${connectionConfig.user}`);
        console.log(`   ✓ Tables créées    : ${tablesCount}`);
        console.log(`   ✓ Rôles créés      : ${rolesResult.rowCount}`);

        console.log('\n🎨 Aperçu des rôles et couleurs :');
        rolesResult.rows.forEach(role => {
            console.log(
                `   • ${role.nom.padEnd(25)} → ${role.badge_hex_color} (priorité: ${role.badge_priority})`
            );
        });
        
        console.log('\n🎯 CONNEXION :');
        console.log('═════════════');
        console.log('   📧 Email       : admin@ebvision.com');
        console.log('   🔑 Mot de passe: Admin@2025\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function createBaseRoles(pool) {
    const roles = [
        { nom: 'Super Administrateur', badge_bg_class: 'bg-red-100', badge_text_class: 'text-red-800', badge_hex_color: '#DC2626', badge_priority: 1 },
        { nom: 'Administrateur', badge_bg_class: 'bg-orange-100', badge_text_class: 'text-orange-800', badge_hex_color: '#EA580C', badge_priority: 2 },
        { nom: 'Manager', badge_bg_class: 'bg-blue-100', badge_text_class: 'text-blue-800', badge_hex_color: '#2563EB', badge_priority: 3 },
        { nom: 'Utilisateur', badge_bg_class: 'bg-green-100', badge_text_class: 'text-green-800', badge_hex_color: '#16A34A', badge_priority: 4 },
        { nom: 'Invité', badge_bg_class: 'bg-gray-100', badge_text_class: 'text-gray-800', badge_hex_color: '#6B7280', badge_priority: 5 }
    ];

    for (const role of roles) {
        await pool.query(`
            INSERT INTO roles (nom, description, badge_bg_class, badge_text_class, badge_hex_color, badge_priority)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (nom) DO UPDATE SET
                badge_bg_class = EXCLUDED.badge_bg_class,
                badge_text_class = EXCLUDED.badge_text_class,
                badge_hex_color = EXCLUDED.badge_hex_color,
                badge_priority = EXCLUDED.badge_priority
        `, [role.nom, `Rôle ${role.nom}`, role.badge_bg_class, role.badge_text_class, role.badge_hex_color, role.badge_priority]);
    }
}

async function createSuperAdmin(pool) {
    const email = 'admin@ebvision.com';
    const password = 'Admin@2025';
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const userResult = await pool.query(`
        INSERT INTO users (email, password_hash, statut)
        VALUES ($1, $2, 'ACTIF')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id
    `, [email, passwordHash]);

    const userId = userResult.rows[0].id;

    // Assigner le rôle Super Administrateur
    const roleResult = await pool.query(`SELECT id FROM roles WHERE nom = 'Super Administrateur'`);
    const roleId = roleResult.rows[0].id;

    await pool.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
    `, [userId, roleId]);

    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Mot de passe: ${password}`);
}

main();

