const fs = require('fs');
const path = require('path');

// Fonction pour corriger les styles problématiques dans une page
function fixPageStyles(content) {
    // Supprimer les styles problématiques avec !important
    let fixedContent = content;
    
    // Remplacer les styles problématiques par des styles propres
    const problematicStyles = [
        /<style>\s*\*\s*\{\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*box-sizing:\s*border-box\s*!important;\s*\}\s*body\s*\{\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*overflow-x:\s*hidden\s*!important;\s*\}\s*\.sidebar-container\s*\{\s*position:\s*fixed\s*!important;\s*left:\s*0\s*!important;\s*top:\s*0\s*!important;\s*width:\s*250px\s*!important;\s*max-width:\s*250px\s*!important;\s*min-width:\s*250px\s*!important;\s*height:\s*100vh\s*!important;\s*z-index:\s*1000\s*!important;\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*\}\s*\.main-content\s*\{\s*position:\s*relative\s*!important;\s*margin-left:\s*250px\s*!important;\s*width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*max-width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*min-width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*padding:\s*0\s*!important;\s*margin-top:\s*0\s*!important;\s*margin-right:\s*0\s*!important;\s*margin-bottom:\s*0\s*!important;\s*left:\s*0\s*!important;\s*top:\s*0\s*!important;\s*\}\s*\.container-fluid\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*max-width:\s*none\s*!important;\s*width:\s*100%\s*!important;\s*\}\s*\.container\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*max-width:\s*none\s*!important;\s*width:\s*100%\s*!important;\s*\}\s*\.row\s*\{\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*\}\s*\.col,\s*\.col-1,\s*\.col-2,\s*\.col-3,\s*\.col-4,\s*\.col-5,\s*\.col-6,\s*\.col-7,\s*\.col-8,\s*\.col-9,\s*\.col-10,\s*\.col-11,\s*\.col-12\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*\}\s*\.col-sm,\s*\.col-sm-1,\s*\.col-sm-2,\s*\.col-sm-3,\s*\.col-sm-4,\s*\.col-sm-5,\s*\.col-sm-6,\s*\.col-sm-7,\s*\.col-sm-8,\s*\.col-sm-9,\s*\.col-sm-10,\s*\.col-sm-11,\s*\.col-sm-12\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*\}\s*\.col-md,\s*\.col-md-1,\s*\.col-md-2,\s*\.col-md-3,\s*\.col-md-4,\s*\.col-md-5,\s*\.col-md-6,\s*\.col-md-7,\s*\.col-md-8,\s*\.col-md-9,\s*\.col-md-10,\s*\.col-md-11,\s*\.col-md-12\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*\}\s*\.col-lg,\s*\.col-lg-1,\s*\.col-lg-2,\s*\.col-lg-3,\s*\.col-lg-4,\s*\.col-lg-5,\s*\.col-lg-6,\s*\.col-lg-7,\s*\.col-lg-8,\s*\.col-lg-9,\s*\.col-lg-10,\s*\.col-lg-11,\s*\.col-lg-12\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*\}\s*\.col-xl,\s*\.col-xl-1,\s*\.col-xl-2,\s*\.col-xl-3,\s*\.col-xl-4,\s*\.col-xl-5,\s*\.col-xl-6,\s*\.col-xl-7,\s*\.col-xl-8,\s*\.col-xl-9,\s*\.col-xl-10,\s*\.col-xl-11,\s*\.col-xl-12\s*\{\s*padding:\s*0\s*!important;\s*margin:\s*0\s*!important;\s*\}\s*#sidebarContainer\s*\{\s*width:\s*250px\s*!important;\s*max-width:\s*250px\s*!important;\s*min-width:\s*250px\s*!important;\s*position:\s*fixed\s*!important;\s*left:\s*0\s*!important;\s*top:\s*0\s*!important;\s*z-index:\s*1000\s*!important;\s*\}\s*#mainContent\s*\{\s*margin-left:\s*250px\s*!important;\s*width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*max-width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*min-width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*position:\s*relative\s*!important;\s*left:\s*0\s*!important;\s*top:\s*0\s*!important;\s*\}\s*\.sidebar\s*\{\s*width:\s*250px\s*!important;\s*max-width:\s*250px\s*!important;\s*min-width:\s*250px\s*!important;\s*position:\s*fixed\s*!important;\s*left:\s*0\s*!important;\s*top:\s*0\s*!important;\s*z-index:\s*1000\s*!important;\s*\}\s*\.col-md-3\.col-lg-2\.px-0\.sidebar-container\s*\{\s*display:\s*none\s*!important;\s*\}\s*<\/style>/g,
        /<style>\s*body\s*\{\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*overflow-x:\s*hidden\s*!important;\s*\}\s*\.sidebar-container\s*\{\s*width:\s*250px\s*!important;\s*max-width:\s*250px\s*!important;\s*\}\s*\.main-content\s*\{\s*margin-left:\s*250px\s*!important;\s*width:\s*calc\(100vw\s*-\s*250px\)\s*!important;\s*\}\s*<\/style>/g
    ];
    
    problematicStyles.forEach(pattern => {
        fixedContent = fixedContent.replace(pattern, '');
    });
    
    // Supprimer les références aux fichiers CSS supprimés
    const removedCSSFiles = [
        /<link href="\/css\/sidebar-fixes\.css" rel="stylesheet">/g,
        /<link href="\/css\/force-alignment\.css" rel="stylesheet">/g,
        /<link href="\/css\/ultimate-fix\.css" rel="stylesheet">/g
    ];
    
    removedCSSFiles.forEach(pattern => {
        fixedContent = fixedContent.replace(pattern, '');
    });
    
    // Ajouter des styles de base propres
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
    
    // Remplacer les styles dans le head
    fixedContent = fixedContent.replace(/<link href="\/css\/sidebar\.css" rel="stylesheet">/, 
        `<link href="/css/sidebar.css" rel="stylesheet">${cleanStyles}`);
    
    return fixedContent;
}

