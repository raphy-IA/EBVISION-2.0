// Charger les variables d'environnement
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function securityAudit() {
    console.log('🔒 Audit de sécurité EB-Vision 2.0\n');
    
    let score = 0;
    const maxScore = 100;
    const issues = [];
    const recommendations = [];
    
    // 1. Vérification des variables d'environnement
    console.log('1️⃣ Vérification des variables d\'environnement...');
    
    const requiredEnvVars = [
        'NODE_ENV', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 
        'JWT_SECRET', 'JWT_EXPIRES_IN'
    ];
    
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            console.log(`   ✅ ${envVar}: défini`);
            score += 2;
        } else {
            console.log(`   ❌ ${envVar}: non défini`);
            issues.push(`${envVar} non défini`);
            recommendations.push(`Définir ${envVar} dans le fichier .env`);
        }
    }
    
    // 2. Vérification du JWT_SECRET
    console.log('\n2️⃣ Vérification du JWT_SECRET...');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length >= 32 && !jwtSecret.includes('dev') && !jwtSecret.includes('test')) {
        console.log('   ✅ JWT_SECRET sécurisé');
        score += 10;
    } else {
        console.log('   ⚠️  JWT_SECRET faible ou par défaut');
        issues.push('JWT_SECRET faible');
        recommendations.push('Changer le JWT_SECRET pour une valeur sécurisée de 32+ caractères');
    }
    
    // 3. Vérification des permissions des fichiers
    console.log('\n3️⃣ Vérification des permissions des fichiers...');
    
    const criticalFiles = [
        '.env', 'config.production.js', 'ecosystem.config.js', '.htaccess'
    ];
    
    for (const file of criticalFiles) {
        try {
            const stats = fs.statSync(file);
            const mode = stats.mode & parseInt('777', 8);
            
            if (mode === parseInt('644', 8) || mode === parseInt('600', 8)) {
                console.log(`   ✅ ${file}: permissions correctes (${mode.toString(8)})`);
                score += 3;
            } else {
                console.log(`   ⚠️  ${file}: permissions trop ouvertes (${mode.toString(8)})`);
                issues.push(`${file} permissions trop ouvertes`);
                recommendations.push(`Changer les permissions de ${file} à 644 ou 600`);
            }
        } catch (error) {
            console.log(`   ❌ ${file}: fichier non trouvé`);
            issues.push(`${file} non trouvé`);
        }
    }
    
    // 4. Vérification des utilisateurs en base
    console.log('\n4️⃣ Vérification des utilisateurs...');
    
    try {
        const usersResult = await pool.query(`
            SELECT email, role, statut, 
                   CASE WHEN password_hash LIKE '$2b$%' THEN 'bcrypt' ELSE 'autre' END as hash_type
            FROM users 
            ORDER BY created_at DESC
        `);
        
        console.log(`   📊 ${usersResult.rows.length} utilisateurs trouvés`);
        
        for (const user of usersResult.rows) {
            if (user.hash_type === 'bcrypt') {
                console.log(`   ✅ ${user.email}: hash sécurisé (${user.role})`);
                score += 2;
            } else {
                console.log(`   ⚠️  ${user.email}: hash non sécurisé`);
                issues.push(`${user.email} hash non sécurisé`);
            }
            
            if (user.statut === 'ACTIF') {
                console.log(`   ✅ ${user.email}: compte actif`);
            } else {
                console.log(`   ⚠️  ${user.email}: compte inactif`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Erreur lors de la vérification des utilisateurs: ${error.message}`);
    }
    
    // 5. Vérification des mots de passe faibles
    console.log('\n5️⃣ Vérification des mots de passe...');
    
    const weakPasswords = ['admin123', 'password', '123456', 'admin', 'test'];
    const adminUser = usersResult.rows.find(u => u.email === 'admin@ebvision.com');
    
    if (adminUser) {
        console.log('   ⚠️  Utilisateur admin détecté - vérifiez le mot de passe');
        recommendations.push('Changer le mot de passe de l\'utilisateur admin');
    }
    
    // 6. Vérification de la configuration PM2
    console.log('\n6️⃣ Vérification de la configuration PM2...');
    
    try {
        const ecosystemConfig = require('../ecosystem.config.js');
        if (ecosystemConfig.apps && ecosystemConfig.apps[0].env.NODE_ENV === 'production') {
            console.log('   ✅ PM2 configuré en production');
            score += 5;
        } else {
            console.log('   ⚠️  PM2 pas en production');
            issues.push('PM2 pas en production');
        }
    } catch (error) {
        console.log('   ❌ Erreur lors de la vérification PM2');
    }
    
    // 7. Vérification des logs
    console.log('\n7️⃣ Vérification des logs...');
    
    const logDir = 'logs';
    if (fs.existsSync(logDir)) {
        console.log('   ✅ Dossier logs présent');
        score += 3;
    } else {
        console.log('   ⚠️  Dossier logs manquant');
        recommendations.push('Créer le dossier logs pour la surveillance');
    }
    
    // Résumé
    console.log('\n📊 Résumé de l\'audit de sécurité');
    console.log('=' .repeat(50));
    console.log(`Score de sécurité: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
    
    if (score >= 80) {
        console.log('🟢 Niveau de sécurité: EXCELLENT');
    } else if (score >= 60) {
        console.log('🟡 Niveau de sécurité: BON');
    } else if (score >= 40) {
        console.log('🟠 Niveau de sécurité: MOYEN');
    } else {
        console.log('🔴 Niveau de sécurité: FAIBLE');
    }
    
    if (issues.length > 0) {
        console.log('\n❌ Problèmes détectés:');
        issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (recommendations.length > 0) {
        console.log('\n💡 Recommandations:');
        recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    console.log('\n🔒 Actions de sécurité prioritaires:');
    console.log('   1. Changer le JWT_SECRET');
    console.log('   2. Changer le mot de passe admin');
    console.log('   3. Vérifier les permissions des fichiers');
    console.log('   4. Configurer la surveillance des logs');
    console.log('   5. Mettre en place un firewall');
    
    await pool.end();
}

securityAudit().catch(console.error);








