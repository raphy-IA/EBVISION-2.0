const fs = require('fs');

console.log('🔧 Nettoyage final du JavaScript...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Nettoyage des restes de code corrompu...');

// Créer une sauvegarde
const backupFile = 'public/collaborateurs_backup_before_final_cleanup.html';
fs.writeFileSync(backupFile, content);
console.log(`📋 Sauvegarde créée: ${backupFile}`);

// Remplacer complètement la section problématique
const cleanFunctions = `
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

// Trouver et remplacer la section complète
const startMarker = 'function loadGrades() {';
const endMarker = 'function loadDivisions() {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    console.log('✅ Section trouvée - Remplacement en cours...');
    
    const beforeSection = content.substring(0, startIndex);
    const afterSection = content.substring(endIndex);
    const cleanedContent = beforeSection + cleanFunctions + '\n\n' + afterSection;
    
    fs.writeFileSync(collaborateursFile, cleanedContent);
    console.log('✅ Nettoyage terminé avec succès');
} else {
    console.log('❌ Marqueurs non trouvés - Tentative alternative...');
    
    // Essayer de nettoyer ligne par ligne
    const lines = content.split('\n');
    let cleanedLines = [];
    let inCorruptedSection = false;
    let skipUntilNextFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('function loadGrades() {') && !inCorruptedSection) {
            inCorruptedSection = true;
            skipUntilNextFunction = true;
            cleanedLines.push('        function loadGrades() {');
            cleanedLines.push('            fetch(`${API_BASE_URL}/grades`)');
            cleanedLines.push('                .then(response => response.json())');
            cleanedLines.push('                .then(data => {');
            cleanedLines.push('                    const selects = [\'grade-select\', \'edit-grade-select\'];');
            cleanedLines.push('                    selects.forEach(selectId => {');
            cleanedLines.push('                        const select = document.getElementById(selectId);');
            cleanedLines.push('                        if (select) {');
            cleanedLines.push('                            select.innerHTML = \'<option value="">Sélectionner un grade</option>\';');
            cleanedLines.push('                            ');
            cleanedLines.push('                            // Gérer la structure de réponse de l\'API');
            cleanedLines.push('                            let grades = [];');
            cleanedLines.push('                            if (data.success && data.data && Array.isArray(data.data)) {');
            cleanedLines.push('                                grades = data.data;');
            cleanedLines.push('                            } else if (Array.isArray(data)) {');
            cleanedLines.push('                                grades = data;');
            cleanedLines.push('                            }');
            cleanedLines.push('                            ');
            cleanedLines.push('                            grades.forEach(grade => {');
            cleanedLines.push('                                const option = document.createElement(\'option\');');
            cleanedLines.push('                                option.value = grade.id;');
            cleanedLines.push('                                option.textContent = grade.nom;');
            cleanedLines.push('                                select.appendChild(option);');
            cleanedLines.push('                            });');
            cleanedLines.push('                        }');
            cleanedLines.push('                    });');
            cleanedLines.push('                })');
            cleanedLines.push('                .catch(error => {');
            cleanedLines.push('                    console.error(\'Erreur lors du chargement des grades:\', error);');
            cleanedLines.push('                });');
            cleanedLines.push('        }');
            cleanedLines.push('');
            cleanedLines.push('        function loadPostes() {');
            cleanedLines.push('            fetch(`${API_BASE_URL}/postes`)');
            cleanedLines.push('                .then(response => response.json())');
            cleanedLines.push('                .then(data => {');
            cleanedLines.push('                    const selects = [\'poste-select\', \'edit-poste-select\'];');
            cleanedLines.push('                    selects.forEach(selectId => {');
            cleanedLines.push('                        const select = document.getElementById(selectId);');
            cleanedLines.push('                        if (select) {');
            cleanedLines.push('                            select.innerHTML = \'<option value="">Sélectionner un poste</option>\';');
            cleanedLines.push('                            ');
            cleanedLines.push('                            // Gérer la structure de réponse de l\'API');
            cleanedLines.push('                            let postes = [];');
            cleanedLines.push('                            if (data.success && data.data && Array.isArray(data.data)) {');
            cleanedLines.push('                                postes = data.data;');
            cleanedLines.push('                            } else if (Array.isArray(data)) {');
            cleanedLines.push('                                postes = data;');
            cleanedLines.push('                            }');
            cleanedLines.push('                            ');
            cleanedLines.push('                            postes.forEach(poste => {');
            cleanedLines.push('                                const option = document.createElement(\'option\');');
            cleanedLines.push('                                option.value = poste.id;');
            cleanedLines.push('                                option.textContent = poste.nom;');
            cleanedLines.push('                                select.appendChild(option);');
            cleanedLines.push('                            });');
            cleanedLines.push('                        }');
            cleanedLines.push('                    });');
            cleanedLines.push('                })');
            cleanedLines.push('                .catch(error => {');
            cleanedLines.push('                    console.error(\'Erreur lors du chargement des postes:\', error);');
            cleanedLines.push('                });');
            cleanedLines.push('        }');
            cleanedLines.push('');
        } else if (line.includes('function loadDivisions() {') && skipUntilNextFunction) {
            skipUntilNextFunction = false;
            inCorruptedSection = false;
            cleanedLines.push(line);
        } else if (!skipUntilNextFunction) {
            cleanedLines.push(line);
        }
    }
    
    const cleanedContent = cleanedLines.join('\n');
    fs.writeFileSync(collaborateursFile, cleanedContent);
    console.log('✅ Nettoyage manuel appliqué');
}

console.log('\n✅ Nettoyage terminé !');
console.log('\n🧪 Pour tester :');
console.log('1. Recharger la page collaborateurs.html');
console.log('2. Ouvrir la console du navigateur (F12)');
console.log('3. Vérifier qu\'il n\'y a plus d\'erreurs de syntaxe');
console.log('4. Tester le bouton "Nouveau collaborateur"');
console.log('5. Tester le bouton "Gérer RH"');