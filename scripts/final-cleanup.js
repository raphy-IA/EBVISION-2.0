// Script pour nettoyer complètement le fichier et corriger les caractères bizarres
const fs = require('fs');

async function finalCleanup() {
    console.log('🧹 Nettoyage final du fichier...\n');
    
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
        
        // Remplacer les caractères bizarres par leurs équivalents ASCII
        const replacements = {
            '਀': ' ',
            'ⴀ': '-',
            'ⴀ': '-',
            ' ': ' ',
            '倀': 'P',
            '漀': 'o',
            '猀': 's',
            '琀': 't',
            '最': 'g',
            '爀': 'r',
            '攀': 'e',
            '匀': 'S',
            '儀': 'Q',
            '䰀': 'L',
            '搀': 'd',
            '愀': 'a',
            '琀': 't',
            '愀': 'a',
            '戀': 'b',
            '愀': 'a',
            '猀': 's',
            '攀': 'e',
            '搀': 'd',
            '甀': 'u',
            '洀': 'm',
            '瀀': 'p',
            '䐀': 'D',
            '甀': 'u',
            '洀': 'm',
            '瀀': 'p',
            '戀': 'b',
            '礀': 'y',
            '瀀': 'p',
            '最': 'g',
            '开': '_',
            '搀': 'd',
            '甀': 'u',
            '洀': 'm',
            '瀀': 'p',
            '瘀': 'v',
            '攀': 'e',
            '爀': 'r',
            '猀': 's',
            '椀': 'i',
            '漀': 'o',
            '渀': 'n',
            '匀': 'S',
            '䔀': 'E',
            '吀': 'T',
            '猀': 's',
            '琀': 't',
            '愀': 'a',
            '琀': 't',
            '攀': 'e',
            '洀': 'm',
            '攀': 'e',
            '渀': 'n',
            '琀': 't',
            '开': '_',
            '琀': 't',
            '椀': 'i',
            '洀': 'm',
            '攀': 'e',
            '漀': 'o',
            '甀': 'u',
            '琀': 't',
            '㴀': '=',
            '　': ' ',
            '㬀': ';',
            '椀': 'i',
            '搀': 'd',
            '氀': 'l',
            '攀': 'e',
            '开': '_',
            '椀': 'i',
            '渀': 'n',
            '开': '_',
            '琀': 't',
            '爀': 'r',
            '愀': 'a',
            '渀': 'n',
            '猀': 's',
            '愀': 'a',
            '挀': 'c',
            '琀': 't',
            '椀': 'i',
            '漀': 'o',
            '渀': 'n',
            '开': '_': '_',
            '猀': 's',
            '攀': 'e',
            '猀': 's',
            '猀': 's',
            '椀': 'i',
            '漀': 'o',
            '渀': 'n',
            '开': '_': '_',
            '琀': 't',
            '椀': 'i',
            '洀': 'm',
            '攀': 'e',
            '漀': 'o',
            '甀': 'u',
            '琀': 't',
            '㴀': '=',
            '　': ' ',
            '㬀': ';'
        };
        
        // Appliquer les remplacements
        for (const [bad, good] of Object.entries(replacements)) {
            cleanContent = cleanContent.replace(new RegExp(bad, 'g'), good);
        }
        
        console.log('✅ Caractères bizarres remplacés');
        
        // 3. Nettoyer les lignes vides et mal formatées
        console.log('\n3️⃣ Nettoyage des lignes...');
        const lines = cleanContent.split('\n');
        const cleanLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Ignorer les lignes vides ou avec des caractères bizarres
            if (line === '' || line.length === 0) {
                continue;
            }
            
            // Vérifier si la ligne contient encore des caractères bizarres
            if (line.match(/[^\x00-\x7F]/)) {
                console.log(`⚠️  Ligne ignorée (caractères bizarres): ${line.substring(0, 50)}...`);
                continue;
            }
            
            cleanLines.push(lines[i]);
        }
        
        cleanContent = cleanLines.join('\n');
        console.log(`✅ Lignes nettoyées (${cleanLines.length} lignes)`);
        
        // 4. Créer le fichier final
        console.log('\n4️⃣ Création du fichier final...');
        const finalFile = 'backup_final_clean.sql';
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
        
        console.log('\n🎉 Fichier complètement nettoyé !');
        console.log(`📁 Fichier: ${finalFile}`);
        console.log('💡 Ce fichier devrait maintenant être parfaitement compatible avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

finalCleanup().catch(console.error);







