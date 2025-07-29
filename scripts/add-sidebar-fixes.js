const fs = require('fs');
const path = require('path');

console.log('🔧 Ajout des corrections CSS pour la sidebar...');

// Fonction pour ajouter les corrections CSS
function addFixes(filePath) {
    try {
        console.log(`📄 Traitement de: ${path.basename(filePath)}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // Ajouter le fichier CSS de corrections après le CSS sidebar principal
        if (content.includes('sidebar.css') && !content.includes('sidebar-fixes.css')) {
            const sidebarCSSIndex = content.indexOf('sidebar.css');
            const headEnd = content.indexOf('</head>');
            
            if (headEnd !== -1) {
                const fixesCSS = `
    <link href="/css/sidebar-fixes.css" rel="stylesheet">
`;
                content = content.slice(0, headEnd) + fixesCSS + content.slice(headEnd);
                updated = true;
            }
        }

        // Écrire le fichier
        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Corrigé: ${path.basename(filePath)}`);
        } else {
            console.log(`ℹ️  OK: ${path.basename(filePath)}`);
        }

    } catch (error) {
        console.error(`❌ Erreur: ${path.basename(filePath)} - ${error.message}`);
    }
}

// Traiter tous les fichiers HTML
const publicDir = path.join(__dirname, '../public');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith('.html')) {
            addFixes(filePath);
        }
    });
}

console.log('📁 Scan des fichiers HTML...');
processDirectory(publicDir);
console.log('✅ Corrections CSS ajoutées !');
console.log('');
console.log('🎯 Corrections appliquées:');
console.log('   - Largeur sidebar forcée à 250px');
console.log('   - Contenu principal aligné correctement');
console.log('   - Marges et paddings corrigés');
console.log('   - Responsive design amélioré');
console.log('');
console.log('🌐 Testez maintenant l\'application sur http://localhost:3000'); 