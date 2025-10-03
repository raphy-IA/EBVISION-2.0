// Script pour redémarrer l'application PM2
const { exec } = require('child_process');

async function restartApplication() {
    console.log('🔄 Redémarrage de l\'application EB-Vision 2.0...\n');
    
    try {
        // 1. Vérifier l'état de PM2
        console.log('1️⃣ Vérification de l\'état PM2...');
        exec('pm2 status', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Erreur PM2:', error.message);
                return;
            }
            console.log('📊 État PM2:');
            console.log(stdout);
            
            // 2. Démarrer l'application
            console.log('\n2️⃣ Démarrage de l\'application...');
            exec('pm2 start ecosystem.config.js --env production', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Erreur lors du démarrage:', error.message);
                    return;
                }
                
                if (stderr) {
                    console.log('⚠️  Avertissements:', stderr);
                }
                
                console.log('✅ Application démarrée !');
                console.log(stdout);
                
                // 3. Vérifier le statut final
                console.log('\n3️⃣ Vérification du statut final...');
                setTimeout(() => {
                    exec('pm2 status', (error, stdout, stderr) => {
                        if (error) {
                            console.log('❌ Erreur lors de la vérification:', error.message);
                            return;
                        }
                        console.log('📊 État final PM2:');
                        console.log(stdout);
                        
                        console.log('\n🎉 Application redémarrée avec succès !');
                        console.log('\n💡 Prochaines étapes:');
                        console.log('1. Testez la connexion avec vos identifiants locaux');
                        console.log('   - admin@trs.com');
                        console.log('   - admin.test@trs.com');
                        console.log('   - cdjiki@eb-partnersgroup.cm');
                        console.log('2. Vérifiez les logs si nécessaire: pm2 logs eb-vision-2-0');
                    });
                }, 3000);
            });
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

restartApplication().catch(console.error);










