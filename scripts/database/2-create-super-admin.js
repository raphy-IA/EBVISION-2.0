#!/usr/bin/env node

/**
 * SCRIPT 2/4 : CRÉATION D'UN UTILISATEUR SUPER ADMIN
 * ===================================================
 * 
 * Ce script crée un utilisateur avec le rôle Super Administrateur
 * et lui associe le rôle dans la table user_roles.
 * 
 * Fonctionnalités :
 * - Validation robuste des entrées (email, mot de passe fort)
 * - Détection des utilisateurs existants
 * - Mise à jour si l'utilisateur existe déjà
 * - Association automatique du rôle Super Administrateur
 * 
 * Usage: node scripts/database/2-create-super-admin.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     ÉTAPE 2/4 : CRÉATION SUPER ADMIN                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
    let pool;
    
    try {
        // ===============================================
        // Configuration et connexion
        // ===============================================
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log(`   🔐 SSL        : ${process.env.NODE_ENV === 'production' ? 'Oui' : 'Non'}\n`);

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
        // Vérifier que le rôle SUPER_ADMIN existe
        // ===============================================
        const roleCheck = await pool.query('SELECT id FROM roles WHERE name = $1', ['SUPER_ADMIN']);
        if (roleCheck.rows.length === 0) {
            console.log('❌ Le rôle "SUPER_ADMIN" n\'existe pas dans la base de données');
            console.log('💡 Exécutez d\'abord: node scripts/database/1-init-database-tables.js\n');
            await pool.end();
            return;
        }
        const superAdminRoleId = roleCheck.rows[0].id;

        console.log('\n🛠️  Vérification de la structure de la table users...');
        await ensureUserColumns(pool);
        console.log('   ✓ Structure users prête\n');

        // ===============================================
        // Demander les informations de l'utilisateur
        // ===============================================
        console.log('👤 Informations du Super Administrateur\n');
        
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'nom',
                message: 'Nom:',
                validate: (input) => input.length > 0 ? true : 'Le nom est requis'
            },
            {
                type: 'input',
                name: 'prenom',
                message: 'Prénom:',
                validate: (input) => input.length > 0 ? true : 'Le prénom est requis'
            },
            {
                type: 'input',
                name: 'login',
                message: 'Login (nom d\'utilisateur):',
                default: (answers) => {
                    // Générer un login par défaut à partir du nom et prénom
                    const nom = answers.nom || '';
                    const prenom = answers.prenom || '';
                    return (prenom.charAt(0) + nom).toLowerCase().replace(/[^a-z0-9]/g, '');
                },
                validate: (input) => {
                    if (input.length < 3) return 'Le login doit contenir au moins 3 caractères';
                    if (!/^[a-z0-9_-]+$/i.test(input)) return 'Le login ne peut contenir que des lettres, chiffres, tirets et underscores';
                    return true;
                }
            },
            {
                type: 'input',
                name: 'email',
                message: 'Email:',
                default: 'admin@ebvision.com',
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input)) return 'Email invalide';
                    return true;
                }
            },
            {
                type: 'password',
                name: 'password',
                message: 'Mot de passe:',
                mask: '*',
                default: 'Admin@2025',
                validate: (input) => {
                    if (input.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
                    if (!/[A-Z]/.test(input)) return 'Le mot de passe doit contenir au moins une majuscule';
                    if (!/[a-z]/.test(input)) return 'Le mot de passe doit contenir au moins une minuscule';
                    if (!/[0-9]/.test(input)) return 'Le mot de passe doit contenir au moins un chiffre';
                    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(input)) return 'Le mot de passe doit contenir au moins un caractère spécial';
                    return true;
                }
            },
            {
                type: 'password',
                name: 'passwordConfirm',
                message: 'Confirmer le mot de passe:',
                mask: '*',
                validate: (input, answers) => {
                    if (input !== answers.password) return 'Les mots de passe ne correspondent pas';
                    return true;
                }
            }
        ]);

        // ===============================================
        // Vérifier si l'utilisateur existe déjà
        // ===============================================
        console.log('\n🔍 Vérification de l\'existence de l\'utilisateur...');
        
        const existingUser = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [answers.email]
        );

        let userId;

        if (existingUser.rows.length > 0) {
            const existing = existingUser.rows[0];
            console.log('⚠️  Un utilisateur avec cet email existe déjà:');
            console.log(`   → ID: ${existing.id}`);
            console.log(`   → Email: ${existing.email}\n`);
            
            const overwriteAnswer = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Voulez-vous mettre à jour cet utilisateur?',
                    default: false
                }
            ]);

            if (!overwriteAnswer.overwrite) {
                console.log('\n❌ Création annulée\n');
                await pool.end();
                return;
            }

            // Mettre à jour l'utilisateur existant
            const passwordHash = await bcrypt.hash(answers.password, 12);
            
            await pool.query(`
                UPDATE users 
                SET nom = $1, prenom = $2, login = $3, email = $4, password_hash = $5, role = 'SUPER_ADMIN', statut = 'ACTIF'
                WHERE id = $6
            `, [answers.nom, answers.prenom, answers.login, answers.email, passwordHash, existing.id]);

            console.log('\n✅ Utilisateur mis à jour avec succès!');
            console.log(`   → ID: ${existing.id}`);
            
            userId = existing.id;

        } else {
            // ===============================================
            // Créer le nouvel utilisateur
            // ===============================================
            console.log('\n👤 Création de l\'utilisateur...');
            
            const passwordHash = await bcrypt.hash(answers.password, 12);
            
            const result = await pool.query(`
                INSERT INTO users (nom, prenom, login, email, password_hash, role, statut)
                VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', 'ACTIF')
                RETURNING id, nom, prenom, login, email, role, created_at
            `, [
                answers.nom,
                answers.prenom,
                answers.login,
                answers.email,
                passwordHash
            ]);

            const newUser = result.rows[0];
            console.log('✅ Utilisateur créé avec succès!');
            console.log(`   → ID: ${newUser.id}`);
            
            userId = newUser.id;
        }

        // ===============================================
        // Associer le rôle Super Administrateur
        // ===============================================
        console.log('\n🔗 Association du rôle Super Administrateur...');
        
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, superAdminRoleId]);
        
        console.log('✅ Rôle Super Administrateur associé');

        // ===============================================
        // Compter les permissions actuelles
        // ===============================================
        const permCount = await pool.query('SELECT COUNT(*) as count FROM permissions');
        const rolePermCount = await pool.query(`
            SELECT COUNT(*) as count 
            FROM role_permissions rp
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [userId]);

        // ===============================================
        // Résumé
        // ===============================================
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║           ✅ SUPER ADMIN CRÉÉ AVEC SUCCÈS                   ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 INFORMATIONS :');
        console.log('═════════════════');
        console.log(`   👤 Nom      : ${answers.nom} ${answers.prenom}`);
        console.log(`   🔑 Login    : ${answers.login}`);
        console.log(`   📧 Email    : ${answers.email}`);
        console.log(`   🆔 ID       : ${userId}`);
        console.log(`   👑 Rôle     : Super Administrateur`);
        
        console.log(`\n📋 PERMISSIONS :`);
        console.log(`   → ${permCount.rows[0].count} permissions disponibles dans la base`);
        console.log(`   → ${rolePermCount.rows[0].count} permissions actuellement associées`);
        
        if (parseInt(rolePermCount.rows[0].count) === 0) {
            console.log('\n⚠️  ATTENTION : Aucune permission associée pour le moment');
        }
        
        console.log('\n🎯 PROCHAINE ÉTAPE :');
        console.log('════════════════════');
        console.log('   Affecter toutes les permissions → node scripts/database/3-assign-all-permissions.js');
        
        console.log('\n🔑 INFORMATIONS DE CONNEXION :');
        console.log('══════════════════════════════');
        console.log(`   🔑 Login        : ${answers.login}`);
        console.log(`   📧 Email        : ${answers.email}`);
        console.log(`   🔐 Mot de passe : [celui que vous avez défini]`);
        console.log('\n');

        await pool.end();

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        if (pool) await pool.end();
        process.exit(1);
    }
}

async function ensureUserColumns(pool) {
    const queries = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(255);`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS prenom VARCHAR(255);`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER';`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'ACTIF';`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    // S'assurer que la colonne email est unique
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);`);
}

main();
