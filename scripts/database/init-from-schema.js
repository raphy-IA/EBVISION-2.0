#!/usr/bin/env node

/**
 * Script d'initialisation de base de données à partir d'un dump de schéma
 * Usage: node scripts/database/init-from-schema.js
 * 
 * Ce script :
 * 1. Crée une nouvelle base de données (ou utilise une existante)
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

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     INITIALISATION SIMPLE DE LA BASE DE DONNÉES            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   🏠 Hôte       : ${config.host}`);
console.log(`   🔌 Port       : ${config.port}`);
console.log(`   👤 Utilisateur: ${config.user}`);
console.log(`   🗄️  Base      : ${config.database}`);
console.log(`   🔐 SSL        : ${config.ssl ? 'Oui' : 'Non'}\n`);

async function main() {
    try {
        // Demander confirmation (sauf si --yes)
        const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
        
        if (!skipConfirm) {
            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Voulez-vous initialiser la base "${config.database}" ?`,
                default: true
            }]);

            if (!confirm) {
                console.log('\n❌ Opération annulée.\n');
                process.exit(0);
            }
        }

        // Se connecter à la base
        console.log('\n📡 Connexion à la base de données...');
        const pool = new Pool(config);
        
        try {
            await pool.query('SELECT NOW()');
            console.log('✅ Connexion réussie!\n');
        } catch (error) {
            console.error('❌ Erreur de connexion:', error.message);
            process.exit(1);
        }

        // Charger le schéma SQL
        const schemaPath = path.join(__dirname, 'schema-complete.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error(`\n❌ Fichier de schéma introuvable: ${schemaPath}`);
            console.log('\n💡 Pour créer ce fichier, exécutez sur votre base de développement:');
            console.log('   pg_dump -U postgres -d ewm_db --schema-only --no-owner --no-privileges -f scripts/database/schema-complete.sql\n');
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
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log(`\n✅ ${result.rows.length} tables créées avec succès!\n`);
        
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ INITIALISATION RÉUSSIE !                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await pool.end();
        
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

