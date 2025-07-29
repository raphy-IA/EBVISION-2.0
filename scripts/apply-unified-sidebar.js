const fs = require('fs');
const path = require('path');

// Liste des pages à mettre à jour
const pages = [
    'clients.html',
    'collaborateurs.html',
    'missions.html',
    'opportunities.html',
    'time-entries.html',
    'feuilles-temps.html',
    'taux-horaires.html',
    'grades.html',
    'postes.html',
    'divisions.html',
    'business-units.html',
    'reports.html',
    'validation.html',
    'users.html',
    'analytics.html'
];

function updatePage(pageName) {
    const filePath = path.join(__dirname, '..', 'public', pageName);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Fichier ${pageName} non trouvé`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Remplacer la structure de la sidebar
    content = content.replace(
        /<div class="col-md-3 col-lg-2 px-0 sidebar-container">\s*<!-- La sidebar sera générée par JavaScript -->\s*<\/div>/g,
        '<div class="sidebar-container">\n                <!-- La sidebar sera générée par JavaScript -->\n            </div>'
    );
    
    // 2. Remplacer la structure du contenu principal
    content = content.replace(
        /<div class="col-md-9 col-lg-10">/g,
        '<div class="main-content-wrapper">'
    );
    
    // 3. Ajouter les styles CSS pour la sidebar unifiée
    const sidebarStyles = `
        /* Styles pour la sidebar unifiée */
        .main-content-wrapper {
            margin-left: 300px;
            transition: margin-left 0.3s ease;
            min-height: 100vh;
        }
        
        @media (max-width: 768px) {
            .main-content-wrapper {
                margin-left: 0;
            }
            
            .sidebar-container {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            
            .sidebar-container.open {
                transform: translateX(0);
            }
        }`;
    
    // Ajouter les styles avant la fermeture de </style>
    content = content.replace(
        /(\s*)(<\/style>)/,
        `$1${sidebarStyles}$1$2`
    );
    
    // 4. Ajouter le script de la sidebar unifiée
    const sidebarScript = '\n    <!-- Sidebar Unifiée -->\n    <script src="js/unified-sidebar.js"></script>';
    
    // Ajouter le script avant la fermeture de </body>
    content = content.replace(
        /(\s*)(<\/body>)/,
        `$1${sidebarScript}$1$2`
    );
    
    // 5. Ajouter le bouton toggle mobile dans la navbar si pas déjà présent
    if (!content.includes('sidebar-toggle')) {
        content = content.replace(
            /(<div class="container-fluid">)/,
            `$1\n            <!-- Bouton toggle pour la sidebar mobile -->\n            <button class="sidebar-toggle d-lg-none" id="sidebarToggle">\n                <i class="fas fa-bars"></i>\n            </button>\n            `
        );
    }
    
    // Écrire le fichier mis à jour
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${pageName} mis à jour`);
}

// Mettre à jour toutes les pages
console.log('🔄 Application de la sidebar unifiée...\n');

pages.forEach(page => {
    updatePage(page);
});

console.log('\n✅ Toutes les pages ont été mises à jour avec la sidebar unifiée !');
console.log('\n📝 Pour utiliser la sidebar unifiée :');
console.log('1. Assurez-vous que le fichier js/unified-sidebar.js existe');
console.log('2. Assurez-vous que le fichier css/modern-sidebar.css est inclus');
console.log('3. Redémarrez le serveur si nécessaire'); 