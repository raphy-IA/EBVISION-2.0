#!/usr/bin/env node

/**
 * Script pour identifier les fichiers JavaScript non utilisés
 * Usage: node scripts/identify-unused-js-files.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 IDENTIFICATION DES FICHIERS JAVASCRIPT NON UTILISÉS');
console.log('=====================================================\n');

class UnusedJSFilesIdentifier {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.publicDir = path.join(this.rootDir, 'public');
        this.jsDir = path.join(this.publicDir, 'js');
        this.oldFilesDir = path.join(this.rootDir, 'Old_files');
        this.usedJSFiles = new Set();
        this.unusedJSFiles = [];
    }

    async identify() {
        try {
            // 1. Analyser tous les fichiers HTML pour identifier les JS utilisés
            this.analyzeHTMLFiles();
            
            // 2. Analyser les fichiers JS pour les références internes
            this.analyzeJSFiles();
            
            // 3. Identifier les fichiers JS non utilisés
            this.identifyUnusedFiles();
            
            // 4. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'identification:', error);
        }
    }

    analyzeHTMLFiles() {
        console.log('🔍 Analyse des fichiers HTML...');
        
        const htmlFiles = this.getAllFiles(this.publicDir, ['.html']);
        
        htmlFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Extraire les références de scripts
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

    analyzeJSFiles() {
        console.log('🔍 Analyse des références internes dans les fichiers JS...');
        
        const jsFiles = this.getAllFiles(this.jsDir, ['.js']);
        
        jsFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Extraire les imports/requires
                const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g) || [];
                const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
                
                [...importMatches, ...requireMatches].forEach(match => {
                    const importPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    if (importPath.startsWith('./') || importPath.startsWith('../')) {
                        const jsFile = path.basename(importPath);
                        this.usedJSFiles.add(jsFile);
                    }
                });
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        });
    }

    identifyUnusedFiles() {
        console.log('🔍 Identification des fichiers JS non utilisés...');
        
        const jsFiles = fs.readdirSync(this.jsDir);
        
        jsFiles.forEach(file => {
            if (file.endsWith('.js') && !file.includes('.backup')) {
                if (!this.usedJSFiles.has(file)) {
                    this.unusedJSFiles.push({
                        file,
                        path: path.join(this.jsDir, file),
                        destination: path.join(this.oldFilesDir, file)
                    });
                }
            }
        });
        
        console.log(`✅ ${this.unusedJSFiles.length} fichiers JS non utilisés identifiés`);
    }

    showReport() {
        console.log('\n📊 RAPPORT D\'IDENTIFICATION');
        console.log('=============================');
        console.log(`📁 Fichiers JS utilisés: ${this.usedJSFiles.size}`);
        console.log(`📁 Fichiers JS non utilisés: ${this.unusedJSFiles.length}`);
        
        if (this.unusedJSFiles.length > 0) {
            console.log('\n❌ FICHIERS JS NON UTILISÉS:');
            this.unusedJSFiles.forEach(item => {
                console.log(`   - ${item.file}`);
            });
            
            console.log('\n💡 RECOMMANDATIONS:');
            console.log('1. ✅ Déplacer ces fichiers vers Old_files/');
            console.log('2. ✅ Vérifier qu\'ils ne sont pas nécessaires');
            console.log('3. ✅ Les supprimer définitivement si confirmé');
        } else {
            console.log('\n✅ Tous les fichiers JS sont utilisés !');
        }
        
        console.log('\n🔍 Identification terminée !');
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

// Exécuter l'identification
const identifier = new UnusedJSFilesIdentifier();
identifier.identify();

