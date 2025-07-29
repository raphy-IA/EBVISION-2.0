const fs = require('fs');

console.log('🔧 Correction finale des erreurs JavaScript...\n');

try {
    // Lire le fichier
    const collaborateursFile = 'public/collaborateurs.html';
    console.log('📋 Lecture du fichier:', collaborateursFile);
    
    const content = fs.readFileSync(collaborateursFile, 'utf8');
    console.log('📊 Taille du fichier:', content.length, 'caractères');
    console.log('📊 Nombre de lignes:', content.split('\n').length);
    
    // Créer une sauvegarde
    const backupFile = 'public/collaborateurs_backup_final.html';
    fs.writeFileSync(backupFile, content);
    console.log('📋 Sauvegarde créée:', backupFile);
    
    let updatedContent = content;
    
    // 1. Corriger l'erreur de syntaxe showAlert
    console.log('🔍 Recherche d\'erreurs de syntaxe showAlert...');
    
    const lines = content.split('\n');
    let hasError = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('showAlert(') && !line.includes(')')) {
            console.log(`❌ Erreur trouvée ligne ${i + 1}: ${line}`);
            hasError = true;
        }
    }
    
    if (hasError) {
        console.log('🔧 Correction des erreurs showAlert...');
        updatedContent = updatedContent.replace(/showAlert\([^)]*$/gm, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
        console.log('✅ Erreurs showAlert corrigées');
    } else {
        console.log('✅ Aucune erreur showAlert détectée');
    }
    
    // 2. Ajouter la fonction showNewCollaborateurModal si elle n'existe pas
    if (!updatedContent.includes('function showNewCollaborateurModal()')) {
        console.log('🔧 Ajout de la fonction showNewCollaborateurModal...');
        
        const functionToAdd = `
        function showNewCollaborateurModal() {
            console.log('🔄 Ouverture du modal nouveau collaborateur...');
            
            try {
                // Charger les données nécessaires
                if (typeof loadBusinessUnits === 'function') loadBusinessUnits();
                if (typeof loadGrades === 'function') loadGrades();
                if (typeof loadPostes === 'function') loadPostes();
                if (typeof loadTypesCollaborateurs === 'function') loadTypesCollaborateurs();
                if (typeof loadDivisions === 'function') loadDivisions();
                
                // Afficher le modal
                const modalElement = document.getElementById('newCollaborateurModal');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                    console.log('✅ Modal nouveau collaborateur affiché');
                } else {
                    console.error('❌ Élément newCollaborateurModal non trouvé');
                    alert('Erreur: Modal non trouvé');
                }
            } catch (error) {
                console.error('❌ Erreur lors de l\'ouverture du modal:', error);
                alert('Erreur lors de l\'ouverture du modal: ' + error.message);
            }
        }`;
        
        // Ajouter à la fin du script
        updatedContent = updatedContent.replace('</script>', functionToAdd + '\n    </script>');
        console.log('✅ Fonction showNewCollaborateurModal ajoutée');
    } else {
        console.log('✅ Fonction showNewCollaborateurModal existe déjà');
    }
    
    // 3. Ajouter des logs de debug
    console.log('🔧 Ajout de logs de debug...');
    
    const debugFunction = `
        // Debug au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔍 DEBUG: Page collaborateurs.html chargée');
            console.log('🔍 DEBUG: DOM chargé');
            
            // Vérifier les éléments essentiels
            const elements = [
                'newCollaborateurModal',
                'collaborateurs-table',
                'collaborateurs-loading',
                'collaborateurs-content'
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
                if (typeof loadCollaborateurs === 'function') {
                    loadCollaborateurs();
                } else {
                    console.error('❌ DEBUG: Fonction loadCollaborateurs non trouvée');
                }
            }, 100);
        });
        
        // Debug pour les fonctions de chargement
        function debugLoadCollaborateurs() {
            console.log('🔍 DEBUG: Fonction loadCollaborateurs appelée');
            
            fetch(\`\${API_BASE_URL}/collaborateurs\`)
                .then(response => {
                    console.log('🔍 DEBUG: Réponse API:', response.status, response.statusText);
                    return response.json();
                })
                .then(data => {
                    console.log('🔍 DEBUG: Données reçues:', data);
                    
                    if (data.success && data.data) {
                        console.log('🔍 DEBUG: Nombre de collaborateurs:', data.data.length);
                        if (typeof displayCollaborateurs === 'function') {
                            displayCollaborateurs(data.data);
                        } else {
                            console.error('❌ DEBUG: Fonction displayCollaborateurs non trouvée');
                        }
                    } else if (Array.isArray(data)) {
                        console.log('🔍 DEBUG: Données reçues (array):', data.length);
                        if (typeof displayCollaborateurs === 'function') {
                            displayCollaborateurs(data);
                        } else {
                            console.error('❌ DEBUG: Fonction displayCollaborateurs non trouvée');
                        }
                    } else {
                        console.log('🔍 DEBUG: Format de données inattendu:', data);
                    }
                })
                .catch(error => {
                    console.error('❌ DEBUG: Erreur lors du chargement des collaborateurs:', error);
                });
        }
        
        // Remplacer la fonction originale si elle existe
        if (typeof loadCollaborateurs === 'function') {
            const originalLoadCollaborateurs = loadCollaborateurs;
            window.loadCollaborateurs = function() {
                debugLoadCollaborateurs();
            };
        } else {
            window.loadCollaborateurs = debugLoadCollaborateurs;
        }`;
    
    // Ajouter le debug
    updatedContent = updatedContent.replace('</script>', debugFunction + '\n    </script>');
    
    // Sauvegarder le fichier corrigé
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Fichier corrigé et sauvegardé');
    
    // Vérification finale
    console.log('\n📊 Vérification finale...');
    
    const finalContent = fs.readFileSync(collaborateursFile, 'utf8');
    
    if (finalContent.includes('function showNewCollaborateurModal()')) {
        console.log('✅ Fonction showNewCollaborateurModal - PRÉSENTE');
    } else {
        console.log('❌ Fonction showNewCollaborateurModal - MANQUANTE');
    }
    
    const finalLines = finalContent.split('\n');
    let finalError = false;
    
    for (let i = 0; i < finalLines.length; i++) {
        const line = finalLines[i];
        if (line.includes('showAlert(') && !line.includes(')')) {
            console.log(`❌ Erreur finale ligne ${i + 1}: ${line}`);
            finalError = true;
        }
    }
    
    if (!finalError) {
        console.log('✅ Aucune erreur de syntaxe finale détectée');
    }
    
    console.log('\n✅ Correction finale terminée !');
    console.log('\n🧪 Instructions de test :');
    console.log('1. Recharger la page: http://localhost:3000/collaborateurs.html');
    console.log('2. Ouvrir la console du navigateur (F12)');
    console.log('3. Vous devriez voir des logs de debug');
    console.log('4. Tester le bouton "Nouveau collaborateur"');
    console.log('5. Tester le bouton "Gérer RH"');
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
}