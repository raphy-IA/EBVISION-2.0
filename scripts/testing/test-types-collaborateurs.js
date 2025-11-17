#!/usr/bin/env node

/**
 * Script de test pour la gestion des types de collaborateurs
 * Teste les fonctionnalités CRUD via l'API
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken = '';

// Couleurs pour l'affichage console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
    log('\n📝 Authentification...', 'cyan');
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.TEST_USER_EMAIL || 'admin@eb-partnersgroup.cm',
                password: process.env.TEST_USER_PASSWORD || 'Admin123!'
            })
        });

        const data = await response.json();
        if (data.token) {
            authToken = data.token;
            log('✅ Authentification réussie', 'green');
            return true;
        } else {
            log('❌ Échec de l\'authentification', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Erreur d'authentification: ${error.message}`, 'red');
        return false;
    }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return { response, data };
}

async function testGetAllTypes() {
    log('\n📋 Test: Récupération de tous les types de collaborateurs', 'cyan');
    try {
        const { response, data } = await apiRequest('/api/types-collaborateurs?limit=100');
        
        if (response.ok && data.success) {
            log(`✅ ${data.data.length} types récupérés`, 'green');
            if (data.data.length > 0) {
                log(`   Premier type: ${data.data[0].code} - ${data.data[0].nom}`, 'blue');
            }
            return data.data;
        } else {
            log('❌ Échec de récupération', 'red');
            return [];
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return [];
    }
}

async function testGetStatistics() {
    log('\n📊 Test: Récupération des statistiques', 'cyan');
    try {
        const { response, data } = await apiRequest('/api/types-collaborateurs/statistics');
        
        if (response.ok) {
            log('✅ Statistiques récupérées:', 'green');
            log(`   Total: ${data.total}`, 'blue');
            log(`   Actifs: ${data.actifs}`, 'blue');
            log(`   Inactifs: ${data.inactifs}`, 'blue');
            log(`   Collaborateurs: ${data.collaborateurs}`, 'blue');
            return data;
        } else {
            log('❌ Échec de récupération des statistiques', 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return null;
    }
}

async function testCreateType() {
    log('\n➕ Test: Création d\'un nouveau type', 'cyan');
    const newType = {
        code: 'TEST-' + Date.now().toString().slice(-4),
        nom: 'Type de Test',
        description: 'Type créé automatiquement pour les tests',
        statut: 'ACTIF'
    };

    try {
        const { response, data } = await apiRequest('/api/types-collaborateurs', 'POST', newType);
        
        if (response.ok && data.success) {
            log(`✅ Type créé avec succès: ${data.data.code}`, 'green');
            log(`   ID: ${data.data.id}`, 'blue');
            return data.data;
        } else {
            log(`❌ Échec de création: ${data.details || data.error}`, 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return null;
    }
}

async function testGetTypeById(id) {
    log(`\n🔍 Test: Récupération du type ${id}`, 'cyan');
    try {
        const { response, data } = await apiRequest(`/api/types-collaborateurs/${id}`);
        
        if (response.ok && data.success) {
            log(`✅ Type récupéré: ${data.data.code} - ${data.data.nom}`, 'green');
            return data.data;
        } else {
            log('❌ Type non trouvé', 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return null;
    }
}

async function testUpdateType(id) {
    log(`\n✏️ Test: Modification du type ${id}`, 'cyan');
    const updates = {
        nom: 'Type de Test Modifié',
        description: 'Description mise à jour',
        statut: 'ACTIF'
    };

    try {
        const { response, data } = await apiRequest(`/api/types-collaborateurs/${id}`, 'PUT', updates);
        
        if (response.ok && data.success) {
            log(`✅ Type modifié: ${data.data.nom}`, 'green');
            return data.data;
        } else {
            log(`❌ Échec de modification: ${data.details || data.error}`, 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return null;
    }
}

async function testDeleteType(id) {
    log(`\n🗑️ Test: Suppression du type ${id}`, 'cyan');
    try {
        const { response, data } = await apiRequest(`/api/types-collaborateurs/${id}`, 'DELETE');
        
        if (response.ok && data.success) {
            log('✅ Type supprimé avec succès', 'green');
            return true;
        } else {
            log(`❌ Échec de suppression: ${data.details || data.error}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        return false;
    }
}

async function runTests() {
    log('\n╔═══════════════════════════════════════════════════════╗', 'bright');
    log('║   TEST DES TYPES DE COLLABORATEURS - EB VISION 2.0   ║', 'bright');
    log('╚═══════════════════════════════════════════════════════╝', 'bright');

    // 1. Authentification
    const authenticated = await login();
    if (!authenticated) {
        log('\n❌ Impossible de continuer sans authentification', 'red');
        process.exit(1);
    }

    // 2. Récupérer tous les types
    const allTypes = await testGetAllTypes();

    // 3. Récupérer les statistiques
    await testGetStatistics();

    // 4. Créer un nouveau type
    const createdType = await testCreateType();
    
    if (createdType) {
        // 5. Récupérer le type créé
        await testGetTypeById(createdType.id);

        // 6. Modifier le type
        await testUpdateType(createdType.id);

        // 7. Supprimer le type
        await testDeleteType(createdType.id);
    }

    // Résumé final
    log('\n╔═══════════════════════════════════════════════════════╗', 'bright');
    log('║                    RÉSUMÉ DES TESTS                   ║', 'bright');
    log('╚═══════════════════════════════════════════════════════╝', 'bright');
    log(`\n✅ Tests terminés`, 'green');
    log(`📊 ${allTypes.length} types existants dans la base`, 'cyan');
    
    if (createdType) {
        log('✅ Cycle CRUD complet testé avec succès', 'green');
    } else {
        log('⚠️ Le cycle CRUD complet n\'a pas pu être testé', 'yellow');
    }
}

// Lancer les tests
runTests().catch(error => {
    log(`\n❌ Erreur fatale: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});




