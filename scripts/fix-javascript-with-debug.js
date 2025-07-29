const fs = require('fs');

console.log('🔧 Correction JavaScript avec debug complet...\n');

// Lire le fichier collaborateurs.html
const collaborateursFile = 'public/collaborateurs.html';
const content = fs.readFileSync(collaborateursFile, 'utf8');

console.log('📋 Recherche et correction des erreurs...');

// Créer une sauvegarde
const backupFile = 'public/collaborateurs_backup_before_debug_fix.html';
fs.writeFileSync(backupFile, content);
console.log(`📋 Sauvegarde créée: ${backupFile}`);

// 1. Corriger l'erreur de syntaxe à la ligne 2003
const lines = content.split('\n');
let correctedLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i === 2002) { // Ligne 2003 (index 2002)
        console.log(`📍 Ligne ${i + 1} problématique: ${line}`);
        
        if (line.includes('showAlert(') && !line.includes(')')) {
            console.log('🔧 Correction de l\'erreur de syntaxe showAlert...');
            const correctedLine = line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
            correctedLines.push(correctedLine);
        } else {
            correctedLines.push(line);
        }
    } else {
        correctedLines.push(line);
    }
}

// 2. Remplacer complètement la fonction showNewCollaborateurModal
let updatedContent = correctedLines.join('\n');

// Supprimer l'ancienne fonction si elle existe
const oldFunctionPattern = /function showNewCollaborateurModal\(\) \{[\s\S]*?\}/;
if (oldFunctionPattern.test(updatedContent)) {
    console.log('🔧 Suppression de l\'ancienne fonction showNewCollaborateurModal...');
    updatedContent = updatedContent.replace(oldFunctionPattern, '');
}

// Ajouter la nouvelle fonction avec debug complet
const newShowNewCollaborateurModalFunction = `
        function showNewCollaborateurModal() {
            console.log('🔄 DEBUG: Ouverture du modal nouveau collaborateur...');
            
            try {
                console.log('🔍 DEBUG: Vérification des éléments DOM...');
                const modalElement = document.getElementById('newCollaborateurModal');
                if (!modalElement) {
                    console.error('❌ DEBUG: Élément newCollaborateurModal non trouvé');
                    alert('Erreur: Modal non trouvé');
                    return;
                }
                console.log('✅ DEBUG: Modal trouvé');
                
                console.log('🔍 DEBUG: Chargement des données...');
                
                // Charger les données avec debug
                try {
                    loadBusinessUnits();
                    console.log('✅ DEBUG: Business units chargés');
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement business units:', error);
                }
                
                try {
                    loadGrades();
                    console.log('✅ DEBUG: Grades chargés');
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement grades:', error);
                }
                
                try {
                    loadPostes();
                    console.log('✅ DEBUG: Postes chargés');
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement postes:', error);
                }
                
                try {
                    loadTypesCollaborateurs();
                    console.log('✅ DEBUG: Types collaborateurs chargés');
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement types collaborateurs:', error);
                }
                
                try {
                    loadDivisions();
                    console.log('✅ DEBUG: Divisions chargées');
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement divisions:', error);
                }
                
                console.log('🔍 DEBUG: Affichage du modal...');
                
                // Afficher le modal
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
                
                console.log('✅ DEBUG: Modal nouveau collaborateur affiché avec succès');
                
            } catch (error) {
                console.error('❌ DEBUG: Erreur lors de l\'ouverture du modal:', error);
                alert('Erreur lors de l\'ouverture du modal: ' + error.message);
            }
        }`;

// Ajouter la nouvelle fonction à la fin du script
const scriptEndPattern = /<\/script>/;
updatedContent = updatedContent.replace(
    scriptEndPattern,
    newShowNewCollaborateurModalFunction + '\n    </script>'
);

