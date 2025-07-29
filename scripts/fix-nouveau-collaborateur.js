const fs = require('fs');

console.log('🔧 Correction du bouton "Nouveau collaborateur"...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Vérification de la fonction loadPostes...');

// Vérifier si la fonction loadPostes existe
if (content.includes('function loadPostes()')) {
    console.log('✅ Fonction loadPostes existe déjà');
} else {
    console.log('❌ Fonction loadPostes manquante - Ajout en cours...');
    
    // Trouver la fonction loadGrades pour ajouter loadPostes après
    const loadGradesPattern = /function loadGrades\(\) \{[\s\S]*?\}/;
    const loadGradesMatch = content.match(loadGradesPattern);
    
    if (loadGradesMatch) {
        console.log('✅ Fonction loadGrades trouvée');
        
        // Créer la fonction loadPostes
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
        
        // Ajouter la fonction après loadGrades
        const updatedContent = content.replace(
            loadGradesPattern,
            loadGradesMatch[0] + loadPostesFunction
        );
        
        // Sauvegarder le fichier
        fs.writeFileSync(collaborateursFile, updatedContent);
        console.log('✅ Fonction loadPostes ajoutée avec succès');
    } else {
        console.log('❌ Fonction loadGrades non trouvée - Impossible d\'ajouter loadPostes');
    }
}

// Vérifier aussi la fonction loadTypesCollaborateurs
console.log('\n📋 Vérification de la fonction loadTypesCollaborateurs...');

if (content.includes('function loadTypesCollaborateurs()')) {
    console.log('✅ Fonction loadTypesCollaborateurs existe');
} else {
    console.log('❌ Fonction loadTypesCollaborateurs manquante - Ajout en cours...');
    
    // Trouver la fonction loadDivisions pour ajouter loadTypesCollaborateurs après
    const loadDivisionsPattern = /function loadDivisions\(\) \{[\s\S]*?\}/;
    const loadDivisionsMatch = content.match(loadDivisionsPattern);
    
    if (loadDivisionsMatch) {
        console.log('✅ Fonction loadDivisions trouvée');
        
        // Créer la fonction loadTypesCollaborateurs
        const loadTypesCollaborateursFunction = `
        function loadTypesCollaborateurs() {
            fetch(\`\${API_BASE_URL}/types-collaborateurs\`)
                .then(response => response.json())
                .then(data => {
                    const selects = ['typeCollaborateur-select', 'edit-typeCollaborateur-select'];
                    selects.forEach(selectId => {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.innerHTML = '<option value="">Sélectionner un type</option>';
                            
                            // Gérer la structure de réponse de l'API
                            let types = [];
                            if (data.success && data.data && Array.isArray(data.data)) {
                                types = data.data;
                            } else if (Array.isArray(data)) {
                                types = data;
                            }
                            
                            types.forEach(type => {
                                const option = document.createElement('option');
                                option.value = type.id;
                                option.textContent = type.nom;
                                select.appendChild(option);
                            });
                        }
                    });
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des types collaborateurs:', error);
                });
        }`;
        
        // Ajouter la fonction après loadDivisions
        const updatedContent = content.replace(
            loadDivisionsPattern,
            loadDivisionsMatch[0] + loadTypesCollaborateursFunction
        );
        
        // Sauvegarder le fichier
        fs.writeFileSync(collaborateursFile, updatedContent);
        console.log('✅ Fonction loadTypesCollaborateurs ajoutée avec succès');
    } else {
        console.log('❌ Fonction loadDivisions non trouvée - Impossible d\'ajouter loadTypesCollaborateurs');
    }
}

// Vérifier aussi la fonction loadDivisionsForBusinessUnit
console.log('\n📋 Vérification de la fonction loadDivisionsForBusinessUnit...');

if (content.includes('function loadDivisionsForBusinessUnit()')) {
    console.log('✅ Fonction loadDivisionsForBusinessUnit existe');
} else {
    console.log('❌ Fonction loadDivisionsForBusinessUnit manquante - Ajout en cours...');
    
    // Créer la fonction loadDivisionsForBusinessUnit
    const loadDivisionsForBusinessUnitFunction = `
        function loadDivisionsForBusinessUnit() {
            const businessUnitSelect = document.getElementById('business-unit-select');
            const divisionSelect = document.getElementById('division-select');
            
            if (businessUnitSelect && divisionSelect) {
                const businessUnitId = businessUnitSelect.value;
                
                if (businessUnitId) {
                    fetch(\`\${API_BASE_URL}/divisions?business_unit_id=\${businessUnitId}\`)
                        .then(response => response.json())
                        .then(data => {
                            divisionSelect.innerHTML = '<option value="">Sélectionner une division</option>';
                            
                            // Gérer la structure de réponse de l'API
                            let divisions = [];
                            if (data.success && data.data && Array.isArray(data.data)) {
                                divisions = data.data;
                            } else if (Array.isArray(data)) {
                                divisions = data;
                            }
                            
                            divisions.forEach(division => {
                                const option = document.createElement('option');
                                option.value = division.id;
                                option.textContent = division.nom;
                                divisionSelect.appendChild(option);
                            });
                        })
                        .catch(error => {
                            console.error('Erreur lors du chargement des divisions:', error);
                        });
                } else {
                    divisionSelect.innerHTML = '<option value="">Sélectionner une division</option>';
                }
            }
        }`;
    
    // Ajouter la fonction à la fin du script
    const scriptEndPattern = /<\/script>/;
    const updatedContent = content.replace(
        scriptEndPattern,
        loadDivisionsForBusinessUnitFunction + '\n    </script>'
    );
    
    // Sauvegarder le fichier
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Fonction loadDivisionsForBusinessUnit ajoutée avec succès');
}

// Vérifier aussi la fonction loadPostesForType
console.log('\n📋 Vérification de la fonction loadPostesForType...');

if (content.includes('function loadPostesForType()')) {
    console.log('✅ Fonction loadPostesForType existe');
} else {
    console.log('❌ Fonction loadPostesForType manquante - Ajout en cours...');
    
    // Créer la fonction loadPostesForType
    const loadPostesForTypeFunction = `
        function loadPostesForType() {
            const typeSelect = document.getElementById('typeCollaborateur-select');
            const posteSelect = document.getElementById('poste-select');
            
            if (typeSelect && posteSelect) {
                const typeId = typeSelect.value;
                
                if (typeId) {
                    fetch(\`\${API_BASE_URL}/postes?type_collaborateur_id=\${typeId}\`)
                        .then(response => response.json())
                        .then(data => {
                            posteSelect.innerHTML = '<option value="">Sélectionner un poste</option>';
                            
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
                                posteSelect.appendChild(option);
                            });
                        })
                        .catch(error => {
                            console.error('Erreur lors du chargement des postes:', error);
                        });
                } else {
                    posteSelect.innerHTML = '<option value="">Sélectionner un poste</option>';
                }
            }
        }`;
    
    // Ajouter la fonction à la fin du script
    const scriptEndPattern = /<\/script>/;
    const updatedContent = content.replace(
        scriptEndPattern,
        loadPostesForTypeFunction + '\n    </script>'
    );
    
    // Sauvegarder le fichier
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Fonction loadPostesForType ajoutée avec succès');
}

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Pour tester :');
console.log('1. Démarrer le serveur: npm start');
console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
console.log('3. Cliquer sur le bouton "Nouveau collaborateur"');
console.log('4. Vérifier que le modal s\'ouvre correctement');
console.log('5. Vérifier que les listes déroulantes se remplissent');