#!/usr/bin/env node

/**
 * Script pour corriger les mots de passe non-bcrypt
 * Usage: node scripts/fix-non-bcrypt-passwords.js
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../src/utils/database');

console.log('🔧 CORRECTION DES MOTS DE PASSE NON-BCRYPT\n');

async function fixNonBcryptPasswords() {
    try {
        // 1. Trouver les utilisateurs avec des hash non-bcrypt
        console.log('🔍 Recherche des utilisateurs avec des hash non-bcrypt...');
        const usersResult = await pool.query(`
            SELECT id, nom, prenom, email, login, role, password_hash
            FROM users 
            WHERE password_hash NOT LIKE '$2b$%' 
            AND password_hash NOT LIKE '$2a$%'
            AND password_hash IS NOT NULL
            AND password_hash != ''
        `);
        
        const usersToFix = usersResult.rows;
        console.log(`📊 ${usersToFix.length} utilisateurs à corriger\n`);
        
        if (usersToFix.length === 0) {
            console.log('✅ Tous les utilisateurs ont déjà des hash bcrypt !');
            return;
        }
        
        // 2. Afficher les utilisateurs concernés
        console.log('👥 Utilisateurs concernés:');
        usersToFix.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - Rôle: ${user.role}`);
        });
        console.log('');
        
        // 3. Demander confirmation
        console.log('⚠️  ATTENTION: Cette opération va:');
        console.log('   1. Générer un nouveau mot de passe temporaire pour chaque utilisateur');
        console.log('   2. Hasher le nouveau mot de passe avec bcrypt');
        console.log('   3. Mettre à jour la base de données');
        console.log('   4. Afficher les nouveaux mots de passe (à noter et communiquer)');
        console.log('');
        
        // 4. Générer de nouveaux mots de passe sécurisés
        console.log('🔐 Génération de nouveaux mots de passe sécurisés...');
        
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const updatedUsers = [];
        
        for (const user of usersToFix) {
            // Générer un mot de passe temporaire sécurisé
            const tempPassword = generateSecurePassword();
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            
            // Mettre à jour en base
            await pool.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [passwordHash, user.id]
            );
            
            updatedUsers.push({
                ...user,
                tempPassword: tempPassword
            });
            
            console.log(`   ✅ ${user.nom} ${user.prenom} - Mot de passe mis à jour`);
        }
        
        console.log('\n📋 NOUVEAUX MOTS DE PASSE TEMPORAIRES:');
        console.log('⚠️  IMPORTANT: Communiquez ces mots de passe aux utilisateurs concernés');
        console.log('⚠️  Les utilisateurs devront changer leur mot de passe à la première connexion\n');
        
        updatedUsers.forEach(user => {
            console.log(`👤 ${user.nom} ${user.prenom} (${user.email})`);
            console.log(`   Rôle: ${user.role}`);
            console.log(`   Nouveau mot de passe: ${user.tempPassword}`);
            console.log('');
        });
        
        console.log('✅ Correction terminée !');
        console.log('📝 Actions à effectuer:');
        console.log('   1. Communiquer les nouveaux mots de passe aux utilisateurs');
        console.log('   2. Demander aux utilisateurs de changer leur mot de passe à la première connexion');
        console.log('   3. Vérifier que tous les utilisateurs peuvent se connecter');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

/**
 * Générer un mot de passe sécurisé
 */
function generateSecurePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // S'assurer qu'il y a au moins un caractère de chaque type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Majuscule
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minuscule
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Chiffre
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Caractère spécial
    
    // Compléter avec des caractères aléatoires
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Exécuter la correction
fixNonBcryptPasswords();


