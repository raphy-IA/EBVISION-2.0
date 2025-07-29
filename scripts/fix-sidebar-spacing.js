const fs = require('fs');
const path = require('path');

// Liste des pages à corriger
const pages = [
    'clients.html',
    'collaborateurs.html',
    'missions.html',
    'opportunities.html',
    'time-entries.html',
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

function fixSidebarSpacing(pageName) {
    const filePath = path.join(__dirname, '..', 'public', pageName);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Fichier ${pageName} non trouvé`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Nouveaux styles CSS pour corriger l'espacement
    const newStyles = `
        /* Styles pour la sidebar unifiée */
        .main-content-wrapper {
            margin-left: 300px;
            transition: margin-left 0.3s ease;
            min-height: 100vh;
            padding: 0;
        }
        
        .main-content {
            padding: 2rem;
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
            
            .main-content {
                padding: 1rem;
            }
        }`;
    
    // Supprimer les anciens styles de sidebar unifiée s'ils existent
    const oldStylesPattern = /\/\* Styles pour la sidebar unifiée \*\/[\s\S]*?@media \(max-width: 768px\) \{[\s\S]*?\}/g;
    if (content.match(oldStylesPattern)) {
        content = content.replace(oldStylesPattern, '');
        updated = true;
    }
    
    // Ajouter les nouveaux styles avant la fermeture de </style>
    if (content.includes('</style>')) {
        content = content.replace(
            /(\s*)(<\/style>)/,
            `$1${newStyles}$1$2`
        );
        updated = true;
    }
    
    // Écrire le fichier mis à jour
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${pageName} - Espacement corrigé`);
    } else {
        console.log(`ℹ️  ${pageName} - Aucun changement nécessaire`);
    }
}

// Corriger toutes les pages
console.log('🔄 Correction de l\'espacement de la sidebar...\n');

pages.forEach(page => {
    fixSidebarSpacing(page);
});

console.log('\n✅ Espacement de la sidebar corrigé sur toutes les pages !');
console.log('\n📝 Changements apportés :');
console.log('- Suppression de la marge excessive');
console.log('- Ajout de padding approprié au contenu principal');
console.log('- Support responsive amélioré'); 