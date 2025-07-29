const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DES CORRECTIONS APPLIQUÉES');
console.log('===========================================');

const publicDir = path.join(__dirname, '../public');

function verifyFixes(dir) {
    const files = fs.readdirSync(dir);
    let totalFiles = 0;
    let correctedFiles = 0;
    let issues = [];
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            const subResult = verifyFixes(filePath);
            totalFiles += subResult.totalFiles;
            correctedFiles += subResult.correctedFiles;
            issues = issues.concat(subResult.issues);
        } else if (file.endsWith('.html')) {
            totalFiles++;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                let fileCorrected = true;
                let fileIssues = [];
                
                // Vérifier les CSS requis
                const requiredCSS = [
                    'sidebar.css',
                    'sidebar-fixes.css',
                    'force-alignment.css'
                ];
                
                requiredCSS.forEach(css => {
                    if (!content.includes(css)) {
                        fileCorrected = false;
                        fileIssues.push(`CSS manquant: ${css}`);
                    }
                });
                
                // Vérifier le script sidebar.js
                if (!content.includes('sidebar.js')) {
                    fileCorrected = false;
                    fileIssues.push('Script manquant: sidebar.js');
                }
                
                // Vérifier la structure main-content
                if (content.includes('sidebar-container') && !content.includes('main-content')) {
                    fileCorrected = false;
                    fileIssues.push('Structure main-content manquante');
                }
                
                // Vérifier les styles inline
                if (!content.includes('margin-left: 250px')) {
                    fileCorrected = false;
                    fileIssues.push('Styles inline manquants');
                }
                
                if (fileCorrected) {
                    correctedFiles++;
                    console.log(`✅ ${file} - OK`);
                } else {
                    console.log(`❌ ${file} - Problèmes:`);
                    fileIssues.forEach(issue => {
                        console.log(`   - ${issue}`);
                    });
                    issues.push({ file, issues: fileIssues });
                }
                
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification de ${file}: ${error.message}`);
                issues.push({ file, issues: ['Erreur de lecture'] });
            }
        }
    });
    
    return { totalFiles, correctedFiles, issues };
}

const result = verifyFixes(publicDir);

console.log('');
console.log('📊 RÉSULTATS DE LA VÉRIFICATION:');
console.log('================================');
console.log(`📁 Fichiers HTML traités: ${result.totalFiles}`);
console.log(`✅ Fichiers correctement corrigés: ${result.correctedFiles}`);
console.log(`❌ Fichiers avec problèmes: ${result.issues.length}`);
console.log(`📈 Taux de réussite: ${Math.round((result.correctedFiles / result.totalFiles) * 100)}%`);

if (result.issues.length > 0) {
    console.log('');
    console.log('🚨 PROBLÈMES DÉTECTÉS:');
    result.issues.forEach(issue => {
        console.log(`📄 ${issue.file}:`);
        issue.issues.forEach(problem => {
            console.log(`   - ${problem}`);
        });
    });
} else {
    console.log('');
    console.log('🎉 TOUTES LES CORRECTIONS ONT ÉTÉ APPLIQUÉES AVEC SUCCÈS !');
}

console.log('');
console.log('🌐 TESTEZ L\'APPLICATION:');
console.log('   http://localhost:3000');
console.log('');
console.log('🔍 VÉRIFIEZ VISUELLEMENT:');
console.log('   - Plus de décalage entre sidebar et contenu');
console.log('   - Sidebar fait exactement 250px de large');
console.log('   - Contenu aligné parfaitement');
console.log('   - Responsive design fonctionnel'); 