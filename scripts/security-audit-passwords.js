#!/usr/bin/env node

/**
 * Script d'audit de sécurité des mots de passe
 * Usage: node scripts/security-audit-passwords.js
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../src/utils/database');

console.log('🔒 AUDIT DE SÉCURITÉ - MOTS DE PASSE\n');

async function auditPasswords() {
    try {
        // 1. Récupérer tous les utilisateurs
        console.log('📊 Récupération des utilisateurs...');
        const usersResult = await pool.query(`
            SELECT id, nom, prenom, email, login, role, password_hash, 
                   CASE WHEN password_hash LIKE '$2b$%' THEN 'bcrypt' 
                        WHEN password_hash LIKE '$2a$%' THEN 'bcrypt' 
                        ELSE 'autre' END as hash_type,
                   LENGTH(password_hash) as hash_length,
                   created_at, last_login
            FROM users 
            ORDER BY role, nom
        `);
        
        const users = usersResult.rows;
        console.log(`✅ ${users.length} utilisateurs trouvés\n`);
        
        // 2. Analyser les types de hash
        console.log('🔍 ANALYSE DES TYPES DE HASH:');
        const hashTypes = {};
        users.forEach(user => {
            hashTypes[user.hash_type] = (hashTypes[user.hash_type] || 0) + 1;
        });
        
        Object.entries(hashTypes).forEach(([type, count]) => {
            const status = type === 'bcrypt' ? '✅' : '❌';
            console.log(`   ${status} ${type}: ${count} utilisateurs`);
        });
        console.log('');
        
        // 3. Vérifier les mots de passe faibles
        console.log('⚠️  VÉRIFICATION DES MOTS DE PASSE FAIBLES:');
        const weakPasswords = [
            'admin123', 'password', '123456', 'admin', 'test', 
            'password123', 'admin123456', '123456789', 'qwerty',
            'abc123', 'password1', 'admin1', 'root', 'user'
        ];
        
        let weakPasswordCount = 0;
        const usersWithWeakPasswords = [];
        
        for (const user of users) {
            if (user.hash_type === 'bcrypt') {
                for (const weakPassword of weakPasswords) {
                    try {
                        const isValid = await bcrypt.compare(weakPassword, user.password_hash);
                        if (isValid) {
                            usersWithWeakPasswords.push({
                                ...user,
                                weakPassword: weakPassword
                            });
                            weakPasswordCount++;
                            break; // Un seul mot de passe faible par utilisateur
                        }
                    } catch (error) {
                        // Ignorer les erreurs de comparaison
                    }
                }
            }
        }
        
        if (weakPasswordCount > 0) {
            console.log(`   🚨 ${weakPasswordCount} utilisateurs avec des mots de passe faibles:`);
            usersWithWeakPasswords.forEach(user => {
                console.log(`      - ${user.nom} ${user.prenom} (${user.email}) - Mot de passe: "${user.weakPassword}"`);
            });
        } else {
            console.log('   ✅ Aucun mot de passe faible détecté');
        }
        console.log('');
        
        // 4. Analyser les longueurs de hash
        console.log('📏 ANALYSE DES LONGUEURS DE HASH:');
        const hashLengths = {};
        users.forEach(user => {
            if (user.hash_type === 'bcrypt') {
                hashLengths[user.hash_length] = (hashLengths[user.hash_length] || 0) + 1;
            }
        });
        
        Object.entries(hashLengths).forEach(([length, count]) => {
            const status = length >= 60 ? '✅' : '⚠️';
            console.log(`   ${status} Longueur ${length}: ${count} utilisateurs`);
        });
        console.log('');
        
        // 5. Vérifier les utilisateurs sans mot de passe
        console.log('🔐 UTILISATEURS SANS MOT DE PASSE:');
        const usersWithoutPassword = users.filter(user => !user.password_hash);
        if (usersWithoutPassword.length > 0) {
            console.log(`   🚨 ${usersWithoutPassword.length} utilisateurs sans mot de passe:`);
            usersWithoutPassword.forEach(user => {
                console.log(`      - ${user.nom} ${user.prenom} (${user.email})`);
            });
        } else {
            console.log('   ✅ Tous les utilisateurs ont un mot de passe');
        }
        console.log('');
        
        // 6. Analyser par rôle
        console.log('👥 ANALYSE PAR RÔLE:');
        const roleAnalysis = {};
        users.forEach(user => {
            if (!roleAnalysis[user.role]) {
                roleAnalysis[user.role] = {
                    total: 0,
                    bcrypt: 0,
                    weak: 0,
                    noPassword: 0
                };
            }
            
            roleAnalysis[user.role].total++;
            
            if (user.hash_type === 'bcrypt') {
                roleAnalysis[user.role].bcrypt++;
            }
            
            if (usersWithWeakPasswords.some(u => u.id === user.id)) {
                roleAnalysis[user.role].weak++;
            }
            
            if (!user.password_hash) {
                roleAnalysis[user.role].noPassword++;
            }
        });
        
        Object.entries(roleAnalysis).forEach(([role, stats]) => {
            console.log(`   ${role}:`);
            console.log(`      Total: ${stats.total}`);
            console.log(`      Hash sécurisé: ${stats.bcrypt}/${stats.total} (${Math.round(stats.bcrypt/stats.total*100)}%)`);
            console.log(`      Mots de passe faibles: ${stats.weak}`);
            console.log(`      Sans mot de passe: ${stats.noPassword}`);
        });
        console.log('');
        
        // 7. Recommandations
        console.log('💡 RECOMMANDATIONS:');
        
        if (weakPasswordCount > 0) {
            console.log('   🔴 URGENT: Forcer le changement des mots de passe faibles');
        }
        
        if (usersWithoutPassword.length > 0) {
            console.log('   🔴 URGENT: Définir des mots de passe pour tous les utilisateurs');
        }
        
        const nonBcryptUsers = users.filter(u => u.hash_type !== 'bcrypt');
        if (nonBcryptUsers.length > 0) {
            console.log('   🟡 ÉLEVÉ: Migrer les utilisateurs vers bcrypt');
        }
        
        console.log('   🟢 MOYEN: Implémenter une politique de mots de passe forte');
        console.log('   🟢 MOYEN: Ajouter l\'authentification à deux facteurs');
        console.log('   🟢 MOYEN: Mettre en place l\'expiration des mots de passe');
        console.log('');
        
        // 8. Score de sécurité
        const totalUsers = users.length;
        const secureUsers = users.filter(u => 
            u.hash_type === 'bcrypt' && 
            !usersWithWeakPasswords.some(w => w.id === u.id) &&
            u.password_hash
        ).length;
        
        const securityScore = Math.round((secureUsers / totalUsers) * 100);
        
        console.log('📊 SCORE DE SÉCURITÉ DES MOTS DE PASSE:');
        console.log(`   Score: ${securityScore}/100`);
        
        if (securityScore >= 90) {
            console.log('   🟢 EXCELLENT: Sécurité des mots de passe très bonne');
        } else if (securityScore >= 70) {
            console.log('   🟡 BON: Sécurité des mots de passe acceptable');
        } else if (securityScore >= 50) {
            console.log('   🟠 MOYEN: Sécurité des mots de passe à améliorer');
        } else {
            console.log('   🔴 CRITIQUE: Sécurité des mots de passe insuffisante');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'audit:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter l'audit
auditPasswords();