// 3. Ajouter des fonctions de debug pour le chargement des collaborateurs
const debugFunctions = `
        // Fonction de debug pour charger les collaborateurs
        function debugLoadCollaborateurs() {
            console.log('🔍 DEBUG: Début du chargement des collaborateurs...');
            
            const loadingElement = document.getElementById('collaborateurs-loading');
            const contentElement = document.getElementById('collaborateurs-content');
            
            if (loadingElement) {
                loadingElement.style.display = 'block';
                console.log('✅ DEBUG: Élément de chargement affiché');
            }
            
            if (contentElement) {
                contentElement.style.display = 'none';
                console.log('✅ DEBUG: Contenu masqué pendant le chargement');
            }
            
            console.log('🔍 DEBUG: Appel API collaborateurs...');
            
            fetch(\`\${API_BASE_URL}/collaborateurs\`)
                .then(response => {
                    console.log('🔍 DEBUG: Réponse API reçue:', response.status, response.statusText);
                    if (!response.ok) {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('🔍 DEBUG: Données reçues:', data);
                    
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                        console.log('✅ DEBUG: Élément de chargement masqué');
                    }
                    
                    if (contentElement) {
                        contentElement.style.display = 'block';
                        console.log('✅ DEBUG: Contenu affiché');
                    }
                    
                    if (data.success && data.data) {
                        console.log('🔍 DEBUG: Format success.data, nombre de collaborateurs:', data.data.length);
                        displayCollaborateurs(data.data);
                    } else if (Array.isArray(data)) {
                        console.log('🔍 DEBUG: Format array, nombre de collaborateurs:', data.length);
                        displayCollaborateurs(data);
                    } else {
                        console.log('🔍 DEBUG: Format inattendu:', data);
                        displayCollaborateurs([]);
                    }
                })
                .catch(error => {
                    console.error('❌ DEBUG: Erreur lors du chargement des collaborateurs:', error);
                    
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                    
                    if (contentElement) {
                        contentElement.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des collaborateurs: ' + error.message + '</div>';
                    }
                });
        }
        
        // Fonction de debug pour afficher les collaborateurs
        function debugDisplayCollaborateurs(collaborateurs) {
            console.log('🔍 DEBUG: Affichage de', collaborateurs.length, 'collaborateurs');
            
            const tbody = document.getElementById('collaborateurs-table');
            if (!tbody) {
                console.error('❌ DEBUG: Élément collaborateurs-table non trouvé');
                return;
            }
            
            console.log('✅ DEBUG: Élément tbody trouvé, vidage...');
            tbody.innerHTML = '';
            
            if (collaborateurs.length === 0) {
                console.log('🔍 DEBUG: Aucun collaborateur à afficher');
                tbody.innerHTML = '<tr><td colspan="10" class="text-center">Aucun collaborateur trouvé</td></tr>';
                return;
            }
            
            console.log('🔍 DEBUG: Affichage des collaborateurs...');
            
            collaborateurs.forEach((collab, index) => {
                console.log('🔍 DEBUG: Affichage collaborateur', index + 1, ':', collab);
                
                const row = document.createElement('tr');
                row.innerHTML = \`
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="gestionRH('\${collab.id}')" title="Gérer RH">
                                <i class="fas fa-user-tie"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="editCollaborateur('\${collab.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCollaborateur('\${collab.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                    <td>\${collab.nom || 'N/A'}</td>
                    <td>\${collab.prenom || 'N/A'}</td>
                    <td>\${collab.email || 'N/A'}</td>
                    <td>\${collab.telephone || 'N/A'}</td>
                    <td>\${collab.business_unit_nom || 'N/A'}</td>
                    <td>\${collab.division_nom || 'N/A'}</td>
                    <td>\${collab.grade_nom || 'N/A'}</td>
                    <td>\${collab.poste_nom || 'N/A'}</td>
                    <td><span class="badge \${getStatusBadgeClass(collab.statut)}">\${getStatusLabel(collab.statut)}</span></td>
                \`;
                
                tbody.appendChild(row);
            });
            
            console.log('✅ DEBUG: Affichage terminé');
        }
        
        // Fonction de debug pour les statistiques
        function debugUpdateStatistics() {
            console.log('🔍 DEBUG: Mise à jour des statistiques...');
            
            fetch(\`\${API_BASE_URL}/collaborateurs\`)
                .then(response => response.json())
                .then(data => {
                    const collaborateurs = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
                    
                    console.log('🔍 DEBUG: Données pour statistiques:', collaborateurs.length, 'collaborateurs');
                    
                    const totalElement = document.getElementById('total-collaborateurs');
                    const actifsElement = document.getElementById('actifs-collaborateurs');
                    
                    if (totalElement) {
                        totalElement.textContent = collaborateurs.length;
                        console.log('✅ DEBUG: Total mis à jour:', collaborateurs.length);
                    }
                    
                    if (actifsElement) {
                        const actifs = collaborateurs.filter(c => c.statut === 'ACTIF').length;
                        actifsElement.textContent = actifs;
                        console.log('✅ DEBUG: Actifs mis à jour:', actifs);
                    }
                })
                .catch(error => {
                    console.error('❌ DEBUG: Erreur mise à jour statistiques:', error);
                });
        }
        
        // Remplacer la fonction de chargement initiale
        function loadCollaborateurs() {
            console.log('🔍 DEBUG: Fonction loadCollaborateurs appelée');
            debugLoadCollaborateurs();
        }
        
        // Remplacer la fonction d'affichage
        function displayCollaborateurs(collaborateurs) {
            console.log('🔍 DEBUG: Fonction displayCollaborateurs appelée');
            debugDisplayCollaborateurs(collaborateurs);
        }
        
        // Remplacer la fonction de mise à jour des statistiques
        function updateStatistics() {
            console.log('🔍 DEBUG: Fonction updateStatistics appelée');
            debugUpdateStatistics();
        }`;

