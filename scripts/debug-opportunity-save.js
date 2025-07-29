// Script de débogage pour l'enregistrement d'opportunité
// À exécuter dans la console du navigateur (F12) après avoir rempli le formulaire

console.log('💾 DÉBOGAGE ENREGISTREMENT OPPORTUNITÉ');
console.log('=======================================');

// Fonction pour tester l'enregistrement étape par étape
window.testOpportunitySave = function() {
    console.log('\n1️⃣ ÉTAPE 1: Vérification des données du formulaire');
    
    const formData = {
        nom: document.getElementById('opportunityName')?.value,
        client_id: document.getElementById('opportunityClient')?.value,
        collaborateur_id: document.getElementById('opportunityCollaborator')?.value,
        business_unit_id: document.getElementById('opportunityBusinessUnit')?.value,
        opportunity_type_id: document.getElementById('opportunityType')?.value,
        statut: document.getElementById('opportunityStatus')?.value,
        source: document.getElementById('opportunitySource')?.value,
        probabilite: document.getElementById('opportunityProbability')?.value,
        montant_estime: document.getElementById('opportunityAmount')?.value,
        devise: document.getElementById('opportunityCurrency')?.value,
        date_fermeture_prevue: document.getElementById('opportunityCloseDate')?.value,
        description: document.getElementById('opportunityNotes')?.value
    };
    
    console.log('📊 Données du formulaire:');
    Object.entries(formData).forEach(([key, value]) => {
        console.log(`   - ${key}: "${value}"`);
    });
    
    console.log('\n2️⃣ ÉTAPE 2: Validation des données');
    
    // Vérifier les champs obligatoires
    const requiredFields = ['nom', 'business_unit_id'];
    let hasErrors = false;
    
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            console.log(`❌ Champ obligatoire manquant: ${field}`);
            hasErrors = true;
        } else {
            console.log(`✅ ${field}: OK`);
        }
    });
    
    if (hasErrors) {
        console.log('❌ Données invalides - arrêt du test');
        return;
    }
    
    console.log('\n3️⃣ ÉTAPE 3: Préparation de la requête');
    
    // Nettoyer et formater les données
    const cleanData = {
        nom: formData.nom.trim(),
        client_id: formData.client_id || null,
        collaborateur_id: formData.collaborateur_id || null,
        business_unit_id: formData.business_unit_id || null,
        opportunity_type_id: formData.opportunity_type_id || null,
        statut: formData.statut || 'EN_COURS',
        source: formData.source || null,
        probabilite: parseInt(formData.probabilite) || 50,
        montant_estime: parseFloat(formData.montant_estime) || null,
        devise: formData.devise || 'EUR',
        date_fermeture_prevue: formData.date_fermeture_prevue || null,
        description: formData.description || null
    };
    
    console.log('📤 Données à envoyer:');
    Object.entries(cleanData).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value} (${typeof value})`);
    });
    
    console.log('\n4️⃣ ÉTAPE 4: Test de la requête HTTP');
    
    // Simuler la requête
    const url = '/api/opportunities';
    const method = 'POST';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    
    console.log('🌐 Configuration de la requête:');
    console.log(`   - URL: ${url}`);
    console.log(`   - Méthode: ${method}`);
    console.log(`   - Headers:`, headers);
    
    // Test de la requête réelle
    fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(cleanData)
    })
    .then(response => {
        console.log('\n📡 Réponse du serveur:');
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Status Text: ${response.statusText}`);
        console.log(`   - Headers:`, Object.fromEntries(response.headers.entries()));
        
        return response.json();
    })
    .then(data => {
        console.log('\n📊 Données de réponse:');
        console.log('   - Success:', data.success);
        console.log('   - Message:', data.message);
        console.log('   - Error:', data.error);
        console.log('   - Data:', data.data);
        
        if (data.success) {
            console.log('✅ Enregistrement réussi!');
        } else {
            console.log('❌ Erreur lors de l\'enregistrement');
            console.log('   - Message d\'erreur:', data.error || data.message);
        }
    })
    .catch(error => {
        console.log('\n❌ Erreur de connexion:');
        console.log('   - Type:', error.name);
        console.log('   - Message:', error.message);
        console.log('   - Stack:', error.stack);
    });
};

// Fonction pour tester l'API directement
window.testOpportunityAPI = function() {
    console.log('\n🧪 TEST DIRECT DE L\'API');
    
    // Test avec des données minimales
    const testData = {
        nom: 'Test Opportunity',
        business_unit_id: document.getElementById('opportunityBusinessUnit')?.value || null,
        statut: 'EN_COURS',
        probabilite: 50,
        devise: 'EUR'
    };
    
    console.log('📤 Données de test:');
    Object.entries(testData).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value}`);
    });
    
    fetch('/api/opportunities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(testData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('📊 Réponse API:');
        console.log('   - Success:', data.success);
        console.log('   - Message:', data.message);
        console.log('   - Error:', data.error);
        console.log('   - Data:', data.data);
    })
    .catch(error => {
        console.log('❌ Erreur API:', error);
    });
};

// Fonction pour vérifier l'état du serveur
window.checkServerStatus = function() {
    console.log('\n🔍 VÉRIFICATION DU SERVEUR');
    
    fetch('/api/opportunities')
    .then(response => {
        console.log('📡 Statut du serveur:');
        console.log(`   - Status: ${response.status}`);
        console.log(`   - OK: ${response.ok}`);
        return response.json();
    })
    .then(data => {
        console.log('📊 Réponse GET /api/opportunities:');
        console.log('   - Success:', data.success);
        console.log('   - Data:', data.data);
    })
    .catch(error => {
        console.log('❌ Serveur inaccessible:', error);
    });
};

// Fonction pour afficher les logs du serveur
window.showServerLogs = function() {
    console.log('\n📋 LOGS DU SERVEUR');
    console.log('💡 Vérifiez la console du serveur pour voir les erreurs détaillées');
    console.log('💡 Commandes utiles:');
    console.log('   - netstat -ano | findstr :3000');
    console.log('   - taskkill /PID [PID] /F');
    console.log('   - node server.js');
};

console.log('\n✅ FONCTIONS DE TEST DISPONIBLES:');
console.log('💡 testOpportunitySave() - Test complet de l\'enregistrement');
console.log('💡 testOpportunityAPI() - Test direct de l\'API');
console.log('💡 checkServerStatus() - Vérifier l\'état du serveur');
console.log('💡 showServerLogs() - Afficher les logs du serveur'); 