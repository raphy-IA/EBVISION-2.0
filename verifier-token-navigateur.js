console.log('🔍 Vérification du token dans le navigateur...');

// Instructions pour l'utilisateur
console.log('\n📋 Instructions:');
console.log('1. Ouvrez la console du navigateur (F12)');
console.log('2. Copiez et collez cette commande:');
console.log('   localStorage.getItem("authToken")');
console.log('3. Copiez le token et collez-le ici');

// Générer un nouveau token valide pour Raphaël
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'eb_vision_2_0_super_secret_key_2024';

const raphaelUser = {
    id: 'b306cee5-cab6-453a-b753-cdaa54cad0d4',
    email: 'rngos@eb-paersf.cm',
    nom: 'Ngos',
    prenom: 'Raphaël',
    role: 'MANAGER'
};

const newToken = jwt.sign(raphaelUser, JWT_SECRET, { expiresIn: '24h' });

console.log('\n🎯 Nouveau token valide pour Raphaël:');
console.log(newToken);

console.log('\n📋 Pour corriger le problème:');
console.log('1. Ouvrez la console du navigateur (F12)');
console.log('2. Supprimez l\'ancien token:');
console.log('   localStorage.removeItem("authToken")');
console.log('3. Ajoutez le nouveau token:');
console.log(`   localStorage.setItem("authToken", "${newToken}")`);
console.log('4. Rechargez la page (F5)');
console.log('5. Testez les boutons "Approuver" et "Rejeter"');

console.log('\n✅ Le problème devrait être résolu !');
