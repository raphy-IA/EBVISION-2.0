const fs = require('fs');

console.log('🔧 Correction de la duplication JavaScript...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Recherche de la duplication...');

// Créer une sauvegarde
const backupFile = 'public/collaborateurs_backup_before_duplication_fix.html';
fs.writeFileSync(backupFile, content);
console.log(`📋 Sauvegarde créée: ${backupFile}`);

// Remplacer toute la section corrompue par les fonctions correctes
const correctFunctions = `
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
        }

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

// Trouver le début de la section corrompue
const startPattern = /function loadGrades\(\) \{[\s\S]*?fetch\(\`\${API_BASE_URL}\`/;
const endPattern = /function loadDivisions\(\) \{/;

if (startPattern.test(content) && endPattern.test(content)) {
    console.log('✅ Section corrompue trouvée - Correction en cours...');
    
    // Trouver les positions
    const startMatch = content.match(startPattern);
    const endMatch = content.match(endPattern);
    
    if (startMatch && endMatch) {
        const startIndex = content.indexOf(startMatch[0]);
        const endIndex = content.indexOf(endMatch[0]);
        
        // Remplacer la section corrompue
        const beforeCorrupted = content.substring(0, startIndex);
        const afterCorrupted = content.substring(endIndex);
        const correctedContent = beforeCorrupted + correctFunctions + '\n\n' + afterCorrupted;
        
        // Sauvegarder le fichier corrigé
        fs.writeFileSync(collaborateursFile, correctedContent);
        console.log('✅ Duplication corrigée avec succès');
    } else {
        console.log('❌ Impossible de localiser les positions');
    }
} else {
    console.log('❌ Pattern non trouvé - Tentative alternative...');
    
    // Essayer une approche plus simple
    const corruptedSection = /function loadGrades\(\) \{[\s\S]*?function loadPostes\(\) \{[\s\S]*?\}\/postes`\)[\s\S]*?\}\/grades`\)[\s\S]*?\}/;
    
    if (corruptedSection.test(content)) {
        console.log('✅ Section corrompue trouvée avec pattern alternatif');
        const correctedContent = content.replace(corruptedSection, correctFunctions);
        fs.writeFileSync(collaborateursFile, correctedContent);
        console.log('✅ Correction appliquée');
    } else {
        console.log('❌ Aucun pattern trouvé - Correction manuelle nécessaire');
        
        // Essayer de remplacer ligne par ligne
        const lines = content.split('\n');
        let correctedLines = [];
        let inCorruptedSection = false;
        let skipUntilNextFunction = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('function loadGrades() {') && !inCorruptedSection) {
                inCorruptedSection = true;
                skipUntilNextFunction = true;
                correctedLines.push('        function loadGrades() {');
                correctedLines.push('            fetch(`${API_BASE_URL}/grades`)');
                correctedLines.push('                .then(response => response.json())');
                correctedLines.push('                .then(data => {');
                correctedLines.push('                    const selects = [\'grade-select\', \'edit-grade-select\'];');
                correctedLines.push('                    selects.forEach(selectId => {');
                correctedLines.push('                        const select = document.getElementById(selectId);');
                correctedLines.push('                        if (select) {');
                correctedLines.push('                            select.innerHTML = \'<option value="">Sélectionner un grade</option>\';');
                correctedLines.push('                            ');
                correctedLines.push('                            // Gérer la structure de réponse de l\'API');
                correctedLines.push('                            let grades = [];');
                correctedLines.push('                            if (data.success && data.data && Array.isArray(data.data)) {');
                correctedLines.push('                                grades = data.data;');
                correctedLines.push('                            } else if (Array.isArray(data)) {');
                correctedLines.push('                                grades = data;');
                correctedLines.push('                            }');
                correctedLines.push('                            ');
                correctedLines.push('                            grades.forEach(grade => {');
                correctedLines.push('                                const option = document.createElement(\'option\');');
                correctedLines.push('                                option.value = grade.id;');
                correctedLines.push('                                option.textContent = grade.nom;');
                correctedLines.push('                                select.appendChild(option);');
                correctedLines.push('                            });');
                correctedLines.push('                        }');
                correctedLines.push('                    });');
                correctedLines.push('                })');
                correctedLines.push('                .catch(error => {');
                correctedLines.push('                    console.error(\'Erreur lors du chargement des grades:\', error);');
                correctedLines.push('                });');
                correctedLines.push('        }');
                correctedLines.push('');
                correctedLines.push('        function loadPostes() {');
                correctedLines.push('            fetch(`${API_BASE_URL}/postes`)');
                correctedLines.push('                .then(response => response.json())');
                correctedLines.push('                .then(data => {');
                correctedLines.push('                    const selects = [\'poste-select\', \'edit-poste-select\'];');
                correctedLines.push('                    selects.forEach(selectId => {');
                correctedLines.push('                        const select = document.getElementById(selectId);');
                correctedLines.push('                        if (select) {');
                correctedLines.push('                            select.innerHTML = \'<option value="">Sélectionner un poste</option>\';');
                correctedLines.push('                            ');
                correctedLines.push('                            // Gérer la structure de réponse de l\'API');
                correctedLines.push('                            let postes = [];');
                correctedLines.push('                            if (data.success && data.data && Array.isArray(data.data)) {');
                correctedLines.push('                                postes = data.data;');
                correctedLines.push('                            } else if (Array.isArray(data)) {');
                correctedLines.push('                                postes = data;');
                correctedLines.push('                            }');
                correctedLines.push('                            ');
                correctedLines.push('                            postes.forEach(poste => {');
                correctedLines.push('                                const option = document.createElement(\'option\');');
                correctedLines.push('                                option.value = poste.id;');
                correctedLines.push('                                option.textContent = poste.nom;');
                correctedLines.push('                                select.appendChild(option);');
                correctedLines.push('                            });');
                correctedLines.push('                        }');
                correctedLines.push('                    });');
                correctedLines.push('                })');
                correctedLines.push('                .catch(error => {');
                correctedLines.push('                    console.error(\'Erreur lors du chargement des postes:\', error);');
                correctedLines.push('                });');
                correctedLines.push('        }');
                correctedLines.push('');
            } else if (line.includes('function loadDivisions() {') && skipUntilNextFunction) {
                skipUntilNextFunction = false;
                inCorruptedSection = false;
                correctedLines.push(line);
            } else if (!skipUntilNextFunction) {
                correctedLines.push(line);
            }
        }
        
        const correctedContent = correctedLines.join('\n');
        fs.writeFileSync(collaborateursFile, correctedContent);
        console.log('✅ Correction manuelle appliquée');
    }
}

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Pour tester :');
console.log('1. Recharger la page collaborateurs.html');
console.log('2. Ouvrir la console du navigateur (F12)');
console.log('3. Vérifier qu\'il n\'y a plus d\'erreurs de syntaxe');
console.log('4. Tester le bouton "Nouveau collaborateur"');
console.log('5. Tester le bouton "Gérer RH"');