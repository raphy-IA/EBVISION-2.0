const fs = require('fs');

console.log('🔧 Correction de l\'erreur de syntaxe JavaScript...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Recherche de l\'erreur de syntaxe...');

// Le problème est que les fonctions loadGrades et loadPostes sont mélangées
// Il faut les séparer et corriger la syntaxe

// Créer les fonctions correctes
const loadGradesFunction = `
        function loadGrades() {
            fetch(\`\${API_BASE_URL}/grades\`)
                .then(response => response.json())
                .then(data => {
                    const selects = ['grade-select', 'edit-grade-select'];
                    selects.forEach(selectId => {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.innerHTML = '<option value="">Sélectionner un grade</option>';
                            
                            // Gérer la structure de réponse de l'API
                            let grades = [];
                            if (data.success && data.data && Array.isArray(data.data)) {
                                grades = data.data;
                            } else if (Array.isArray(data)) {
                                grades = data;
                            }
                            
                            grades.forEach(grade => {
                                const option = document.createElement('option');
                                option.value = grade.id;
                                option.textContent = grade.nom;
                                select.appendChild(option);
                            });
                        }
                    });
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des grades:', error);
                });
        }`;

const loadPostesFunction = `
        function loadPostes() {
            fetch(\`\${API_BASE_URL}/postes\`)
                .then(response => response.json())
                .then(data => {
                    const selects = ['poste-select', 'edit-poste-select'];
                    selects.forEach(selectId => {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.innerHTML = '<option value="">Sélectionner un poste</option>';
                            
                            // Gérer la structure de réponse de l'API
                            let postes = [];
                            if (data.success && data.data && Array.isArray(data.data)) {
                                postes = data.data;
                            } else if (Array.isArray(data)) {
                                postes = data;
                            }
                            
                            postes.forEach(poste => {
                                const option = document.createElement('option');
                                option.value = poste.id;
                                option.textContent = poste.nom;
                                select.appendChild(option);
                            });
                        }
                    });
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des postes:', error);
                });
        }`;

// Trouver et remplacer la section corrompue
const corruptedPattern = /function loadGrades\(\) \{[\s\S]*?function loadPostes\(\) \{[\s\S]*?\}\/grades\)[\s\S]*?\}/;

if (corruptedPattern.test(content)) {
    console.log('✅ Section corrompue trouvée - Correction en cours...');
    
    // Remplacer par les fonctions correctes
    const correctedContent = content.replace(
        corruptedPattern,
        loadGradesFunction + '\n\n' + loadPostesFunction
    );
    
    // Sauvegarder le fichier corrigé
    fs.writeFileSync(collaborateursFile, correctedContent);
    console.log('✅ Erreur de syntaxe corrigée avec succès');
} else {
    console.log('❌ Section corrompue non trouvée - Recherche alternative...');
    
    // Essayer de trouver la ligne problématique
    const lines = content.split('\n');
    for (let i = 1220; i < 1230; i++) {
        if (lines[i] && lines[i].includes('function loadGrades')) {
            console.log(`📍 Ligne ${i + 1}: ${lines[i]}`);
        }
    }
    
    // Créer une version de sauvegarde
    const backupFile = 'public/collaborateurs_backup_before_fix.html';
    fs.writeFileSync(backupFile, content);
    console.log(`📋 Sauvegarde créée: ${backupFile}`);
    
    // Essayer une correction manuelle
    console.log('🔧 Tentative de correction manuelle...');
    
    // Chercher la fonction loadGrades et la remplacer
    const loadGradesPattern = /function loadGrades\(\) \{[\s\S]*?\}/;
    if (loadGradesPattern.test(content)) {
        const updatedContent = content.replace(loadGradesPattern, loadGradesFunction);
        fs.writeFileSync(collaborateursFile, updatedContent);
        console.log('✅ Fonction loadGrades corrigée');
    }
    
    // Chercher la fonction loadPostes et la remplacer
    const loadPostesPattern = /function loadPostes\(\) \{[\s\S]*?\}/;
    if (loadPostesPattern.test(content)) {
        const updatedContent = content.replace(loadPostesPattern, loadPostesFunction);
        fs.writeFileSync(collaborateursFile, updatedContent);
        console.log('✅ Fonction loadPostes corrigée');
    }
}

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Pour tester :');
console.log('1. Recharger la page collaborateurs.html');
console.log('2. Ouvrir la console du navigateur (F12)');
console.log('3. Vérifier qu\'il n\'y a plus d\'erreurs de syntaxe');
console.log('4. Tester le bouton "Nouveau collaborateur"');
console.log('5. Tester le bouton "Gérer RH"');