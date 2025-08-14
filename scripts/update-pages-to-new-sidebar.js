const fs = require('fs');
const path = require('path');

// Liste des pages principales à mettre à jour
const mainPages = [
    'dashboard.html',
    'analytics.html',
    'reports.html',
    'time-sheet-modern.html',
    'time-sheet-approvals.html',
    'time-sheet-supervisors.html',
    'missions.html',
    'mission-types.html',
    'task-templates.html',
    'invoices.html',
    'clients.html',
    'opportunities.html',
    'opportunity-types.html',
    'collaborateurs.html',
    'grades.html',
    'postes.html',
    'fiscal-years.html',
    'pays.html',
    'divisions.html',
    'business-units.html',
    'secteurs-activite.html',
    'opportunity-type-configuration.html',
    'notification-settings.html',
    'users.html',
    'profile.html'
];

// Fonction pour mettre à jour une page
function updatePage(pagePath) {
    try {
        const fullPath = path.join(__dirname, '..', 'public', pagePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  Page non trouvée: ${pagePath}`);
            return false;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        let updated = false;

        // 1. S'assurer que le CSS modern-sidebar.css est inclus
        if (!content.includes('modern-sidebar.css')) {
            content = content.replace(
                /<link[^>]*href="[^"]*sidebar[^"]*\.css"[^>]*>/g,
                '<link rel="stylesheet" href="css/modern-sidebar.css">'
            );
            if (!content.includes('modern-sidebar.css')) {
                content = content.replace(
                    '</head>',
                    '    <link rel="stylesheet" href="css/modern-sidebar.css">\n    </head>'
                );
            }
            updated = true;
        }

        // 2. S'assurer que unified-sidebar.js est inclus
        if (!content.includes('unified-sidebar.js')) {
            content = content.replace(
                '</body>',
                '    <script src="js/unified-sidebar.js"></script>\n    </body>'
            );
            updated = true;
        }

        // 3. S'assurer que la structure de base est présente
        if (!content.includes('sidebar-container')) {
            // Ajouter la structure de base si elle n'existe pas
            const sidebarStructure = `
    <!-- Sidebar -->
    <div class="col-md-3 col-lg-2 px-0">
        <div class="sidebar-container">
            <!-- La sidebar sera générée par unified-sidebar.js -->
        </div>
    </div>

    <!-- Contenu principal -->
    <div class="col-md-9 col-lg-10">
        <div class="main-content">
            <!-- Contenu existant -->
`;
            
            // Chercher le contenu principal et l'encapsuler
            if (content.includes('<main') || content.includes('<div class="container')) {
                // Remplacer la structure existante
                content = content.replace(
                    /<div class="container[^>]*>/g,
                    '<div class="container-fluid">\n    <div class="row g-0">' + sidebarStructure
                );
                content = content.replace(
                    /<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/g,
                    '        </div>\n    </div>\n</div>\n</div>\n</body>'
                );
            } else {
                // Ajouter la structure complète
                content = content.replace(
                    '<body>',
                    '<body>\n<div class="container-fluid">\n    <div class="row g-0">' + sidebarStructure
                );
                content = content.replace(
                    '</body>',
                    '        </div>\n    </div>\n</div>\n</body>'
                );
            }
            updated = true;
        }

        // 4. Ajouter le bouton toggle pour mobile si pas présent
        if (!content.includes('sidebar-toggle')) {
            content = content.replace(
                '<body>',
                '<body>\n    <!-- Bouton toggle sidebar mobile -->\n    <button class="sidebar-toggle d-md-none">\n        <i class="fas fa-bars"></i>\n    </button>'
            );
            updated = true;
        }

        // 5. S'assurer que Font Awesome est inclus
        if (!content.includes('fontawesome') && !content.includes('font-awesome')) {
            content = content.replace(
                '</head>',
                '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">\n    </head>'
            );
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Mise à jour réussie: ${pagePath}`);
            return true;
        } else {
            console.log(`ℹ️  Aucune mise à jour nécessaire: ${pagePath}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de ${pagePath}:`, error.message);
        return false;
    }
}

// Fonction principale
function main() {
    console.log('🚀 Début de la mise à jour des pages pour la nouvelle sidebar...\n');

    let successCount = 0;
    let totalCount = 0;

    mainPages.forEach(page => {
        totalCount++;
        if (updatePage(page)) {
            successCount++;
        }
    });

    console.log(`\n📊 Résumé:`);
    console.log(`   - Pages traitées: ${totalCount}`);
    console.log(`   - Mises à jour réussies: ${successCount}`);
    console.log(`   - Échecs: ${totalCount - successCount}`);

    if (successCount === totalCount) {
        console.log('\n🎉 Toutes les pages ont été mises à jour avec succès !');
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Tester la navigation sur quelques pages');
        console.log('   2. Vérifier que toutes les sections de la sidebar fonctionnent');
        console.log('   3. Tester la fonctionnalité d\'expansion/réduction des sections');
    } else {
        console.log('\n⚠️  Certaines pages n\'ont pas pu être mises à jour. Vérifiez les erreurs ci-dessus.');
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { updatePage, mainPages };

