// Script pour déployer le code corrigé des permissions en production
const fs = require('fs');
const path = require('path');

function deployFixedPermissions() {
    console.log('🚀 Déploiement du code corrigé des permissions...\n');

    console.log('1️⃣ Vérification des fichiers à déployer...');
    
    const filesToDeploy = [
        'src/routes/permissions.js',
        'src/utils/PermissionManager.js',
        'src/middleware/auth.js'
    ];

    filesToDeploy.forEach(file => {
        if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            console.log(`   ✅ ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.log(`   ❌ ${file} - MANQUANT !`);
        }
    });

    console.log('\n2️⃣ Instructions de déploiement...');
    console.log('\n📋 ÉTAPES À SUIVRE EN PRODUCTION :');
    console.log('\n1️⃣ Arrêter l\'application :');
    console.log('   pm2 stop eb-vision-2-0');
    
    console.log('\n2️⃣ Sauvegarder les fichiers actuels :');
    console.log('   cp src/routes/permissions.js src/routes/permissions.js.backup');
    console.log('   cp src/utils/PermissionManager.js src/utils/PermissionManager.js.backup');
    console.log('   cp src/middleware/auth.js src/middleware/auth.js.backup');
    
    console.log('\n3️⃣ Copier les fichiers corrigés depuis votre machine locale :');
    console.log('   # Utilisez FTP/SFTP ou copiez-collez le contenu de :');
    console.log('   - src/routes/permissions.js');
    console.log('   - src/utils/PermissionManager.js');
    console.log('   - src/middleware/auth.js');
    
    console.log('\n4️⃣ Vérifier que les fichiers sont bien copiés :');
    console.log('   ls -la src/routes/permissions.js');
    console.log('   ls -la src/utils/PermissionManager.js');
    console.log('   ls -la src/middleware/auth.js');
    
    console.log('\n5️⃣ Redémarrer l\'application :');
    console.log('   pm2 start ecosystem.config.js --env production');
    
    console.log('\n6️⃣ Vérifier le statut :');
    console.log('   pm2 status');
    console.log('   pm2 logs eb-vision-2-0 --lines 10');
    
    console.log('\n🎯 DÉPLOIEMENT TERMINÉ');
    console.log('\n💡 Après le déploiement, testez à nouveau les toggles de permissions !');
}

deployFixedPermissions();








