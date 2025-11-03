// Script pour nettoyer complètement le fichier de sauvegarde
const fs = require('fs');

async function cleanBackupFile() {
    console.log('🧹 Nettoyage complet du fichier de sauvegarde...\n');
    
    try {
        // 1. Lire le fichier en mode binaire
        console.log('1️⃣ Lecture du fichier en mode binaire...');
        const backupFile = 'backup_clean.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_clean.sql non trouvé');
            return;
        }
        
        // Lire en mode binaire pour détecter les BOM
        const buffer = fs.readFileSync(backupFile);
        console.log(`✅ Fichier lu (${buffer.length} octets)`);
        
        // 2. Supprimer les BOM UTF-8
        console.log('\n2️⃣ Suppression des caractères BOM...');
        let cleanBuffer = buffer;
        
        // Supprimer BOM UTF-8 (EF BB BF)
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            cleanBuffer = buffer.slice(3);
            console.log('✅ BOM UTF-8 supprimé (EF BB BF)');
        }
        
        // Supprimer BOM UTF-16 LE (FF FE)
        else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            cleanBuffer = buffer.slice(2);
            console.log('✅ BOM UTF-16 LE supprimé (FF FE)');
        }
        
        // Supprimer BOM UTF-16 BE (FE FF)
        else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            cleanBuffer = buffer.slice(2);
            console.log('✅ BOM UTF-16 BE supprimé (FE FF)');
        }
        
        // Supprimer BOM UTF-32 LE (FF FE 00 00)
        else if (buffer.length >= 4 && buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0x00 && buffer[3] === 0x00) {
            cleanBuffer = buffer.slice(4);
            console.log('✅ BOM UTF-32 LE supprimé (FF FE 00 00)');
        }
        
        // Supprimer BOM UTF-32 BE (00 00 FE FF)
        else if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xFE && buffer[3] === 0xFF) {
            cleanBuffer = buffer.slice(4);
            console.log('✅ BOM UTF-32 BE supprimé (00 00 FE FF)');
        }
        
        else {
            console.log('ℹ️  Aucun BOM détecté');
        }
        
        // 3. Convertir en string et nettoyer
        console.log('\n3️⃣ Conversion et nettoyage du contenu...');
        let content = cleanBuffer.toString('utf8');
        
        // Supprimer les lignes avec des caractères bizarres au début
        const lines = content.split('\n');
        let startIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Chercher la première ligne qui ressemble à du SQL valide
            if (line.startsWith('--') || line.startsWith('CREATE') || line.startsWith('SET') || line.startsWith('DROP') || line.startsWith('BEGIN') || line.startsWith('COMMIT')) {
                startIndex = i;
                break;
            }
        }
        
        content = lines.slice(startIndex).join('\n');
        console.log(`✅ Contenu nettoyé (${content.length} caractères)`);
        
        // 4. Créer le fichier final
        console.log('\n4️⃣ Création du fichier final...');
        const finalFile = 'backup_final.sql';
        fs.writeFileSync(finalFile, content, 'utf8');
        console.log(`✅ Fichier final créé: ${finalFile}`);
        
        // 5. Vérifier le début du fichier
        console.log('\n5️⃣ Vérification du fichier final...');
        const firstLines = content.split('\n').slice(0, 10);
        console.log('📋 Premières lignes du fichier final:');
        firstLines.forEach((line, index) => {
            if (line.trim()) {
                console.log(`   ${index + 1}: ${line}`);
            }
        });
        
        // 6. Vérifier la taille
        const stats = fs.statSync(finalFile);
        console.log(`\n📊 Taille du fichier final: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        console.log('\n🎉 Fichier de sauvegarde complètement nettoyé !');
        console.log(`📁 Fichier: ${finalFile}`);
        console.log('💡 Vous pouvez maintenant utiliser ce fichier pour l\'import en production.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

cleanBackupFile().catch(console.error);



















