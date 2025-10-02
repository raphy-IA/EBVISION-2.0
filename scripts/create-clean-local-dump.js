// Script pour créer un dump propre de la base locale
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function createCleanLocalDump() {
    console.log('🗄️  Création d\'un dump propre de la base locale...\n');
    
    try {
        // 1. Configuration
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const dumpFileName = `backup_local_clean_${timestamp}.sql`;
        const dumpPath = path.join(__dirname, '..', dumpFileName);
        
        console.log('1️⃣ Configuration du dump...');
        console.log(`📁 Fichier de sortie: ${dumpPath}`);
        
        // 2. Commande pg_dump avec les bonnes options
        const dumpCommand = `pg_dump -h localhost -U postgres -d eb_vision_2_0 --clean --if-exists --no-owner --no-privileges --inserts --encoding=UTF8 --verbose > "${dumpPath}"`;
        
        console.log('\n2️⃣ Exécution du dump...');
        console.log(`🔧 Commande: ${dumpCommand}`);
        
        // 3. Exécuter le dump
        exec(dumpCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erreur lors du dump:', error.message);
                return;
            }
            
            if (stderr) {
                console.log('⚠️  Avertissements du dump:');
                console.log(stderr);
            }
            
            // 4. Vérifier que le fichier a été créé
            if (fs.existsSync(dumpPath)) {
                const stats = fs.statSync(dumpPath);
                const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                console.log('\n✅ Dump créé avec succès !');
                console.log(`📊 Taille du fichier: ${fileSizeMB} MB`);
                console.log(`📁 Emplacement: ${dumpPath}`);
                
                // 5. Vérifier les premières lignes du fichier
                console.log('\n3️⃣ Vérification du contenu...');
                const content = fs.readFileSync(dumpPath, 'utf8');
                const lines = content.split('\n');
                
                console.log('📋 Premières lignes du dump:');
                lines.slice(0, 10).forEach((line, index) => {
                    console.log(`   ${index + 1}: ${line}`);
                });
                
                // 6. Vérifier la présence des tables importantes
                const hasUsers = content.includes('CREATE TABLE users') || content.includes('INSERT INTO users');
                const hasBusinessUnits = content.includes('CREATE TABLE business_units') || content.includes('INSERT INTO business_units');
                const hasRoles = content.includes('CREATE TABLE roles') || content.includes('INSERT INTO roles');
                
                console.log('\n🔍 Vérification des tables importantes:');
                console.log(`   ${hasUsers ? '✅' : '❌'} Table users`);
                console.log(`   ${hasBusinessUnits ? '✅' : '❌'} Table business_units`);
                console.log(`   ${hasRoles ? '✅' : '❌'} Table roles`);
                
                console.log('\n🎉 Dump terminé avec succès !');
                console.log('\n📋 Prochaines étapes:');
                console.log('1. Transférez ce fichier vers votre serveur de production');
                console.log('2. Exécutez: node scripts/import-clean-dump.js');
                
            } else {
                console.error('❌ Le fichier de dump n\'a pas été créé');
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

createCleanLocalDump().catch(console.error);








