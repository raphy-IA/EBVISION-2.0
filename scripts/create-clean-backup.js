// Script pour créer un nouveau dump propre
const { exec } = require('child_process');

async function createCleanBackup() {
    console.log('🔄 Création d\'un nouveau dump propre...\n');
    
    try {
        // 1. Créer un nouveau dump avec les bonnes options
        console.log('1️⃣ Création du dump...');
        
        const dumpCommand = 'pg_dump -h localhost -U postgres -d eb_vision_2_0 --clean --if-exists --no-owner --no-privileges --encoding=UTF8 --no-password > backup_clean.sql';
        
        console.log(`🔄 Exécution: ${dumpCommand}`);
        
        exec(dumpCommand, { env: { ...process.env, PGPASSWORD: 'votre_mot_de_passe_postgres' } }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erreur lors du dump:', error.message);
                return;
            }
            
            if (stderr) {
                console.log('⚠️  Avertissements:', stderr);
            }
            
            console.log('✅ Dump créé avec succès !');
            console.log('📁 Fichier: backup_clean.sql');
            
            // 2. Vérifier le fichier
            const fs = require('fs');
            if (fs.existsSync('backup_clean.sql')) {
                const stats = fs.statSync('backup_clean.sql');
                console.log(`📊 Taille du fichier: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Vérifier le début du fichier
                const content = fs.readFileSync('backup_clean.sql', 'utf8');
                const firstLines = content.split('\n').slice(0, 5);
                console.log('\n📋 Premières lignes:');
                firstLines.forEach((line, index) => {
                    console.log(`   ${index + 1}: ${line}`);
                });
                
                console.log('\n🎉 Fichier de sauvegarde propre créé !');
                console.log('💡 Vous pouvez maintenant transférer ce fichier vers la production.');
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

createCleanBackup().catch(console.error);







