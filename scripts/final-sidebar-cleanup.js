const fs = require('fs');
const path = require('path');

// Fonction pour nettoyer complètement une page
function cleanPage(filePath) {
    console.log(`🧹 Nettoyage complet de ${path.basename(filePath)}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Supprimer toutes les duplications de CSS
    const cssDuplications = [
        /<style>[\s\S]*?<\/style>/g,
        /\/\* Styles pour la sidebar unifiée \*\/[\s\S]*?@media \(max-width: 768px\) \{[\s\S]*?\}/g,
        /\.sidebar-container \{[\s\S]*?transform: translateX\(-100%\);/g,
        /\.sidebar-container\.open \{[\s\S]*?transform: translateX\(0\);/g,
        /\.main-content \{[\s\S]*?padding: 1rem;/g,
        /\.main-content-wrapper \{[\s\S]*?padding: 0;/g,
        /@media \(max-width: 768px\) \{[\s\S]*?\}/g
    ];
    
    cssDuplications.forEach(pattern => {
        content = content.replace(pattern, '');
    });
    
    // 2. Nettoyer le head
    const headMatch = content.match(/<head>[\s\S]*?<\/head>/);
    if (headMatch) {
        let headContent = headMatch[0];
        
        // Supprimer les duplications de liens CSS
        headContent = headContent.replace(/<link rel="stylesheet" href="css\/modern-sidebar\.css">/g, '');
        headContent = headContent.replace(/<style>[\s\S]*?<\/style>/g, '');
        
        // Ajouter les liens et styles corrects
        headContent = headContent.replace(
            /<\/head>/,
            `    <link rel="stylesheet" href="css/modern-sidebar.css">
    <style>
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
        }
    </style>
</head>`
        );
        
        content = content.replace(/<head>[\s\S]*?<\/head>/, headContent);
    }
    
    // 3. Nettoyer le body
    // Supprimer les duplications de structure
    const bodyDuplications = [
        /<div class="col-md-3 col-lg-2 px-0 sidebar-container">[\s\S]*?<\/div>/g,
        /<div class="col-md-9 col-lg-10">[\s\S]*?<\/div>/g,
        /<!-- Sidebar Container -->[\s\S]*?<!-- La sidebar sera générée par JavaScript -->[\s\S]*?<\/div>/g,
        /<div class="main-content-wrapper">[\s\S]*?<div class="main-content">/g,
        /<div class="main-content-wrapper">[\s\S]*?<div class="main-content">[\s\S]*?<div class="main-content-wrapper">/g
    ];
    
    bodyDuplications.forEach(pattern => {
        content = content.replace(pattern, '');
    });
    
    // 4. S'assurer que la structure correcte est présente
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
    
    // 5. S'assurer que le script unified-sidebar.js est inclus
    if (!content.includes('unified-sidebar.js')) {
        content = content.replace(
            /<\/body>/,
            `    <script src="js/unified-sidebar.js"></script>
</body>`
        );
    }
    
    // 6. Nettoyer les styles en ligne dans le body
    content = content.replace(/<style>[\s\S]*?<\/style>/g, '');
    
    // 7. Fermer correctement les divs
    content = content.replace(
        /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/g,
        `        </div>
    </div>
</div>
</body>`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} nettoyé`);
}

// Fonction pour traiter tous les fichiers HTML
function cleanAllPages() {
    const publicDir = path.join(__dirname, '..', 'public');
    const htmlFiles = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.html'))
        .filter(file => !file.includes('backup') && !file.includes('template') && file !== 'login.html' && file !== 'logout.html');
    
    console.log('🧹 Nettoyage final de la structure de la sidebar...\n');
    
    htmlFiles.forEach(file => {
        const filePath = path.join(publicDir, file);
        try {
            cleanPage(filePath);
        } catch (error) {
            console.log(`❌ Erreur lors du nettoyage de ${file}: ${error.message}`);
        }
    });
    
    console.log('\n🎉 Nettoyage final terminé !');
    console.log('\n📋 Résumé :');
    console.log('   ✅ Suppression de toutes les duplications CSS');
    console.log('   ✅ Nettoyage complet de la structure HTML');
    console.log('   ✅ Structure sidebar unifiée et propre');
    console.log('   ✅ Scripts correctement inclus');
    
    console.log('\n🔄 Redémarrez le serveur pour voir les changements :');
    console.log('   node server.js');
}

// Exécuter le nettoyage final
cleanAllPages(); 