// Script pour corriger les commandes COPY et les valeurs NULL
const fs = require('fs');

async function fixCopyCommands() {
    console.log('🔧 Correction des commandes COPY et valeurs NULL...\n');
    
    try {
        // 1. Lire le fichier
        console.log('1️⃣ Lecture du fichier...');
        const backupFile = 'backup_utf8.sql';
        
        if (!fs.existsSync(backupFile)) {
            console.log('❌ Fichier backup_utf8.sql non trouvé');
            return;
        }
        
        const content = fs.readFileSync(backupFile, 'utf8');
        console.log(`✅ Fichier lu (${content.length} caractères)`);
        
        // 2. Corriger les commandes COPY
        console.log('\n2️⃣ Correction des commandes COPY...');
        let fixedContent = content;
        
        // Remplacer les \N par NULL
        fixedContent = fixedContent.replace(/\\N/g, 'NULL');
        console.log('✅ Valeurs \\N remplacées par NULL');
        
        // Corriger les commandes COPY mal formatées
        fixedContent = fixedContent.replace(/COPY ([^(]+) \(([^)]+)\) FROM stdin;/g, (match, table, columns) => {
            return `COPY ${table.trim()} (${columns.trim()}) FROM stdin;`;
        });
        console.log('✅ Commandes COPY corrigées');
        
        // 3. Supprimer les lignes avec des données mal formatées
        console.log('\n3️⃣ Suppression des lignes mal formatées...');
        const lines = fixedContent.split('\n');
        const cleanLines = [];
        let inCopyBlock = false;
        let copyTableName = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Détecter le début d'un bloc COPY
            if (line.startsWith('COPY ') && line.includes('FROM stdin;')) {
                inCopyBlock = true;
                copyTableName = line.match(/COPY ([^(]+)/)?.[1]?.trim() || '';
                cleanLines.push(lines[i]);
                continue;
            }
            
            // Détecter la fin d'un bloc COPY
            if (inCopyBlock && line === '\\.') {
                inCopyBlock = false;
                copyTableName = '';
                cleanLines.push(lines[i]);
                continue;
            }
            
            // Dans un bloc COPY, vérifier le format des données
            if (inCopyBlock) {
                // Ignorer les lignes vides ou mal formatées
                if (line === '' || line === '\\N' || line.match(/^[a-f0-9-]+ [^\\t]+ [^\\t]+/)) {
                    continue;
                }
                
                // Vérifier que la ligne a le bon nombre de colonnes (séparées par des tabulations)
                const columns = line.split('\t');
                if (columns.length >= 2) {
                    cleanLines.push(lines[i]);
                } else {
                    console.log(`⚠️  Ligne ignorée (format incorrect): ${line.substring(0, 50)}...`);
                }
            } else {
                cleanLines.push(lines[i]);
            }
        }
        
        fixedContent = cleanLines.join('\n');
        console.log(`✅ Lignes nettoyées (${cleanLines.length} lignes)`);
        
        // 4. Créer le fichier corrigé
        console.log('\n4️⃣ Création du fichier corrigé...');
        const fixedFile = 'backup_fixed.sql';
        fs.writeFileSync(fixedFile, fixedContent, 'utf8');
        console.log(`✅ Fichier corrigé créé: ${fixedFile}`);
        
        // 5. Vérifier le début du fichier
        console.log('\n5️⃣ Vérification du fichier corrigé...');
        const firstLines = fixedContent.split('\n').slice(0, 10);
        console.log('📋 Premières lignes:');
        firstLines.forEach((line, index) => {
            if (line.trim()) {
                console.log(`   ${index + 1}: ${line}`);
            }
        });
        
        // 6. Vérifier la taille
        const stats = fs.statSync(fixedFile);
        console.log(`\n📊 Taille du fichier corrigé: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        console.log('\n🎉 Fichier corrigé avec succès !');
        console.log(`📁 Fichier: ${fixedFile}`);
        console.log('💡 Ce fichier devrait maintenant être compatible avec psql.');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    }
}

fixCopyCommands().catch(console.error);







