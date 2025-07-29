const fs = require('fs');

console.log('🔍 Diagnostic complet des erreurs...\n');

try {
    // Lire le fichier
    const collaborateursFile = 'public/collaborateurs.html';
    const content = fs.readFileSync(collaborateursFile, 'utf8');
    
    console.log('📊 Fichier lu:', collaborateursFile);
    console.log('📊 Taille:', content.length, 'caractères');
    console.log('📊 Lignes:', content.split('\n').length);
    
    // 1. Vérifier l'erreur de syntaxe à la ligne 2480
    console.log('\n🔍 Vérification de l\'erreur ligne 2480...');
    
    const lines = content.split('\n');
    if (lines.length > 2479) {
        const line2480 = lines[2479];
        console.log(`📍 Ligne 2480: ${line2480}`);
        
        if (line2480.includes('showAlert(') && !line2480.includes(')')) {
            console.log('❌ Erreur de syntaxe détectée à la ligne 2480');
        } else {
            console.log('✅ Ligne 2480 semble correcte');
        }
    }
    
    // 2. Vérifier toutes les erreurs showAlert
    console.log('\n🔍 Recherche de toutes les erreurs showAlert...');
    
    let showAlertErrors = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('showAlert(') && !line.includes(')')) {
            showAlertErrors.push({ line: i + 1, content: line });
        }
    }
    
    if (showAlertErrors.length > 0) {
        console.log(`❌ ${showAlertErrors.length} erreur(s) showAlert trouvée(s):`);
        showAlertErrors.forEach(error => {
            console.log(`   Ligne ${error.line}: ${error.content}`);
        });
    } else {
        console.log('✅ Aucune erreur showAlert détectée');
    }
    
    // 3. Vérifier la fonction showNewCollaborateurModal
    console.log('\n🔍 Vérification de la fonction showNewCollaborateurModal...');
    
    if (content.includes('function showNewCollaborateurModal()')) {
        console.log('✅ Fonction showNewCollaborateurModal trouvée');
        
        // Vérifier si elle est complète
        const functionMatch = content.match(/function showNewCollaborateurModal\(\) \{[\s\S]*?\}/);
        if (functionMatch) {
            console.log('✅ Fonction complète trouvée');
        } else {
            console.log('❌ Fonction incomplète');
        }
    } else {
        console.log('❌ Fonction showNewCollaborateurModal MANQUANTE');
    }
    
    // 4. Vérifier le bouton onclick
    console.log('\n🔍 Vérification du bouton onclick...');
    
    if (content.includes('onclick="showNewCollaborateurModal()"')) {
        console.log('✅ Bouton onclick trouvé');
    } else {
        console.log('❌ Bouton onclick MANQUANT');
    }
    
    // 5. Vérifier les éléments HTML
    console.log('\n🔍 Vérification des éléments HTML...');
    
    const htmlElements = [
        'id="newCollaborateurModal"',
        'id="collaborateurs-table"',
        'id="collaborateurs-loading"',
        'id="collaborateurs-content"'
    ];
    
    htmlElements.forEach(element => {
        if (content.includes(element)) {
            console.log(`✅ ${element}`);
        } else {
            console.log(`❌ ${element} - MANQUANT`);
        }
    });
    
    // 6. Vérifier les fonctions de chargement
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
            console.log(`❌ ${func} - MANQUANTE`);
        }
    });
    
    // 7. Vérifier les logs de debug
    console.log('\n🔍 Vérification des logs de debug...');
    
    const debugLogs = [
        'DEBUG: Page collaborateurs.html chargée',
        'DEBUG: DOM chargé',
        'DEBUG: Chargement des collaborateurs...'
    ];
    
    debugLogs.forEach(log => {
        if (content.includes(log)) {
            console.log(`✅ Log "${log}"`);
        } else {
            console.log(`❌ Log "${log}" - MANQUANT`);
        }
    });
    
    // Résumé du diagnostic
    console.log('\n📊 Résumé du diagnostic...');
    console.log(`- Erreurs showAlert: ${showAlertErrors.length}`);
    console.log(`- Fonction showNewCollaborateurModal: ${content.includes('function showNewCollaborateurModal()') ? 'PRÉSENTE' : 'MANQUANTE'}`);
    console.log(`- Bouton onclick: ${content.includes('onclick="showNewCollaborateurModal()"') ? 'PRÉSENT' : 'MANQUANT'}`);
    
    // Recommandations
    console.log('\n🔧 Recommandations:');
    if (showAlertErrors.length > 0) {
        console.log('1. Corriger les erreurs showAlert');
    }
    if (!content.includes('function showNewCollaborateurModal()')) {
        console.log('2. Ajouter la fonction showNewCollaborateurModal');
    }
    if (!content.includes('onclick="showNewCollaborateurModal()"')) {
        console.log('3. Vérifier le bouton onclick');
    }
    
} catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
}