const fs = require('fs');

console.log('🔧 Correction finale de la fonction showNewCollaborateurModal...\n');

try {
    // Lire le fichier
    const collaborateursFile = 'public/collaborateurs.html';
    const content = fs.readFileSync(collaborateursFile, 'utf8');
    
    console.log('📋 Lecture du fichier:', collaborateursFile);
    
    // Créer une sauvegarde
    const backupFile = 'public/collaborateurs_backup_before_function_fix.html';
    fs.writeFileSync(backupFile, content);
    console.log('📋 Sauvegarde créée:', backupFile);
    
    // Remplacer complètement la fonction showNewCollaborateurModal
    console.log('🔧 Remplacement de la fonction showNewCollaborateurModal...');
    
    const newFunction = `
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
                    if (typeof loadBusinessUnits === 'function') {
                        loadBusinessUnits();
                        console.log('✅ DEBUG: Business units chargés');
                    } else {
                        console.error('❌ DEBUG: Fonction loadBusinessUnits non trouvée');
                    }
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement business units:', error);
                }
                
                try {
                    if (typeof loadGrades === 'function') {
                        loadGrades();
                        console.log('✅ DEBUG: Grades chargés');
                    } else {
                        console.error('❌ DEBUG: Fonction loadGrades non trouvée');
                    }
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement grades:', error);
                }
                
                try {
                    if (typeof loadPostes === 'function') {
                        loadPostes();
                        console.log('✅ DEBUG: Postes chargés');
                    } else {
                        console.error('❌ DEBUG: Fonction loadPostes non trouvée');
                    }
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement postes:', error);
                }
                
                try {
                    if (typeof loadTypesCollaborateurs === 'function') {
                        loadTypesCollaborateurs();
                        console.log('✅ DEBUG: Types collaborateurs chargés');
                    } else {
                        console.error('❌ DEBUG: Fonction loadTypesCollaborateurs non trouvée');
                    }
                } catch (error) {
                    console.error('❌ DEBUG: Erreur chargement types collaborateurs:', error);
                }
                
                try {
                    if (typeof loadDivisions === 'function') {
                        loadDivisions();
                        console.log('✅ DEBUG: Divisions chargées');
                    } else {
                        console.error('❌ DEBUG: Fonction loadDivisions non trouvée');
                    }
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
    
    // Supprimer l'ancienne fonction si elle existe
    let updatedContent = content;
    const oldFunctionPattern = /function showNewCollaborateurModal\(\) \{[\s\S]*?\}/;
    
    if (oldFunctionPattern.test(updatedContent)) {
        console.log('🔧 Suppression de l\'ancienne fonction...');
        updatedContent = updatedContent.replace(oldFunctionPattern, '');
    }
    
    // Ajouter la nouvelle fonction
    updatedContent = updatedContent.replace('</script>', newFunction + '\n    </script>');
    
    // Sauvegarder le fichier corrigé
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Fonction showNewCollaborateurModal corrigée et sauvegardée');
    
    // Vérification finale
    console.log('\n📊 Vérification finale...');
    
    const finalContent = fs.readFileSync(collaborateursFile, 'utf8');
    
    if (finalContent.includes('function showNewCollaborateurModal()')) {
        console.log('✅ Fonction showNewCollaborateurModal - PRÉSENTE');
        
        if (finalContent.includes('console.log(\'🔄 DEBUG: Ouverture du modal nouveau collaborateur...\')')) {
            console.log('✅ Code de debug présent dans la fonction');
        } else {
            console.log('❌ Code de debug manquant dans la fonction');
        }
        
        if (finalContent.includes('bootstrap.Modal(modalElement)')) {
            console.log('✅ Code d\'ouverture du modal présent');
        } else {
            console.log('❌ Code d\'ouverture du modal manquant');
        }
        
        if (finalContent.includes('loadBusinessUnits()')) {
            console.log('✅ Appels aux fonctions de chargement présents');
        } else {
            console.log('❌ Appels aux fonctions de chargement manquants');
        }
    } else {
        console.log('❌ Fonction showNewCollaborateurModal - MANQUANTE');
    }
    
    console.log('\n✅ Correction finale terminée !');
    console.log('\n🧪 Instructions de test :');
    console.log('1. Recharger la page: http://localhost:3000/collaborateurs.html');
    console.log('2. Ouvrir la console du navigateur (F12)');
    console.log('3. Vous devriez voir beaucoup de logs de debug');
    console.log('4. Tester le bouton "Nouveau collaborateur" - devrait maintenant fonctionner');
    console.log('5. Tester le bouton "Gérer RH"');
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
}