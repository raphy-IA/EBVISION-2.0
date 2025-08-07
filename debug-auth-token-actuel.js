const jwt = require('jsonwebtoken');

async function debugAuthToken() {
    console.log('🔍 Débogage du token JWT actuel...');
    
    // Simuler un token JWT (vous devrez copier le vrai token depuis le localStorage)
    // Le token est stocké dans localStorage.getItem('authToken')
    console.log('\n📋 Pour déboguer le token JWT:');
    console.log('1. Ouvrez la console du navigateur (F12)');
    console.log('2. Tapez: localStorage.getItem("authToken")');
    console.log('3. Copiez le token et collez-le ici');
    
    // Exemple de décodage (sans vérification de signature)
    const tokenExample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI2MzA2Y2U1LWNhYjYtNDUzYS1iNzUzLWNkYWE1NGNhZDBkNCIsIm5vbSI6Ik5nb3MiLCJwcmVub20iOiJSYXBoYcOqbCIsImVtYWlsIjoicm5nb3NAZWItcGFlcnNmLmNtIiwiaWF0IjoxNzM1NzI5NjAwfQ.example';
    
    try {
        // Décoder la partie payload (sans vérifier la signature)
        const parts = tokenExample.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('\n📊 Exemple de payload décodé:', payload);
        }
    } catch (error) {
        console.log('❌ Erreur de décodage:', error.message);
    }
    
    console.log('\n🔧 Pour corriger le problème:');
    console.log('1. Vérifiez que le token contient le bon user_id');
    console.log('2. Vérifiez que la signature est valide');
    console.log('3. Vérifiez que le secret JWT est cohérent');
}

debugAuthToken().catch(console.error);
