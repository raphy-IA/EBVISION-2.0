// Script pour corriger l'encodage du fichier de sauvegarde
const fs = require('fs');

async function fixBackupEncoding() {
    console.log('🔧 Correction de l\'encodage du fichier de sauvegarde...\n');
    
    try {
        // 1. Lire le fichier de sauvegarde
        console.log('1️⃣ Lecture du fichier de sauvegarde...');
        const backupFile = 'backup_local_20250901_041626.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier de sauvegarde non trouvé');
            return;
        }
        
        const content = fs.readFileSync(backupFile, 'utf8');
        console.log(`✅ Fichier lu (${content.length} caractères)`);
        
        // 2. Nettoyer le contenu
        console.log('\n2️⃣ Nettoyage du contenu...');
        
        // Supprimer les caractères BOM et autres caractères bizarres au début
        let cleanContent = content;
        
        // Supprimer les caractères BOM UTF-8
        if (cleanContent.charCodeAt(0) === 0xFEFF) {
            cleanContent = cleanContent.slice(1);
            console.log('✅ Caractère BOM UTF-8 supprimé');
        }
        
        // Supprimer les caractères bizarres au début
        const lines = cleanContent.split('\n');
        let startIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Chercher la première ligne qui ressemble à du SQL valide
            if (line.startsWith('--') || line.startsWith('CREATE') || line.startsWith('SET') || line.startsWith('DROP')) {
                startIndex = i;
                break;
            }
        }
        
        cleanContent = lines.slice(startIndex).join('\n');
        console.log(`✅ Contenu nettoyé (${cleanContent.length} caractères)`);
        
        // 3. Créer le fichier corrigé
        console.log('\n3️⃣ Création du fichier corrigé...');
        const fixedFile = 'backup_local_fixed.sql';
        fs.writeFileSync(fixedFile, cleanContent, 'utf8');
        console.log(`✅ Fichier corrigé créé: ${fixedFile}`);
        
        // 4. Vérifier le début du fichier
        console.log('\n4️⃣ Vérification du fichier corrigé...');
        const firstLines = cleanContent.split('\n').slice(0, 5);
        console.log('📋 Premières lignes du fichier corrigé:');
        firstLines.forEach((line, index) => {
            console.log(`   ${index + 1}: ${line}`);
        });
        
        console.log('\n🎉 Fichier de sauvegarde corrigé avec succès !');
        console.log(`📁 Fichier: ${fixedFile}`);
        console.log('💡 Vous pouvez maintenant utiliser ce fichier pour l\'import en production.');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    }
}

fixBackupEncoding().catch(console.error);



















