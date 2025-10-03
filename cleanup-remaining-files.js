const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des fichiers restants...\n');

// Patterns de fichiers à déplacer
const patterns = [
    'test-*.js',
    'check-*.js',
    'debug-*.js',
    'verify-*.js',
    'fix-*.js',
    'add-*.js',
    'create-*.js',
    'run-*.js',
    'clean-*.js',
    'restore-*.js',
    'force-*.js',
    'quick-*.js',
    'simulate-*.js',
    'find-*.js',
    'send-*.js',
    'setup-*.js',
    'diagnostic-*.js',
    'GUIDE_*.md',
    'RESOLUTION_*.md',
    'RESUME_*.md',
    'AMELIORATIONS_*.md',
    'OPTIMISATIONS_*.md',
    'FONCTIONNALITE_*.md',
    '*.sql'
];

// Fonction pour faire correspondre les patterns
function matchesPattern(filename, pattern) {
    const regex = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`).test(filename);
}

// Obtenir tous les fichiers du répertoire courant
const files = fs.readdirSync('.').filter(file => {
    return fs.statSync(file).isFile() && file !== 'server.js' && file !== 'package.json' && file !== 'package-lock.json';
});

let movedCount = 0;
let skippedCount = 0;

files.forEach(file => {
    // Vérifier si le fichier correspond à un pattern
    const shouldMove = patterns.some(pattern => matchesPattern(file, pattern));
    
    if (shouldMove) {
        try {
            const sourcePath = file;
            const destPath = path.join('development-scripts', file);
            
            // Si le fichier de destination existe déjà, le supprimer
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            
            fs.renameSync(sourcePath, destPath);
            console.log(`✅ Déplacé: ${file}`);
            movedCount++;
        } catch (error) {
            console.log(`❌ Erreur lors du déplacement de ${file}: ${error.message}`);
        }
    } else {
        // Vérifier si c'est un fichier de configuration de production
        const productionFiles = [
            '.htaccess',
            'ecosystem.config.js',
            'install.sh',
            'DEPLOYMENT.md',
            'README-PRODUCTION.md',
            'PRODUCTION-CHECKLIST.md',
            '.gitignore',
            'server.js',
            'package.json',
            'package-lock.json'
        ];
        
        if (!productionFiles.includes(file)) {
            console.log(`⚠️ Fichier non déplacé: ${file}`);
            skippedCount++;
        }
    }
});

console.log('\n🎉 Nettoyage terminé !');
console.log(`\n📊 Résumé:`);
console.log(`   - ${movedCount} fichiers déplacés vers development-scripts/`);
console.log(`   - ${skippedCount} fichiers non déplacés`);

console.log('\n📁 Structure finale de production:');
const remainingFiles = fs.readdirSync('.').filter(file => {
    return fs.statSync(file).isFile();
});

console.log('\n📄 Fichiers restants à la racine:');
remainingFiles.forEach(file => {
    console.log(`   - ${file}`);
});

console.log('\n✅ Votre projet est maintenant prêt pour la production !');
console.log('🚀 Uploadez tous les fichiers SAUF development-scripts/');











