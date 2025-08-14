const fs = require('fs');
const path = require('path');

// Fonction pour identifier et corriger les pages sans top bar
function fixMissingTopBar() {
    console.log('🔍 Recherche des pages sans top bar...\n');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const files = fs.readdirSync(publicDir, { recursive: true });
    
    let totalFiles = 0;
    let filesWithTopBar = 0;
    let filesWithoutTopBar = 0;
    let filesFixed = 0;
    let filesExcluded = 0;
    
    // Pages qui ne doivent PAS avoir de top bar
    const excludedPages = [
        'login.html',
        'logout.html',
        'index.html',
        '403.html'
    ];

    files.forEach(file => {
        if (file.endsWith('.html')) {
            totalFiles++;
            const filePath = path.join(publicDir, file);
            const fileName = path.basename(file);
            
            // Ignorer les pages exclues
            if (excludedPages.includes(fileName)) {
                console.log(`⏭️  Exclu: ${file}`);
                filesExcluded++;
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');
            
            // Vérifier si la page a déjà une top bar
            const hasTopBarCSS = content.includes('user-header.css');
            const hasTopBarJS = content.includes('user-header-utils.js');
            
            if (hasTopBarCSS && hasTopBarJS) {
                console.log(`✅ Déjà équipée: ${file}`);
                filesWithTopBar++;
            } else {
                console.log(`❌ Manquante: ${file}`);
                filesWithoutTopBar++;
                
                // Vérifier si c'est une page avec sidebar (doit avoir modern-sidebar.css)
                if (content.includes('modern-sidebar.css')) {
                    console.log(`  🔧 Ajout de la top bar...`);
                    
                    let updated = false;
                    
                    // Ajouter le CSS de la top bar
                    if (!hasTopBarCSS) {
                        if (content.includes('modern-sidebar.css')) {
                            content = content.replace(
                                /<link rel="stylesheet" href="css\/modern-sidebar\.css">/,
                                `<link rel="stylesheet" href="css/modern-sidebar.css">
    <link rel="stylesheet" href="css/user-header.css">`
                            );
                            updated = true;
                        }
                    }
                    
                    // Ajouter les scripts de la top bar
                    if (!hasTopBarJS) {
                        if (content.includes('bootstrap.min.js')) {
                            // Ajouter après Bootstrap
                            content = content.replace(
                                /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/js\/bootstrap\.min\.js"><\/script>/,
                                `<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js"></script>
    <!-- Scripts pour la top bar EBVISION 2.0 -->
    <script src="js/user-header-utils.js"></script>
    <script src="js/user-header-main.js"></script>
    <script src="js/user-header-init.js"></script>`
                            );
                            updated = true;
                        } else if (content.includes('</head>')) {
                            // Ajouter avant la fermeture de head
                            content = content.replace(
                                '</head>',
                                `    <!-- Scripts pour la top bar EBVISION 2.0 -->
    <script src="js/user-header-utils.js"></script>
    <script src="js/user-header-main.js"></script>
    <script src="js/user-header-init.js"></script>
</head>`
                            );
                            updated = true;
                        }
                    }
                    
                    if (updated) {
                        fs.writeFileSync(filePath, content, 'utf8');
                        console.log(`  ✅ Corrigée: ${file}`);
                        filesFixed++;
                    } else {
                        console.log(`  ⚠️  Impossible de corriger: ${file}`);
                    }
                } else {
                    console.log(`  ⏭️  Pas de sidebar, ignorée`);
                }
            }
        }
    });

    console.log('\n📊 Résultats');
    console.log('='.repeat(50));
    console.log(`Total des fichiers HTML: ${totalFiles}`);
    console.log(`Fichiers avec top bar: ${filesWithTopBar} ✅`);
    console.log(`Fichiers sans top bar: ${filesWithoutTopBar} ❌`);
    console.log(`Fichiers corrigés: ${filesFixed} 🔧`);
    console.log(`Fichiers exclus: ${filesExcluded} ⏭️`);
    
    if (filesWithoutTopBar === 0) {
        console.log('\n🎉 Toutes les pages ont maintenant une top bar !');
    } else {
        console.log(`\n⚠️  Il reste ${filesWithoutTopBar - filesFixed} pages sans top bar.`);
    }
}

// Exécuter la correction
console.log('🚀 Début de la correction des pages sans top bar...\n');
fixMissingTopBar();


