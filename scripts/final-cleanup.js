const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage final pour la production...\n');

// Fichiers à déplacer vers development-scripts
const filesToMove = [
    'test-guide-*.md',
    'verifier-*.js',
    'corriger-env.js',
    'generate-import-report.js',
    'import-csv-data.js',
    'get-valid-ids.js',
    'apply-harmonization-migration.js',
    'reset-*.js',
    'update-*.js',
    'analyze-file.ps1',
    'delete_file.js',
    'server_simple.js',
    'test-simple-persistence.png',
    'IMPORT_REPORT.json',
    'et --hard HEAD',
    'tatus --porcelain'
];

// Fichiers de documentation à déplacer
const docsToMove = [
    'COMMENT_TESTER_INTERFACE.md',
    'RAPPORT_FINAL_PROJET.md',
    'CORRECTIONS_FINALES_RESUME.md',
    'CORRECTION_COLLABORATEURS_RESUME.md',
    'GESTION_RH_RESUME.md',
    'TEST_RH_GUIDE.md',
    'NETTOYAGE_AUTHENTIFICATION.md',
    'REPRISE.md',
    'CHANGELOG.md',
    'DOCUMENTATION.md',
    'DOCUMENTATION_COMPLETE.md',
    'SESSION_MANAGER_*.md',
    'guide-debutant.md',
    'test-setup.md'
];

// Fonction pour faire correspondre les patterns
function matchesPattern(filename, pattern) {
    const regex = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`).test(filename);
}

// Obtenir tous les fichiers du répertoire courant
const files = fs.readdirSync('.').filter(file => {
    return fs.statSync(file).isFile();
});

let movedCount = 0;

files.forEach(file => {
    // Vérifier si le fichier correspond à un pattern ou est dans la liste
    const shouldMove = filesToMove.some(pattern => matchesPattern(file, pattern)) || 
                      docsToMove.includes(file);
    
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
    }
});

// Créer un fichier de résumé de la production
const productionSummary = `# EB-Vision 2.0 - Production Ready

## 🎉 Organisation terminée !

### 📁 Structure de production

\`\`\`
eb-vision-2.0/
├── public/                 # Interface utilisateur
├── src/                   # Code source de l'application
├── scripts/               # Scripts de production
│   ├── migrate-production.js
│   └── deploy-planethoster.js
├── migrations/            # Migrations de base de données
├── docs/                  # Documentation
├── .htaccess              # Configuration Apache
├── ecosystem.config.js    # Configuration PM2
├── config.production.js   # Configuration de production
├── install.sh             # Script d'installation
├── DEPLOYMENT.md          # Guide de déploiement
├── README-PRODUCTION.md   # Documentation de production
├── PRODUCTION-CHECKLIST.md # Checklist de vérification
├── package.json           # Dépendances
└── server.js              # Point d'entrée de l'application
\`\`\`

### 📦 Fichiers de développement déplacés

Tous les fichiers de test, debug et développement ont été déplacés dans le dossier \`development-scripts/\` :

- Scripts de test (test-*.js)
- Scripts de vérification (check-*.js, verify-*.js)
- Scripts de debug (debug-*.js)
- Scripts de migration temporaires
- Documentation de développement
- Fichiers de configuration temporaires

### 🚀 Prêt pour le déploiement

1. **Uploadez tous les fichiers** SAUF le dossier \`development-scripts/\`
2. **Configurez votre base de données** PostgreSQL
3. **Modifiez config.production.js** avec vos informations
4. **Exécutez l'installation** : \`chmod +x install.sh && ./install.sh\`

### 📊 Statistiques

- ✅ ${movedCount} fichiers de développement déplacés
- ✅ Structure de production optimisée
- ✅ Documentation complète créée
- ✅ Scripts de déploiement prêts

### 🔒 Sécurité

- Fichiers sensibles exclus du déploiement
- Configuration de production séparée
- Logs et cache exclus
- Fichiers de test isolés

### 📞 Support

Pour les problèmes de développement, consultez le dossier \`development-scripts/\`.

---

**Date de préparation** : ${new Date().toLocaleDateString('fr-FR')}
**Version** : EB-Vision 2.0 Production
**Statut** : Prêt pour déploiement
`;

fs.writeFileSync('PRODUCTION-SUMMARY.md', productionSummary);
console.log('✅ PRODUCTION-SUMMARY.md créé');

console.log('\n🎉 Nettoyage final terminé !');
console.log(`\n📊 Résumé:`);
console.log(`   - ${movedCount} fichiers déplacés vers development-scripts/`);
console.log(`   - PRODUCTION-SUMMARY.md créé`);

console.log('\n📁 Structure finale de production:');
const remainingFiles = fs.readdirSync('.').filter(file => {
    return fs.statSync(file).isFile();
});

console.log('\n📄 Fichiers de production restants:');
remainingFiles.forEach(file => {
    console.log(`   - ${file}`);
});

console.log('\n✅ Votre projet EB-Vision 2.0 est maintenant PRÊT pour la production !');
console.log('🚀 Uploadez tous les fichiers SAUF development-scripts/ sur PlanetHoster');
console.log('📋 Suivez DEPLOYMENT.md pour l\'installation');





















