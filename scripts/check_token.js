// Script de diagnostic du token JWT
// À exécuter dans la console du navigateur (F12)

console.log('🔍 Diagnostic du Token JWT\n');

// 1. Récupérer le token
const token = localStorage.getItem('token');
if (!token) {
    console.error('❌ Aucun token trouvé dans localStorage');
} else {
    console.log('✅ Token trouvé');

    // 2. Décoder le payload du JWT (partie centrale entre les deux points)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        console.log('\n📋 Contenu du token:');
        console.log('  - User ID:', payload.userId);
        console.log('  - Login:', payload.login);
        console.log('  - Émis le:', new Date(payload.iat * 1000).toLocaleString());
        console.log('  - Expire le:', new Date(payload.exp * 1000).toLocaleString());

        console.log('\n🔐 Permissions dans le token:');
        if (payload.permissions && Array.isArray(payload.permissions)) {
            console.log(`  Total: ${payload.permissions.length} permissions`);

            // Chercher OBJECTIVES_CONFIG_EDIT
            const hasPermission = payload.permissions.includes('OBJECTIVES_CONFIG_EDIT');
            if (hasPermission) {
                console.log('  ✅ OBJECTIVES_CONFIG_EDIT: PRÉSENTE');
            } else {
                console.log('  ❌ OBJECTIVES_CONFIG_EDIT: ABSENTE');
                console.log('\n⚠️ PROBLÈME IDENTIFIÉ!');
                console.log('  La permission existe en BDD mais pas dans votre token JWT.');
                console.log('  Solution: Déconnectez-vous et reconnectez-vous pour obtenir un nouveau token.');
            }

            // Afficher quelques permissions pour référence
            console.log('\n  Premières permissions:');
            payload.permissions.slice(0, 10).forEach((p, i) => {
                console.log(`    ${i + 1}. ${p}`);
            });
        } else {
            console.log('  ⚠️ Aucune permission trouvée dans le token');
        }

    } catch (error) {
        console.error('❌ Erreur lors du décodage du token:', error);
    }
}

console.log('\n💡 Pour forcer un nouveau token:');
console.log('1. Cliquez sur votre profil en haut à droite');
console.log('2. Cliquez sur "Se déconnecter"');
console.log('3. Reconnectez-vous avec vos identifiants');
