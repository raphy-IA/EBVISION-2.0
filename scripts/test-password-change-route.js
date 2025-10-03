#!/usr/bin/env node

/**
 * Script pour tester la route de changement de mot de passe
 */

const { pool } = require('../src/utils/database');
const bcrypt = require('bcryptjs');

async function testPasswordChangeRoute() {
    console.log('🧪 TEST DE LA ROUTE DE CHANGEMENT DE MOT DE PASSE');
    console.log('================================================\n');

    try {
        const client = await pool.connect();
        console.log('✅ Connexion à la base de données réussie\n');

        // Récupérer l'utilisateur le plus récemment modifié (probablement celui qui teste)
        const userQuery = `
            SELECT id, login, email, nom, prenom, password_hash, role
            FROM users 
            ORDER BY updated_at DESC 
            LIMIT 1
        `;
        
        const userResult = await client.query(userQuery);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé');
            return;
        }

        const user = userResult.rows[0];
        console.log('👤 UTILISATEUR DE TEST:');
        console.log('======================');
        console.log(`   ID: ${user.id}`);
        console.log(`   Login: ${user.login}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nom: ${user.nom} ${user.prenom}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Password Hash: ${user.password_hash ? '✅ Défini' : '❌ Manquant'}`);
        console.log(`   Longueur Hash: ${user.password_hash ? user.password_hash.length : 0} caractères\n`);

        // Tester la vérification du mot de passe
        console.log('🔍 TEST DE VÉRIFICATION DU MOT DE PASSE:');
        console.log('=======================================');
        
        const testPasswords = ['TempPass123!', 'password', 'admin', '123456'];
        
        for (const testPassword of testPasswords) {
            try {
                const isValid = await bcrypt.compare(testPassword, user.password_hash);
                console.log(`   "${testPassword}": ${isValid ? '✅ Valide' : '❌ Invalide'}`);
            } catch (error) {
                console.log(`   "${testPassword}": ❌ Erreur - ${error.message}`);
            }
        }

        // Tester la création d'un nouveau hash
        console.log('\n🔧 TEST DE CRÉATION D\'UN NOUVEAU HASH:');
        console.log('=====================================');
        
        const newPassword = 'NewTest123!';
        const saltRounds = 12;
        
        try {
            const newHash = await bcrypt.hash(newPassword, saltRounds);
            console.log(`   Nouveau mot de passe: "${newPassword}"`);
            console.log(`   Nouveau hash créé: ${newHash.length} caractères`);
            console.log(`   Hash valide: ${newHash ? '✅' : '❌'}`);
            
            // Tester la vérification du nouveau hash
            const isValidNew = await bcrypt.compare(newPassword, newHash);
            console.log(`   Vérification nouveau hash: ${isValidNew ? '✅' : '❌'}`);
            
        } catch (error) {
            console.log(`   ❌ Erreur lors de la création du hash: ${error.message}`);
        }

        // Vérifier la structure de la table users
        console.log('\n📋 VÉRIFICATION DE LA STRUCTURE:');
        console.log('================================');
        
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password_hash'
        `;
        
        const structureResult = await client.query(structureQuery);
        if (structureResult.rows.length > 0) {
            const col = structureResult.rows[0];
            console.log(`   password_hash: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
            console.log(`   Default: ${col.column_default || 'Aucun'}`);
        }

        client.release();
        
        console.log('\n💡 DIAGNOSTIC:');
        console.log('==============');
        console.log('1. L\'utilisateur a un password_hash défini');
        console.log('2. Le problème peut venir de:');
        console.log('   - La récupération de l\'utilisateur dans la route');
        console.log('   - La vérification du token JWT');
        console.log('   - La logique de la route change-password');
        console.log('3. Vérifiez les logs du serveur lors du changement de mot de passe');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le test
testPasswordChangeRoute().catch(console.error);


