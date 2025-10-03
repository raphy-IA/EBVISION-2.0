// Script pour démarrer l'application EB-Vision 2.0
const { exec } = require('child_process');

console.log('🚀 Démarrage de l\'application EB-Vision 2.0...\n');

// Vérifier le statut PM2 actuel
exec('pm2 status', (error, stdout, stderr) => {
    console.log('📊 Statut PM2 actuel:');
    console.log(stdout);
    
    console.log('\n🔧 Démarrage de l\'application...');
    
    // Démarrer l'application avec PM2
    exec('pm2 start ecosystem.config.js --env production', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Erreur lors du démarrage:', error.message);
            return;
        }
        
        console.log('✅ Application démarrée avec succès !');
        console.log(stdout);
        
        console.log('\n📊 Vérification du statut...');
        
        // Vérifier le nouveau statut
        exec('pm2 status', (error, stdout, stderr) => {
            console.log(stdout);
            
            console.log('\n🎉 Application EB-Vision 2.0 prête !');
            console.log('💡 Vous pouvez maintenant tester la connexion avec vos identifiants locaux');
        });
    });
});