// Ajouter les fonctions de debug
const scriptEndPattern2 = /<\/script>/;
updatedContent = updatedContent.replace(
    scriptEndPattern2,
    debugFunctions + '\n    </script>'
);

// 4. Ajouter un appel de debug au chargement de la page
const pageLoadDebug = `
        // Debug au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔍 DEBUG: Page chargée, initialisation...');
            
            // Vérifier les éléments essentiels
            const elements = [
                'collaborateurs-loading',
                'collaborateurs-content',
                'collaborateurs-table',
                'total-collaborateurs',
                'actifs-collaborateurs',
                'newCollaborateurModal'
            ];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    console.log('✅ DEBUG: Élément', id, 'trouvé');
                } else {
                    console.error('❌ DEBUG: Élément', id, 'NON TROUVÉ');
                }
            });
            
            // Charger les collaborateurs après un délai
            setTimeout(() => {
                console.log('🔍 DEBUG: Chargement des collaborateurs...');
                loadCollaborateurs();
            }, 100);
        });`;

// Ajouter le debug de chargement de page
const scriptEndPattern3 = /<\/script>/;
updatedContent = updatedContent.replace(
    scriptEndPattern3,
    pageLoadDebug + '\n    </script>'
);

// Sauvegarder le fichier corrigé
fs.writeFileSync(collaborateursFile, updatedContent);
console.log('✅ Erreurs JavaScript corrigées et debug complet ajouté');

console.log('\n✅ Correction terminée !');
console.log('\n🧪 Instructions de test :');
console.log('1. Démarrer le serveur: npm start');
console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
console.log('3. Ouvrir la console du navigateur (F12)');
console.log('4. Vérifier tous les logs de debug');
console.log('5. Tester le bouton "Nouveau collaborateur"');
console.log('6. Tester le bouton "Gérer RH"');
console.log('\n📝 Les logs de debug vous diront exactement ce qui se passe !');