const fs = require('fs');
const path = require('path');

console.log('🔧 Application des corrections agressives...');

const publicDir = path.join(__dirname, '../public');

function applyFixes(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            applyFixes(filePath);
        } else if (file.endsWith('.html')) {
            try {
                console.log(`📄 ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                let updated = false;
                
                // 1. S'assurer que le CSS sidebar-fixes.css est inclus
                if (!content.includes('sidebar-fixes.css')) {
                    const headEnd = content.indexOf('</head>');
                    if (headEnd !== -1) {
                        const fixesCSS = `
    <link href="/css/sidebar-fixes.css" rel="stylesheet">
`;
                        content = content.slice(0, headEnd) + fixesCSS + content.slice(headEnd);
                        updated = true;
                    }
                }
                
                // 2. S'assurer que la structure main-content est correcte
                if (content.includes('sidebar-container') && !content.includes('main-content')) {
                    content = content.replace(
                        /<div class="container-fluid">/g, 
                        '<div class="main-content"><div class="container-fluid">'
                    );
                    content = content.replace(
                        /<\/div>\s*<\/body>/g, 
                        '</div></div></body>'
                    );
                    updated = true;
                }
                
                // 3. S'assurer que le CSS sidebar principal est inclus
                if (!content.includes('sidebar.css')) {
                    const headEnd = content.indexOf('</head>');
                    if (headEnd !== -1) {
                        const sidebarCSS = `
    <link href="/css/sidebar.css" rel="stylesheet">
`;
                        content = content.slice(0, headEnd) + sidebarCSS + content.slice(headEnd);
                        updated = true;
                    }
                }
                
                // 4. S'assurer que le script sidebar.js est inclus
                if (!content.includes('sidebar.js')) {
                    const bodyEnd = content.lastIndexOf('</body>');
                    if (bodyEnd !== -1) {
                        const sidebarScript = `
    <script src="/js/sidebar.js"></script>
`;
                        content = content.slice(0, bodyEnd) + sidebarScript + content.slice(bodyEnd);
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

applyFixes(publicDir);
console.log('✅ Corrections agressives appliquées !');
console.log('');
console.log('🎯 Corrections appliquées:');
console.log('   - CSS agressif pour éliminer le décalage');
console.log('   - Structure main-content forcée');
console.log('   - Largeur sidebar fixée à 250px');
console.log('   - Contenu principal aligné parfaitement');
console.log('');
console.log('🌐 Redémarrez le serveur et testez sur http://localhost:3000'); 