#!/usr/bin/env node

/**
 * SCRIPT 1 : INITIALISATION DES TABLES DE LA BASE DE DONNÉES
 * ===========================================================
 * 
 * Ce script crée toutes les tables nécessaires pour l'application
 * en utilisant le schéma de référence (schema-complete.sql) et
 * crée les rôles système de base.
 * 
 * ⚠️  NOTE IMPORTANTE :
 * Ce script ne crée QUE les tables et les rôles.
 * Les données de référence doivent être insérées avec le script
 * 3-insert-reference-data.js
 * 
 * Usage: node scripts/database/1-init-database-tables.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║       ÉTAPE 1/4 : INITIALISATION DES TABLES                ║');
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
        const sslStatus = process.env.NODE_ENV === 'production' ? 'Oui' : 'Non';
        console.log(`   🔐 SSL        : ${sslStatus}\n`);

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

            // Créer la base de données
            console.log('\n📡 Connexion à PostgreSQL (base "postgres")...');
            const adminPool = new Pool({ ...connectionConfig, database: 'postgres' });
            
            try {
                await adminPool.query('SELECT NOW()');
                console.log('✅ Connexion réussie!\n');

                // Vérifier si la base existe déjà
                console.log('🔍 Vérification de l\'existence de "' + targetDatabase + '"...\n');
                const checkDb = await adminPool.query(
                    'SELECT 1 FROM pg_database WHERE datname = $1',
                    [targetDatabase]
                );

                if (checkDb.rows.length > 0) {
                    console.log('⚠️  La base de données existe déjà\n');
                    const overwrite = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'proceed',
                            message: 'Voulez-vous la supprimer et la recréer?',
                            default: false
                        }
                    ]);

                    if (!overwrite.proceed) {
                        console.log('\n❌ Opération annulée\n');
                        await adminPool.end();
                        return;
                    }

                    // Terminer les connexions actives
                    await adminPool.query(`
                        SELECT pg_terminate_backend(pg_stat_activity.pid)
                        FROM pg_stat_activity
                        WHERE pg_stat_activity.datname = $1
                        AND pid <> pg_backend_pid()
                    `, [targetDatabase]);

                    await adminPool.query(`DROP DATABASE "${targetDatabase}"`);
                    console.log('🗑️  Base supprimée\n');
                }

                console.log('🏗️  Création de la base de données "' + targetDatabase + '"...');
                await adminPool.query(`CREATE DATABASE "${targetDatabase}"`);
                console.log('✅ Base de données créée avec succès!\n');
                
                await adminPool.end();

            } catch (error) {
                await adminPool.end();
                throw error;
            }

        } else {
            // ===============================================
            // Mode : Base de données existante
            // ===============================================
            console.log('\n📂 Utilisation d\'une base de données existante\n');
            
            targetDatabase = process.env.DB_NAME || 'ewm_db';
            
            console.log('📋 Base de données détectée depuis .env:');
            console.log(`   🗄️  Base : ${targetDatabase}\n`);
            
            const confirmAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'databaseName',
                    message: 'Confirmer ou modifier le nom de la base de données:',
                    default: targetDatabase,
                    validate: (input) => {
                        if (input.length === 0) return 'Le nom est requis';
                        if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Caractères autorisés: lettres, chiffres, - et _';
                        return true;
                    }
                },
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: (answers) => {
                        return `⚠️  ATTENTION: Les tables vont être créées dans "${answers.databaseName}". Continuer?`;
                    },
                    default: false
                }
            ]);

            if (!confirmAnswers.proceed) {
                console.log('\n❌ Opération annulée par l\'utilisateur\n');
                return;
            }

            targetDatabase = confirmAnswers.databaseName;
            
            // Vérifier que la base existe
            console.log('\n🔍 Vérification de l\'existence de la base de données...');
            const checkPool = new Pool({ ...connectionConfig, database: 'postgres' });
            
            try {
                const checkDb = await checkPool.query(
                    'SELECT 1 FROM pg_database WHERE datname = $1',
                    [targetDatabase]
                );
                
                if (checkDb.rows.length === 0) {
                    await checkPool.end();
                    console.error(`\n❌ La base de données "${targetDatabase}" n'existe pas!`);
                    console.log('\n💡 Options:');
                    console.log('   1. Créer la base manuellement: createdb ' + targetDatabase);
                    console.log('   2. Relancer le script et choisir "Nouvelle base"\n');
                    return;
                }
                
                console.log('✅ Base de données trouvée!\n');
                await checkPool.end();
                
            } catch (error) {
                await checkPool.end();
                throw error;
            }
        }

        // ===============================================
        // Connexion à la base cible
        // ===============================================
        console.log('📡 Connexion à la base de données "' + targetDatabase + '"...');
        const pool = new Pool({
            ...connectionConfig,
            database: targetDatabase
        });

        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // ===============================================
        // Vérifier l'existence du fichier de schéma
        // ===============================================
        const schemaPath = path.join(__dirname, 'schema-structure-only.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error(`\n❌ Fichier de schéma introuvable: ${schemaPath}`);
            console.log('\n💡 Le fichier schema-complete.sql est requis pour l\'initialisation.');
            console.log('   Il devrait se trouver dans: scripts/database/schema-complete.sql\n');
            await pool.end();
            return;
        }

        // ===============================================
        // Application du schéma via psql
        // ===============================================
        console.log('📄 Chargement du schéma SQL depuis schema-complete.sql...');
        console.log('🔨 Application du schéma via psql...\n');
        
        // Fermer le pool temporairement
        await pool.end();
        
        // Utiliser psql pour appliquer le schéma
        const { execSync } = require('child_process');
        const psqlCmd = `psql -h ${connectionConfig.host} -p ${connectionConfig.port} -U ${connectionConfig.user} -d ${targetDatabase} -f "${schemaPath}" -q`;
        
        try {
            process.env.PGPASSWORD = connectionConfig.password;
            execSync(psqlCmd, { stdio: 'pipe' });
            delete process.env.PGPASSWORD;
            console.log('✅ Schéma appliqué avec succès!\n');
        } catch (error) {
            delete process.env.PGPASSWORD;
            console.error('❌ Erreur lors de l\'application du schéma:', error.message);
            console.log('\n💡 Assurez-vous que psql est installé et accessible dans le PATH\n');
            process.exit(1);
        }
        
        // Recréer le pool
        const newPool = new Pool({
            ...connectionConfig,
            database: targetDatabase
        });

        // ===============================================
        // Création des rôles de base avec styles
        // ===============================================
        console.log('👥 Création des rôles de base...');
        
        const baseRoles = [
            // ===== RÔLES SYSTÈME (is_system_role = true) - comme dans la base pure =====
            { name: 'SUPER_ADMIN', description: 'Super administrateur - Accès total à toutes les fonctionnalités', is_system: true, badge_bg_class: 'danger', badge_text_class: 'white', badge_hex_color: '#dc3545', badge_priority: 100 },
            { name: 'ADMIN_IT', description: 'Administrateur IT - Gestion technique et maintenance', is_system: true, badge_bg_class: 'dark', badge_text_class: 'white', badge_hex_color: '#212529', badge_priority: 95 },
            { name: 'IT', description: 'Technicien IT - Support technique et maintenance', is_system: true, badge_bg_class: 'secondary', badge_text_class: 'white', badge_hex_color: '#6c757d', badge_priority: 92 },
            { name: 'ADMIN', description: 'Administrateur - Gestion métier et configuration', is_system: true, badge_bg_class: 'primary', badge_text_class: 'white', badge_hex_color: '#0d6efd', badge_priority: 90 },
            { name: 'MANAGER', description: 'Manager - Gestion d\'équipe et supervision', is_system: true, badge_bg_class: 'info', badge_text_class: 'white', badge_hex_color: '#0dcaf0', badge_priority: 70 },
            { name: 'CONSULTANT', description: 'Consultant - Utilisateur standard avec accès complet aux données', is_system: true, badge_bg_class: 'success', badge_text_class: 'white', badge_hex_color: '#198754', badge_priority: 60 },
            { name: 'COLLABORATEUR', description: 'Collaborateur - Accès limité aux données de sa BU', is_system: true, badge_bg_class: 'info', badge_text_class: 'white', badge_hex_color: '#17a2b8', badge_priority: 50 },
            
            // ===== RÔLES NON-SYSTÈME (is_system_role = false) - optionnels =====
            { name: 'DIRECTEUR', description: 'Permissions et roles pour les directeurs', is_system: false, badge_bg_class: 'warning', badge_text_class: 'dark', badge_hex_color: '#ffc107', badge_priority: 80 },
            { name: 'ASSOCIE', description: 'Permissions et roles pour les Associés', is_system: false, badge_bg_class: 'warning', badge_text_class: 'dark', badge_hex_color: '#ff9800', badge_priority: 85 },
            { name: 'SUPER_USER', description: 'Permissions et roles pour le SP', is_system: false, badge_bg_class: 'primary', badge_text_class: 'white', badge_hex_color: '#0066cc', badge_priority: 75 },
            { name: 'SUPERVISEUR', description: 'Permissions pour superviseurs', is_system: false, badge_bg_class: 'info', badge_text_class: 'white', badge_hex_color: '#17a2b8', badge_priority: 65 }
        ];

        // S'assurer que la colonne is_system_role existe
        await newPool.query(`
            ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false
        `);
        
        for (const role of baseRoles) {
            await newPool.query(`
                INSERT INTO roles (name, description, is_system_role, badge_bg_class, badge_text_class, badge_hex_color, badge_priority)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    is_system_role = EXCLUDED.is_system_role,
                    badge_bg_class = EXCLUDED.badge_bg_class,
                    badge_text_class = EXCLUDED.badge_text_class,
                    badge_hex_color = EXCLUDED.badge_hex_color,
                    badge_priority = EXCLUDED.badge_priority
            `, [role.name, role.description, role.is_system, role.badge_bg_class, role.badge_text_class, role.badge_hex_color, role.badge_priority]);
        }
        const systemRolesCount = baseRoles.filter(r => r.is_system).length;
        const nonSystemRolesCount = baseRoles.filter(r => !r.is_system).length;
        console.log(`   ✅ ${baseRoles.length} rôles créés (${systemRolesCount} système, ${nonSystemRolesCount} non-système)\n`);

        // ===============================================
        // Vérification finale
        // ===============================================
        const tableResult = await newPool.query(`
            SELECT COUNT(*)::int AS count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        const tablesCount = tableResult.rows[0]?.count || 0;

        await newPool.end();

        // ===============================================
        // RÉSUMÉ
        // ===============================================
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ TABLES CRÉÉES AVEC SUCCÈS                   ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ ${tablesCount} tables créées/vérifiées`);
        console.log(`   ✓ ${baseRoles.length} rôles de base créés`);
        console.log(`   ✓ Base de données: ${targetDatabase}`);
        console.log(`   ✓ Hôte: ${connectionConfig.host}:${connectionConfig.port}`);
        console.log(`   ✓ Utilisateur: ${connectionConfig.user}`);
        
        console.log('\n🎯 PROCHAINES ÉTAPES :');
        console.log('══════════════════════');
        console.log('   1. Créer un super admin → node scripts/database/2-create-super-admin.js');
        console.log('   2. Insérer les données de référence → node scripts/database/3-insert-reference-data.js');
        console.log('   3. (Optionnel) Générer des données de démo → node scripts/database/5-generate-demo-data.js\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n💡 Vérifiez :');
        console.error('   - Les informations de connexion dans le fichier .env');
        console.error('   - Que la base de données existe (si mode "existante")');
        console.error('   - Que PostgreSQL est démarré');
        console.error('   - Que psql est installé et accessible\n');
        process.exit(1);
    }
}

// Exécution du script
initDatabaseTables().catch((error) => {
    console.error('\n❌ Échec de l\'initialisation');
    process.exit(1);
});
