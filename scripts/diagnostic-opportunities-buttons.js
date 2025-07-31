// Script de diagnostic pour les boutons des opportunités
// À exécuter dans la console du navigateur (F12)

console.log('🔍 DIAGNOSTIC BOUTONS OPPORTUNITIES');
console.log('=====================================');

// Diagnostic des fonctions
window.diagnoseFunctions = function() {
    console.log('\n1️⃣ DIAGNOSTIC DES FONCTIONS');
    
    const functions = [
        'viewOpportunity',
        'editOpportunity', 
        'deleteOpportunity',
        'confirmDeleteOpportunity',
        'displayOpportunities',
        'loadOpportunities'
    ];
    
    functions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        console.log(`   ${exists ? '✅' : '❌'} ${funcName}: ${exists ? 'Définie' : 'Manquante'}`);
        
        if (exists) {
            try {
                const func = window[funcName];
                console.log(`      📝 Type: ${typeof func}`);
                console.log(`      📝 Nombre de paramètres: ${func.length}`);
            } catch (error) {
                console.log(`      ❌ Erreur lors de l'inspection: ${error.message}`);
            }
        }
    });
};

// Diagnostic des données
window.diagnoseData = function() {
    console.log('\n2️⃣ DIAGNOSTIC DES DONNÉES');
    
    console.log(`📊 Opportunités disponibles: ${window.opportunities ? window.opportunities.length : 'Non définies'}`);
    console.log(`📊 Opportunités filtrées: ${window.filteredOpportunities ? window.filteredOpportunities.length : 'Non définies'}`);
    
    if (window.opportunities && window.opportunities.length > 0) {
        const firstOpp = window.opportunities[0];
        console.log('📋 Première opportunité:', firstOpp);
        console.log(`   - ID: ${firstOpp.id}`);
        console.log(`   - Nom: ${firstOpp.nom}`);
        console.log(`   - Statut: ${firstOpp.statut}`);
    }
};

// Diagnostic du DOM
window.diagnoseDOM = function() {
    console.log('\n3️⃣ DIAGNOSTIC DU DOM');
    
    const table = document.getElementById('opportunities-table');
    console.log(`📊 Tableau trouvé: ${!!table}`);
    
    if (table) {
        const rows = table.querySelectorAll('tr');
        console.log(`📊 Lignes dans le tableau: ${rows.length}`);
        
        if (rows.length > 0) {
            const firstRow = rows[0];
            const buttons = firstRow.querySelectorAll('button');
            console.log(`🔘 Boutons dans la première ligne: ${buttons.length}`);
            
            buttons.forEach((button, index) => {
                const onclick = button.getAttribute('onclick');
                const className = button.className;
                const title = button.getAttribute('title');
                
                console.log(`   Bouton ${index + 1}:`);
                console.log(`      - Classe: ${className}`);
                console.log(`      - Titre: ${title}`);
                console.log(`      - OnClick: ${onclick}`);
            });
        }
    }
};

