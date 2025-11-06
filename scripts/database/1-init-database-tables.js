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

        console.log('🏗️  Création des tables...\n');

        // ===============================================
        // CRÉATION DES TABLES
        // ===============================================

        let tableCount = 0;

        // 1. Table users
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
                photo_url TEXT,
                two_factor_enabled BOOLEAN DEFAULT false,
                two_factor_secret VARCHAR(255),
                backup_codes TEXT[],
                last_login TIMESTAMP WITH TIME ZONE,
                last_logout TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Ajouter les colonnes 2FA si elles n'existent pas (pour les bases existantes)
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
                    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
                    ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
                    ALTER TABLE users ADD COLUMN backup_codes TEXT[];
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'last_login') THEN
                    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'users' AND column_name = 'last_logout') THEN
                    ALTER TABLE users ADD COLUMN last_logout TIMESTAMP WITH TIME ZONE;
                END IF;
            END $$;
        `);
        console.log('   ✓ Table users');
        tableCount++;

        // 2. Table roles
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
        tableCount++;

        // 3. Table permissions
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
        tableCount++;

        // 4. Table user_roles
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
        tableCount++;

        // 5. Table role_permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, permission_id)
            );
        `);
        console.log('   ✓ Table role_permissions');
        tableCount++;

        // 6. Table business_units
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_units (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL UNIQUE,
                code VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table business_units');
        tableCount++;

        // 7. Table divisions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS divisions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table divisions');
        tableCount++;

        // 8. Table grades
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(100) NOT NULL UNIQUE,
                niveau INTEGER,
                taux_horaire_default DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table grades');
        tableCount++;

        // 9. Table postes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS postes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table postes');
        tableCount++;

        // 10. Table collaborateurs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS collaborateurs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE,
                telephone VARCHAR(50),
                division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
                poste_id UUID REFERENCES postes(id) ON DELETE SET NULL,
                grade_actuel_id UUID REFERENCES grades(id) ON DELETE SET NULL,
                date_embauche DATE,
                statut VARCHAR(50) DEFAULT 'ACTIF',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table collaborateurs');
        tableCount++;

        // 11. Table clients
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                code_client VARCHAR(50) UNIQUE,
                email VARCHAR(255),
                telephone VARCHAR(50),
                adresse TEXT,
                secteur_activite_id UUID,
                pays_id UUID,
                statut VARCHAR(50) DEFAULT 'ACTIF',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table clients');
        tableCount++;

        // 12. Table missions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS missions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                code_mission VARCHAR(50) UNIQUE,
                client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
                type_mission_id UUID,
                date_debut DATE,
                date_fin_prevue DATE,
                date_fin_reelle DATE,
                statut VARCHAR(50) DEFAULT 'EN_COURS',
                montant_honoraires DECIMAL(15, 2),
                devise VARCHAR(3) DEFAULT 'EUR',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table missions');
        tableCount++;

        // 13. Table opportunities
        await pool.query(`
            CREATE TABLE IF NOT EXISTS opportunities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
                business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
                opportunity_type_id UUID,
                collaborateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
                statut VARCHAR(50) DEFAULT 'NOUVELLE',
                probabilite INTEGER DEFAULT 50,
                montant_estime DECIMAL(15, 2),
                devise VARCHAR(3) DEFAULT 'EUR',
                date_fermeture_prevue DATE,
                date_fermeture_reelle DATE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table opportunities');
        tableCount++;

        // 14. Table time_entries
        await pool.query(`
            CREATE TABLE IF NOT EXISTS time_entries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
                date_saisie DATE NOT NULL,
                heures DECIMAL(5, 2) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table time_entries');
        tableCount++;

        // 15. Table invoices
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                numero_facture VARCHAR(100) UNIQUE NOT NULL,
                client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
                mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
                date_emission DATE NOT NULL,
                date_echeance DATE,
                montant_ht DECIMAL(15, 2) NOT NULL,
                montant_ttc DECIMAL(15, 2) NOT NULL,
                taux_tva DECIMAL(5, 2) DEFAULT 20.00,
                statut VARCHAR(50) DEFAULT 'BROUILLON',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table invoices');
        tableCount++;

        // 16. Table notifications (si elle n'existe pas déjà)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                opportunity_id UUID,
                stage_id UUID,
                campaign_id UUID,
                read BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Ajouter campaign_id si la colonne n'existe pas
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'notifications' AND column_name = 'campaign_id') THEN
                    ALTER TABLE notifications ADD COLUMN campaign_id UUID;
                END IF;
            END $$;
        `);
        console.log('   ✓ Table notifications');
        tableCount++;

        // 17. Table pages (optionnelle, pour synchronisation)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                url VARCHAR(500) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table pages (optionnelle)');
        tableCount++;

        // 18. Table menu_sections (optionnelle, pour synchronisation)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu_sections (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table menu_sections (optionnelle)');
        tableCount++;

        // 19. Table menu_items (optionnelle, pour synchronisation)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(255) NOT NULL UNIQUE,
                label VARCHAR(255) NOT NULL,
                url VARCHAR(500) NOT NULL,
                section_id UUID REFERENCES menu_sections(id) ON DELETE CASCADE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✓ Table menu_items (optionnelle)');
        tableCount++;

        // ===============================================
        // Insertion des rôles de base
        // ===============================================
        console.log('\n👥 Création des rôles de base...');
        
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
        console.log(`   ✅ ${baseRoles.length} rôles créés`);

        // ===============================================
        // RÉSUMÉ
        // ===============================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ TABLES CRÉÉES AVEC SUCCÈS                   ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ ${tableCount} tables créées/vérifiées`);
        console.log(`   ✓ ${baseRoles.length} rôles de base créés`);
        console.log(`   ✓ Base de données: ${targetDatabase}`);
        console.log(`   ✓ Hôte: ${connectionConfig.host}:${connectionConfig.port}`);
        console.log(`   ✓ Utilisateur: ${connectionConfig.user}`);
        
        console.log('\n🎯 PROCHAINES ÉTAPES :');
        console.log('══════════════════════');
        console.log('   1. Créer un super admin → node scripts/2-create-super-admin.js');
        console.log('   2. Affecter les permissions → node scripts/3-assign-all-permissions.js\n');

        await pool.end();

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

