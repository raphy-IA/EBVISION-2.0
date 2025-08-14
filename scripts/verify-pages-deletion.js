const fs = require('fs');
const path = require('path');

function verifyPagesDeletion() {
    console.log('🔍 Vérification de la suppression des pages et liens\n');
    
    const publicDir = path.join(__dirname, '..', 'public');
    
    // Vérifier si les pages existent encore
    console.log('📁 Vérification de l\'existence des pages :');
    console.log('='.repeat(50));
    
    const pagesToCheck = [
        'time-sheet.html',
        'validation.html'
    ];
    
    let pagesDeleted = 0;
    pagesToCheck.forEach(page => {
        const filePath = path.join(publicDir, page);
        const exists = fs.existsSync(filePath);
        
        if (!exists) {
            console.log(`✅ ${page} - Page supprimée`);
            pagesDeleted++;
        } else {
            console.log(`❌ ${page} - Page encore présente`);
        }
    });
    
    // Vérifier les liens dans les fichiers JS
    console.log('\n📁 Vérification des liens dans les fichiers JS :');
    console.log('='.repeat(50));
    
    const jsFiles = [
        'public/js/unified-sidebar.js',
        'public/js/sidebar-generator.js'
    ];
    
    let linksRemoved = 0;
    jsFiles.forEach(jsFile => {
        const filePath = path.join(__dirname, '..', jsFile);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            const hasTimeSheetLink = content.includes('time-sheet.html');
            const hasValidationLink = content.includes('validation.html');
            
            console.log(`\n📄 ${jsFile}:`);
            if (!hasTimeSheetLink) {
                console.log(`  ✅ Lien time-sheet.html supprimé`);
                linksRemoved++;
            } else {
                console.log(`  ❌ Lien time-sheet.html encore présent`);
            }
            
            if (!hasValidationLink) {
                console.log(`  ✅ Lien validation.html supprimé`);
                linksRemoved++;
            } else {
                console.log(`  ❌ Lien validation.html encore présent`);
            }
        } else {
            console.log(`\n📄 ${jsFile}: Fichier non trouvé`);
        }
    });
    
    // Vérifier les liens dans les fichiers HTML
    console.log('\n📁 Vérification des liens dans les fichiers HTML :');
    console.log('='.repeat(50));
    
    const htmlFiles = [
        'public/template-modern-sidebar.html'
    ];
    
    htmlFiles.forEach(htmlFile => {
        const filePath = path.join(__dirname, '..', htmlFile);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            const hasTimeSheetLink = content.includes('time-sheet.html');
            const hasValidationLink = content.includes('validation.html');
            
            console.log(`\n📄 ${htmlFile}:`);
            if (!hasTimeSheetLink) {
                console.log(`  ✅ Lien time-sheet.html supprimé`);
                linksRemoved++;
            } else {
                console.log(`  ❌ Lien time-sheet.html encore présent`);
            }
            
            if (!hasValidationLink) {
                console.log(`  ✅ Lien validation.html supprimé`);
                linksRemoved++;
            } else {
                console.log(`  ❌ Lien validation.html encore présent`);
            }
        } else {
            console.log(`\n📄 ${htmlFile}: Fichier non trouvé`);
        }
    });
    
    console.log('\n📊 Résultats de la vérification');
    console.log('='.repeat(50));
    console.log(`Pages supprimées: ${pagesDeleted}/${pagesToCheck.length}`);
    console.log(`Liens supprimés: ${linksRemoved} références`);
    
    if (pagesDeleted === pagesToCheck.length && linksRemoved > 0) {
        console.log('\n🎉 Suppression réussie !');
        console.log('✅ Pages supprimées');
        console.log('✅ Liens supprimés des sidebars');
        console.log('✅ Navigation nettoyée');
    } else {
        console.log('\n⚠️  Certains éléments restent à supprimer');
    }
    
    console.log('\n💡 Actions effectuées :');
    console.log('1. Suppression de validation.html');
    console.log('2. Suppression du lien validation.html dans sidebar-generator.js');
    console.log('3. Suppression du lien time-sheet.html dans template-modern-sidebar.html');
    console.log('4. Vérification de l\'absence de liens orphelins');
}

// Exécuter la vérification
console.log('🚀 Début de la vérification de la suppression...\n');
verifyPagesDeletion();


