const fs = require('fs');
const path = require('path');

console.log('🚀 Début de la correction de la sidebar...');

// Fonction pour mettre à jour une page
function updatePage(filePath) {
    try {
        console.log(`📄 Traitement de: ${path.basename(filePath)}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // 1. S'assurer que le CSS sidebar est inclus
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

        // 3. Ajouter la classe main-content
        if (!content.includes('main-content')) {
            content = content.replace(/<div class="container-fluid">/g, '<div class="main-content"><div class="container-fluid">');
            content = content.replace(/<\/div>\s*<\/body>/g, '</div></div></body>');
            updated = true;
        }

        // Écrire le fichier
        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Mis à jour: ${path.basename(filePath)}`);
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
            updatePage(filePath);
        }
    });
}

console.log('📁 Scan des fichiers HTML...');
processDirectory(publicDir);
console.log('✅ Correction terminée !'); 