const fs = require('fs');
const path = require('path');

// Fonction pour ajouter la top bar aux pages HTML
function addTopBarToPages() {
    const publicDir = path.join(__dirname, '..', 'public');
    const files = fs.readdirSync(publicDir, { recursive: true });
    
    let updatedFiles = 0;
    let skippedFiles = 0;
    
    // Pages qui ne doivent PAS avoir de top bar
    const excludedPages = [
        'login.html',
        'logout.html',
        'index.html',
        '403.html'
    ];

    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(publicDir, file);
            const fileName = path.basename(file);
            
            // Ignorer les pages exclues
            if (excludedPages.includes(fileName)) {
                console.log(`⏭️  Ignoré (page exclue): ${file}`);
                skippedFiles++;
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;

            // Vérifier si la page a déjà une top bar
            if (content.includes('user-header.js')) {
                console.log(`✅ Déjà présente: ${file}`);
                skippedFiles++;
                return;
            }

            // Vérifier si c'est une page avec sidebar (doit avoir modern-sidebar.css)
            if (content.includes('modern-sidebar.css')) {
                // Ajouter les scripts de la top bar après Bootstrap
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

                // Ajouter le CSS de la top bar
                if (content.includes('modern-sidebar.css')) {
                    content = content.replace(
                        /<link rel="stylesheet" href="css\/modern-sidebar\.css">/,
                        `<link rel="stylesheet" href="css/modern-sidebar.css">
    <link rel="stylesheet" href="css/user-header.css">`
                    );
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Mis à jour: ${file}`);
                updatedFiles++;
            } else {
                console.log(`⏭️  Aucun changement: ${file}`);
                skippedFiles++;
            }
        }
    });

    console.log(`\n🎉 Mise à jour terminée !`);
    console.log(`📁 Fichiers modifiés: ${updatedFiles}`);
    console.log(`⏭️  Fichiers ignorés: ${skippedFiles}`);
    console.log(`📊 Total traité: ${updatedFiles + skippedFiles}`);
}

// Exécuter la mise à jour
console.log('🚀 Début de l\'ajout de la top bar aux pages...\n');
addTopBarToPages();


