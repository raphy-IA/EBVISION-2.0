#!/usr/bin/env node

/**
 * SCRIPT DE CORRECTION : AJOUT DES LOGINS MANQUANTS
 * ==================================================
 * 
 * Ce script corrige les utilisateurs qui n'ont pas de login en générant
 * un login basé sur leur prénom et nom.
 * 
 * Usage: node scripts/database/fix-missing-logins.js
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     CORRECTION : AJOUT DES LOGINS MANQUANTS               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
    let pool;
    
    try {
        // Configuration et connexion
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log('   🔐 SSL        : ' + (process.env.NODE_ENV === 'production' ? 'Oui' : 'Non') + '\n');

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

        // Récupérer les utilisateurs sans login
        console.log('🔍 Recherche des utilisateurs sans login...');
        const usersWithoutLoginResult = await pool.query(`
            SELECT id, nom, prenom, email, login
            FROM users
            WHERE login IS NULL OR login = ''
            ORDER BY nom, prenom
        `);

        const usersWithoutLogin = usersWithoutLoginResult.rows;
        console.log(`📊 ${usersWithoutLogin.length} utilisateur(s) trouvé(s) sans login\n`);

        if (usersWithoutLogin.length === 0) {
            console.log('✅ Aucune correction nécessaire. Tous les utilisateurs ont un login.\n');
            await pool.end();
            return;
        }

        // Afficher les utilisateurs à corriger
        console.log('📋 Utilisateurs à corriger :');
        console.log('═══════════════════════════');
        usersWithoutLogin.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.email})`);
        });
        console.log('');

        // Générer et assigner les logins
        let correctedCount = 0;
        const inquirer = require('inquirer');
        
        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Générer les logins pour ces ${usersWithoutLogin.length} utilisateur(s) ?`,
                default: true
            }
        ]);

        if (!confirm.proceed) {
            console.log('\n❌ Correction annulée\n');
            await pool.end();
            return;
        }

        console.log('\n🚀 Génération des logins...\n');

        for (const user of usersWithoutLogin) {
            try {
                // Générer le login basé sur le prénom et le nom (première lettre de chaque)
                const baseLogin = (user.prenom.substring(0, 1) + user.nom.substring(0, 1)).toLowerCase();
                
                // Vérifier si le login existe déjà et ajouter un numéro si nécessaire
                let login = baseLogin;
                let loginExists = true;
                let counter = 1;
                
                while (loginExists) {
                    const checkLoginResult = await pool.query(
                        'SELECT id FROM users WHERE login = $1 AND id != $2', 
                        [login, user.id]
                    );
                    
                    if (checkLoginResult.rows.length === 0) {
                        loginExists = false;
                    } else {
                        login = baseLogin + counter;
                        counter++;
                    }
                }

                // Mettre à jour l'utilisateur
                await pool.query(
                    'UPDATE users SET login = $1 WHERE id = $2',
                    [login, user.id]
                );

                console.log(`   ✅ ${user.prenom} ${user.nom}: login = "${login}"`);
                correctedCount++;

            } catch (error) {
                console.error(`   ❌ Erreur pour ${user.prenom} ${user.nom}:`, error.message);
            }
        }

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ CORRECTION TERMINÉE AVEC SUCCÈS                  ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Utilisateurs corrigés : ${correctedCount}/${usersWithoutLogin.length}`);
        console.log('');

        await pool.end();

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        if (pool) await pool.end();
        process.exit(1);
    }
}

main();



