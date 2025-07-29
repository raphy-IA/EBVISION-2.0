const fs = require('fs');
const path = require('path');

// Fonction pour corriger une page
function fixPage(filePath) {
    console.log(`🔧 Correction de ${path.basename(filePath)}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Supprimer les duplications de CSS
    const cssPatterns = [
        /\/\* Styles pour la sidebar unifiée \*\/[\s\S]*?@media \(max-width: 768px\) \{[\s\S]*?\}/g,
        /\.sidebar-container \{[\s\S]*?transform: translateX\(-100%\);/g,
        /\.sidebar-container\.open \{[\s\S]*?transform: translateX\(0\);/g,
        /\.main-content \{[\s\S]*?padding: 1rem;/g,
        /\.main-content-wrapper \{[\s\S]*?padding: 0;/g
    ];
    
    cssPatterns.forEach(pattern => {
        content = content.replace(pattern, '');
    });
    
    // 2. Supprimer les duplications de structure HTML
    const htmlPatterns = [
        /<div class="col-md-3 col-lg-2 px-0 sidebar-container">[\s\S]*?<\/div>/g,
        /<div class="col-md-9 col-lg-10">[\s\S]*?<\/div>/g,
        /<!-- Sidebar Container -->[\s\S]*?<!-- La sidebar sera générée par JavaScript -->[\s\S]*?<\/div>/g,
        /<div class="main-content-wrapper">[\s\S]*?<div class="main-content">/g
    ];
    
    htmlPatterns.forEach(pattern => {
        content = content.replace(pattern, '');
    });
    
    // 3. Ajouter la structure correcte si elle n'existe pas
    if (!content.includes('sidebar-container')) {
        content = content.replace(
            /<div class="container-fluid">[\s\S]*?<div class="row">/g,
            `<div class="container-fluid">
        <div class="row">
            <!-- Bouton toggle sidebar (mobile) -->
            <button class="sidebar-toggle" id="sidebarToggle">
                <i class="fas fa-bars"></i>
            </button>

            <!-- Sidebar Container -->
            <div class="sidebar-container" id="sidebarContainer">
                <!-- La sidebar sera générée par unified-sidebar.js -->
            </div>

            <!-- Contenu principal -->
            <div class="main-content-wrapper">
                <div class="main-content" id="mainContent">`
        );
    }
    
    // 4. Ajouter les styles CSS corrects
    const correctCSS = `
        /* Styles pour la sidebar unifiée */
        .sidebar-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 300px;
            height: 100vh;
            background: var(--sidebar-bg);
            box-shadow: var(--sidebar-shadow);
            z-index: 1000;
            overflow-y: auto;
        }
        
        .main-content-wrapper {
            margin-left: 300px;
            transition: margin-left 0.3s ease;
            min-height: 100vh;
            padding: 0;
        }
        
        .main-content {
            padding: 2rem;
        }
        
        .sidebar-toggle {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            background: var(--primary-color);
            border: none;
            color: white;
            padding: 10px;
            border-radius: 5px;
            display: none;
        }
        
        @media (max-width: 768px) {
            .sidebar-container {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            
            .sidebar-container.open {
                transform: translateX(0);
            }
            
            .main-content-wrapper {
                margin-left: 0;
            }
            
            .main-content {
                padding: 1rem;
            }
            
            .sidebar-toggle {
                display: block;
            }
        }`;
    
    // Remplacer les styles existants ou les ajouter
    if (content.includes('/* Styles pour la sidebar unifiée */')) {
        content = content.replace(
            /\/\* Styles pour la sidebar unifiée \*\/[\s\S]*?@media \(max-width: 768px\) \{[\s\S]*?\}/g,
            correctCSS
        );
    } else {
        content = content.replace(
            /<link rel="stylesheet" href="css\/modern-sidebar\.css">/g,
            `<link rel="stylesheet" href="css/modern-sidebar.css">
    <style>${correctCSS}</style>`
        );
    }
    
    // 5. S'assurer que le script unified-sidebar.js est inclus
    if (!content.includes('unified-sidebar.js')) {
        content = content.replace(
            /<\/body>/,
            `    <script src="js/unified-sidebar.js"></script>
</body>`
        );
    }
    
    // 6. Nettoyer les duplications de structure
    content = content.replace(
        /<div class="main-content-wrapper">[\s\S]*?<div class="main-content">[\s\S]*?<div class="main-content-wrapper">/g,
        `<div class="main-content-wrapper">
                <div class="main-content">`
    );
    
    // 7. Fermer correctement les divs
    content = content.replace(
        /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/g,
        `        </div>
    </div>
</div>
</body>`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} corrigé`);
}

// Fonction pour traiter tous les fichiers HTML
function fixAllPages() {
    const publicDir = path.join(__dirname, '..', 'public');
    const htmlFiles = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.html'))
        .filter(file => !file.includes('backup') && !file.includes('template') && file !== 'login.html' && file !== 'logout.html');
    
    console.log('🔧 Correction simple de la structure de la sidebar...\n');
    
    htmlFiles.forEach(file => {
        const filePath = path.join(publicDir, file);
        try {
            fixPage(filePath);
        } catch (error) {
            console.log(`❌ Erreur lors de la correction de ${file}: ${error.message}`);
        }
    });
    
    console.log('\n🎉 Correction terminée !');
    console.log('\n📋 Résumé :');
    console.log('   ✅ Suppression des duplications CSS');
    console.log('   ✅ Nettoyage de la structure HTML');
    console.log('   ✅ Ajout de la structure sidebar correcte');
    console.log('   ✅ Inclusion du script unified-sidebar.js');
    
    console.log('\n🔄 Redémarrez le serveur pour voir les changements :');
    console.log('   node server.js');
}

// Exécuter la correction
fixAllPages(); 