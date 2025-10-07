// Script pour convertir UTF-16 en UTF-8
const fs = require('fs');

async function fixUtf16() {
    console.log('🔄 Conversion UTF-16 vers UTF-8...\n');
    
    try {
        // 1. Lire le fichier en mode binaire
        console.log('1️⃣ Lecture du fichier...');
        const backupFile = 'backup_final.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_final.sql non trouvé');
            return;
        }
        
        const buffer = fs.readFileSync(backupFile);
        console.log(`✅ Fichier lu (${buffer.length} octets)`);
        
        // 2. Convertir UTF-16 LE vers UTF-8
        console.log('\n2️⃣ Conversion UTF-16 vers UTF-8...');
        const content = buffer.toString('utf16le');
        console.log(`✅ Conversion terminée (${content.length} caractères)`);
        
        // 3. Créer le fichier UTF-8
        console.log('\n3️⃣ Création du fichier UTF-8...');
        const utf8File = 'backup_utf8.sql';
        fs.writeFileSync(utf8File, content, 'utf8');
        console.log(`✅ Fichier UTF-8 créé: ${utf8File}`);
        
        // 4. Vérifier le début
        console.log('\n4️⃣ Vérification du fichier UTF-8...');
        const firstLines = content.split('\n').slice(0, 5);
        console.log('📋 Premières lignes:');
        firstLines.forEach((line, index) => {
            console.log(`   ${index + 1}: ${line}`);
        });
        
        // 5. Vérifier la taille
        const stats = fs.statSync(utf8File);
        console.log(`\n📊 Taille du fichier UTF-8: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        console.log('\n🎉 Conversion UTF-16 vers UTF-8 terminée !');
        console.log(`📁 Fichier: ${utf8File}`);
        console.log('💡 Ce fichier devrait maintenant être compatible avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors de la conversion:', error.message);
    }
}

fixUtf16().catch(console.error);











