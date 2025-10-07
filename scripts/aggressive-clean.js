// Script pour nettoyer agressivement le fichier de sauvegarde
const fs = require('fs');

async function aggressiveClean() {
    console.log('🧹 Nettoyage agressif du fichier de sauvegarde...\n');
    
    try {
        // 1. Lire le fichier en mode binaire
        console.log('1️⃣ Lecture du fichier en mode binaire...');
        const backupFile = 'backup_final.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_final.sql non trouvé');
            return;
        }
        
        const buffer = fs.readFileSync(backupFile);
        console.log(`✅ Fichier lu (${buffer.length} octets)`);
        
        // 2. Analyser les premiers octets
        console.log('\n2️⃣ Analyse des premiers octets...');
        const firstBytes = buffer.slice(0, 20);
        console.log('📋 Premiers octets (hex):', firstBytes.toString('hex'));
        console.log('📋 Premiers octets (ascii):', firstBytes.toString('ascii'));
        
        // 3. Chercher le début réel du SQL
        console.log('\n3️⃣ Recherche du début SQL...');
        const content = buffer.toString('utf8');
        const lines = content.split('\n');
        
        let startIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Chercher une ligne qui commence vraiment par du SQL valide
            if (line.startsWith('-- PostgreSQL database dump') || 
                line.startsWith('-- Dumped from database version') ||
                line.startsWith('SET ') ||
                line.startsWith('CREATE ') ||
                line.startsWith('DROP ') ||
                line.startsWith('BEGIN') ||
                line.startsWith('COMMIT')) {
                startIndex = i;
                console.log(`✅ Début SQL trouvé à la ligne ${i + 1}: "${line}"`);
                break;
            }
        }
        
        if (startIndex === -1) {
            console.log('❌ Aucun début SQL valide trouvé');
            return;
        }
        
        // 4. Extraire le contenu SQL valide
        console.log('\n4️⃣ Extraction du contenu SQL...');
        const sqlContent = lines.slice(startIndex).join('\n');
        console.log(`✅ Contenu SQL extrait (${sqlContent.length} caractères)`);
        
        // 5. Vérifier le début du contenu extrait
        console.log('\n5️⃣ Vérification du contenu extrait...');
        const firstLines = sqlContent.split('\n').slice(0, 10);
        console.log('📋 Premières lignes du contenu SQL:');
        firstLines.forEach((line, index) => {
            if (line.trim()) {
                console.log(`   ${index + 1}: ${line}`);
            }
        });
        
        // 6. Créer le fichier final propre
        console.log('\n6️⃣ Création du fichier final propre...');
        const cleanFile = 'backup_clean_final.sql';
        fs.writeFileSync(cleanFile, sqlContent, 'utf8');
        console.log(`✅ Fichier final propre créé: ${cleanFile}`);
        
        // 7. Vérifier la taille
        const stats = fs.statSync(cleanFile);
        console.log(`📊 Taille du fichier final: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // 8. Test de validation SQL basique
        console.log('\n7️⃣ Test de validation SQL...');
        const sqlLines = sqlContent.split('\n');
        let validSqlCount = 0;
        let invalidLines = [];
        
        for (let i = 0; i < Math.min(100, sqlLines.length); i++) {
            const line = sqlLines[i].trim();
            if (line && !line.startsWith('--') && !line.startsWith('/*') && !line.startsWith('*/')) {
                if (line.match(/^(CREATE|DROP|INSERT|UPDATE|DELETE|SET|BEGIN|COMMIT|ALTER|GRANT|REVOKE)/i)) {
                    validSqlCount++;
                } else if (line.length > 0 && !line.match(/^[a-zA-Z0-9\s\(\)\[\]\{\}\.\,\;\:\-\_\'\"]+$/)) {
                    invalidLines.push({ line: i + 1, content: line });
                }
            }
        }
        
        console.log(`✅ Lignes SQL valides trouvées: ${validSqlCount}`);
        if (invalidLines.length > 0) {
            console.log(`⚠️  Lignes suspectes trouvées: ${invalidLines.length}`);
            invalidLines.slice(0, 5).forEach(item => {
                console.log(`   Ligne ${item.line}: "${item.content}"`);
            });
        }
        
        console.log('\n🎉 Nettoyage agressif terminé !');
        console.log(`📁 Fichier: ${cleanFile}`);
        console.log('💡 Ce fichier devrait maintenant être compatible avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

aggressiveClean().catch(console.error);











