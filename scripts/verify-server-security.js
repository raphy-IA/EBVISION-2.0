#!/usr/bin/env node

/**
 * Script de vérification de la sécurité sur le serveur de production
 * Usage: node scripts/verify-server-security.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 VÉRIFICATION DE LA SÉCURITÉ SUR LE SERVEUR');
console.log('=============================================\n');

function checkFileExists(filePath) {
    return fs.existsSync(path.join(__dirname, '..', filePath));
}

function checkFileContent(filePath, searchPattern, description) {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
        return { status: '❌', message: `Fichier non trouvé: ${filePath}` };
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasPattern = searchPattern.test(content);
    
    return {
        status: hasPattern ? '✅' : '❌',
        message: hasPattern ? description : `Pattern non trouvé dans ${filePath}`
    };
}

function checkPackageInstalled(packageName) {
    try {
        execSync(`npm list ${packageName}`, { stdio: 'pipe' });
        return { status: '✅', message: `${packageName} installé` };
    } catch (error) {
        return { status: '❌', message: `${packageName} non installé` };
    }
}

function checkProcessRunning(processName) {
    try {
        const result = execSync(`pgrep -f "${processName}"`, { stdio: 'pipe' }).toString();
        return result.trim() ? 
            { status: '✅', message: `${processName} en cours d'exécution` } :
            { status: '❌', message: `${processName} non démarré` };
    } catch (error) {
        return { status: '❌', message: `${processName} non démarré` };
    }
}

function checkEnvironmentVariable(varName, expectedPattern) {
    const value = process.env[varName];
    if (!value) {
        return { status: '❌', message: `${varName} non défini` };
    }
    
    if (expectedPattern && !expectedPattern.test(value)) {
        return { status: '❌', message: `${varName} ne correspond pas au pattern attendu` };
    }
    
    return { status: '✅', message: `${varName} correctement configuré` };
}

console.log('📋 VÉRIFICATIONS DE SÉCURITÉ:\n');

// 1. Vérifier les fichiers de sécurité
console.log('1. 📁 Fichiers de sécurité:');
const securityFiles = [
    'src/middleware/cookieAuth.js',
    'scripts/security-audit-passwords.js',
    'scripts/fix-non-bcrypt-passwords.js',
    'scripts/generate-secure-jwt-key.js'
];

securityFiles.forEach(file => {
    const exists = checkFileExists(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file} ${exists ? 'présent' : 'manquant'}`);
});

// 2. Vérifier les dépendances
console.log('\n2. 📦 Dépendances de sécurité:');
const securityPackages = [
    'cookie-parser',
    'bcryptjs',
    'jsonwebtoken',
    'express-rate-limit',
    'helmet'
];

securityPackages.forEach(pkg => {
    const check = checkPackageInstalled(pkg);
    console.log(`   ${check.status} ${check.message}`);
});

// 3. Vérifier la configuration
console.log('\n3. ⚙️ Configuration de sécurité:');

// Vérifier la clé JWT
const jwtCheck = checkEnvironmentVariable('JWT_SECRET', /^.{50,}$/);
console.log(`   ${jwtCheck.status} ${jwtCheck.message}`);

// Vérifier le rate limiting
const rateLimitCheck = checkEnvironmentVariable('RATE_LIMIT_MAX_REQUESTS', /^\d+$/);
console.log(`   ${rateLimitCheck.status} ${rateLimitCheck.message}`);

// Vérifier bcrypt rounds
const bcryptCheck = checkEnvironmentVariable('BCRYPT_ROUNDS', /^\d+$/);
console.log(`   ${bcryptCheck.status} ${bcryptCheck.message}`);

// 4. Vérifier le code source
console.log('\n4. 🔍 Code source sécurisé:');

// Vérifier que les credentials sont supprimés
const loginCheck = checkFileContent('public/login.html', /SUPPRIMÉ_POUR_RAISONS_DE_SÉCURITÉ/, 'Credentials supprimés');
console.log(`   ${loginCheck.status} ${loginCheck.message}`);

// Vérifier le rate limiting activé
const rateLimitCodeCheck = checkFileContent('server.js', /Rate limiting activé pour l'authentification/, 'Rate limiting activé');
console.log(`   ${rateLimitCodeCheck.status} ${rateLimitCodeCheck.message}`);

// Vérifier les cookies httpOnly
const cookieCheck = checkFileContent('src/routes/auth.js', /setAuthCookie/, 'Cookies httpOnly utilisés');
console.log(`   ${cookieCheck.status} ${cookieCheck.message}`);

// 5. Vérifier l'application
console.log('\n5. 🚀 Application:');

// Vérifier que l'application tourne
const appCheck = checkProcessRunning('node.*server.js');
console.log(`   ${appCheck.status} ${appCheck.message}`);

// Vérifier PM2 si disponible
try {
    execSync('pm2 --version', { stdio: 'pipe' });
    const pm2Check = checkProcessRunning('pm2');
    console.log(`   ${pm2Check.status} ${pm2Check.message}`);
} catch (error) {
    console.log('   ℹ️  PM2 non disponible');
}

// 6. Test de l'API
console.log('\n6. 🌐 Test de l\'API:');
try {
    const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health', { stdio: 'pipe' }).toString();
    if (response.trim() === '200') {
        console.log('   ✅ API de santé accessible');
    } else {
        console.log(`   ❌ API de santé retourne: ${response.trim()}`);
    }
} catch (error) {
    console.log('   ❌ API de santé non accessible');
}

// 7. Audit des mots de passe
console.log('\n7. 🔐 Audit des mots de passe:');
try {
    const auditResult = execSync('node scripts/security-audit-passwords.js', { stdio: 'pipe' }).toString();
    const scoreMatch = auditResult.match(/Score: (\d+)\/100/);
    if (scoreMatch) {
        const score = parseInt(scoreMatch[1]);
        const status = score >= 90 ? '✅' : score >= 70 ? '⚠️' : '❌';
        console.log(`   ${status} Score de sécurité: ${score}/100`);
    } else {
        console.log('   ❌ Impossible de déterminer le score de sécurité');
    }
} catch (error) {
    console.log('   ❌ Échec de l\'audit des mots de passe');
}

// 8. Calculer le score global
console.log('\n📊 RÉSUMÉ:');
const checks = [
    checkFileExists('src/middleware/cookieAuth.js'),
    checkPackageInstalled('cookie-parser').status === '✅',
    checkEnvironmentVariable('JWT_SECRET', /^.{50,}$/).status === '✅',
    loginCheck.status === '✅',
    rateLimitCodeCheck.status === '✅',
    cookieCheck.status === '✅',
    appCheck.status === '✅'
];

const passedChecks = checks.filter(Boolean).length;
const totalChecks = checks.length;
const score = Math.round((passedChecks / totalChecks) * 100);

console.log(`Score global: ${score}/100 (${passedChecks}/${totalChecks} vérifications réussies)`);

if (score >= 90) {
    console.log('🟢 EXCELLENT: La sécurité est correctement configurée !');
} else if (score >= 70) {
    console.log('🟡 BON: La sécurité est globalement correcte');
} else if (score >= 50) {
    console.log('🟠 MOYEN: Des améliorations de sécurité sont nécessaires');
} else {
    console.log('🔴 CRITIQUE: Des corrections de sécurité urgentes sont requises');
}

console.log('\n💡 RECOMMANDATIONS:');
if (score < 100) {
    console.log('- Vérifiez les éléments marqués ❌ ci-dessus');
    console.log('- Consultez le guide de déploiement: DEPLOYMENT-SECURITY-GUIDE.md');
    console.log('- Redémarrez l\'application si nécessaire');
} else {
    console.log('- ✅ Toutes les vérifications de sécurité sont passées');
    console.log('- Surveillez les logs régulièrement');
    console.log('- Planifiez des audits de sécurité périodiques');
}

console.log('\n🔒 Vérification terminée !');
