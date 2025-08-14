const fs = require('fs');
const path = require('path');

function quickSidebarCheck() {
    console.log('🧪 Vérification rapide de la sidebar\n');
    
    const sidebarPath = path.join(__dirname, '..', 'public', 'js', 'unified-sidebar.js');
    const content = fs.readFileSync(sidebarPath, 'utf8');
    
    // Vérifications clés
    const checks = [
        { name: 'Lien validation.html supprimé', check: !content.includes('validation.html') },
        { name: 'Section FEUILLES DE TEMPS présente', check: content.includes('FEUILLES DE TEMPS') },
        { name: 'Section ACTIVITÉS présente', check: content.includes('ACTIVITÉS') },
        { name: 'Lien time-sheet-modern.html présent', check: content.includes('time-sheet-modern.html') },
        { name: 'Lien time-sheet-approvals.html présent', check: content.includes('time-sheet-approvals.html') },
        { name: 'Lien activites-internes.html présent', check: content.includes('activites-internes.html') },
        { name: 'Pas de liens orphelins time-entries.html', check: !content.includes('time-entries.html') },
        { name: 'Pas de liens orphelins activities.html', check: !content.includes('activities.html') },
        { name: 'Pas de liens orphelins feuilles-temps.html', check: !content.includes('feuilles-temps.html') },
        { name: 'Pas de liens orphelins payments.html', check: !content.includes('payments.html') }
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
    
    console.log(`\n📊 Résultat: ${passed}/${checks.length} tests réussis`);
    
    if (passed === checks.length) {
        console.log('\n🎉 La sidebar a été corrigée avec succès !');
    } else {
        console.log(`\n⚠️  ${checks.length - passed} problèmes restent`);
    }
}

quickSidebarCheck();


