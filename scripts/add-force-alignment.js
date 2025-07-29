const fs = require('fs');
const path = require('path');

console.log('🔧 Ajout du CSS force-alignment...');

const publicDir = path.join(__dirname, '../public');

function addForceAlignment(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            addForceAlignment(filePath);
        } else if (file.endsWith('.html')) {
            try {
                console.log(`📄 ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                let updated = false;
                
                // Ajouter le CSS force-alignment après les autres CSS
                if (!content.includes('force-alignment.css')) {
                    const headEnd = content.indexOf('</head>');
                    if (headEnd !== -1) {
                        const forceCSS = `
    <link href="/css/force-alignment.css" rel="stylesheet">
`;
                        content = content.slice(0, headEnd) + forceCSS + content.slice(headEnd);
                        updated = true;
                    }
                }
                
                if (updated) {
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log(`✅ Corrigé: ${file}`);
                } else {
                    console.log(`ℹ️  OK: ${file}`);
                }
            } catch (error) {
                console.error(`❌ Erreur: ${file} - ${error.message}`);
            }
        }
    });
}

addForceAlignment(publicDir);
console.log('✅ CSS force-alignment ajouté !');
console.log('');
console.log('🎯 Corrections appliquées:');
console.log('   - CSS force-alignment pour éliminer le décalage');
console.log('   - Reset complet des marges et paddings');
console.log('   - Alignement parfait sidebar/contenu');
console.log('   - Largeur fixe 250px pour la sidebar');
console.log('');
console.log('🌐 Testez maintenant sur http://localhost:3000'); 