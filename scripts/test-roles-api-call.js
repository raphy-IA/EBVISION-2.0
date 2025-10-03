const fetch = require('node-fetch');

// Script pour tester l'appel API des rôles
async function testRolesApiCall() {
  console.log('🔍 Test de l\'appel API des rôles...\n');
  
  try {
    // 1. Simuler un token d'authentification (vous devrez le remplacer par un vrai token)
    const token = 'YOUR_AUTH_TOKEN_HERE'; // Remplacez par un vrai token
    
    console.log('🌐 APPEL API:');
    console.log('=============');
    console.log('   URL: http://localhost:3000/api/users/roles');
    console.log('   Méthode: GET');
    console.log('   Headers: Authorization: Bearer ' + token.substring(0, 20) + '...');
    console.log('');
    
    // 2. Faire l'appel API
    const response = await fetch('http://localhost:3000/api/users/roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 RÉPONSE API:');
    console.log('===============');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    console.log('');
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 DONNÉES REÇUES:');
      console.log('==================');
      console.log(`   Type: ${typeof data}`);
      console.log(`   Is Array: ${Array.isArray(data)}`);
      console.log(`   Length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      console.log('');
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('✅ RÔLES REÇUS:');
        console.log('===============');
        data.forEach((role, index) => {
          console.log(`   ${index + 1}. ${role.name} (ID: ${role.id})`);
          if (role.description) {
            console.log(`      Description: ${role.description}`);
          }
        });
        console.log('');
        
        console.log('🎯 FORMAT POUR LE FRONTEND:');
        console.log('===========================');
        console.log('   Le frontend devrait recevoir un tableau de rôles');
        console.log('   Chaque rôle devrait avoir: name, id, description');
        console.log('   La fonction loadGeneratedRoles() devrait pouvoir les afficher');
        
      } else {
        console.log('❌ PROBLÈME:');
        console.log('============');
        console.log('   Aucun rôle reçu ou format incorrect');
        console.log('   Vérifiez l\'implémentation de l\'endpoint backend');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ ERREUR API:');
      console.log('==============');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${errorText}`);
      console.log('');
      
      if (response.status === 401) {
        console.log('🔑 PROBLÈME D\'AUTHENTIFICATION:');
        console.log('================================');
        console.log('   Token invalide ou expiré');
        console.log('   Vérifiez que le token est correct');
      } else if (response.status === 403) {
        console.log('🚫 PROBLÈME DE PERMISSIONS:');
        console.log('============================');
        console.log('   Utilisateur n\'a pas les permissions pour accéder aux rôles');
        console.log('   Vérifiez les permissions de l\'utilisateur');
      }
    }
    
  } catch (error) {
    console.error('❌ ERREUR LORS DU TEST:');
    console.error('========================');
    console.error(`   Message: ${error.message}`);
    console.error(`   Type: ${error.name}`);
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 PROBLÈME DE CONNEXION:');
      console.log('==========================');
      console.log('   Le serveur n\'est pas démarré ou n\'écoute pas sur le port 3000');
      console.log('   Vérifiez que le serveur Node.js est en cours d\'exécution');
    }
  }
  
  console.log('\n📋 INSTRUCTIONS POUR LE TEST:');
  console.log('==============================');
  console.log('1. Démarrez le serveur Node.js: npm start');
  console.log('2. Connectez-vous à l\'application et récupérez votre token d\'authentification');
  console.log('3. Remplacez YOUR_AUTH_TOKEN_HERE par votre vrai token');
  console.log('4. Relancez ce script: node scripts/test-roles-api-call.js');
  console.log('5. Vérifiez les logs du serveur pour voir l\'exécution de l\'endpoint');
}

// Exécuter le script
if (require.main === module) {
  testRolesApiCall();
}

module.exports = { testRolesApiCall };





