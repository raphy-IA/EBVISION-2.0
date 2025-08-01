const fs = require('fs');
const path = require('path');

// Fonction pour ajouter le script d'authentification à une page HTML
function addAuthScript(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier si le script d'authentification est déjà présent
        if (content.includes('js/auth.js')) {
            console.log(`✅ ${path.basename(filePath)} : Script d'authentification déjà présent`);
            return;
        }
        
        // Chercher la ligne après les liens CSS pour ajouter le script
        const cssPattern = /<link rel="stylesheet" href="css\/modern-sidebar\.css">/;
        const match = content.match(cssPattern);
        
        if (match) {
            // Ajouter le script d'authentification après le CSS de la sidebar
            const newContent = content.replace(
                cssPattern,
                `<link rel="stylesheet" href="css/modern-sidebar.css">
    
    <!-- Script d'authentification -->
    <script src="js/auth.js"></script>`
            );
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.basename(filePath)} : Script d'authentification ajouté`);
        } else {
            console.log(`⚠️ ${path.basename(filePath)} : Pattern CSS non trouvé, ajout manuel nécessaire`);
        }
    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    }
}

// Fonction pour lister tous les fichiers HTML dans le dossier public
function processHtmlFiles(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Récursivement traiter les sous-dossiers
            processHtmlFiles(filePath);
        } else if (file.endsWith('.html')) {
            // Ignorer les fichiers de backup et les pages spéciales
            if (!file.includes('backup') && 
                !file.includes('test') && 
                !file.includes('old') &&
                file !== 'login.html' &&
                file !== 'logout.html') {
                addAuthScript(filePath);
            } else {
                console.log(`⏭️ ${file} : Fichier ignoré (backup/test/login)`);
            }
        }
    });
}

// Démarrer le traitement
console.log('🔧 Ajout du script d\'authentification sur toutes les pages HTML...\n');

const publicDir = path.join(__dirname, '..', 'public');
processHtmlFiles(publicDir);

console.log('\n✅ Traitement terminé !'); 