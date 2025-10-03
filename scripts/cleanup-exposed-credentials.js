#!/usr/bin/env node

/**
 * Script pour nettoyer les credentials exposés dans le code
 * Usage: node scripts/cleanup-exposed-credentials.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des credentials exposés...\n');

// Liste des fichiers à nettoyer avec leurs patterns
const filesToClean = [
    {
        path: 'public/login.html',
        patterns: [
            {
                search: /admin@trs\.com/g,
                replace: '[EMAIL_SUPPRIMÉ_POUR_SÉCURITÉ]'
            }
        ]
    },
    {
        path: 'docs/TRS-Affichage/SECURITY.md',
        patterns: [
            {
                search: /- \*\*Mot de passe\*\* : `EB@Partners`/g,
                replace: '- **Mot de passe** : `[SUPPRIMÉ_POUR_SÉCURITÉ]`'
            }
        ]
    },
    {
        path: 'docs/TRS-Affichage/deploy/auth.js',
        patterns: [
            {
                search: /if \(username === 'EB' && password === 'EB@Partners'\)/g,
                replace: "if (username === '[USERNAME_SUPPRIMÉ]' && password === '[PASSWORD_SUPPRIMÉ]')"
            }
        ]
    },
    {
        path: 'docs/TRS-Affichage/auth.js',
        patterns: [
            {
                search: /if \(username === 'EB' && password === 'EB@Partners'\)/g,
                replace: "if (username === '[USERNAME_SUPPRIMÉ]' && password === '[PASSWORD_SUPPRIMÉ]')"
            }
        ]
    }
];

// Fonction pour nettoyer un fichier
function cleanFile(filePath, patterns) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Fichier non trouvé: ${filePath}`);
        return false;
    }
    
    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        patterns.forEach(pattern => {
            if (pattern.search.test(content)) {
                content = content.replace(pattern.search, pattern.replace);
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Nettoyé: ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️  Aucun changement: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
        return false;
    }
}

// Nettoyer tous les fichiers
let cleanedCount = 0;
filesToClean.forEach(file => {
    if (cleanFile(file.path, file.patterns)) {
        cleanedCount++;
    }
});

console.log(`\n📊 Résumé:`);
console.log(`- ${cleanedCount} fichiers nettoyés`);
console.log(`- ${filesToClean.length - cleanedCount} fichiers inchangés`);

console.log(`\n🔒 SÉCURITÉ:`);
console.log(`- Les credentials exposés ont été supprimés`);
console.log(`- Vérifiez manuellement les autres fichiers si nécessaire`);
console.log(`- Ne commitez JAMAIS de credentials dans le code source`);

console.log(`\n⚠️  ATTENTION:`);
console.log(`- Certains scripts de test peuvent encore contenir des credentials`);
console.log(`- Vérifiez les fichiers dans le dossier scripts/`);
console.log(`- Utilisez des variables d'environnement pour les credentials de test`);

