// Script de déploiement des corrections en production
const fs = require('fs');
const path = require('path');

console.log('🚀 Déploiement des corrections en production...\n');

// Liste des fichiers à déployer avec leurs corrections
const filesToDeploy = [
    {
        source: 'src/services/userAccessService.js',
        description: 'Service de création de comptes utilisateur corrigé'
    },
    {
        source: 'src/middleware/auth.js', 
        description: 'Middleware de permissions corrigé'
    },
    {
        source: 'public/collaborateurs.html',
        description: 'Interface avec sélecteur de rôles dynamique'
    },
    {
        source: 'public/js/photo-upload.js',
        description: 'Gestionnaire de photos avec aperçu dimensionné'
    }
];

// Vérifier que tous les fichiers source existent
console.log('📋 Vérification des fichiers source...');
let allFilesExist = true;

filesToDeploy.forEach(file => {
    if (fs.existsSync(file.source)) {
        console.log(`✅ ${file.source} - ${file.description}`);
    } else {
        console.log(`❌ ${file.source} - FICHIER MANQUANT !`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Certains fichiers source sont manquants. Déploiement annulé.');
    process.exit(1);
}

console.log('\n📝 Instructions de déploiement :');
console.log('=====================================');

console.log('\n1️⃣ **Sauvegarder les fichiers actuels en production :**');
console.log('   cd /path/to/ebvision2.0');
filesToDeploy.forEach(file => {
    const fileName = path.basename(file.source);
    const dir = path.dirname(file.source);
    console.log(`   cp ${file.source} ${file.source}.backup`);
});

console.log('\n2️⃣ **Copier les fichiers corrigés :**');
console.log('   # Depuis votre machine locale, utilisez scp ou rsync :');
filesToDeploy.forEach(file => {
    console.log(`   scp ${file.source} user@server:/path/to/ebvision2.0/${file.source}`);
});

console.log('\n3️⃣ **Redémarrer l\'application :**');
console.log('   pm2 restart eb-vision-2.0');

console.log('\n4️⃣ **Vérifier le statut :**');
console.log('   pm2 status');
console.log('   pm2 logs eb-vision-2.0 --lines 20');

console.log('\n5️⃣ **Tester les fonctionnalités :**');
console.log('   - Création de compte utilisateur (sélecteur de rôles dynamique)');
console.log('   - Permissions (plus d\'erreur 403)');
console.log('   - Aperçu des photos (dimensions contrôlées)');

console.log('\n✅ **Déploiement terminé !**');
console.log('\n💡 **Note importante :**');
console.log('   - Assurez-vous que les permissions des fichiers sont correctes');
console.log('   - Vérifiez que l\'application redémarre sans erreur');
console.log('   - Testez en production avant de valider');










