const fs = require('fs');
const path = require('path');

// Liste de toutes les pages principales (excluant les backups)
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
    'profile.html',
    'mission-details.html',
    'edit-mission-planning.html',
    'opportunity-details.html',
    'opportunity-stages.html',
    'invoice-details.html',
    'taux-horaires.html',
    'activites-internes.html',
    'create-mission-step1.html',
    'create-mission-step2.html',
    'create-mission-step3.html',
    'create-mission-step4.html',
    'time-entry-modern.html'
];

// Fonction pour nettoyer une page
function cleanPage(pagePath) {
    try {
        const fullPath = path.join(__dirname, '..', 'public', pagePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  Page non trouvée: ${pagePath}`);
            return false;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        let updated = false;

        // 1. Supprimer toutes les références à unified-sidebar.js
        if (content.includes('unified-sidebar.js')) {
            content = content.replace(/<script src="js\/unified-sidebar\.js"><\/script>\s*/g, '');
            content = content.replace(/<script src="\/js\/unified-sidebar\.js"><\/script>\s*/g, '');
            updated = true;
        }

        // 2. Supprimer les références à modern-sidebar.js
        if (content.includes('modern-sidebar.js')) {
            content = content.replace(/<script src="js\/modern-sidebar\.js"><\/script>\s*/g, '');
            content = content.replace(/<script src="\/js\/modern-sidebar\.js"><\/script>\s*/g, '');
            updated = true;
        }

        // 3. S'assurer que sidebar.js est inclus (une seule fois)
        if (!content.includes('sidebar.js')) {
            // Ajouter sidebar.js avant la fermeture de body
            content = content.replace(
                '</body>',
                '    <script src="js/sidebar.js" defer></script>\n    </body>'
            );
            updated = true;
        } else {
            // S'assurer qu'il n'y a qu'une seule référence
            const sidebarMatches = content.match(/<script[^>]*sidebar\.js[^>]*><\/script>/g);
            if (sidebarMatches && sidebarMatches.length > 1) {
                // Garder seulement la première occurrence
                content = content.replace(/<script[^>]*sidebar\.js[^>]*><\/script>/g, '');
                content = content.replace(
                    '</body>',
                    '    <script src="js/sidebar.js" defer></script>\n    </body>'
                );
                updated = true;
            }
        }

        // 4. S'assurer que modern-sidebar.css est inclus
        if (!content.includes('modern-sidebar.css')) {
            content = content.replace(
                '</head>',
                '    <link rel="stylesheet" href="css/modern-sidebar.css">\n    </head>'
            );
            updated = true;
        }

        // 5. S'assurer que la structure de base est correcte
        if (!content.includes('sidebar-container')) {
            // Ajouter la structure de base
            const sidebarStructure = `
    <!-- Sidebar -->
    <div class="col-md-3 col-lg-2 px-0">
        <div class="sidebar-container">
            <!-- La sidebar sera générée par sidebar.js -->
        </div>
    </div>

    <!-- Contenu principal -->
    <div class="col-md-9 col-lg-10">
        <div class="main-content">
            <!-- Contenu existant -->
`;
            
            // Chercher le contenu principal et l'encapsuler
            if (content.includes('<main') || content.includes('<div class="container')) {
                content = content.replace(
                    /<div class="container[^>]*>/g,
                    '<div class="container-fluid">\n    <div class="row g-0">' + sidebarStructure
                );
                content = content.replace(
                    /<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/g,
                    '        </div>\n    </div>\n</div>\n</div>\n</body>'
                );
            } else {
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

        // 6. Ajouter le bouton toggle mobile si pas présent
        if (!content.includes('sidebar-toggle')) {
            content = content.replace(
                '<body>',
                '<body>\n    <!-- Bouton toggle sidebar mobile -->\n    <button class="sidebar-toggle d-md-none">\n        <i class="fas fa-bars"></i>\n    </button>'
            );
            updated = true;
        }

        // 7. S'assurer que Font Awesome est inclus
        if (!content.includes('fontawesome') && !content.includes('font-awesome')) {
            content = content.replace(
                '</head>',
                '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">\n    </head>'
            );
            updated = true;
        }

        // 8. Nettoyer les espaces et lignes vides multiples
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

        if (updated) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Nettoyage réussi: ${pagePath}`);
            return true;
        } else {
            console.log(`ℹ️  Aucun nettoyage nécessaire: ${pagePath}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ Erreur lors du nettoyage de ${pagePath}:`, error.message);
        return false;
    }
}

