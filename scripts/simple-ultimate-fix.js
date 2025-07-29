const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION ULTIME SIMPLE');
console.log('============================');

const publicDir = path.join(__dirname, '../public');

function applyFix(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            applyFix(filePath);
        } else if (file.endsWith('.html')) {
            try {
                console.log(`📄 ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                let updated = false;
                
                // Ajouter le CSS ultimate-fix.css
                if (!content.includes('ultimate-fix.css')) {
                    const headEnd = content.indexOf('</head>');
                    if (headEnd !== -1) {
                        const cssLink = '\n    <link href="/css/ultimate-fix.css" rel="stylesheet">\n';
                        content = content.slice(0, headEnd) + cssLink + content.slice(headEnd);
                        updated = true;
                    }
                }
                
                // Ajouter des styles inline agressifs
                if (content.includes('<body>')) {
                    const bodyStart = content.indexOf('<body>');
                    const inlineStyles = '\n    <style>\n        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }\n        body { margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }\n        .sidebar-container { position: fixed !important; left: 0 !important; top: 0 !important; width: 250px !important; max-width: 250px !important; min-width: 250px !important; height: 100vh !important; z-index: 1000 !important; margin: 0 !important; padding: 0 !important; }\n        .main-content { position: relative !important; margin-left: 250px !important; width: calc(100vw - 250px) !important; max-width: calc(100vw - 250px) !important; min-width: calc(100vw - 250px) !important; padding: 0 !important; margin-top: 0 !important; margin-right: 0 !important; margin-bottom: 0 !important; left: 0 !important; top: 0 !important; }\n        .container-fluid { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; }\n        .container { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; }\n        .row { margin: 0 !important; padding: 0 !important; }\n        .col, .col-1, .col-2, .col-3, .col-4, .col-5, .col-6, .col-7, .col-8, .col-9, .col-10, .col-11, .col-12 { padding: 0 !important; margin: 0 !important; }\n        .col-sm, .col-sm-1, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-10, .col-sm-11, .col-sm-12 { padding: 0 !important; margin: 0 !important; }\n        .col-md, .col-md-1, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-10, .col-md-11, .col-md-12 { padding: 0 !important; margin: 0 !important; }\n        .col-lg, .col-lg-1, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-10, .col-lg-11, .col-lg-12 { padding: 0 !important; margin: 0 !important; }\n        .col-xl, .col-xl-1, .col-xl-2, .col-xl-3, .col-xl-4, .col-xl-5, .col-xl-6, .col-xl-7, .col-xl-8, .col-xl-9, .col-xl-10, .col-xl-11, .col-xl-12 { padding: 0 !important; margin: 0 !important; }\n        #sidebarContainer { width: 250px !important; max-width: 250px !important; min-width: 250px !important; position: fixed !important; left: 0 !important; top: 0 !important; z-index: 1000 !important; }\n        #mainContent { margin-left: 250px !important; width: calc(100vw - 250px) !important; max-width: calc(100vw - 250px) !important; min-width: calc(100vw - 250px) !important; position: relative !important; left: 0 !important; top: 0 !important; }\n        .sidebar { width: 250px !important; max-width: 250px !important; min-width: 250px !important; position: fixed !important; left: 0 !important; top: 0 !important; z-index: 1000 !important; }\n        .col-md-3.col-lg-2.px-0.sidebar-container { display: none !important; }\n    </style>\n';
                        content = content.slice(0, bodyStart + 6) + inlineStyles + content.slice(bodyStart + 6);
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

applyFix(publicDir);
console.log('');
console.log('✅ CORRECTION ULTIME APPLIQUÉE !');
console.log('');
console.log('🎯 RÉSULTAT ATTENDU:');
console.log('   - ZÉRO décalage entre sidebar et contenu');
console.log('   - Sidebar: 250px fixe à gauche');
console.log('   - Contenu: Aligné parfaitement à droite');
console.log('');
console.log('🌐 TESTEZ MAINTENANT:');
console.log('   http://localhost:3000'); 