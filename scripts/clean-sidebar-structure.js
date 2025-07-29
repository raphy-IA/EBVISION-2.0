const fs = require('fs');
const path = require('path');

// Template de page propre
const cleanPageTemplate = (title, content) => `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- CSS Bootstrap et FontAwesome -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/modern-sidebar.css">
    
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
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark" style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));">
        <div class="container-fluid">
            <!-- Bouton toggle pour la sidebar mobile -->
            <button class="sidebar-toggle d-lg-none" id="sidebarToggle">
                <i class="fas fa-bars"></i>
            </button>
            
            <a class="navbar-brand" href="/dashboard.html">
                <i class="fas fa-clock me-2"></i>
                TRS Dashboard
            </a>
            <div class="navbar-nav ms-auto">
                <span class="navbar-text me-3">
                    <i class="fas fa-user me-1"></i>
                    Admin
                </span>
                <a href="/dashboard.html" class="btn btn-outline-light btn-sm">
                    <i class="fas fa-arrow-left me-1"></i>
                    Retour
                </a>
            </div>
        </div>
    </nav>

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
        <div class="main-content" id="mainContent">
            ${content}
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/unified-sidebar.js"></script>
</body>
</html>`;

// Fonction pour extraire le contenu principal d'une page
function extractMainContent(content) {
    // Chercher le contenu principal après la navigation
    const mainContentMatch = content.match(/<div class="main-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/);
    if (mainContentMatch) {
        return mainContentMatch[1];
    }
    
    // Fallback: chercher le contenu après la navigation
    const navEndMatch = content.match(/<\/nav>[\s\S]*?<div class="container-fluid">[\s\S]*?<div class="row">[\s\S]*?<div class="main-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/);
    if (navEndMatch) {
        return navEndMatch[1];
    }
    
    // Fallback: chercher tout le contenu entre body et les scripts
    const bodyMatch = content.match(/<body>[\s\S]*?<div class="main-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/);
    if (bodyMatch) {
        return bodyMatch[1];
    }
    
    return '';
}

// Fonction pour extraire le titre
function extractTitle(content) {
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    return titleMatch ? titleMatch[1] : 'TRS Dashboard';
}

// Fonction pour nettoyer une page
function cleanPage(filePath) {
    console.log(`🔧 Nettoyage de ${path.basename(filePath)}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const title = extractTitle(content);
    const mainContent = extractMainContent(content);
    
    if (!mainContent) {
        console.log(`⚠️ Impossible d'extraire le contenu principal de ${path.basename(filePath)}`);
        return;
    }
    
    const cleanContent = cleanPageTemplate(title, mainContent);
    fs.writeFileSync(filePath, cleanContent, 'utf8');
    console.log(`✅ ${path.basename(filePath)} nettoyé`);
}

// Fonction pour traiter tous les fichiers HTML
function cleanAllPages() {
    const publicDir = path.join(__dirname, '..', 'public');
    const htmlFiles = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.html'))
        .filter(file => !file.includes('backup') && !file.includes('template') && file !== 'login.html' && file !== 'logout.html');
    
    console.log('🧹 Nettoyage complet de la structure de la sidebar...\n');
    
    htmlFiles.forEach(file => {
        const filePath = path.join(publicDir, file);
        try {
            cleanPage(filePath);
        } catch (error) {
            console.log(`❌ Erreur lors du nettoyage de ${file}: ${error.message}`);
        }
    });
    
    console.log('\n🎉 Nettoyage terminé !');
    console.log('\n📋 Résumé :');
    console.log('   ✅ Structure HTML simplifiée');
    console.log('   ✅ CSS unifié et propre');
    console.log('   ✅ Sidebar unifiée sur toutes les pages');
    console.log('   ✅ Scripts correctement inclus');
    
    console.log('\n🔄 Redémarrez le serveur pour voir les changements :');
    console.log('   node server.js');
}

// Exécuter le nettoyage
cleanAllPages(); 