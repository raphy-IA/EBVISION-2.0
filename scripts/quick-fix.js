const fs = require('fs');
const path = require('path');

console.log('🔧 Ajout des corrections CSS...');

const publicDir = path.join(__dirname, '../public');

function addFixes(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            addFixes(filePath);
        } else if (file.endsWith('.html')) {
            try {
                console.log(`📄 ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                
                if (content.includes('sidebar.css') && !content.includes('sidebar-fixes.css')) {
                    const headEnd = content.indexOf('</head>');
                    if (headEnd !== -1) {
                        const fixesCSS = `
    <link href="/css/sidebar-fixes.css" rel="stylesheet">
`;
                        content = content.slice(0, headEnd) + fixesCSS + content.slice(headEnd);
                        fs.writeFileSync(filePath, content, 'utf8');
                        console.log(`✅ Corrigé: ${file}`);
                    }
                } else {
                    console.log(`ℹ️  OK: ${file}`);
                }
            } catch (error) {
                console.error(`❌ Erreur: ${file} - ${error.message}`);
            }
        }
    });
}

addFixes(publicDir);
console.log('✅ Corrections terminées !'); 