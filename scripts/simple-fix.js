const fs = require('fs');

console.log('🔧 Correction simple des erreurs JavaScript...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Recherche des erreurs...');

// 1. Vérifier si la fonction showNewCollaborateurModal existe
if (!content.includes('function showNewCollaborateurModal()')) {
    console.log('🔧 Ajout de la fonction showNewCollaborateurModal...');
    
    const functionToAdd = `
        function showNewCollaborateurModal() {
            console.log('🔄 Ouverture du modal nouveau collaborateur...');
            
            try {
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
            } catch (error) {
                console.error('❌ Erreur lors de l\'ouverture du modal:', error);
                alert('Erreur lors de l\'ouverture du modal: ' + error.message);
            }
        }`;
    
    // Ajouter à la fin du script
    const scriptEndPattern = /<\/script>/;
    const updatedContent = content.replace(
        scriptEndPattern,
        functionToAdd + '\n    </script>'
    );
    
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Fonction showNewCollaborateurModal ajoutée');
} else {
    console.log('✅ Fonction showNewCollaborateurModal existe déjà');
}

// 2. Vérifier et corriger l'erreur de syntaxe
const lines = content.split('\n');
let hasError = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('showAlert(') && !line.includes(')')) {
        console.log(`❌ Erreur de syntaxe trouvée à la ligne ${i + 1}: ${line}`);
        hasError = true;
    }
}

if (hasError) {
    console.log('🔧 Correction des erreurs de syntaxe...');
    
    // Remplacer toutes les occurrences de showAlert mal formées
    let correctedContent = content;
    correctedContent = correctedContent.replace(/showAlert\([^)]*$/gm, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
    
    fs.writeFileSync(collaborateursFile, correctedContent);
    console.log('✅ Erreurs de syntaxe corrigées');
} else {
    console.log('✅ Aucune erreur de syntaxe détectée');
}

// 3. Ajouter des logs de debug simples
const debugFunction = `
        // Debug simple
        console.log('🔍 DEBUG: Page collaborateurs.html chargée');
        
        // Remplacer la fonction loadCollaborateurs pour ajouter du debug
        const originalLoadCollaborateurs = window.loadCollaborateurs;
        window.loadCollaborateurs = function() {
            console.log('🔍 DEBUG: Chargement des collaborateurs...');
            if (originalLoadCollaborateurs) {
                originalLoadCollaborateurs();
            } else {
                console.error('❌ DEBUG: Fonction loadCollaborateurs originale non trouvée');
            }
        };
        
        // Debug au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔍 DEBUG: DOM chargé');
            console.log('🔍 DEBUG: Éléments trouvés:');
            console.log('- newCollaborateurModal:', !!document.getElementById('newCollaborateurModal'));
            console.log('- collaborateurs-table:', !!document.getElementById('collaborateurs-table'));
            console.log('- collaborateurs-loading:', !!document.getElementById('collaborateurs-loading'));
            console.log('- collaborateurs-content:', !!document.getElementById('collaborateurs-content'));
        });`;

// Ajouter le debug
const scriptEndPattern2 = /<\/script>/;
const finalContent = content.replace(
    scriptEndPattern2,
    debugFunction + '\n    </script>'
);

fs.writeFileSync(collaborateursFile, finalContent);
console.log('✅ Debug simple ajouté');

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Instructions de test :');
console.log('1. Démarrer le serveur: npm start');
console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
console.log('3. Ouvrir la console du navigateur (F12)');
console.log('4. Vous devriez voir des logs de debug');
console.log('5. Tester le bouton "Nouveau collaborateur"');
console.log('6. Tester le bouton "Gérer RH"');