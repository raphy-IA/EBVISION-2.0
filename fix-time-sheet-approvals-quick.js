const fs = require('fs');
const path = require('path');

console.log('🔧 Correction rapide du fichier time-sheet-approvals.js...');

// Lire le fichier
const filePath = path.join(__dirname, 'public', 'js', 'time-sheet-approvals.js');
let content = fs.readFileSync(filePath, 'utf8');

// Supprimer la duplication de code
const lines = content.split('\n');
let newLines = [];
let inDuplicate = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter le début de la duplication
    if (line.includes('} catch (error) {') && lines[i-1] && lines[i-1].includes('showAlert')) {
        inDuplicate = true;
        braceCount = 1;
        continue;
    }
    
    // Compter les accolades pour détecter la fin de la duplication
    if (inDuplicate) {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
        
        if (braceCount === 0) {
            inDuplicate = false;
            continue;
        }
        continue;
    }
    
    newLines.push(line);
}

// Écrire le fichier corrigé
const correctedContent = newLines.join('\n');
fs.writeFileSync(filePath, correctedContent);

console.log('✅ Fichier corrigé !');
console.log('📝 Vérifiez maintenant la page dans le navigateur.');
