// Script pour déboguer le token d'authentification
console.log('🔍 Débogage du token d\'authentification...');

// Vérifier tous les tokens possibles dans localStorage
const possibleTokenKeys = [
    'authToken',
    'token',
    'jwt',
    'access_token',
    'userToken',
    'auth_token'
];

console.log('📋 Tokens trouvés dans localStorage:');
possibleTokenKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
        console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    } else {
        console.log(`❌ ${key}: non trouvé`);
    }
});

// Vérifier les autres données utilisateur
console.log('\n👤 Données utilisateur dans localStorage:');
const userKeys = ['user', 'userInfo', 'currentUser'];
userKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
        try {
            const userData = JSON.parse(value);
            console.log(`✅ ${key}:`, userData);
        } catch (e) {
            console.log(`✅ ${key}: ${value.substring(0, 50)}...`);
        }
    } else {
        console.log(`❌ ${key}: non trouvé`);
    }
});

// Test de l'API avec le token trouvé
async function testWithRealToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('❌ Aucun token authToken trouvé');
        return;
    }
    
    console.log('\n🧪 Test de l\'API avec le token réel...');
    try {
        const response = await fetch('/api/time-sheet-supervisors/all-supervisors', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API fonctionne avec le token réel');
            console.log('Data:', data);
        } else {
            console.log('❌ API ne fonctionne pas avec le token réel');
            const errorText = await response.text();
            console.log('Error:', errorText);
        }
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    }
}

// Exécuter le test
testWithRealToken(); 