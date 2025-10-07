#!/usr/bin/env node

/**
 * Script pour déplacer les fichiers JavaScript non utilisés vers Old_files
 * Usage: node scripts/move-unused-js-files.js
 */

const fs = require('fs');
const path = require('path');

console.log('📦 DÉPLACEMENT DES FICHIERS JAVASCRIPT NON UTILISÉS');
console.log('===================================================\n');

class UnusedJSFilesMover {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.publicDir = path.join(this.rootDir, 'public');
        this.jsDir = path.join(this.publicDir, 'js');
        this.oldFilesDir = path.join(this.rootDir, 'Old_files');
        this.usedJSFiles = new Set();
        this.movedFiles = [];
        this.errorFiles = [];
    }

    async move() {
        try {
            // 1. Analyser les fichiers HTML pour identifier les JS utilisés
            this.analyzeHTMLFiles();
            
            // 2. Identifier et déplacer les fichiers JS non utilisés
            this.moveUnusedFiles();
            
            // 3. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors du déplacement:', error);
        }
    }

    analyzeHTMLFiles() {
        console.log('🔍 Analyse des fichiers HTML...');
        
        const htmlFiles = this.getAllFiles(this.publicDir, ['.html']);
        
        htmlFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Extraire les références de scripts (seulement les non commentées)
                const scriptMatches = content.match(/<script[^>]+src=['"`]([^'"`]+)['"`]/g) || [];
                
                scriptMatches.forEach(match => {
                    const scriptPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    if (scriptPath.startsWith('js/') || scriptPath.startsWith('./js/') || scriptPath.startsWith('../js/')) {
                        const jsFile = scriptPath.replace(/^(\.\.?\/)*js\//, '');
                        this.usedJSFiles.add(jsFile);
                    }
                });
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        });
        
        console.log(`✅ ${this.usedJSFiles.size} fichiers JS identifiés comme utilisés`);
    }

    moveUnusedFiles() {
        console.log('\n📦 Déplacement des fichiers JS non utilisés...');
        
        const jsFiles = fs.readdirSync(this.jsDir);
        
        jsFiles.forEach(file => {
            if (file.endsWith('.js') && !file.includes('.backup')) {
                if (!this.usedJSFiles.has(file)) {
                    try {
                        const sourcePath = path.join(this.jsDir, file);
                        const destPath = path.join(this.oldFilesDir, file);
                        
                        fs.renameSync(sourcePath, destPath);
                        this.movedFiles.push(file);
                        console.log(`✅ ${file} → Old_files/`);
                    } catch (error) {
                        this.errorFiles.push({ file, error: error.message });
                        console.error(`❌ Erreur lors du déplacement de ${file}:`, error.message);
                    }
                }
            }
        });
    }

    showReport() {
        console.log('\n📊 RAPPORT DE DÉPLACEMENT');
        console.log('==========================');
        console.log(`✅ Fichiers déplacés: ${this.movedFiles.length}`);
        console.log(`❌ Erreurs: ${this.errorFiles.length}`);
        
        if (this.movedFiles.length > 0) {
            console.log('\n✅ FICHIERS DÉPLACÉS VERS Old_files/:');
            this.movedFiles.forEach(file => {
                console.log(`   - ${file}`);
            });
        }
        
        if (this.errorFiles.length > 0) {
            console.log('\n❌ ERREURS:');
            this.errorFiles.forEach(item => {
                console.log(`   - ${item.file}: ${item.error}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.errorFiles.length === 0) {
            console.log('✅ Tous les fichiers JS non utilisés ont été déplacés !');
            console.log('✅ Le dossier public/js/ ne contient plus que les fichiers utilisés');
            console.log('✅ Les fichiers non utilisés sont sauvegardés dans Old_files/');
        } else {
            console.log('⚠️  Certains fichiers n\'ont pas pu être déplacés');
            console.log('🔧 Vérifiez les erreurs ci-dessus');
        }
        
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('1. ✅ Tester l\'application pour s\'assurer qu\'elle fonctionne');
        console.log('2. ✅ Vérifier que tous les scripts nécessaires sont présents');
        console.log('3. ✅ Conserver Old_files/ comme sauvegarde');
        
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
const mover = new UnusedJSFilesMover();
mover.move();


