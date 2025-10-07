// Script simple pour nettoyer le fichier
const fs = require('fs');

async function simpleCleanup() {
    console.log('🧹 Nettoyage simple du fichier...\n');
    
    try {
        // 1. Lire le fichier
        console.log('1️⃣ Lecture du fichier...');
        const backupFile = 'backup_production_ready.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_production_ready.sql non trouvé');
            return;
        }
        
        const content = fs.readFileSync(backupFile, 'utf8');
        console.log(`✅ Fichier lu (${content.length} caractères)`);
        
        // 2. Nettoyer les caractères bizarres
        console.log('\n2️⃣ Nettoyage des caractères bizarres...');
        let cleanContent = content;
        
        // Supprimer tous les caractères non-ASCII
        cleanContent = cleanContent.replace(/[^\x00-\x7F]/g, '');
        console.log('✅ Caractères non-ASCII supprimés');
        
        // 3. Nettoyer les lignes vides
        console.log('\n3️⃣ Nettoyage des lignes vides...');
        const lines = cleanContent.split('\n');
        const cleanLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line !== '') {
                cleanLines.push(lines[i]);
            }
        }
        
        cleanContent = cleanLines.join('\n');
        console.log(`✅ Lignes nettoyées (${cleanLines.length} lignes)`);
        
        // 4. Créer le fichier final
        console.log('\n4️⃣ Création du fichier final...');
        const finalFile = 'backup_simple_clean.sql';
        fs.writeFileSync(finalFile, cleanContent, 'utf8');
        console.log(`✅ Fichier final créé: ${finalFile}`);
        
        // 5. Vérifier le début
        console.log('\n5️⃣ Vérification du fichier final...');
        const firstLines = cleanContent.split('\n').slice(0, 10);
        console.log('📋 Premières lignes:');
        firstLines.forEach((line, index) => {
            if (line.trim()) {
                console.log(`   ${index + 1}: ${line}`);
            }
        });
        
        // 6. Vérifier la taille
        const stats = fs.statSync(finalFile);
        console.log(`\n📊 Taille du fichier final: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // 7. Vérifier qu'il n'y a plus de caractères bizarres
        const hasInvalidChars = cleanContent.match(/[^\x00-\x7F]/);
        if (!hasInvalidChars) {
            console.log('✅ Aucun caractère bizarre détecté');
        } else {
            console.log('⚠️  Caractères bizarres encore présents');
        }
        
        console.log('\n🎉 Fichier nettoyé avec succès !');
        console.log(`📁 Fichier: ${finalFile}`);
        console.log('💡 Ce fichier devrait maintenant être compatible avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

simpleCleanup().catch(console.error);