// Test de génération des boutons
window.testButtonGeneration = function() {
    console.log('\n4️⃣ TEST GÉNÉRATION DES BOUTONS');
    
    // Créer une opportunité de test
    const testOpp = {
        id: 'test-id-123',
        nom: 'Test Opportunité',
        statut: 'EN_COURS',
        client_nom: 'Client Test',
        collaborateur_nom: 'Dupont',
        collaborateur_prenom: 'Jean',
        business_unit_nom: 'BU Test',
        opportunity_type_nom: 'Type Test',
        montant_estime: 10000,
        probabilite: 50,
        source: 'Test'
    };
    
    console.log('📋 Opportunité de test:', testOpp);
    
    // Simuler la génération d'une ligne
    const rowHTML = `
        <td>
            <strong>${testOpp.nom}</strong>
            ${testOpp.source ? `<br><small class="text-muted">Source: ${testOpp.source}</small>` : ''}
        </td>
        <td>${testOpp.client_nom || '-'}</td>
        <td>
            <div class="d-flex align-items-center">
                <div class="collaborateur-avatar me-2">
                    ${getInitials(testOpp.collaborateur_nom || '', testOpp.collaborateur_prenom || '')}
                </div>
                <div>
                    <div class="fw-bold">${testOpp.collaborateur_nom ? `${testOpp.collaborateur_nom} ${testOpp.collaborateur_prenom}` : '-'}</div>
                </div>
            </div>
        </td>
        <td>${testOpp.business_unit_nom || '-'}</td>
        <td>${testOpp.opportunity_type_nom || '-'}</td>
        <td>
            <div class="fw-bold">${testOpp.montant_estime ? formatCurrency(testOpp.montant_estime) : '-'}</div>
        </td>
        <td>
            <div class="progress" style="height: 20px;">
                <div class="progress-bar bg-info" 
                     style="width: ${testOpp.probabilite || 0}%" 
                     role="progressbar">
                    ${testOpp.probabilite ? `${testOpp.probabilite}%` : '-'}
                </div>
            </div>
        </td>
        <td>-</td>
        <td><span class="status-badge status-saisie">En Cours</span></td>
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-info" onclick="viewOpportunity('${testOpp.id}')" title="Voir">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-warning" onclick="editOpportunity('${testOpp.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="deleteOpportunity('${testOpp.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    console.log('📝 HTML généré pour les boutons:');
    console.log(rowHTML);
    
    // Vérifier si les fonctions existent
    const functions = ['viewOpportunity', 'editOpportunity', 'deleteOpportunity'];
    functions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        console.log(`   ${exists ? '✅' : '❌'} ${funcName}: ${exists ? 'Disponible' : 'Manquante'}`);
    });
};

// Test d'exécution des fonctions
window.testFunctionExecution = function() {
    console.log('\n5️⃣ TEST EXÉCUTION DES FONCTIONS');
    
    if (!window.opportunities || window.opportunities.length === 0) {
        console.log('❌ Aucune opportunité disponible pour le test');
        return;
    }
    
    const testOpp = window.opportunities[0];
    console.log('📋 Opportunité de test:', testOpp);
    
    // Test viewOpportunity
    if (typeof window.viewOpportunity === 'function') {
        console.log('🎯 Test viewOpportunity...');
        try {
            window.viewOpportunity(testOpp.id);
            console.log('✅ viewOpportunity exécutée avec succès');
        } catch (error) {
            console.log('❌ Erreur viewOpportunity:', error.message);
        }
    }
    
    // Test editOpportunity
    if (typeof window.editOpportunity === 'function') {
        console.log('🎯 Test editOpportunity...');
        try {
            window.editOpportunity(testOpp.id);
            console.log('✅ editOpportunity exécutée avec succès');
        } catch (error) {
            console.log('❌ Erreur editOpportunity:', error.message);
        }
    }
    
    // Test deleteOpportunity
    if (typeof window.deleteOpportunity === 'function') {
        console.log('🎯 Test deleteOpportunity...');
        try {
            window.deleteOpportunity(testOpp.id);
            console.log('✅ deleteOpportunity exécutée avec succès');
        } catch (error) {
            console.log('❌ Erreur deleteOpportunity:', error.message);
        }
    }
};

// Diagnostic complet
window.diagnoseAll = function() {
    console.log('\n🎯 DIAGNOSTIC COMPLET');
    console.log('======================');
    
    diagnoseFunctions();
    diagnoseData();
    diagnoseDOM();
    testButtonGeneration();
    testFunctionExecution();
    
    console.log('\n📊 RÉSUMÉ DU DIAGNOSTIC');
    console.log('========================');
    console.log('✅ Vérifiez les résultats ci-dessus pour identifier les problèmes');
    console.log('💡 Si les fonctions sont manquantes, il y a un problème de chargement JavaScript');
    console.log('💡 Si les boutons ne sont pas générés, il y a un problème dans displayOpportunities');
    console.log('💡 Si les fonctions existent mais ne fonctionnent pas, il y a un problème d\'exécution');
};

console.log('\n✅ FONCTIONS DE DIAGNOSTIC DISPONIBLES:');
console.log('💡 diagnoseFunctions() - Vérifier les fonctions');
console.log('💡 diagnoseData() - Vérifier les données');
console.log('💡 diagnoseDOM() - Vérifier le DOM');
console.log('💡 testButtonGeneration() - Tester la génération des boutons');
console.log('💡 testFunctionExecution() - Tester l\'exécution des fonctions');
console.log('💡 diagnoseAll() - Diagnostic complet');
console.log('\n🎯 INSTRUCTIONS:');
console.log('1. Ouvrir opportunities.html');
console.log('2. Attendre le chargement des données');
console.log('3. Ouvrir la console (F12)');
console.log('4. Exécuter diagnoseAll() pour un diagnostic complet'); 