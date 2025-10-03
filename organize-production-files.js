const fs = require('fs');
const path = require('path');

console.log('🧹 Organisation des fichiers pour la production...\n');

// Créer le dossier development-scripts s'il n'existe pas
if (!fs.existsSync('development-scripts')) {
    fs.mkdirSync('development-scripts');
}

// Liste des fichiers à déplacer vers development-scripts
const filesToMove = [
    // Scripts de test
    'test-validate-stage.js',
    'test-api.js',
    'check-db-structure.js',
    'check-tables.js',
    'check-opportunity-simple.js',
    'fix-existing-opportunities.js',
    'check-specific-opportunity.js',
    'test-simple.js',
    'debug-opportunity-data.js',
    'check-opportunity-fields.js',
    'test-opportunity-modal.js',
    'check-stages-structure.js',
    'test-validation.js',
    'check-opportunity-types-config.js',
    'check-tables-structure.js',
    'check-opportunity-types-simple.js',
    'debug-opportunity-requirements.js',
    'check-opportunities-structure.js',
    'fix-existing-opportunities-requirements.js',
    'check-actions-structure.js',
    'check-vente-standard-opportunity.js',
    'add-consulting-requirements.js',
    'test-consulting-config.js',
    'check-stage-templates-structure.js',
    'check-consulting-types.js',
    'test-sidebar.js',
    'fix-sidebar.js',
    'assign-manager.js',
    
    // Scripts de vérification et debug
    'verifier-token-navigateur.js',
    'verifier-simple.js',
    'verifier-installation.js',
    'verifier-env.js',
    'diagnostic-auth.js',
    'debug-server-logs.js',
    'quick-fix-auth.js',
    'fix-auth-system.js',
    'creer-env.js',
    
    // Scripts de migration et setup
    'execute-permissions-migration.js',
    'clean-permissions-tables.js',
    'migrate-user-roles-with-constraint-fix.js',
    'update-users-role-constraint.js',
    'add-menu-permissions.js',
    'test-menu-permissions.js',
    'add-granular-menu-permissions.js',
    'test-granular-permissions.js',
    'add-menu-permissions-to-pages.js',
    'add-section-main-permissions.js',
    'check-section-permissions.js',
    'add-menu-permissions-to-all-pages.js',
    'test-business-unit-access.js',
    'add-explicit-bu-access.js',
    
    // Scripts de test API
    'test-api-with-real-user.js',
    'test-api-filtering.js',
    'test-data-filtering.js',
    'check-bu-data-distribution.js',
    'check-user-bu-access.js',
    'debug-bu-access-issue.js',
    'verify-deployment.js',
    
    // Scripts de configuration
    'config.production.js',
    '.gitignore.production'
];

// Déplacer les fichiers
let movedCount = 0;
let skippedCount = 0;

filesToMove.forEach(file => {
    if (fs.existsSync(file)) {
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
        console.log(`⚠️ Fichier non trouvé: ${file}`);
        skippedCount++;
    }
});

// Créer un fichier .gitignore pour la production
const productionGitignore = `# Fichiers de développement (non inclus en production)
development-scripts/

# Fichiers de configuration sensibles
.env
.env.production
.env.local

# Logs
logs/
*.log
npm-debug.log*

# Dossiers de build
node_modules/
dist/
build/

# Fichiers temporaires
*.tmp
*.temp
.cache/

# Fichiers de sauvegarde
*.bak
*.backup

# Fichiers de PM2
.pm2/

# Fichiers de base de données
*.sql
*.db

# Fichiers d'upload
uploads/

# Fichiers de test
test/
tests/
__tests__/
*.test.js
*.spec.js

# Fichiers de couverture
coverage/

# Fichiers IDE
.vscode/
.idea/
*.swp
*.swo

# Fichiers OS
.DS_Store
Thumbs.db
`;

fs.writeFileSync('.gitignore', productionGitignore);
console.log('✅ Fichier .gitignore de production créé');

