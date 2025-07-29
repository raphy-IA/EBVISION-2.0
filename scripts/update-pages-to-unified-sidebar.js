const fs = require('fs');
const path = require('path');

/**
 * Script pour mettre à jour toutes les pages avec la sidebar unifiée
 */

// Configuration de la sidebar unifiée
const unifiedSidebarStructure = `
    <!-- Bouton toggle sidebar (mobile) -->
    <button class="sidebar-toggle" id="sidebarToggle">
        <i class="fas fa-bars"></i>
    </button>

    <!-- Sidebar Container -->
    <div class="sidebar-container" id="sidebarContainer">
        <!-- La sidebar sera générée par sidebar.js -->
    </div>

    <!-- Contenu principal -->
    <div class="main-content" id="mainContent">
`;

// Fonction pour mettre à jour une page HTML
function updatePageToUnifiedSidebar(filePath) {
    try {
        console.log(`🔄 Mise à jour de: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // 1. Remplacer les anciennes structures de sidebar
        const oldSidebarPatterns = [
            /<div class="col-md-3 col-lg-2 px-0 sidebar-container">[\s\S]*?<!-- La sidebar sera générée par JavaScript -->[\s\S]*?<\/div>/g,
            /<div class="sidebar-container"><\/div>/g,
            /<div class="border-end bg-white" id="sidebar-wrapper">[\s\S]*?<\/div>/g,
            /<div class="sidebar">[\s\S]*?<\/div>/g
        ];

        oldSidebarPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                content = content.replace(pattern, unifiedSidebarStructure);
                updated = true;
            }
        });

        // 2. Ajouter le bouton toggle si absent
        if (!content.includes('sidebar-toggle')) {
            const bodyTag = content.indexOf('<body>');
            if (bodyTag !== -1) {
                const toggleButton = `
    <!-- Bouton toggle sidebar (mobile) -->
    <button class="sidebar-toggle" id="sidebarToggle">
        <i class="fas fa-bars"></i>
    </button>

`;
                content = content.slice(0, bodyTag + 6) + toggleButton + content.slice(bodyTag + 6);
                updated = true;
            }
        }

        // 3. S'assurer que le CSS de la sidebar est inclus
        if (!content.includes('sidebar.css')) {
            const headTag = content.indexOf('</head>');
            if (headTag !== -1) {
                const sidebarCSS = `
    <!-- Sidebar CSS unifié -->
    <link href="/css/sidebar.css" rel="stylesheet">
    
`;
                content = content.slice(0, headTag) + sidebarCSS + content.slice(headTag);
                updated = true;
            }
        }

        // 4. S'assurer que le script sidebar.js est inclus
        if (!content.includes('sidebar.js')) {
            const bodyEndTag = content.lastIndexOf('</body>');
            if (bodyEndTag !== -1) {
                const sidebarScript = `
    <!-- Sidebar Manager -->
    <script src="/js/sidebar.js"></script>
    
`;
                content = content.slice(0, bodyEndTag) + sidebarScript + content.slice(bodyEndTag);
                updated = true;
            }
        }

        // 5. Ajouter la classe main-content si absente
        if (!content.includes('main-content')) {
            // Chercher le contenu principal
            const mainContentPattern = /<div class="container-fluid">/g;
            if (mainContentPattern.test(content)) {
                content = content.replace(/<div class="container-fluid">/g, '<div class="main-content"><div class="container-fluid">');
                content = content.replace(/<\/div>\s*<\/body>/g, '</div></div></body>');
                updated = true;
            }
        }

        // 6. Nettoyer les styles CSS inline de sidebar
        const inlineSidebarStyles = [
            /\.sidebar\s*\{[\s\S]*?\}/g,
            /\.sidebar\s*\.nav-link[\s\S]*?\{[\s\S]*?\}/g,
            /\.sidebar\s*h6[\s\S]*?\{[\s\S]*?\}/g
        ];

        inlineSidebarStyles.forEach(pattern => {
            if (pattern.test(content)) {
                content = content.replace(pattern, '');
                updated = true;
            }
        });

        // Écrire le fichier mis à jour
        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Mis à jour: ${filePath}`);
        } else {
            console.log(`ℹ️  Aucune modification nécessaire: ${filePath}`);
        }

    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de ${filePath}:`, error.message);
    }
}

// Fonction pour traiter tous les fichiers HTML
function updateAllPages() {
    const publicDir = path.join(__dirname, '../public');
    const htmlFiles = [];

    // Récupérer tous les fichiers HTML
    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else if (file.endsWith('.html')) {
                htmlFiles.push(filePath);
            }
        });
    }

    scanDirectory(publicDir);

    console.log(`📁 Trouvé ${htmlFiles.length} fichiers HTML à traiter`);
    console.log('🚀 Début de la mise à jour vers la sidebar unifiée...\n');

    // Traiter chaque fichier
    htmlFiles.forEach(filePath => {
        updatePageToUnifiedSidebar(filePath);
    });

    console.log('\n✅ Mise à jour terminée !');
    console.log('📋 Résumé:');
    console.log(`   - ${htmlFiles.length} fichiers traités`);
    console.log('   - Sidebar unifiée appliquée');
    console.log('   - Structure cohérente pour toute l\'application');
}

// Exécuter le script
if (require.main === module) {
    updateAllPages();
}

module.exports = { updatePageToUnifiedSidebar, updateAllPages }; 