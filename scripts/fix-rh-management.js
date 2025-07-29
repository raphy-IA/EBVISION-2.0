const fs = require('fs');
const path = require('path');

console.log('🔧 Diagnostic et correction de la gestion RH...\n');

// 1. Vérifier que les routes API existent
const routesToCheck = [
    'src/routes/evolution-grades.js',
    'src/routes/evolution-postes.js', 
    'src/routes/evolution-organisations.js'
];

console.log('📋 Vérification des routes API...');
routesToCheck.forEach(route => {
    if (fs.existsSync(route)) {
        console.log(`✅ ${route} - OK`);
    } else {
        console.log(`❌ ${route} - MANQUANT`);
    }
});

// 2. Vérifier que les modèles existent
const modelsToCheck = [
    'src/models/EvolutionGrade.js',
    'src/models/EvolutionPoste.js',
    'src/models/EvolutionOrganisation.js'
];

console.log('\n📋 Vérification des modèles...');
modelsToCheck.forEach(model => {
    if (fs.existsSync(model)) {
        console.log(`✅ ${model} - OK`);
    } else {
        console.log(`❌ ${model} - MANQUANT`);
    }
});

// 3. Améliorer la fonction gestionRH dans collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
let content = fs.readFileSync(collaborateursFile, 'utf8');

// Améliorer la fonction gestionRH avec une meilleure gestion des erreurs
const improvedGestionRH = `
        function gestionRH(collaborateurId) {
            console.log('🔧 Début gestionRH pour collaborateurId:', collaborateurId);
            collaborateurRHId = collaborateurId;
            const collaborateur = collaborateurs.find(c => c.id === collaborateurId);
            
            console.log('📊 Collaborateur trouvé:', collaborateur);
            
            if (!collaborateur) {
                console.log('❌ Collaborateur non trouvé dans la liste');
                showAlert('Collaborateur non trouvé', 'danger');
                return;
            }

            // Afficher le modal d'abord
            const modal = new bootstrap.Modal(document.getElementById('gestionRHModal'));
            modal.show();

            // Fonction pour charger les données avec gestion d'erreur
            async function loadRHData() {
                try {
                    console.log('🔄 Chargement des données RH...');
                    
                    // Charger les données en parallèle
                    const promises = [
                        loadGradesForRH(),
                        loadTypesCollaborateursForRH(),
                        loadPostesForRH(),
                        loadBusinessUnitsForRH(),
                        loadHistoriqueGrades(collaborateurId),
                        loadHistoriquePostes(collaborateurId),
                        loadHistoriqueOrganisations(collaborateurId)
                    ];
                    
                    await Promise.allSettled(promises);
                    console.log('✅ Toutes les données RH chargées');
                    
                    // Pré-remplir les formulaires
                    setTimeout(() => {
                        preRemplirFormulaires();
                    }, 500);
                    
                } catch (error) {
                    console.error('❌ Erreur lors du chargement des données RH:', error);
                    showAlert('Erreur lors du chargement des données RH', 'danger');
                }
            }

            // Mettre à jour les informations du collaborateur
            setTimeout(() => {
                console.log('🔄 Mise à jour des informations du collaborateur...');
                
                const elements = {
                    nom: document.getElementById('rh-collaborateur-nom'),
                    nomComplet: document.getElementById('rh-collaborateur-nom-complet'),
                    email: document.getElementById('rh-collaborateur-email'),
                    bu: document.getElementById('rh-collaborateur-business-unit'),
                    division: document.getElementById('rh-collaborateur-division'),
                    dateEmb: document.getElementById('rh-collaborateur-date-embauche'),
                    statut: document.getElementById('rh-collaborateur-statut'),
                    grade: document.getElementById('rh-collaborateur-grade-actuel'),
                    poste: document.getElementById('rh-collaborateur-poste-actuel')
                };

                // Vérifier que tous les éléments existent
                const missingElements = Object.entries(elements)
                    .filter(([key, element]) => !element)
                    .map(([key]) => key);

                if (missingElements.length > 0) {
                    console.error('❌ Éléments DOM manquants:', missingElements);
                    showAlert('Erreur: éléments d\'interface manquants', 'danger');
                    return;
                }

                // Mettre à jour les informations
                elements.nom.textContent = \`\${collaborateur.nom} \${collaborateur.prenom}\`;
                elements.nomComplet.textContent = \`\${collaborateur.nom} \${collaborateur.prenom}\`;
                elements.email.textContent = collaborateur.email || 'Non renseigné';
                elements.bu.textContent = collaborateur.business_unit_nom || 'Non assigné';
                elements.division.textContent = collaborateur.division_nom || 'Non assigné';
                elements.dateEmb.textContent = collaborateur.date_embauche ? new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR') : 'Non renseigné';
                elements.statut.textContent = getStatusLabel(collaborateur.statut);
                elements.grade.textContent = collaborateur.grade_nom || 'Non assigné';
                elements.poste.textContent = collaborateur.poste_nom || 'Non assigné';

                console.log('✅ Informations du collaborateur mises à jour');
                
                // Charger les données RH
                loadRHData();
                
            }, 100); // Délai réduit
        }`;

