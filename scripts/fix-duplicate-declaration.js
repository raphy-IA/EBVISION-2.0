// Script pour corriger la déclaration en double de requireAdminPermission
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function fixDuplicateDeclaration() {
    console.log('🔧 CORRECTION de la déclaration en double de requireAdminPermission...\n');
    
    try {
        const permissionsPath = path.join(__dirname, '../src/routes/permissions.js');
        let content = fs.readFileSync(permissionsPath, 'utf8');
        
        console.log('1️⃣ Lecture du fichier permissions.js...');
        console.log('✅ Fichier lu, taille:', content.length, 'caractères');
        
        console.log('\n2️⃣ Recherche des déclarations en double...');
        
        // Compter les occurrences de requireAdminPermission
        const matches = content.match(/const requireAdminPermission/g);
        const count = matches ? matches.length : 0;
        console.log(`📊 Nombre de déclarations trouvées: ${count}`);
        
        if (count > 1) {
            console.log('❌ DÉCLARATION EN DOUBLE DÉTECTÉE !');
            
            // Trouver la première déclaration (celle qu'on garde)
            const firstMatch = content.indexOf('const requireAdminPermission');
            console.log('📍 Première déclaration à la position:', firstMatch);
            
            // Trouver la fin de la première déclaration
            let braceCount = 0;
            let firstEnd = -1;
            let inString = false;
            let stringChar = '';
            
            for (let i = firstMatch; i < content.length; i++) {
                const char = content[i];
                
                if (char === '"' || char === "'" || char === '`') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            firstEnd = i + 1;
                            break;
                        }
                    }
                }
            }
            
            if (firstEnd > 0) {
                console.log('📍 Fin de la première déclaration à la position:', firstEnd);
                
                // Extraire la première déclaration
                const firstDeclaration = content.substring(firstMatch, firstEnd);
                console.log('📋 Première déclaration extraite (premiers 100 caractères):', firstDeclaration.substring(0, 100) + '...');
                
                // Supprimer toutes les déclarations et garder seulement la première
                const cleanContent = content.replace(/const requireAdminPermission[\s\S]*?};/g, '');
                
                // Ajouter la première déclaration au bon endroit
                const insertPoint = cleanContent.indexOf('const permissionManager = require(\'../utils/PermissionManager\');');
                if (insertPoint !== -1) {
                    const before = cleanContent.substring(0, insertPoint);
                    const after = cleanContent.substring(insertPoint);
                    const finalContent = before + firstDeclaration + '\n\n' + after;
                    
                    // Sauvegarder et écrire
                    const backupPath = permissionsPath + '.backup2';
                    fs.writeFileSync(backupPath, content);
                    fs.writeFileSync(permissionsPath, finalContent);
                    
                    console.log('✅ Déclaration en double corrigée !');
                    console.log('✅ Sauvegarde créée:', backupPath);
                    
                    // Vérifier que le fichier est maintenant valide
                    try {
                        require(permissionsPath);
                        console.log('✅ permissions.js peut maintenant être chargé sans erreur !');
                    } catch (error) {
                        console.log('❌ Erreur persistante:', error.message);
                    }
                    
                } else {
                    console.log('❌ Point d\'insertion non trouvé');
                }
                
            } else {
                console.log('❌ Impossible de déterminer la fin de la première déclaration');
            }
            
        } else {
            console.log('✅ Aucune déclaration en double détectée');
        }
        
        console.log('\n🎉 CORRECTION TERMINÉE !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Vérifiez que le fichier est correct: node scripts/diagnostic-rapide.js');
        console.log('2. Si OK, redémarrez l\'application: pm2 start ecosystem.config.js --env production');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixDuplicateDeclaration().catch(console.error);



















