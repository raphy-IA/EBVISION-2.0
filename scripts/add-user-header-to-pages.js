const fs = require('fs');
const path = require('path');

// Fonction pour ajouter les scripts de zone utilisateur à une page HTML
function addUserHeaderScripts(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier si les scripts sont déjà présents
        if (content.includes('js/user-header.js') && content.includes('js/user-modals.js')) {
            console.log(`✅ ${path.basename(filePath)} : Scripts de zone utilisateur déjà présents`);
            return;
        }
        
        // Chercher la ligne après le script d'authentification pour ajouter les nouveaux scripts
        const authScriptPattern = /<script src="js\/auth\.js"><\/script>/;
        const match = content.match(authScriptPattern);
        
        if (match) {
            // Ajouter les scripts de zone utilisateur après le script d'authentification
            const newContent = content.replace(
                authScriptPattern,
                `<script src="js/auth.js"></script>
                
                <!-- Scripts de zone utilisateur -->
                <script src="js/user-header.js"></script>
                <script src="js/user-modals.js"></script>`
            );
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.basename(filePath)} : Scripts de zone utilisateur ajoutés`);
        } else {
            console.log(`⚠️ ${path.basename(filePath)} : Script d'authentification non trouvé, ajout manuel nécessaire`);
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
                !file.includes('_backup') &&
                !file.includes('_test') &&
                !file.includes('_simple') &&
                !file.includes('_fixed') &&
                !file.includes('_Gemini') &&
                !file.includes('_autre') &&
                !file.includes('_presque_parfait') &&
                !file.includes('_final') &&
                !file.includes('_before_') &&
                !file.includes('_function_') &&
                !file.includes('_debug_') &&
                !file.includes('_duplication_') &&
                !file.includes('_cleanup_') &&
                file !== 'login.html' &&
                file !== 'logout.html' &&
                file !== 'test-simple.html' &&
                file !== 'test-rh.html' &&
                file !== 'template.html' &&
                file !== 'template-unified.old.html') {
                addUserHeaderScripts(filePath);
            } else {
                console.log(`⏭️ ${file} : Fichier ignoré (backup/test/template)`);
            }
        }
    });
}

// Démarrer le traitement
console.log('🔧 Ajout des scripts de zone utilisateur sur toutes les pages HTML...\n');

const publicDir = path.join(__dirname, '..', 'public');
processHtmlFiles(publicDir);

console.log('\n✅ Traitement terminé !');
console.log('\n📋 Résumé des fonctionnalités ajoutées :');
console.log('- Zone utilisateur en haut de toutes les pages');
console.log('- Affichage du profil utilisateur avec nom et rôle');
console.log('- Notifications avec compteur et liste déroulante');
console.log('- Tâches assignées avec compteur et liste déroulante');
console.log('- Bouton de déconnexion');
console.log('- Modale de modification du profil utilisateur');
console.log('- Modale de changement de mot de passe avec validation'); 