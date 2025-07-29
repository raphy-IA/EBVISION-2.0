const fs = require('fs');
const path = require('path');

console.log('🔧 Mise à jour des pages pour la sidebar unifiée...');

// Pages à mettre à jour
const pagesToUpdate = [
    'dashboard.html',
    'clients.html',
    'collaborateurs.html',
    'missions.html',
    'time-entries.html',
    'validation.html',
    'reports.html',
    'opportunities.html',
    'analytics.html',
    'users.html',
    'grades.html',
    'postes.html',
    'taux-horaires.html',
    'business-units.html',
    'divisions.html'
];

function updatePageForUnifiedSidebar(pageName) {
    const publicDir = path.join(__dirname, '..', 'public');
    const pagePath = path.join(publicDir, pageName);
    
    if (!fs.existsSync(pagePath)) {
        console.log(`❌ Page ${pageName} n'existe pas`);
        return;
    }
    
    try {
        let content = fs.readFileSync(pagePath, 'utf8');
        
        // Remplacer l'ancien CSS de sidebar par le nouveau
        content = content.replace(
            /<link href="\/css\/sidebar\.css" rel="stylesheet">/g,
            `<link href="/css/unified-sidebar.css" rel="stylesheet">`
        );
        
        // Remplacer l'ancien script de sidebar par le nouveau
        content = content.replace(
            /<script src="\/js\/sidebar\.js"><\/script>/g,
            `<script src="/js/unified-sidebar.js"></script>`
        );
        
        // Supprimer les styles problématiques avec !important
        content = content.replace(
            /<style>\s*\*\s*\{[^}]*\}\s*body\s*\{[^}]*\}\s*\.sidebar-container\s*\{[^}]*\}\s*\.main-content\s*\{[^}]*\}\s*\.container-fluid\s*\{[^}]*\}\s*\.container\s*\{[^}]*\}\s*\.row\s*\{[^}]*\}\s*\.col[^}]*\}\s*\.col-sm[^}]*\}\s*\.col-md[^}]*\}\s*\.col-lg[^}]*\}\s*\.col-xl[^}]*\}\s*#sidebarContainer\s*\{[^}]*\}\s*#mainContent\s*\{[^}]*\}\s*\.sidebar\s*\{[^}]*\}\s*\.col-md-3\.col-lg-2\.px-0\.sidebar-container\s*\{[^}]*\}\s*<\/style>/g,
            ''
        );
        
        // Supprimer les références aux fichiers CSS supprimés
        content = content.replace(/<link href="\/css\/sidebar-fixes\.css" rel="stylesheet">/g, '');
        content = content.replace(/<link href="\/css\/force-alignment\.css" rel="stylesheet">/g, '');
        content = content.replace(/<link href="\/css\/ultimate-fix\.css" rel="stylesheet">/g, '');
        
        // Ajouter des styles de base pour la compatibilité
        const baseStyles = `
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
            }
            
            .main-content {
                margin-left: 280px;
                min-height: 100vh;
                background-color: #ffffff;
                transition: margin-left 0.3s ease;
            }
            
            .container-fluid {
                padding: 2rem;
            }
            
            .card {
                border: none;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 1.5rem;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 25px;
                padding: 0.5rem 1.5rem;
                font-weight: 500;
            }
            
            .table {
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .main-content {
                    margin-left: 0;
                    padding-top: 4rem;
                }
            }
        </style>`;
        
        // Ajouter les styles de base après le CSS de sidebar
        content = content.replace(
            /<link href="\/css\/unified-sidebar\.css" rel="stylesheet">/,
            `<link href="/css/unified-sidebar.css" rel="stylesheet">${baseStyles}`
        );
        
        fs.writeFileSync(pagePath, content);
        console.log(`✅ Page ${pageName} mise à jour pour la sidebar unifiée`);
        
    } catch (error) {
        console.error(`❌ Erreur pour ${pageName}:`, error.message);
    }
}

// Mettre à jour toutes les pages
pagesToUpdate.forEach(pageName => {
    updatePageForUnifiedSidebar(pageName);
});

console.log('✅ Mise à jour terminée !');
console.log('📝 Toutes les pages utilisent maintenant la sidebar unifiée.'); 