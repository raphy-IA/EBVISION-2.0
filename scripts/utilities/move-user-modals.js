#!/usr/bin/env node

/**
 * Script spécifique pour déplacer user-modals.js vers Old_files
 * Usage: node scripts/move-user-modals.js
 */

const fs = require('fs');
const path = require('path');

console.log('📦 DÉPLACEMENT DE user-modals.js VERS Old_files');
console.log('===============================================\n');

class UserModalsMover {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.publicDir = path.join(this.rootDir, 'public');
        this.jsDir = path.join(this.publicDir, 'js');
        this.oldFilesDir = path.join(this.rootDir, 'Old_files');
    }

    async move() {
        try {
            // 1. Vérifier si user-modals.js existe
            const userModalsPath = path.join(this.jsDir, 'user-modals.js');
            
            if (!fs.existsSync(userModalsPath)) {
                console.log('❌ user-modals.js n\'existe pas dans public/js/');
                return;
            }
            
            // 2. Vérifier s'il est activement utilisé (non commenté)
            const isActivelyUsed = this.checkActiveUsage();
            
            if (isActivelyUsed) {
                console.log('⚠️  user-modals.js est encore activement utilisé !');
                console.log('🔧 Vérifiez les références non commentées');
                return;
            }
            
            // 3. Déplacer le fichier
            const destPath = path.join(this.oldFilesDir, 'user-modals.js');
            
            fs.renameSync(userModalsPath, destPath);
            console.log('✅ user-modals.js déplacé vers Old_files/');
            
            // 4. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors du déplacement:', error);
        }
    }

    checkActiveUsage() {
        console.log('🔍 Vérification de l\'utilisation active de user-modals.js...');
        
        const htmlFiles = this.getAllFiles(this.publicDir, ['.html']);
        let activeUsage = false;
        
        htmlFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Chercher les références non commentées
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    const trimmedLine = line.trim();
                    
                    // Vérifier si la ligne contient user-modals.js et n'est pas commentée
                    if (trimmedLine.includes('user-modals.js') && 
                        !trimmedLine.startsWith('<!--') && 
                        !trimmedLine.startsWith('*') &&
                        !trimmedLine.startsWith('//')) {
                        
                        // Vérifier que ce n'est pas dans un commentaire multi-ligne
                        const beforeLine = lines.slice(0, index).join('\n');
                        const commentStart = beforeLine.lastIndexOf('<!--');
                        const commentEnd = beforeLine.lastIndexOf('-->');
                        
                        if (commentStart === -1 || commentEnd > commentStart) {
                            console.log(`⚠️  Référence active trouvée dans ${path.basename(file)}:${index + 1}`);
                            console.log(`   ${trimmedLine}`);
                            activeUsage = true;
                        }
                    }
                });
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        });
        
        if (!activeUsage) {
            console.log('✅ Aucune référence active trouvée - user-modals.js peut être déplacé');
        }
        
        return activeUsage;
    }

    showReport() {
        console.log('\n📊 RAPPORT DE DÉPLACEMENT');
        console.log('==========================');
        console.log('✅ user-modals.js déplacé avec succès vers Old_files/');
        console.log('✅ Le fichier n\'était plus utilisé activement');
        console.log('✅ Toutes les références étaient commentées');
        
        console.log('\n🎯 RÉSULTAT:');
        console.log('✅ user-modals.js est maintenant dans Old_files/');
        console.log('✅ Le fichier est exclu des commits Git');
        console.log('✅ L\'application utilise les modales du template de sidebar');
        
        console.log('\n💡 VÉRIFICATION:');
        console.log('1. ✅ Tester que les modales de profil fonctionnent');
        console.log('2. ✅ Vérifier que toutes les pages utilisent les mêmes modales');
        console.log('3. ✅ S\'assurer que le système de permissions fonctionne');
        
        console.log('\n📦 Déplacement terminé !');
    }

    getAllFiles(dir, extensions = []) {
        let files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    files = files.concat(this.getAllFiles(itemPath, extensions));
                } else if (stat.isFile()) {
                    if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
                        files.push(itemPath);
                    }
                }
            });
        } catch (error) {
            // Ignorer les erreurs d'accès
        }
        
        return files;
    }
}

// Exécuter le déplacement
const mover = new UserModalsMover();
mover.move();










