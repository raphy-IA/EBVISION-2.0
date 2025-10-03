// Script pour nettoyer le fichier de sauvegarde sur le serveur de production
const fs = require('fs');

async function fixProductionBackup() {
    console.log('🧹 Nettoyage du fichier de sauvegarde sur le serveur de production...\n');
    
    try {
        // 1. Lire le fichier en mode binaire
        console.log('1️⃣ Lecture du fichier en mode binaire...');
        const backupFile = 'backup_clean_inserts.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_clean_inserts.sql non trouvé');
            return;
        }
        
        const buffer = fs.readFileSync(backupFile);
        console.log(`✅ Fichier lu (${buffer.length} octets)`);
        
        // 2. Analyser les premiers octets
        console.log('\n2️⃣ Analyse des premiers octets...');
        const firstBytes = buffer.slice(0, 10);
        console.log('📋 Premiers octets (hex):', firstBytes.toString('hex'));
        console.log('📋 Premiers octets (ascii):', firstBytes.toString('ascii'));
        
        // 3. Supprimer les BOM
        console.log('\n3️⃣ Suppression des BOM...');
        let cleanBuffer = buffer;
        
        // Supprimer BOM UTF-16 LE (FF FE)
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            cleanBuffer = buffer.slice(2);
            console.log('✅ BOM UTF-16 LE supprimé (FF FE)');
        }
        // Supprimer BOM UTF-16 BE (FE FF)
        else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            cleanBuffer = buffer.slice(2);
            console.log('✅ BOM UTF-16 BE supprimé (FE FF)');
        }
        // Supprimer BOM UTF-8 (EF BB BF)
        else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            cleanBuffer = buffer.slice(3);
            console.log('✅ BOM UTF-8 supprimé (EF BB BF)');
        }
        else {
            console.log('ℹ️  Aucun BOM détecté');
        }
        
        // 4. Convertir en UTF-8
        console.log('\n4️⃣ Conversion en UTF-8...');
        const content = cleanBuffer.toString('utf16le');
        console.log(`✅ Conversion terminée (${content.length} caractères)`);
        
        // 5. Créer le fichier final
        console.log('\n5️⃣ Création du fichier final...');
        const finalFile = 'backup_production_ready.sql';
        fs.writeFileSync(finalFile, content, 'utf8');
        console.log(`✅ Fichier final créé: ${finalFile}`);
        
        // 6. Vérifier le début
        console.log('\n6️⃣ Vérification du fichier final...');
        const firstLines = content.split('\n').slice(0, 5);
        console.log('📋 Premières lignes:');
        firstLines.forEach((line, index) => {
            console.log(`   ${index + 1}: ${line}`);
        });
        
        // 7. Vérifier la taille
        const stats = fs.statSync(finalFile);
        console.log(`\n📊 Taille du fichier final: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // 8. Vérifier qu'il n'y a pas de caractères bizarres
        const hasInvalidChars = content.includes('\\7U') || content.includes('\\N') || content.includes('0xff');
        if (!hasInvalidChars) {
            console.log('✅ Aucun caractère invalide détecté');
        } else {
            console.log('⚠️  Caractères invalides détectés, nettoyage supplémentaire nécessaire');
        }
        
        console.log('\n🎉 Fichier prêt pour la production !');
        console.log(`📁 Fichier: ${finalFile}`);
        console.log('💡 Vous pouvez maintenant utiliser ce fichier avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

fixProductionBackup().catch(console.error);









