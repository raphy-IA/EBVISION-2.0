const { exec } = require('child_process');

const pages = [
    'http://localhost:3000/dashboard.html',
    'http://localhost:3000/time-entries.html',
    'http://localhost:3000/validation.html',
    'http://localhost:3000/reports.html',
    'http://localhost:3000/collaborateurs.html'
];

console.log('🚀 Ouverture de toutes les pages dans le navigateur...');

pages.forEach((url, index) => {
    setTimeout(() => {
        console.log(`📄 Ouverture de: ${url}`);
        
        // Ouvrir dans le navigateur par défaut
        exec(`start ${url}`, (error) => {
            if (error) {
                console.error(`❌ Erreur lors de l'ouverture de ${url}:`, error.message);
            } else {
                console.log(`✅ ${url} ouvert avec succès`);
            }
        });
    }, index * 1000); // Délai de 1 seconde entre chaque ouverture
});

console.log('\n📋 Instructions de test:');
console.log('1. Vérifiez que toutes les pages se chargent correctement');
console.log('2. Testez les liens de navigation dans la sidebar du dashboard');
console.log('3. Testez les boutons "Retour" sur chaque page');
console.log('4. Vérifiez que les fonctionnalités de chaque page marchent');
console.log('\n🔗 URLs à tester:');
pages.forEach(url => console.log(`   - ${url}`)); 