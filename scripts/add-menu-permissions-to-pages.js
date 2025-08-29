const fs = require('fs');
const path = require('path');

// Pages principales à modifier
const pagesToUpdate = [
    'public/dashboard.html',
    'public/opportunities.html',
    'public/missions.html',
    'public/time-sheet-modern.html',
    'public/collaborateurs.html',
    'public/users.html',
    'public/reports.html',
    'public/business-units.html',
    'public/divisions.html',
    'public/grades.html',
    'public/postes.html',
    'public/fiscal-years.html',
    'public/pays.html',
    'public/notification-settings.html'
];

function addMenuPermissionsScript(filePath) {
    try {
        console.log(`📝 Traitement de: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Fichier non trouvé: ${filePath}`);
            return;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier si le script est déjà présent
        if (content.includes('menu-permissions.js')) {
            console.log(`✅ Script déjà présent dans: ${filePath}`);
            return;
        }
        
        // Patterns pour ajouter le script après auth.js
        const patterns = [
            {
                search: /<script src="js\/auth\.js"><\/script>/g,
                replace: '<script src="js/auth.js"></script>\n    <script src="js/menu-permissions.js"></script>'
            },
            {
                search: /<script src="js\/global-auth\.js"><\/script>/g,
                replace: '<script src="js/global-auth.js"></script>\n    <script src="js/menu-permissions.js"></script>'
            }
        ];
        
        let modified = false;
        for (const pattern of patterns) {
            if (pattern.search.test(content)) {
                content = content.replace(pattern.search, pattern.replace);
                modified = true;
                break;
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Script ajouté à: ${filePath}`);
        } else {
            console.log(`⚠️ Aucun pattern trouvé dans: ${filePath}`);
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    }
}

// Traiter toutes les pages
console.log('🔄 Ajout du script de permissions de menu aux pages...\n');

pagesToUpdate.forEach(page => {
    addMenuPermissionsScript(page);
});

console.log('\n✅ Traitement terminé !');
