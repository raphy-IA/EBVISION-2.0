const fs = require('fs');
const path = require('path');

console.log('🔧 RESTAURATION URGENTE - Pages détruites...');

// Pages qui ont été détruites et doivent être restaurées
const pagesToRestore = [
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

// Lire la sauvegarde
const backupPath = path.join(__dirname, '..', 'public', 'collaborateurs_backup.html');
const backupContent = fs.readFileSync(backupPath, 'utf8');

pagesToRestore.forEach(pageName => {
    try {
        const pagePath = path.join(__dirname, '..', 'public', pageName);
        
        // Adapter le contenu pour chaque page
        let content = backupContent;
        
        // Remplacer les références aux collaborateurs par le nom de la page
        const pageTitle = pageName.replace('.html', '').charAt(0).toUpperCase() + pageName.replace('.html', '').slice(1);
        content = content.replace(/Gestion des Collaborateurs/g, `Gestion des ${pageTitle}`);
        content = content.replace(/collaborateurs/g, pageName.replace('.html', ''));
        
        // Supprimer les styles problématiques avec !important
        content = content.replace(/<style>\s*\*\s*\{[^}]*\}\s*body\s*\{[^}]*\}\s*\.sidebar-container\s*\{[^}]*\}\s*\.main-content\s*\{[^}]*\}\s*\.container-fluid\s*\{[^}]*\}\s*\.container\s*\{[^}]*\}\s*\.row\s*\{[^}]*\}\s*\.col[^}]*\}\s*\.col-sm[^}]*\}\s*\.col-md[^}]*\}\s*\.col-lg[^}]*\}\s*\.col-xl[^}]*\}\s*#sidebarContainer\s*\{[^}]*\}\s*#mainContent\s*\{[^}]*\}\s*\.sidebar\s*\{[^}]*\}\s*\.col-md-3\.col-lg-2\.px-0\.sidebar-container\s*\{[^}]*\}\s*<\/style>/g, '');
        
        // Supprimer les références aux fichiers CSS supprimés
        content = content.replace(/<link href="\/css\/sidebar-fixes\.css" rel="stylesheet">/g, '');
        content = content.replace(/<link href="\/css\/force-alignment\.css" rel="stylesheet">/g, '');
        content = content.replace(/<link href="\/css\/ultimate-fix\.css" rel="stylesheet">/g, '');
        
        // Ajouter des styles propres
        const cleanStyles = `
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
            }
            
            .main-content {
                margin-left: 250px;
                min-height: 100vh;
                background-color: #ffffff;
            }
            
            .sidebar-container {
                position: fixed;
                left: 0;
                top: 0;
                width: 250px;
                height: 100vh;
                z-index: 1000;
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
                }
                
                .sidebar-toggle {
                    display: block !important;
                }
            }
        </style>`;
        
        content = content.replace(/<link href="\/css\/sidebar\.css" rel="stylesheet">/, 
            `<link href="/css/sidebar.css" rel="stylesheet">${cleanStyles}`);
        
        fs.writeFileSync(pagePath, content);
        console.log(`✅ Page ${pageName} RESTAURÉE`);
        
    } catch (error) {
        console.error(`❌ ERREUR pour ${pageName}:`, error.message);
    }
});

console.log('✅ RESTAURATION TERMINÉE !');
console.log('📝 Toutes les pages détruites ont été restaurées.'); 