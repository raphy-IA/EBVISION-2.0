const fs = require('fs');

console.log('🔍 Diagnostic du système...\n');

try {
    // 1. Vérifier que le fichier existe
    const collaborateursFile = 'public/collaborateurs.html';
    console.log('📋 Vérification du fichier:', collaborateursFile);
    
    if (fs.existsSync(collaborateursFile)) {
        console.log('✅ Fichier existe');
        
        const stats = fs.statSync(collaborateursFile);
        console.log('📊 Taille du fichier:', stats.size, 'octets');
        
        // 2. Lire le contenu
        const content = fs.readFileSync(collaborateursFile, 'utf8');
        console.log('📊 Nombre de lignes:', content.split('\n').length);
        
        // 3. Vérifier les erreurs spécifiques
        console.log('\n🔍 Recherche des erreurs...');
        
        // Vérifier la fonction showNewCollaborateurModal
        if (content.includes('function showNewCollaborateurModal()')) {
            console.log('✅ Fonction showNewCollaborateurModal trouvée');
        } else {
            console.log('❌ Fonction showNewCollaborateurModal MANQUANTE');
        }
        
        // Vérifier l'erreur de syntaxe
        const lines = content.split('\n');
        let errorFound = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('showAlert(') && !line.includes(')')) {
                console.log(`❌ Erreur de syntaxe à la ligne ${i + 1}: ${line}`);
                errorFound = true;
            }
        }
        
        if (!errorFound) {
            console.log('✅ Aucune erreur de syntaxe détectée');
        }
        
        // 4. Vérifier les éléments HTML essentiels
        console.log('\n🔍 Vérification des éléments HTML...');
        
        const htmlElements = [
            'id="newCollaborateurModal"',
            'id="collaborateurs-table"',
            'onclick="showNewCollaborateurModal()"'
        ];
        
        htmlElements.forEach(element => {
            if (content.includes(element)) {
                console.log(`✅ ${element}`);
            } else {
                console.log(`❌ ${element} - MANQUANT`);
            }
        });
        
        // 5. Vérifier les fonctions de chargement
        console.log('\n🔍 Vérification des fonctions de chargement...');
        
        const loadFunctions = [
            'loadBusinessUnits',
            'loadGrades',
            'loadPostes',
            'loadDivisions',
            'loadTypesCollaborateurs'
        ];
        
        loadFunctions.forEach(func => {
            if (content.includes(`function ${func}()`)) {
                console.log(`✅ ${func}`);
            } else {
                console.log(`❌ ${func} - MANQUANT`);
            }
        });
        
        // 6. Vérifier les dernières lignes
        console.log('\n🔍 Dernières lignes du fichier:');
        const lastLines = lines.slice(-10);
        lastLines.forEach((line, index) => {
            console.log(`${lines.length - 10 + index + 1}: ${line}`);
        });
        
    } else {
        console.log('❌ Fichier non trouvé');
    }
    
} catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
}

console.log('\n📊 Diagnostic terminé');