// Remplacer la fonction gestionRH existante
const oldGestionRHPattern = /function gestionRH\(collaborateurId\) \{[\s\S]*?\n\s*\}\n/;
if (content.match(oldGestionRHPattern)) {
    content = content.replace(oldGestionRHPattern, improvedGestionRH + '\n');
    console.log('✅ Fonction gestionRH améliorée');
} else {
    console.log('⚠️ Fonction gestionRH non trouvée, ajout manuel nécessaire');
}

// 4. Améliorer les fonctions de chargement avec gestion d'erreur
const improvedLoadFunctions = `
        async function loadGradesForRH() {
            try {
                console.log('🔄 Chargement des grades pour RH...');
                const response = await fetch(\`\${API_BASE_URL}/grades\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                console.log('📥 Réponse API grades:', data);
                
                const select = document.getElementById('rh-grade-select');
                if (!select) {
                    console.error('❌ Select grade non trouvé');
                    return;
                }
                
                select.innerHTML = '<option value="">Sélectionner un grade</option>';
                
                if (data.success && data.data && Array.isArray(data.data)) {
                    console.log(\`📋 \${data.data.length} grades trouvés\`);
                    data.data.forEach(grade => {
                        const option = document.createElement('option');
                        option.value = grade.id;
                        option.textContent = \`\${grade.nom} (\${grade.code})\`;
                        select.appendChild(option);
                    });
                } else {
                    console.log('⚠️ Aucun grade trouvé ou format invalide');
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "Aucun grade disponible";
                    option.disabled = true;
                    select.appendChild(option);
                }
            } catch (error) {
                console.error('❌ Erreur lors du chargement des grades:', error);
                showAlert('Erreur lors du chargement des grades', 'danger');
            }
        }

        async function loadTypesCollaborateursForRH() {
            try {
                console.log('🔄 Chargement des types collaborateurs pour RH...');
                const response = await fetch(\`\${API_BASE_URL}/types-collaborateurs\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                console.log('📥 Réponse API types collaborateurs:', data);
                
                const select = document.getElementById('rh-type-collaborateur-select');
                if (!select) {
                    console.error('❌ Select type collaborateur non trouvé');
                    return;
                }
                
                select.innerHTML = '<option value="">Sélectionner un type</option>';
                
                if (data.success && data.data && Array.isArray(data.data)) {
                    console.log(\`📋 \${data.data.length} types collaborateurs trouvés\`);
                    data.data.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.id;
                        option.textContent = type.nom;
                        select.appendChild(option);
                    });
                } else {
                    console.log('⚠️ Aucun type collaborateur trouvé ou format invalide');
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "Aucun type disponible";
                    option.disabled = true;
                    select.appendChild(option);
                }
            } catch (error) {
                console.error('❌ Erreur lors du chargement des types collaborateurs:', error);
                showAlert('Erreur lors du chargement des types collaborateurs', 'danger');
            }
        }

        async function loadPostesForRH() {
            try {
                console.log('🔄 Chargement des postes pour RH...');
                const response = await fetch(\`\${API_BASE_URL}/postes\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                console.log('📥 Réponse API postes:', data);
                
                const select = document.getElementById('rh-poste-select');
                if (!select) {
                    console.error('❌ Select poste non trouvé');
                    return;
                }
                
                select.innerHTML = '<option value="">Sélectionner un poste</option>';
                
                if (data.success && data.data && Array.isArray(data.data)) {
                    console.log(\`📋 \${data.data.length} postes trouvés\`);
                    data.data.forEach(poste => {
                        const option = document.createElement('option');
                        option.value = poste.id;
                        option.textContent = poste.nom;
                        select.appendChild(option);
                    });
                } else {
                    console.log('⚠️ Aucun poste trouvé ou format invalide');
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "Aucun poste disponible";
                    option.disabled = true;
                    select.appendChild(option);
                }
            } catch (error) {
                console.error('❌ Erreur lors du chargement des postes:', error);
                showAlert('Erreur lors du chargement des postes', 'danger');
            }
        }`;