// Créer un fichier README pour la production
const productionReadme = `# EB-Vision 2.0 - Production

## 🚀 Déploiement

Cette version est optimisée pour la production. Tous les fichiers de développement et de test ont été déplacés dans le dossier \`development-scripts/\`.

## 📁 Structure de production

\`\`\`
eb-vision-2.0/
├── public/                 # Fichiers statiques
├── src/                   # Code source de l'application
├── scripts/               # Scripts de production uniquement
│   ├── migrate-production.js
│   └── deploy-planethoster.js
├── .htaccess              # Configuration Apache
├── ecosystem.config.js    # Configuration PM2
├── install.sh             # Script d'installation
├── DEPLOYMENT.md          # Documentation de déploiement
└── package.json           # Dépendances
\`\`\`

## 🔧 Installation

1. Uploadez tous les fichiers sur votre serveur
2. Configurez votre base de données PostgreSQL
3. Modifiez \`config.production.js\` avec vos informations
4. Exécutez: \`chmod +x install.sh && ./install.sh\`

## 📊 Monitoring

- \`pm2 monit\` - Surveiller l'application
- \`pm2 logs eb-vision-2.0\` - Voir les logs
- \`pm2 restart eb-vision-2.0\` - Redémarrer

## 🔒 Sécurité

- Changez le JWT_SECRET en production
- Utilisez HTTPS
- Limitez les accès à la base de données
- Surveillez les logs régulièrement

## 📞 Support

Pour les problèmes de développement, consultez le dossier \`development-scripts/\`.
`;

fs.writeFileSync('README-PRODUCTION.md', productionReadme);
console.log('✅ README de production créé');

// Créer un fichier de vérification des fichiers de production
const productionChecklist = `# Checklist de fichiers pour la production

## ✅ Fichiers essentiels (DOIT être présent)

### Configuration
- [ ] package.json
- [ ] ecosystem.config.js
- [ ] .htaccess
- [ ] install.sh
- [ ] DEPLOYMENT.md

### Code source
- [ ] server.js
- [ ] src/ (dossier complet)
- [ ] public/ (dossier complet)

### Scripts de production
- [ ] scripts/migrate-production.js
- [ ] scripts/deploy-planethoster.js

## ❌ Fichiers à NE PAS inclure

### Développement
- [ ] development-scripts/ (tout le dossier)
- [ ] test-*.js
- [ ] check-*.js
- [ ] debug-*.js
- [ ] verify-*.js
- [ ] fix-*.js
- [ ] add-*.js

### Configuration locale
- [ ] .env
- [ ] .env.local
- [ ] config.production.js (à configurer sur le serveur)

### Logs et cache
- [ ] logs/
- [ ] node_modules/
- [ ] .cache/
- [ ] *.log

## 📋 Vérification avant upload

1. ✅ Tous les fichiers de test sont dans development-scripts/
2. ✅ Le dossier development-scripts/ n'est pas uploadé
3. ✅ Les fichiers de configuration sont prêts
4. ✅ Les permissions sont correctes
5. ✅ Le .gitignore est configuré

## 🚀 Upload recommandé

\`\`\`bash
# Créer un archive de production
tar -czf eb-vision-2.0-production.tar.gz \\
  --exclude='development-scripts' \\
  --exclude='node_modules' \\
  --exclude='logs' \\
  --exclude='.env' \\
  --exclude='*.log' \\
  .
\`\`\`
`;

fs.writeFileSync('PRODUCTION-CHECKLIST.md', productionChecklist);
console.log('✅ Checklist de production créée');

console.log('\n🎉 Organisation terminée !');
console.log(`\n📊 Résumé:`);
console.log(`   - ${movedCount} fichiers déplacés vers development-scripts/`);
console.log(`   - ${skippedCount} fichiers non trouvés`);
console.log(`   - .gitignore de production créé`);
console.log(`   - README-PRODUCTION.md créé`);
console.log(`   - PRODUCTION-CHECKLIST.md créé`);

console.log('\n📁 Structure finale:');
console.log('   ✅ Fichiers de production: prêts pour l\'upload');
console.log('   📂 development-scripts/: contient tous les fichiers de test');
console.log('   📋 Documentation: README-PRODUCTION.md et PRODUCTION-CHECKLIST.md');

console.log('\n🚀 Pour déployer:');
console.log('   1. Vérifiez PRODUCTION-CHECKLIST.md');
console.log('   2. Uploadez tous les fichiers SAUF development-scripts/');
console.log('   3. Suivez DEPLOYMENT.md pour l\'installation');











