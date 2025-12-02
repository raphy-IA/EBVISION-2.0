#!/usr/bin/env node

/**
 * Script pour ajouter page-permissions.js à tous les dashboards
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const dashboardFiles = [
    'dashboard.html',
    'dashboard-chargeabilite.html',
    'dashboard-direction.html',
    'dashboard-equipe.html',
    'dashboard-optimise.html',
    'dashboard-personnel.html',
    'dashboard-recouvrement.html',
    'dashboard-rentabilite.html'
];

console.log('\n🔧 Ajout de page-permissions.js aux dashboards...\n');

let modified = 0;
let skipped = 0;

dashboardFiles.forEach(file => {
    const filePath = path.join(publicDir, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} - Fichier non trouvé`);
        skipped++;
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Vérifier si page-permissions.js est déjà présent
    if (content.includes('page-permissions.js')) {
        console.log(`✓  ${file} - Déjà configuré`);
        skipped++;
        return;
    }

    // Chercher la ligne menu-permissions.js et ajouter page-permissions.js juste après
    const menuPermissionsLine = /(<script src="js\/menu-permissions\.js"><\/script>)/;

    if (menuPermissionsLine.test(content)) {
        content = content.replace(
            menuPermissionsLine,
            '$1\n    <script src="/js/page-permissions.js"></script>'
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file} - Script ajouté`);
        modified++;
    } else {
        console.log(`⚠️  ${file} - Ligne menu-permissions.js non trouvée`);
        skipped++;
    }
});

console.log(`\n📊 Résumé :`);
console.log(`   ✅ Modifiés : ${modified}`);
console.log(`   ⏭️  Ignorés  : ${skipped}`);
console.log('');

if (modified > 0) {
    console.log('✅ Modification terminée! Rechargez les dashboards pour appliquer les changements.\n');
}
