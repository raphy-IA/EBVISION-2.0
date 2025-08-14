const fs = require('fs');
const path = require('path');

// Fonction pour mettre à jour le nom de l'application
function updateAppName() {
    const publicDir = path.join(__dirname, '..', 'public');
    const files = fs.readdirSync(publicDir, { recursive: true });
    
    let updatedFiles = 0;
    
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(publicDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;
            
            // Remplacer les titres de pages
            if (content.includes('TRS Dashboard')) {
                content = content.replace(/TRS Dashboard/g, 'EBVISION 2.0');
                updated = true;
            }
            
            if (content.includes('TRS -')) {
                content = content.replace(/TRS -/g, 'EBVISION 2.0 -');
                updated = true;
            }
            
            if (content.includes('- TRS')) {
                content = content.replace(/- TRS/g, '- EBVISION 2.0');
                updated = true;
            }
            
            if (content.includes('TRS')) {
                content = content.replace(/TRS/g, 'EBVISION 2.0');
                updated = true;
            }
            
            if (updated) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Mis à jour: ${file}`);
                updatedFiles++;
            }
        }
    });
    
    console.log(`\n🎉 Mise à jour terminée ! ${updatedFiles} fichiers modifiés.`);
}

// Exécuter la mise à jour
updateAppName();