// Fonction pour restaurer une page depuis la sauvegarde
function restorePageFromBackup(pageName, backupName) {
    const publicDir = path.join(__dirname, '..', 'public');
    const backupPath = path.join(publicDir, backupName);
    const pagePath = path.join(publicDir, pageName);
    
    if (!fs.existsSync(backupPath)) {
        console.log(`❌ Sauvegarde ${backupName} n'existe pas pour ${pageName}`);
        return;
    }
    
    try {
        let content = fs.readFileSync(backupPath, 'utf8');
        
        // Adapter le contenu pour la nouvelle page
        content = content.replace(/Gestion des Collaborateurs/g, `Gestion des ${pageName.replace('.html', '').charAt(0).toUpperCase() + pageName.replace('.html', '').slice(1)}`);
        content = content.replace(/collaborateurs/g, pageName.replace('.html', ''));
        
        // Corriger les styles
        content = fixPageStyles(content);
        
        fs.writeFileSync(pagePath, content);
        console.log(`✅ Page ${pageName} restaurée depuis ${backupName}`);
        
    } catch (error) {
        console.error(`❌ Erreur lors de la restauration de ${pageName}:`, error.message);
    }
}

// Fonction principale
function restoreAllPages() {
    console.log('🔧 Restauration des pages depuis les sauvegardes...');
    
    // Pages à restaurer depuis collaborateurs_backup.html
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
    
    pagesToRestore.forEach(pageName => {
        restorePageFromBackup(pageName, 'collaborateurs_backup.html');
    });
    
    console.log('✅ Restauration terminée !');
    console.log('📝 Note: Les pages ont été restaurées avec le contenu adapté.');
}

// Exécuter le script
if (require.main === module) {
    restoreAllPages();
}

module.exports = { restoreAllPages, restorePageFromBackup, fixPageStyles }; 