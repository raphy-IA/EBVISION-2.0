const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION FINALE - ÉLIMINATION DU DÉCALAGE');
console.log('================================================');

const publicDir = path.join(__dirname, '../public');

function finalFix(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            finalFix(filePath);
        } else if (file.endsWith('.html')) {
            try {
                console.log(`📄 ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                let updated = false;
                
                // 1. S'assurer que tous les CSS sont inclus
                const cssFiles = [
                    'sidebar.css',
                    'sidebar-fixes.css', 
                    'force-alignment.css'
                ];
                
                cssFiles.forEach(cssFile => {
                    if (!content.includes(cssFile)) {
                        const headEnd = content.indexOf('</head>');
                        if (headEnd !== -1) {
                            const cssLink = `
    <link href="/css/${cssFile}" rel="stylesheet">
`;
                            content = content.slice(0, headEnd) + cssLink + content.slice(headEnd);
                            updated = true;
                        }
                    }
                });
                
                // 2. S'assurer que le script sidebar.js est inclus
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
                
                // 3. S'assurer que la structure main-content est correcte
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
                
                // 4. Ajouter des styles inline pour forcer l'alignement
                if (content.includes('<body>')) {
                    const bodyStart = content.indexOf('<body>');
                    const inlineStyles = `
    <style>
        body { margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }
        .sidebar-container { width: 250px !important; max-width: 250px !important; }
        .main-content { margin-left: 250px !important; width: calc(100vw - 250px) !important; }
    </style>
`;
                    content = content.slice(0, bodyStart + 6) + inlineStyles + content.slice(bodyStart + 6);
                    updated = true;
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

finalFix(publicDir);
console.log('');
console.log('✅ CORRECTION FINALE TERMINÉE !');
console.log('');
console.log('🎯 CORRECTIONS APPLIQUÉES:');
console.log('   ✅ CSS sidebar.css - Style principal');
console.log('   ✅ CSS sidebar-fixes.css - Corrections agressives');
console.log('   ✅ CSS force-alignment.css - Alignement forcé');
console.log('   ✅ Script sidebar.js - Fonctionnalités');
console.log('   ✅ Structure main-content - HTML correct');
console.log('   ✅ Styles inline - Forçage final');
console.log('');
console.log('🎯 RÉSULTAT ATTENDU:');
console.log('   - Sidebar: 250px de large, fixe à gauche');
console.log('   - Contenu: Aligné parfaitement à droite de la sidebar');
console.log('   - Zéro décalage entre sidebar et contenu');
console.log('   - Responsive design préservé');
console.log('');
console.log('🌐 TESTEZ MAINTENANT:');
console.log('   http://localhost:3000');
console.log('');
console.log('📱 PAGES À TESTER:');
console.log('   - /clients.html');
console.log('   - /dashboard.html');
console.log('   - /missions.html');
console.log('   - /opportunities.html');
console.log('');
console.log('🔍 VÉRIFIEZ:');
console.log('   - Plus de bande blanche entre sidebar et contenu');
console.log('   - Sidebar fait exactement 250px de large');
console.log('   - Contenu commence immédiatement après la sidebar'); 