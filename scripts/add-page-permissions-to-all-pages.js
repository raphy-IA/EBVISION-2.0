#!/usr/bin/env node

/**
 * Script pour ajouter page-permissions.js à toutes les pages HTML de l'application
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

console.log('\n🔧 Ajout de page-permissions.js à toutes les pages HTML...\n');

// Pages à exclure (login, logout, etc.)
const excludedPages = [
    'login.html',
    'logout.html',
    'maintenance.html',
    'index.html'
];

// Trouver tous les fichiers HTML
const allFiles = fs.readdirSync(publicDir);
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

let modified = 0;
let skipped = 0;
let alreadyHave = 0;

htmlFiles.forEach(fileName => {
    const filePath = path.join(publicDir, fileName);

    // Ignorer les pages exclues
    if (excludedPages.includes(fileName)) {
        console.log(`⏭️  ${fileName} - Page exclue (pas de protection nécessaire)`);
        skipped++;
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Vérifier si page-permissions.js est déjà présent
    if (content.includes('page-permissions.js')) {
        console.log(`✓  ${fileName} - Déjà configuré`);
        alreadyHave++;
        return;
    }

    // Chercher où insérer le script (après auth.js ou menu-permissions.js)
    const patterns = [
        { regex: /(<script src="js\/menu-permissions\.js"><\/script>)/, name: 'menu-permissions.js' },
        { regex: /(<script src="\/js\/menu-permissions\.js"><\/script>)/, name: '/js/menu-permissions.js' },
        { regex: /(<script src="js\/auth\.js"><\/script>)/, name: 'auth.js' },
        { regex: /(<script src="\/js\/auth\.js"><\/script>)/, name: '/js/auth.js' },
        { regex: /(<script src="js\/global-auth\.js"><\/script>)/, name: 'global-auth.js' }
    ];

    let inserted = false;
    for (const { regex, name } of patterns) {
        if (regex.test(content)) {
            content = content.replace(
                regex,
                '$1\n    <script src="/js/page-permissions.js"></script>'
            );
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${fileName} - Script ajouté après ${name}`);
            modified++;
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        console.log(`⚠️  ${fileName} - Aucun point d'insertion trouvé`);
        skipped++;
    }
});

console.log(`\n📊 Résumé :`);
console.log(`   ✅ Ajoutés     : ${modified}`);
console.log(`   ✓  Déjà présent: ${alreadyHave}`);
console.log(`   ⏭️  Ignorés    : ${skipped}`);
console.log(`   📄 Total       : ${htmlFiles.length}`);
console.log('');

if (modified > 0) {
    console.log('✅ Modification terminée! Les pages auront maintenant la protection par permissions.\n');
}
