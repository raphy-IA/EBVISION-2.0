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
        // Demander les informations de connexion
        // ===============================================
        console.log('📋 Configuration de la connexion à la base de données\n');
        
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'host',
                message: 'Hôte PostgreSQL:',
                default: process.env.DB_HOST || 'localhost'
            },
            {
                type: 'input',
                name: 'port',
                message: 'Port PostgreSQL:',
                default: process.env.DB_PORT || '5432'
            },
            {
                type: 'input',
                name: 'database',
                message: 'Nom de la base de données:',
                default: process.env.DB_NAME,
                validate: (input) => input.length > 0 ? true : 'Le nom de la base de données est requis'
            },
            {
                type: 'input',
                name: 'user',
                message: 'Utilisateur PostgreSQL:',
                default: process.env.DB_USER,
                validate: (input) => input.length > 0 ? true : 'L\'utilisateur est requis'
            },
            {
                type: 'password',
                name: 'password',
                message: 'Mot de passe PostgreSQL:',
                default: process.env.DB_PASSWORD,
                mask: '*'
            },
            {
                type: 'confirm',
                name: 'useSSL',
                message: 'Utiliser SSL?',
                default: process.env.NODE_ENV === 'production'
            }
        ]);

        // Créer la connexion
        const pool = new Pool({
            host: answers.host,
            port: parseInt(answers.port),
            database: answers.database,
            user: answers.user,
            password: answers.password,
            ssl: answers.useSSL ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        console.log('\n📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // ===============================================
        // Confirmation avant création
        // ===============================================
        const confirmAnswers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Créer les tables dans la base "${answers.database}"?`,
                default: true
            }
        ]);

        if (!confirmAnswers.proceed) {
            console.log('\n❌ Opération annulée\n');
            await pool.end();
            return;
        }

        console.log('\n🏗️  Création des tables...\n');

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
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
        console.log(`   ✓ Base de données: ${answers.database}`);
        console.log(`   ✓ Utilisateur: ${answers.user}`);
        
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

