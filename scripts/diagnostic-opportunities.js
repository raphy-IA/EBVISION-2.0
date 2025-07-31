// Script de diagnostic pour les opportunités
// À exécuter dans la console du navigateur (F12)

console.log('🔍 DIAGNOSTIC OPPORTUNITIES');
console.log('============================');

// Fonction pour vérifier l'état du serveur
window.checkServerStatus = async function() {
    console.log('\n1️⃣ VÉRIFICATION DU SERVEUR');
    
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('📡 Réponse serveur:', data);
        
        if (data.success) {
            console.log('✅ Serveur opérationnel');
            return true;
        } else {
            console.log('❌ Serveur en erreur');
            return false;
        }
    } catch (error) {
        console.log('❌ Serveur inaccessible:', error);
        return false;
    }
};

// Fonction pour vérifier l'API des opportunités
window.checkOpportunitiesAPI = async function() {
    console.log('\n2️⃣ VÉRIFICATION API OPPORTUNITIES');
    
    try {
        const response = await fetch('/api/opportunities');
        const data = await response.json();
        console.log('📡 Réponse API opportunities:', data);
        
        if (data.success) {
            console.log('✅ API opportunities fonctionnelle');
            console.log(`   - Opportunités trouvées: ${data.data?.opportunities?.length || 0}`);
            return true;
        } else {
            console.log('❌ API opportunities en erreur');
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur API opportunities:', error);
        return false;
    }
};

// Fonction pour vérifier les données de formulaire
window.checkFormData = async function() {
    console.log('\n3️⃣ VÉRIFICATION DONNÉES FORMULAIRE');
    
    const apis = [
        { name: 'Clients', url: '/api/clients' },
        { name: 'Business Units', url: '/api/business-units' },
        { name: 'Opportunity Types', url: '/api/opportunity-types' },
        { name: 'Collaborateurs', url: '/api/collaborateurs' }
    ];
    
    const results = {};
    
    for (const api of apis) {
        try {
            const response = await fetch(api.url);
            const data = await response.json();
            
            if (data.success) {
                const count = data.data?.length || data.data?.clients?.length || data.data?.businessUnits?.length || data.data?.opportunityTypes?.length || 0;
                console.log(`✅ ${api.name}: ${count} éléments`);
                results[api.name] = true;
            } else {
                console.log(`❌ ${api.name}: Erreur`);
                results[api.name] = false;
            }
        } catch (error) {
            console.log(`❌ ${api.name}: Erreur de connexion`);
            results[api.name] = false;
        }
    }
    
    return results;
};

// Fonction pour tester la création d'opportunité
window.testOpportunityCreation = async function() {
    console.log('\n4️⃣ TEST CRÉATION OPPORTUNITÉ');
    
    const testData = {
        nom: 'Test Diagnostic ' + new Date().toISOString().slice(0, 19),
        statut: 'EN_COURS',
        source: 'Test',
        probabilite: 50,
        montant_estime: 10000,
        devise: 'EUR',
        description: 'Test de diagnostic'
    };
    
    console.log('📤 Données de test:', testData);
    
    try {
        const response = await fetch('/api/opportunities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        const data = await response.json();
        console.log('📡 Réponse création:', data);
        
        if (data.success) {
            console.log('✅ Création réussie');
            console.log('   - ID:', data.data?.opportunity?.id);
            return data.data?.opportunity?.id;
        } else {
            console.log('❌ Erreur création:', data.error || data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Erreur de connexion:', error);
        return null;
    }
};

// Fonction pour nettoyer les tests
window.cleanupTestData = async function(opportunityId) {
    if (!opportunityId) return;
    
    console.log('\n5️⃣ NETTOYAGE DES DONNÉES DE TEST');
    
    try {
        const response = await fetch(`/api/opportunities/${opportunityId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Données de test supprimées');
        } else {
            console.log('❌ Erreur suppression:', data.error || data.message);
        }
    } catch (error) {
        console.log('❌ Erreur de connexion lors de la suppression');
    }
};

// Fonction de diagnostic complet
window.runFullDiagnostic = async function() {
    console.log('\n🎯 DIAGNOSTIC COMPLET');
    console.log('======================');
    
    const results = {
        server: false,
        api: false,
        formData: {},
        creation: false
    };
    
    // Test serveur
    results.server = await checkServerStatus();
    
    // Test API opportunities
    results.api = await checkOpportunitiesAPI();
    
    // Test données formulaire
    results.formData = await checkFormData();
    
    // Test création
    const testId = await testOpportunityCreation();
    results.creation = testId !== null;
    
    // Nettoyage
    if (testId) {
        await cleanupTestData(testId);
    }
    
    // Résumé
    console.log('\n📊 RÉSUMÉ DU DIAGNOSTIC:');
    console.log(`   - Serveur: ${results.server ? '✅' : '❌'}`);
    console.log(`   - API Opportunities: ${results.api ? '✅' : '❌'}`);
    console.log(`   - Création: ${results.creation ? '✅' : '❌'}`);
    
    Object.entries(results.formData).forEach(([name, status]) => {
        console.log(`   - ${name}: ${status ? '✅' : '❌'}`);
    });
    
    const successCount = [results.server, results.api, results.creation, ...Object.values(results.formData)].filter(Boolean).length;
    const totalCount = 3 + Object.keys(results.formData).length;
    
    console.log(`\n🎯 ${successCount}/${totalCount} tests réussis`);
    
    if (successCount === totalCount) {
        console.log('🎉 TOUS LES TESTS SONT RÉUSSIS !');
    } else {
        console.log('⚠️ Certains tests ont échoué');
    }
    
    return results;
};

// Fonction pour vérifier l'interface utilisateur
window.checkInterface = function() {
    console.log('\n6️⃣ VÉRIFICATION INTERFACE');
    
    const elements = {
        'Page chargée': document.readyState === 'complete',
        'Tableau': !!document.getElementById('opportunities-table'),
        'Modal': !!document.getElementById('opportunityModal'),
        'Formulaire': !!document.getElementById('opportunityForm'),
        'Bouton Nouveau': !!document.querySelector('[onclick="newOpportunity()"]'),
        'Filtres': !!document.getElementById('filters-section')
    };
    
    Object.entries(elements).forEach(([name, found]) => {
        console.log(`   ${found ? '✅' : '❌'} ${name}`);
    });
    
    // Vérifier les fonctions JavaScript
    const functions = [
        'loadOpportunities', 'newOpportunity', 'editOpportunity', 
        'deleteOpportunity', 'saveOpportunity', 'validateAllFields'
    ];
    
    console.log('\n🔧 Fonctions JavaScript:');
    functions.forEach(funcName => {
        const available = typeof window[funcName] === 'function';
        console.log(`   ${available ? '✅' : '❌'} ${funcName}`);
    });
};

console.log('\n✅ FONCTIONS DE DIAGNOSTIC DISPONIBLES:');
console.log('💡 checkServerStatus() - Vérification serveur');
console.log('💡 checkOpportunitiesAPI() - Vérification API');
console.log('💡 checkFormData() - Vérification données formulaire');
console.log('💡 testOpportunityCreation() - Test création');
console.log('💡 cleanupTestData(id) - Nettoyage données test');
console.log('💡 runFullDiagnostic() - Diagnostic complet');
console.log('💡 checkInterface() - Vérification interface');
console.log('\n🎯 INSTRUCTIONS:');
console.log('1. Ouvrir opportunities.html');
console.log('2. Ouvrir la console (F12)');
console.log('3. Exécuter runFullDiagnostic() pour un diagnostic complet'); 