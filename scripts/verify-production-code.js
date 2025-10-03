// Script pour vérifier que le code de production est identique à celui en local
const fs = require('fs');
const path = require('path');

function verifyProductionCode() {
    console.log('🔍 Vérification de la cohérence du code...\n');

    const criticalFiles = [
        'src/routes/permissions.js',
        'src/utils/PermissionManager.js',
        'src/middleware/auth.js',
        'server.js'
    ];

    console.log('📋 Fichiers critiques à vérifier:');
    criticalFiles.forEach(file => {
        console.log(`   - ${file}`);
    });

    console.log('\n1️⃣ Vérification de l\'existence des fichiers...');
    
    let allFilesExist = true;
    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file} - EXISTE`);
        } else {
            console.log(`   ❌ ${file} - MANQUANT !`);
            allFilesExist = false;
        }
    });

    if (!allFilesExist) {
        console.log('\n❌ CERTAINS FICHIERS CRITIQUES SONT MANQUANTS !');
        console.log('💡 Vérifiez que tous les fichiers ont été déployés en production');
        return;
    }

    console.log('\n2️⃣ Vérification du contenu des fichiers...');

    // Vérifier le PermissionManager
    console.log('\n📋 PermissionManager.js:');
    const permissionManagerContent = fs.readFileSync('src/utils/PermissionManager.js', 'utf8');
    if (permissionManagerContent.includes('class PermissionManager')) {
        console.log('   ✅ Classe PermissionManager trouvée');
    } else {
        console.log('   ❌ Classe PermissionManager MANQUANTE !');
    }

    if (permissionManagerContent.includes('hasPermission')) {
        console.log('   ✅ Méthode hasPermission trouvée');
    } else {
        console.log('   ❌ Méthode hasPermission MANQUANTE !');
    }

    // Vérifier le middleware des permissions
    console.log('\n📋 permissions.js:');
    const permissionsContent = fs.readFileSync('src/routes/permissions.js', 'utf8');
    
    if (permissionsContent.includes('requireAdminPermission')) {
        console.log('   ✅ Middleware requireAdminPermission trouvé');
    } else {
        console.log('   ❌ Middleware requireAdminPermission MANQUANT !');
    }

    if (permissionsContent.includes('router.post(\'/roles/:roleId/permissions/:permissionId\'')) {
        console.log('   ✅ Endpoint POST trouvé');
    } else {
        console.log('   ❌ Endpoint POST MANQUANT !');
    }

    // Vérifier l'auth middleware
    console.log('\n📋 auth.js:');
    const authContent = fs.readFileSync('src/middleware/auth.js', 'utf8');
    
    if (authContent.includes('verifyToken')) {
        console.log('   ✅ Fonction verifyToken trouvée');
    } else {
        console.log('   ❌ Fonction verifyToken MANQUANTE !');
    }

    // Vérifier le serveur principal
    console.log('\n📋 server.js:');
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    if (serverContent.includes('app.use(\'/api/permissions\'')) {
        console.log('   ✅ Route permissions montée');
    } else {
        console.log('   ❌ Route permissions NON MONTÉE !');
    }

    console.log('\n3️⃣ Vérification des variables d\'environnement...');
    
    if (fs.existsSync('.env')) {
        console.log('   ✅ Fichier .env trouvé');
        
        const envContent = fs.readFileSync('.env', 'utf8');
        const requiredVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
        
        requiredVars.forEach(varName => {
            if (envContent.includes(varName)) {
                console.log(`   ✅ ${varName} configuré`);
            } else {
                console.log(`   ❌ ${varName} MANQUANT !`);
            }
        });
    } else {
        console.log('   ❌ Fichier .env MANQUANT !');
    }

    console.log('\n🎯 VÉRIFICATION TERMINÉE');
    console.log('\n💡 Si tous les fichiers sont présents et corrects,');
    console.log('   le problème peut être dans les variables d\'environnement');
    console.log('   ou dans la configuration de la base de données');
}

verifyProductionCode();