// Remplacer les fonctions de chargement existantes
const oldLoadFunctionsPattern = /async function loadGradesForRH\(\) \{[\s\S]*?\n\s*\}\n\s*async function loadTypesCollaborateursForRH\(\) \{[\s\S]*?\n\s*\}\n\s*async function loadPostesForRH\(\) \{[\s\S]*?\n\s*\}\n/;
if (content.match(oldLoadFunctionsPattern)) {
    content = content.replace(oldLoadFunctionsPattern, improvedLoadFunctions);
    console.log('✅ Fonctions de chargement améliorées');
} else {
    console.log('⚠️ Fonctions de chargement non trouvées, ajout manuel nécessaire');
}

// 5. Ajouter une fonction de diagnostic
const diagnosticFunction = `
        // Fonction de diagnostic pour la gestion RH
        function diagnosticRH() {
            console.log('🔍 Diagnostic de la gestion RH...');
            
            // Vérifier les éléments DOM
            const elements = [
                'gestionRHModal',
                'rh-collaborateur-nom',
                'rh-grade-select',
                'rh-type-collaborateur-select',
                'rh-poste-select',
                'rh-business-unit-select'
            ];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    console.log(\`✅ \${id} - OK\`);
                } else {
                    console.log(\`❌ \${id} - MANQUANT\`);
                }
            });
            
            // Vérifier les variables globales
            console.log('📊 Variables globales:');
            console.log('- collaborateurs:', typeof collaborateurs, collaborateurs ? collaborateurs.length : 'undefined');
            console.log('- collaborateurRHId:', collaborateurRHId);
            console.log('- API_BASE_URL:', API_BASE_URL);
            
            // Tester les endpoints API
            const endpoints = ['/grades', '/types-collaborateurs', '/postes', '/business-units'];
            endpoints.forEach(endpoint => {
                fetch(\`\${API_BASE_URL}\${endpoint}\`)
                    .then(response => {
                        console.log(\`✅ \${endpoint} - \${response.status}\`);
                    })
                    .catch(error => {
                        console.log(\`❌ \${endpoint} - \${error.message}\`);
                    });
            });
        }`;

// Ajouter la fonction de diagnostic
if (!content.includes('function diagnosticRH()')) {
    content = content.replace('// =====================================================', diagnosticFunction + '\n\n// =====================================================');
    console.log('✅ Fonction de diagnostic ajoutée');
}

// Écrire le fichier mis à jour
fs.writeFileSync(collaborateursFile, content, 'utf8');

console.log('\n✅ Corrections appliquées !');
console.log('\n📝 Améliorations apportées :');
console.log('- Meilleure gestion des erreurs dans gestionRH()');
console.log('- Chargement parallèle des données');
console.log('- Validation des éléments DOM');
console.log('- Messages d\'erreur plus détaillés');
console.log('- Fonction de diagnostic ajoutée');
console.log('\n🔧 Pour tester :');
console.log('1. Ouvrir la page collaborateurs.html');
console.log('2. Ouvrir la console du navigateur');
console.log('3. Cliquer sur "Gérer RH" pour un collaborateur');
console.log('4. Exécuter diagnosticRH() dans la console pour diagnostiquer');