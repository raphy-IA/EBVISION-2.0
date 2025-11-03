/**
 * Script pour ajouter les scripts de branding à toutes les pages HTML
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Scripts de branding à ajouter
const brandingScripts = `
    <!-- CSS des variables de branding dynamiques -->
    <link rel="stylesheet" href="/config/themes/brand-variables.css">
    
    <!-- Scripts de branding -->
    <script src="js/branding-loader.js"></script>
    <script src="js/sidebar-branding.js"></script>`;

// Fonction pour ajouter les scripts de branding à un fichier HTML
function addBrandingToFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si les scripts sont déjà présents
    if (content.includes('branding-loader.js')) {
        console.log(`✓ ${path.basename(filePath)} - Déjà à jour`);
        return false;
    }
    
    // Chercher la balise </head>
    if (content.includes('</head>')) {
        const updatedContent = content.replace('</head>', `${brandingScripts}\n</head>`);
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✓ ${path.basename(filePath)} - Scripts de branding ajoutés`);
        return true;
    } else {
        console.log(`✗ ${path.basename(filePath)} - Pas de balise </head> trouvée`);
        return false;
    }
}

// Trouver tous les fichiers HTML dans public/ (sauf login.html et logout.html qui sont déjà faits)
const htmlFiles = fs.readdirSync(publicDir)
    .filter(file => file.endsWith('.html'))
    .filter(file => !['login.html', 'logout.html', 'clear-cache.html', 'debug-clicks.html'].includes(file))
    .map(file => path.join(publicDir, file));

console.log('\n==============================================');
console.log('  AJOUT DES SCRIPTS DE BRANDING');
console.log('==============================================\n');

let updated = 0;
let skipped = 0;

htmlFiles.forEach(file => {
    if (addBrandingToFile(file)) {
        updated++;
    } else {
        skipped++;
    }
});

console.log('\n==============================================');
console.log(`✓ ${updated} fichier(s) mis à jour`);
console.log(`- ${skipped} fichier(s) déjà à jour`);
console.log('==============================================\n');

