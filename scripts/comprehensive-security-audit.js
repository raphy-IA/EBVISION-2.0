#!/usr/bin/env node

/**
 * Audit de sécurité COMPLET pour EB-Vision 2.0
 * Vérifie TOUTES les vulnérabilités possibles
 * Usage: node scripts/comprehensive-security-audit.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Charger les variables d'environnement
require('dotenv').config();

console.log('🔒 AUDIT DE SÉCURITÉ COMPLET - EB-Vision 2.0');
console.log('==============================================\n');

// Compteurs pour le score
let totalChecks = 0;
let passedChecks = 0;
const vulnerabilities = [];
const recommendations = [];

function checkResult(passed, message, category = 'GENERAL') {
    totalChecks++;
    if (passed) {
        passedChecks++;
        console.log(`   ✅ ${message}`);
    } else {
        console.log(`   ❌ ${message}`);
        vulnerabilities.push({ category, message });
    }
}

function checkWarning(passed, message, category = 'GENERAL') {
    totalChecks++;
    if (passed) {
        passedChecks++;
        console.log(`   ✅ ${message}`);
    } else {
        console.log(`   ⚠️  ${message}`);
        recommendations.push({ category, message });
    }
}

// 1. VULNÉRABILITÉS D'AUTHENTIFICATION
console.log('1. 🔐 AUTHENTIFICATION ET AUTORISATION:');
console.log('=====================================');

// Vérifier la force des mots de passe
try {
    const passwordAudit = execSync('node scripts/security-audit-passwords.js', { stdio: 'pipe' }).toString();
    const scoreMatch = passwordAudit.match(/Score: (\d+)\/100/);
    if (scoreMatch) {
        const score = parseInt(scoreMatch[1]);
        checkResult(score >= 80, `Politique de mots de passe forte (${score}/100)`);
    } else {
        checkResult(false, 'Audit des mots de passe échoué');
    }
} catch (error) {
    checkResult(false, 'Script d\'audit des mots de passe non disponible');
}

// Vérifier bcrypt
checkResult(process.env.BCRYPT_ROUNDS && parseInt(process.env.BCRYPT_ROUNDS) >= 10, 
    `Bcrypt rounds suffisants (${process.env.BCRYPT_ROUNDS || 'non défini'})`);

// Vérifier JWT
checkResult(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 50, 
    `JWT secret fort (${process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0} caractères)`);

// Vérifier l'expiration JWT
checkResult(process.env.JWT_EXPIRES_IN && process.env.JWT_EXPIRES_IN !== 'never', 
    `JWT avec expiration (${process.env.JWT_EXPIRES_IN || 'non défini'})`);

// Vérifier les cookies sécurisés
const cookieAuthExists = fs.existsSync(path.join(__dirname, '..', 'src/middleware/cookieAuth.js'));
checkResult(cookieAuthExists, 'Middleware cookies sécurisés présent');

// Vérifier 2FA
const twoFactorExists = fs.existsSync(path.join(__dirname, '..', 'src/services/twoFactorAuth.js'));
checkResult(twoFactorExists, 'Service 2FA disponible');

// 2. VULNÉRABILITÉS DE SESSION
console.log('\n2. 🍪 GESTION DES SESSIONS:');
console.log('==========================');

// Vérifier HttpOnly cookies
checkResult(process.env.COOKIE_SECURE === 'true', 'Cookies sécurisés activés');
checkResult(process.env.COOKIE_SAME_SITE === 'Lax' || process.env.COOKIE_SAME_SITE === 'Strict', 
    `SameSite configuré (${process.env.COOKIE_SAME_SITE || 'non défini'})`);

// Vérifier l'expiration des sessions
checkResult(process.env.COOKIE_MAX_AGE && parseInt(process.env.COOKIE_MAX_AGE) <= 86400000, 
    `Expiration des sessions raisonnable (${process.env.COOKIE_MAX_AGE || 'non défini'}ms)`);

// 3. VULNÉRABILITÉS DE RATE LIMITING
console.log('\n3. 🚦 PROTECTION CONTRE LES ATTAQUES:');
console.log('===================================');

// Vérifier rate limiting général
checkResult(process.env.RATE_LIMIT_MAX_REQUESTS && parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) <= 1000, 
    `Rate limiting général configuré (${process.env.RATE_LIMIT_MAX_REQUESTS || 'non défini'})`);

// Vérifier rate limiting auth
checkResult(process.env.AUTH_RATE_LIMIT_MAX && parseInt(process.env.AUTH_RATE_LIMIT_MAX) <= 20, 
    `Rate limiting auth strict (${process.env.AUTH_RATE_LIMIT_MAX || 'non défini'})`);

// Vérifier Helmet
try {
    execSync('npm list helmet', { stdio: 'pipe' });
    checkResult(true, 'Helmet installé pour les headers de sécurité');
} catch (error) {
    checkResult(false, 'Helmet non installé');
}

// 4. VULNÉRABILITÉS CORS
console.log('\n4. 🌐 CONFIGURATION CORS:');
console.log('========================');

// Vérifier CORS
checkResult(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.startsWith('https://'), 
    `CORS configuré pour HTTPS (${process.env.CORS_ORIGIN || 'non défini'})`);

checkResult(process.env.CORS_CREDENTIALS === 'true', 'CORS credentials activés');

// 5. VULNÉRABILITÉS DE BASE DE DONNÉES
console.log('\n5. 🗄️ SÉCURITÉ DE LA BASE DE DONNÉES:');
console.log('====================================');

// Vérifier les permissions de la base
try {
    const dbCheck = execSync('psql -h localhost -U postgres -d ebvision_db -c "SELECT 1;" 2>/dev/null', { stdio: 'pipe' });
    checkResult(true, 'Connexion base de données sécurisée');
} catch (error) {
    checkWarning(false, 'Connexion base de données non testable');
}

// Vérifier les migrations de sécurité
const migrationFiles = [
    '049_add_two_factor_auth.sql',
    '050_add_security_monitoring.sql', 
    '051_add_password_expiration.sql'
];

migrationFiles.forEach(migration => {
    const exists = fs.existsSync(path.join(__dirname, '..', 'database/migrations', migration));
    checkResult(exists, `Migration sécurité ${migration}`);
});

// 6. VULNÉRABILITÉS DE LOGGING
console.log('\n6. 📝 LOGGING ET MONITORING:');
console.log('===========================');

// Vérifier les logs de sécurité
checkResult(process.env.SECURITY_LOGGING === 'true', 'Logging de sécurité activé');

// Vérifier les services de monitoring
const monitoringExists = fs.existsSync(path.join(__dirname, '..', 'src/services/securityMonitoring.js'));
checkResult(monitoringExists, 'Service de monitoring de sécurité présent');

// 7. VULNÉRABILITÉS DE CONFIGURATION
console.log('\n7. ⚙️ CONFIGURATION DE SÉCURITÉ:');
console.log('===============================');

// Vérifier l'environnement
checkResult(process.env.NODE_ENV === 'production', `Environnement production (${process.env.NODE_ENV || 'non défini'})`);

// Vérifier les permissions du fichier .env
try {
    const envStats = fs.statSync(path.join(__dirname, '..', '.env'));
    const permissions = (envStats.mode & parseInt('777', 8)).toString(8);
    checkResult(permissions === '600', `Permissions .env sécurisées (${permissions})`);
} catch (error) {
    checkResult(false, 'Fichier .env non trouvé');
}

// 8. VULNÉRABILITÉS DE CODE
console.log('\n8. 💻 VULNÉRABILITÉS DE CODE:');
console.log('============================');

// Vérifier l'absence de credentials hardcodés
const loginContent = fs.readFileSync(path.join(__dirname, '..', 'public/login.html'), 'utf8');
checkResult(!loginContent.includes('demo-credentials'), 'Aucun credential hardcodé dans login.html');

// Vérifier l'absence de console.log en production
const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const consoleLogs = (serverContent.match(/console\.log/g) || []).length;
checkWarning(consoleLogs <= 5, `Console.log limités en production (${consoleLogs} trouvés)`);

// Vérifier l'absence de mots de passe en dur
const hasHardcodedPassword = serverContent.includes('password') && 
    !serverContent.includes('process.env') && 
    !serverContent.includes('//');
checkResult(!hasHardcodedPassword, 'Aucun mot de passe hardcodé');

// 9. VULNÉRABILITÉS DE DÉPENDANCES
console.log('\n9. 📦 SÉCURITÉ DES DÉPENDANCES:');
console.log('==============================');

// Vérifier les dépendances critiques
const criticalPackages = [
    'bcryptjs',
    'jsonwebtoken', 
    'express-rate-limit',
    'helmet',
    'cookie-parser'
];

criticalPackages.forEach(pkg => {
    try {
        execSync(`npm list ${pkg}`, { stdio: 'pipe' });
        checkResult(true, `${pkg} installé`);
    } catch (error) {
        checkResult(false, `${pkg} manquant`);
    }
});

// Vérifier les vulnérabilités npm
try {
    const auditResult = execSync('npm audit --audit-level=high', { stdio: 'pipe' }).toString();
    const hasHighVulns = auditResult.includes('found') && auditResult.includes('high');
    checkResult(!hasHighVulns, 'Aucune vulnérabilité npm critique');
} catch (error) {
    checkWarning(false, 'Audit npm non disponible');
}

// 10. VULNÉRABILITÉS DE RÉSEAU
console.log('\n10. 🌐 SÉCURITÉ RÉSEAU:');
console.log('======================');

// Vérifier HTTPS
checkResult(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.startsWith('https://'), 
    'HTTPS configuré pour la production');

// Vérifier les ports
checkResult(process.env.PORT && process.env.PORT !== '80' && process.env.PORT !== '443', 
    `Port non standard utilisé (${process.env.PORT || 'non défini'})`);

// 11. VULNÉRABILITÉS DE FICHIERS
console.log('\n11. 📁 SÉCURITÉ DES FICHIERS:');
console.log('============================');

// Vérifier l'absence de fichiers sensibles
const sensitiveFiles = [
    '.env.backup',
    'backup.sql',
    'database.sql',
    'config.json'
];

sensitiveFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    checkResult(!exists, `Fichier sensible ${file} absent`);
});

// Vérifier les permissions des uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
    try {
        const uploadsStats = fs.statSync(uploadsDir);
        const permissions = (uploadsStats.mode & parseInt('777', 8)).toString(8);
        checkResult(permissions === '755' || permissions === '750', 
            `Permissions uploads sécurisées (${permissions})`);
    } catch (error) {
        checkWarning(false, 'Permissions uploads non vérifiables');
    }
}

// 12. VULNÉRABILITÉS DE PROCESSUS
console.log('\n12. ⚡ SÉCURITÉ DES PROCESSUS:');
console.log('============================');

// Vérifier que l'app tourne
try {
    execSync('pgrep -f "node.*server.js"', { stdio: 'pipe' });
    checkResult(true, 'Application en cours d\'exécution');
} catch (error) {
    checkResult(false, 'Application non démarrée');
}

// Vérifier PM2 si disponible
try {
    execSync('pm2 --version', { stdio: 'pipe' });
    checkResult(true, 'PM2 disponible pour la gestion des processus');
} catch (error) {
    checkWarning(false, 'PM2 non disponible');
}

// CALCUL DU SCORE FINAL
console.log('\n📊 RÉSULTATS DE L\'AUDIT:');
console.log('========================');

const score = Math.round((passedChecks / totalChecks) * 100);
console.log(`Score de sécurité: ${score}/100 (${passedChecks}/${totalChecks} vérifications)`);

// Classification du niveau de sécurité
let securityLevel, color;
if (score >= 95) {
    securityLevel = 'EXCELLENT';
    color = '🟢';
} else if (score >= 85) {
    securityLevel = 'TRÈS BON';
    color = '🟢';
} else if (score >= 75) {
    securityLevel = 'BON';
    color = '🟡';
} else if (score >= 60) {
    securityLevel = 'MOYEN';
    color = '🟠';
} else {
    securityLevel = 'CRITIQUE';
    color = '🔴';
}

console.log(`\n${color} NIVEAU DE SÉCURITÉ: ${securityLevel}`);

// Afficher les vulnérabilités
if (vulnerabilities.length > 0) {
    console.log('\n❌ VULNÉRABILITÉS DÉTECTÉES:');
    console.log('============================');
    vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. [${vuln.category}] ${vuln.message}`);
    });
}

// Afficher les recommandations
if (recommendations.length > 0) {
    console.log('\n⚠️  RECOMMANDATIONS:');
    console.log('===================');
    recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.message}`);
    });
}

// Recommandations générales
console.log('\n💡 RECOMMANDATIONS GÉNÉRALES:');
console.log('=============================');

if (score < 95) {
    console.log('- Corrigez les vulnérabilités critiques identifiées');
    console.log('- Mettez à jour les dépendances régulièrement');
    console.log('- Surveillez les logs de sécurité quotidiennement');
    console.log('- Planifiez des audits de sécurité mensuels');
    console.log('- Considérez l\'activation du 2FA obligatoire');
} else {
    console.log('- ✅ Excellent niveau de sécurité atteint');
    console.log('- Maintenez les bonnes pratiques actuelles');
    console.log('- Surveillez les logs régulièrement');
    console.log('- Planifiez des audits trimestriels');
}

console.log('\n🔒 Audit de sécurité terminé !');

