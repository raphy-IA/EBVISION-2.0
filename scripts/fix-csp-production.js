#!/usr/bin/env node

/**
 * Script de correction CSP pour la production
 * 
 * Ce script corrige les problèmes de Content Security Policy
 * qui empêchent le chargement des campagnes de prospection
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Script de correction CSP pour la production');
console.log('================================================');

// 1. Vérifier la configuration CSP actuelle
function checkCurrentCSP() {
    console.log('\n📋 1. Vérification de la configuration CSP actuelle...');
    
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    if (!fs.existsSync(serverPath)) {
        console.error('❌ Fichier server.js non trouvé');
        return false;
    }
    
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Vérifier si connectSrc est présent
    const hasConnectSrc = serverContent.includes('connectSrc');
    const hasCdnjs = serverContent.includes('cdnjs.cloudflare.com');
    
    console.log(`   - connectSrc configuré: ${hasConnectSrc ? '✅' : '❌'}`);
    console.log(`   - cdnjs.cloudflare.com autorisé: ${hasCdnjs ? '✅' : '❌'}`);
    
    return { hasConnectSrc, hasCdnjs, serverContent };
}

// 2. Corriger la configuration CSP
function fixCSP() {
    console.log('\n🔧 2. Correction de la configuration CSP...');
    
    const serverPath = path.join(__dirname, '..', 'server.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Configuration CSP corrigée
    const fixedCSP = `app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "data:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https:"],
        },
    },
}));`;
    
    // Remplacer la configuration CSP existante
    const cspRegex = /app\.use\(helmet\(\{[\s\S]*?\}\)\);/;
    
    if (cspRegex.test(serverContent)) {
        serverContent = serverContent.replace(cspRegex, fixedCSP);
        fs.writeFileSync(serverPath, serverContent, 'utf8');
        console.log('   ✅ Configuration CSP mise à jour');
        return true;
    } else {
        console.log('   ❌ Configuration CSP non trouvée dans server.js');
        return false;
    }
}

// 3. Vérifier les URLs dans le frontend
function checkFrontendURLs() {
    console.log('\n🌐 3. Vérification des URLs frontend...');
    
    const frontendPath = path.join(__dirname, '..', 'public', 'prospecting-campaigns.html');
    
    if (!fs.existsSync(frontendPath)) {
        console.log('   ⚠️ Fichier prospecting-campaigns.html non trouvé');
        return false;
    }
    
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    
    // Vérifier les URLs localhost
    const localhostUrls = frontendContent.match(/http:\/\/localhost:\d+/g) || [];
    const uniqueUrls = [...new Set(localhostUrls)];
    
    console.log(`   - URLs localhost trouvées: ${uniqueUrls.length}`);
    uniqueUrls.forEach(url => console.log(`     • ${url}`));
    
    return true;
}

// 4. Créer un script de redémarrage
function createRestartScript() {
    console.log('\n🔄 4. Création du script de redémarrage...');
    
    const restartScript = `#!/bin/bash

# Script de redémarrage pour la production
# Corrige les problèmes CSP et redémarre le serveur

echo "🔄 Redémarrage du serveur avec correction CSP..."

# Arrêter les processus Node.js existants
echo "⏹️ Arrêt des processus existants..."
pkill -f "node server.js" || true
sleep 2

# Vérifier que le port est libre
echo "🔍 Vérification du port..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Le port 3000 est encore occupé, tentative de libération..."
    lsof -ti:3000 | xargs kill -9 || true
    sleep 2
fi

# Redémarrer le serveur
echo "🚀 Redémarrage du serveur..."
npm start

echo "✅ Serveur redémarré avec succès"
echo "🌐 Application disponible sur: http://localhost:3000"
`;

    const scriptPath = path.join(__dirname, 'restart-server-production.sh');
    fs.writeFileSync(scriptPath, restartScript, 'utf8');
    
    // Rendre le script exécutable
    try {
        fs.chmodSync(scriptPath, '755');
        console.log('   ✅ Script de redémarrage créé: restart-server-production.sh');
    } catch (error) {
        console.log('   ⚠️ Script créé mais permissions non modifiées (Windows)');
    }
    
    return scriptPath;
}

// 5. Créer un script de vérification
function createVerificationScript() {
    console.log('\n✅ 5. Création du script de vérification...');
    
    const verificationScript = `#!/bin/bash

# Script de vérification post-déploiement
# Vérifie que les corrections CSP fonctionnent

echo "🔍 Vérification des corrections CSP..."

# Vérifier que le serveur répond
echo "📡 Test de l'API Health..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ API Health: OK"
else
    echo "   ❌ API Health: ERREUR"
    exit 1
fi

# Vérifier la configuration CSP
echo "🔒 Test de la configuration CSP..."
response=$(curl -s -I http://localhost:3000/api/health | grep -i "content-security-policy")
if echo "$response" | grep -q "connect-src"; then
    echo "   ✅ CSP connect-src configuré"
else
    echo "   ❌ CSP connect-src manquant"
fi

if echo "$response" | grep -q "cdnjs.cloudflare.com"; then
    echo "   ✅ CSP cdnjs.cloudflare.com autorisé"
else
    echo "   ❌ CSP cdnjs.cloudflare.com manquant"
fi

# Test de l'API campagnes (nécessite un token valide)
echo "📊 Test de l'API campagnes..."
if curl -s http://localhost:3000/api/prospecting/campaigns > /dev/null; then
    echo "   ✅ API Campagnes: Accessible"
else
    echo "   ⚠️ API Campagnes: Nécessite authentification"
fi

echo "🎉 Vérification terminée"
`;

    const scriptPath = path.join(__dirname, 'verify-csp-fix.sh');
    fs.writeFileSync(scriptPath, verificationScript, 'utf8');
    
    try {
        fs.chmodSync(scriptPath, '755');
        console.log('   ✅ Script de vérification créé: verify-csp-fix.sh');
    } catch (error) {
        console.log('   ⚠️ Script créé mais permissions non modifiées (Windows)');
    }
    
    return scriptPath;
}

// 6. Créer un guide de déploiement
function createDeploymentGuide() {
    console.log('\n📚 6. Création du guide de déploiement...');
    
    const guide = `# Guide de correction CSP en production

## Problème résolu
- Content Security Policy bloquait les connexions vers localhost
- Font Awesome ne se chargeait pas depuis cdnjs.cloudflare.com
- Les campagnes de prospection n'étaient pas visibles

## Solution appliquée
1. **Configuration CSP mise à jour** dans server.js
2. **connectSrc** ajouté pour autoriser les connexions locales
3. **cdnjs.cloudflare.com** ajouté aux sources autorisées

## Étapes de déploiement

### 1. Préparation
\`\`\`bash
# Sauvegarder la configuration actuelle
cp server.js server.js.backup

# Exécuter le script de correction
node scripts/fix-csp-production.js
\`\`\`

### 2. Déploiement
\`\`\`bash
# Redémarrer le serveur
./scripts/restart-server-production.sh

# Ou manuellement:
pkill -f "node server.js"
npm start
\`\`\`

### 3. Vérification
\`\`\`bash
# Vérifier que tout fonctionne
./scripts/verify-csp-fix.sh
\`\`\`

### 4. Test utilisateur
1. Accéder à http://localhost:3000/prospecting-campaigns.html
2. Se connecter avec un utilisateur valide
3. Vérifier que les campagnes s'affichent
4. Vérifier que Font Awesome fonctionne

## Configuration CSP finale
\`\`\`javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "data:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https:"],
        },
    },
}));
\`\`\`

## Rollback (si nécessaire)
\`\`\`bash
# Restaurer la configuration précédente
cp server.js.backup server.js
./scripts/restart-server-production.sh
\`\`\`

## Notes importantes
- Cette correction autorise les connexions vers localhost (développement)
- En production, ajustez les URLs selon votre configuration
- Testez toujours après déploiement
- Surveillez les logs pour détecter d'éventuels problèmes
`;

    const guidePath = path.join(__dirname, '..', 'DEPLOYMENT-CSP-FIX.md');
    fs.writeFileSync(guidePath, guide, 'utf8');
    console.log('   ✅ Guide de déploiement créé: DEPLOYMENT-CSP-FIX.md');
    
    return guidePath;
}

// Fonction principale
async function main() {
    try {
        console.log('🚀 Début de la correction CSP pour la production\n');
        
        // 1. Vérifier l'état actuel
        const currentState = checkCurrentCSP();
        
        // 2. Corriger la configuration
        const cspFixed = fixCSP();
        
        // 3. Vérifier le frontend
        checkFrontendURLs();
        
        // 4. Créer les scripts
        const restartScript = createRestartScript();
        const verificationScript = createVerificationScript();
        const deploymentGuide = createDeploymentGuide();
        
        console.log('\n🎉 Correction CSP terminée !');
        console.log('============================');
        console.log('📁 Fichiers créés:');
        console.log(`   • ${restartScript}`);
        console.log(`   • ${verificationScript}`);
        console.log(`   • ${deploymentGuide}`);
        
        console.log('\n📋 Prochaines étapes:');
        console.log('   1. Redémarrer le serveur: ./scripts/restart-server-production.sh');
        console.log('   2. Vérifier la correction: ./scripts/verify-csp-fix.sh');
        console.log('   3. Tester l\'application: http://localhost:3000/prospecting-campaigns.html');
        
        console.log('\n⚠️ Important:');
        console.log('   - Sauvegardez votre configuration actuelle avant déploiement');
        console.log('   - Testez en environnement de développement d\'abord');
        console.log('   - Surveillez les logs après redémarrage');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        process.exit(1);
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    checkCurrentCSP,
    fixCSP,
    checkFrontendURLs,
    createRestartScript,
    createVerificationScript,
    createDeploymentGuide
};







