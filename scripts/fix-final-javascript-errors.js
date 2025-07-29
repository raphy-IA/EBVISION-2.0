const fs = require('fs');

console.log('🔧 Correction des erreurs JavaScript finales...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Recherche des erreurs...');

// Créer une sauvegarde
const backupFile = 'public/collaborateurs_backup_before_final_fix.html';
fs.writeFileSync(backupFile, content);
console.log(`📋 Sauvegarde créée: ${backupFile}`);

// 1. Ajouter la fonction showNewCollaborateurModal manquante
const showNewCollaborateurModalFunction = `
        function showNewCollaborateurModal() {
            console.log('🔄 Ouverture du modal nouveau collaborateur...');
            
            // Charger les données nécessaires
            loadBusinessUnits();
            loadGrades();
            loadPostes();
            loadTypesCollaborateurs();
            loadDivisions();
            
            // Afficher le modal
            const modal = new bootstrap.Modal(document.getElementById('newCollaborateurModal'));
            modal.show();
            
            console.log('✅ Modal nouveau collaborateur affiché');
        }`;

// 2. Corriger l'erreur de syntaxe à la ligne 2003
// Chercher la ligne problématique
const lines = content.split('\n');
let correctedLines = [];
let foundError = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Vérifier si c'est la ligne 2003 (index 2002)
    if (i === 2002) {
        console.log(`📍 Ligne ${i + 1} problématique: ${line}`);
        
        // Chercher l'erreur de syntaxe
        if (line.includes('showAlert(') && !line.includes(')')) {
            console.log('🔧 Correction de l\'erreur de syntaxe showAlert...');
            // Corriger la ligne
            const correctedLine = line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
            correctedLines.push(correctedLine);
            foundError = true;
        } else {
            correctedLines.push(line);
        }
    } else {
        correctedLines.push(line);
    }
}

// 3. Ajouter la fonction showNewCollaborateurModal si elle n'existe pas
if (!content.includes('function showNewCollaborateurModal()')) {
    console.log('🔧 Ajout de la fonction showNewCollaborateurModal...');
    
    // Trouver un bon endroit pour l'ajouter (après les autres fonctions)
    const insertPattern = /function loadDivisions\(\) \{[\s\S]*?\}/;
    if (insertPattern.test(content)) {
        const updatedContent = content.replace(
            insertPattern,
            insertPattern.exec(content)[0] + '\n\n' + showNewCollaborateurModalFunction
        );
        
        // Appliquer aussi les corrections de lignes
        const finalContent = updatedContent.split('\n').map((line, index) => {
            if (index === 2002) {
                if (line.includes('showAlert(') && !line.includes(')')) {
                    return line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
                }
            }
            return line;
        }).join('\n');
        
        fs.writeFileSync(collaborateursFile, finalContent);
        console.log('✅ Fonction showNewCollaborateurModal ajoutée et erreur de syntaxe corrigée');
    } else {
        // Si on ne trouve pas le pattern, ajouter à la fin du script
        const scriptEndPattern = /<\/script>/;
        const updatedContent = content.replace(
            scriptEndPattern,
            showNewCollaborateurModalFunction + '\n    </script>'
        );
        
        // Appliquer aussi les corrections de lignes
        const finalContent = updatedContent.split('\n').map((line, index) => {
            if (index === 2002) {
                if (line.includes('showAlert(') && !line.includes(')')) {
                    return line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
                }
            }
            return line;
        }).join('\n');
        
        fs.writeFileSync(collaborateursFile, finalContent);
        console.log('✅ Fonction showNewCollaborateurModal ajoutée à la fin et erreur de syntaxe corrigée');
    }
} else {
    console.log('✅ Fonction showNewCollaborateurModal existe déjà');
    
    // Appliquer seulement les corrections de lignes
    const finalContent = content.split('\n').map((line, index) => {
        if (index === 2002) {
            if (line.includes('showAlert(') && !line.includes(')')) {
                return line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
            }
        }
        return line;
    }).join('\n');
    
    fs.writeFileSync(collaborateursFile, finalContent);
    console.log('✅ Erreur de syntaxe corrigée');
}

// 4. Vérifier qu'il n'y a pas d'autres erreurs de syntaxe
console.log('\n🔍 Vérification finale...');

const finalContent = fs.readFileSync(collaborateursFile, 'utf8');

// Vérifier les fonctions essentielles
const essentialFunctions = [
    'function showNewCollaborateurModal()',
    'function loadGrades()',
    'function loadPostes()',
    'function loadDivisions()',
    'function loadBusinessUnits()'
];

essentialFunctions.forEach(func => {
    if (finalContent.includes(func)) {
        console.log(`✅ ${func} - OK`);
    } else {
        console.log(`❌ ${func} - MANQUANT`);
    }
});

// Vérifier les erreurs de syntaxe courantes
const syntaxErrors = [
    /showAlert\([^)]*$/,
    /console\.log\([^)]*$/,
    /fetch\([^)]*$/
];

let hasSyntaxErrors = false;
syntaxErrors.forEach(pattern => {
    if (pattern.test(finalContent)) {
        console.log(`❌ Erreur de syntaxe détectée: ${pattern}`);
        hasSyntaxErrors = true;
    }
});

if (!hasSyntaxErrors) {
    console.log('✅ Aucune erreur de syntaxe détectée');
}

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Pour tester :');
console.log('1. Recharger la page collaborateurs.html');
console.log('2. Ouvrir la console du navigateur (F12)');
console.log('3. Vérifier qu\'il n\'y a plus d\'erreurs de syntaxe');
console.log('4. Tester le bouton "Nouveau collaborateur"');
console.log('5. Tester le bouton "Gérer RH"');