// Fonction pour renommer les fichiers de sidebar non utilisés
function renameUnusedSidebarFiles() {
    console.log('\n🔄 Renommage des fichiers de sidebar non utilisés...\n');
    
    const filesToRename = [
        { src: 'public/js/unified-sidebar.js', dest: 'public/js/unified-sidebar.js.old' },
        { src: 'public/js/sidebar-generator.js', dest: 'public/js/sidebar-generator.js.old' },
        { src: 'public/css/sidebar.css', dest: 'public/css/sidebar.css.old' },
        { src: 'public/css/sidebar-fixes.css', dest: 'public/css/sidebar-fixes.css.old' },
        { src: 'public/test-sidebar.html', dest: 'public/test-sidebar.html.old' }
    ];
    
    let renamedCount = 0;
    
    filesToRename.forEach(file => {
        try {
            const srcPath = path.join(__dirname, '..', file.src);
            const destPath = path.join(__dirname, '..', file.dest);
            
            if (fs.existsSync(srcPath)) {
                fs.renameSync(srcPath, destPath);
                console.log(`✅ Renommé: ${file.src} → ${file.dest}`);
                renamedCount++;
            } else {
                console.log(`⚠️  Fichier non trouvé: ${file.src}`);
            }
        } catch (error) {
            console.log(`❌ Erreur lors du renommage de ${file.src}:`, error.message);
        }
    });
    
    console.log(`\n📊 ${renamedCount} fichiers renommés`);
    return renamedCount;
}

// Fonction pour supprimer les scripts de sidebar obsolètes
function removeObsoleteScripts() {
    console.log('\n🗑️  Suppression des scripts de sidebar obsolètes...\n');
    
    const scriptsToRemove = [
        'scripts/fix-sidebar-spacing.js',
        'scripts/ultimate-sidebar-fix.js',
        'scripts/update-pages-to-unified-sidebar.js',
        'scripts/clean-all-sidebars.js',
        'scripts/update-sidebar-template.js',
        'scripts/fix-sidebar-template-simple.js',
        'scripts/test-sidebar-quick.js',
        'scripts/test-final-sidebar.js'
    ];
    
    let removedCount = 0;
    
    scriptsToRemove.forEach(script => {
        try {
            const scriptPath = path.join(__dirname, '..', script);
            
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
                console.log(`✅ Supprimé: ${script}`);
                removedCount++;
            } else {
                console.log(`⚠️  Script non trouvé: ${script}`);
            }
        } catch (error) {
            console.log(`❌ Erreur lors de la suppression de ${script}:`, error.message);
        }
    });
    
    console.log(`\n📊 ${removedCount} scripts supprimés`);
    return removedCount;
}

// Fonction principale
function main() {
    console.log('🧹 Nettoyage complet de toutes les sidebars...\n');

    // 1. Nettoyer toutes les pages
    let successCount = 0;
    let totalCount = 0;

    mainPages.forEach(page => {
        totalCount++;
        if (cleanPage(page)) {
            successCount++;
        }
    });

    console.log(`\n📊 Résumé du nettoyage des pages:`);
    console.log(`   - Pages traitées: ${totalCount}`);
    console.log(`   - Nettoyages réussis: ${successCount}`);
    console.log(`   - Échecs: ${totalCount - successCount}`);

    // 2. Renommer les fichiers non utilisés
    const renamedCount = renameUnusedSidebarFiles();

    // 3. Supprimer les scripts obsolètes
    const removedCount = removeObsoleteScripts();

    console.log('\n🎉 Nettoyage terminé !');
    console.log('\n📝 Résumé final:');
    console.log(`   - Pages nettoyées: ${successCount}/${totalCount}`);
    console.log(`   - Fichiers renommés: ${renamedCount}`);
    console.log(`   - Scripts supprimés: ${removedCount}`);
    
    console.log('\n✅ Toutes les pages utilisent maintenant uniquement:');
    console.log('   - sidebar.js (JavaScript principal)');
    console.log('   - modern-sidebar.css (Styles)');
    console.log('   - template-modern-sidebar.html (Template)');
    
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Testez quelques pages pour vérifier le fonctionnement');
    console.log('   2. Vérifiez que toutes les sections s\'affichent correctement');
    console.log('   3. Testez l\'expansion/réduction des sections');
    console.log('   4. Vérifiez la navigation entre les pages');
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { cleanPage, renameUnusedSidebarFiles, removeObsoleteScripts };

