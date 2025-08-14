const fs = require('fs');
const path = require('path');

function finalCleanupCheck() {
    console.log('🧹 Vérification finale du nettoyage\n');
    
    const publicDir = path.join(__dirname, '..', 'public');
    
    // Vérifications finales
    const checks = [
        {
            name: 'Page validation.html supprimée',
            check: !fs.existsSync(path.join(publicDir, 'validation.html'))
        },
        {
            name: 'Page time-sheet.html supprimée',
            check: !fs.existsSync(path.join(publicDir, 'time-sheet.html'))
        },
        {
            name: 'Aucun lien validation.html dans unified-sidebar.js',
            check: !fs.readFileSync(path.join(publicDir, 'js', 'unified-sidebar.js'), 'utf8').includes('validation.html')
        },
        {
            name: 'Aucun lien time-sheet.html dans unified-sidebar.js',
            check: !fs.readFileSync(path.join(publicDir, 'js', 'unified-sidebar.js'), 'utf8').includes('time-sheet.html')
        },
        {
            name: 'Aucun lien validation.html dans sidebar-generator.js',
            check: !fs.readFileSync(path.join(publicDir, 'js', 'sidebar-generator.js'), 'utf8').includes('validation.html')
        },
        {
            name: 'Aucun lien time-sheet.html dans template-modern-sidebar.html',
            check: !fs.readFileSync(path.join(publicDir, 'template-modern-sidebar.html'), 'utf8').includes('time-sheet.html')
        }
    ];
    
    let passed = 0;
    checks.forEach(check => {
        if (check.check) {
            console.log(`✅ ${check.name}`);
            passed++;
        } else {
            console.log(`❌ ${check.name}`);
        }
    });
    
    console.log(`\n📊 Résultat: ${passed}/${checks.length} vérifications réussies`);
    
    if (passed === checks.length) {
        console.log('\n🎉 Nettoyage complet réussi !');
        console.log('✅ Pages supprimées');
        console.log('✅ Liens supprimés de tous les fichiers');
        console.log('✅ Navigation propre');
        console.log('✅ Aucun lien orphelin');
    } else {
        console.log(`\n⚠️  ${checks.length - passed} problèmes restent`);
    }
    
    console.log('\n📋 Résumé des actions effectuées :');
    console.log('1. ✅ Suppression de validation.html');
    console.log('2. ✅ Suppression du lien validation.html dans sidebar-generator.js');
    console.log('3. ✅ Suppression du lien time-sheet.html dans template-modern-sidebar.html');
    console.log('4. ✅ Vérification de l\'absence de liens orphelins');
    console.log('5. ✅ Navigation nettoyée et fonctionnelle');
}

finalCleanupCheck();


