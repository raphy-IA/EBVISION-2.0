#!/usr/bin/env node

/**
 * Script pour organiser tous les fichiers du projet
 * - Déplacer tous les scripts vers le dossier scripts/
 * - Déplacer les fichiers non utilisés vers Old_files/
 * Usage: node scripts/organize-project-files.js
 */

const fs = require('fs');
const path = require('path');

console.log('🗂️  ORGANISATION DES FICHIERS DU PROJET');
console.log('=======================================\n');

class ProjectFileOrganizer {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.scriptsDir = path.join(this.rootDir, 'scripts');
        this.oldFilesDir = path.join(this.rootDir, 'Old_files');
        this.filesToMove = [];
        this.scriptsToMove = [];
        this.unusedFiles = [];
        this.usedFiles = new Set();
    }

    async organize() {
        try {
            // 1. Créer les dossiers nécessaires
            this.createDirectories();
            
            // 2. Analyser les fichiers utilisés
            this.analyzeUsedFiles();
            
            // 3. Identifier les scripts à déplacer
            this.identifyScriptsToMove();
            
            // 4. Identifier les fichiers non utilisés
            this.identifyUnusedFiles();
            
            // 5. Déplacer les fichiers
            this.moveFiles();
            
            // 6. Afficher le rapport final
            this.showFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'organisation:', error);
        }
    }

    createDirectories() {
        console.log('📁 Création des dossiers...');
        
        if (!fs.existsSync(this.oldFilesDir)) {
            fs.mkdirSync(this.oldFilesDir, { recursive: true });
            console.log('✅ Dossier Old_files créé');
        } else {
            console.log('✅ Dossier Old_files existe déjà');
        }
        
        if (!fs.existsSync(this.scriptsDir)) {
            fs.mkdirSync(this.scriptsDir, { recursive: true });
            console.log('✅ Dossier scripts créé');
        } else {
            console.log('✅ Dossier scripts existe déjà');
        }
    }

    analyzeUsedFiles() {
        console.log('\n🔍 Analyse des fichiers utilisés...');
        
        // Fichiers principaux toujours utilisés
        const alwaysUsed = [
            'server.js',
            'package.json',
            'package-lock.json',
            'ecosystem.config.js',
            'docker-compose.yml',
            'Dockerfile',
            'env.example',
            '.env',
            'README.md',
            'README-PRODUCTION.md'
        ];
        
        alwaysUsed.forEach(file => this.usedFiles.add(file));
        
        // Analyser les routes dans server.js
        this.analyzeServerRoutes();
        
        // Analyser les imports dans les fichiers JS
        this.analyzeJavaScriptImports();
        
        // Analyser les références dans les fichiers HTML
        this.analyzeHTMLReferences();
        
        console.log(`✅ ${this.usedFiles.size} fichiers identifiés comme utilisés`);
    }

    analyzeServerRoutes() {
        try {
            const serverPath = path.join(this.rootDir, 'server.js');
            if (fs.existsSync(serverPath)) {
                const content = fs.readFileSync(serverPath, 'utf8');
                
                // Extraire les routes
                const routeMatches = content.match(/app\.use\(['"`]\/[^'"`]*['"`]/g) || [];
                routeMatches.forEach(match => {
                    const route = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    this.usedFiles.add(`src/routes/${route.replace('/', '')}.js`);
                });
                
                // Extraire les imports
                const importMatches = content.match(/require\(['"`][^'"`]+['"`]\)/g) || [];
                importMatches.forEach(match => {
                    const importPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    if (importPath.startsWith('./') || importPath.startsWith('../')) {
                        this.usedFiles.add(importPath);
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️  Erreur lors de l\'analyse de server.js:', error.message);
        }
    }

    analyzeJavaScriptImports() {
        const jsFiles = this.getAllFiles(this.rootDir, ['.js'], ['node_modules', '.git']);
        
        jsFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const importMatches = content.match(/require\(['"`][^'"`]+['"`]\)/g) || [];
                
                importMatches.forEach(match => {
                    const importPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    if (importPath.startsWith('./') || importPath.startsWith('../')) {
                        const resolvedPath = path.resolve(path.dirname(file), importPath);
                        const relativePath = path.relative(this.rootDir, resolvedPath);
                        this.usedFiles.add(relativePath);
                    }
                });
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        });
    }

    analyzeHTMLReferences() {
        const htmlFiles = this.getAllFiles(path.join(this.rootDir, 'public'), ['.html']);
        
        htmlFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Extraire les références CSS et JS
                const refMatches = content.match(/<link[^>]+href=['"`]([^'"`]+)['"`]/g) || [];
                const scriptMatches = content.match(/<script[^>]+src=['"`]([^'"`]+)['"`]/g) || [];
                
                [...refMatches, ...scriptMatches].forEach(match => {
                    const refPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
                    if (refPath.startsWith('./') || refPath.startsWith('../') || !refPath.startsWith('http')) {
                        this.usedFiles.add(`public/${refPath}`);
                    }
                });
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        });
    }

    identifyScriptsToMove() {
        console.log('\n🔍 Identification des scripts à déplacer...');
        
        const rootFiles = fs.readdirSync(this.rootDir);
        
        rootFiles.forEach(file => {
            const filePath = path.join(this.rootDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile()) {
                // Scripts shell
                if (file.endsWith('.sh') || file.endsWith('.ps1')) {
                    this.scriptsToMove.push({
                        source: filePath,
                        destination: path.join(this.scriptsDir, file),
                        type: 'script'
                    });
                }
                
                // Scripts JavaScript
                if (file.endsWith('.js') && !file.startsWith('server') && !file.startsWith('package')) {
                    this.scriptsToMove.push({
                        source: filePath,
                        destination: path.join(this.scriptsDir, file),
                        type: 'script'
                    });
                }
            }
        });
        
        console.log(`✅ ${this.scriptsToMove.length} scripts identifiés à déplacer`);
    }

    identifyUnusedFiles() {
        console.log('\n🔍 Identification des fichiers non utilisés...');
        
        const rootFiles = fs.readdirSync(this.rootDir);
        
        rootFiles.forEach(file => {
            const filePath = path.join(this.rootDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile()) {
                // Vérifier si le fichier est utilisé
                const isUsed = this.usedFiles.has(file) || 
                              this.usedFiles.has(`./${file}`) ||
                              this.usedFiles.has(`../${file}`);
                
                // Fichiers à ignorer
                const ignoreFiles = [
                    'server.js', 'package.json', 'package-lock.json',
                    'ecosystem.config.js', 'docker-compose.yml', 'Dockerfile',
                    'env.example', '.env', 'README.md', 'README-PRODUCTION.md',
                    '.gitignore', '.gitattributes'
                ];
                
                if (!isUsed && !ignoreFiles.includes(file) && !file.startsWith('.')) {
                    this.unusedFiles.push({
                        source: filePath,
                        destination: path.join(this.oldFilesDir, file),
                        type: 'unused'
                    });
                }
            }
        });
        
        console.log(`✅ ${this.unusedFiles.length} fichiers non utilisés identifiés`);
    }

    moveFiles() {
        console.log('\n📦 Déplacement des fichiers...');
        
        let movedScripts = 0;
        let movedUnused = 0;
        let errors = 0;
        
        // Déplacer les scripts
        this.scriptsToMove.forEach(file => {
            try {
                fs.renameSync(file.source, file.destination);
                console.log(`✅ Script déplacé: ${path.basename(file.source)} → scripts/`);
                movedScripts++;
            } catch (error) {
                console.error(`❌ Erreur lors du déplacement de ${file.source}:`, error.message);
                errors++;
            }
        });
        
        // Déplacer les fichiers non utilisés
        this.unusedFiles.forEach(file => {
            try {
                fs.renameSync(file.source, file.destination);
                console.log(`✅ Fichier non utilisé déplacé: ${path.basename(file.source)} → Old_files/`);
                movedUnused++;
            } catch (error) {
                console.error(`❌ Erreur lors du déplacement de ${file.source}:`, error.message);
                errors++;
            }
        });
        
        console.log(`\n📊 Résumé du déplacement:`);
        console.log(`✅ Scripts déplacés: ${movedScripts}`);
        console.log(`✅ Fichiers non utilisés déplacés: ${movedUnused}`);
        console.log(`❌ Erreurs: ${errors}`);
    }

    getAllFiles(dir, extensions = [], ignoreDirs = []) {
        let files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    if (!ignoreDirs.includes(item)) {
                        files = files.concat(this.getAllFiles(itemPath, extensions, ignoreDirs));
                    }
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

    showFinalReport() {
        console.log('\n📊 RAPPORT FINAL D\'ORGANISATION');
        console.log('=================================');
        console.log(`📁 Scripts déplacés vers scripts/: ${this.scriptsToMove.length}`);
        console.log(`📁 Fichiers non utilisés déplacés vers Old_files/: ${this.unusedFiles.length}`);
        console.log(`📁 Fichiers utilisés conservés: ${this.usedFiles.size}`);
        
        console.log('\n🎯 STRUCTURE FINALE:');
        console.log('📁 scripts/ - Tous les scripts du projet');
        console.log('📁 Old_files/ - Fichiers non utilisés (sauvegarde)');
        console.log('📁 src/ - Code source de l\'application');
        console.log('📁 public/ - Fichiers publics (HTML, CSS, JS)');
        console.log('📁 database/ - Scripts de base de données');
        console.log('📁 docs/ - Documentation');
        
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('1. ✅ Vérifier que tous les scripts fonctionnent depuis scripts/');
        console.log('2. ✅ Mettre à jour les références dans la documentation');
        console.log('3. ✅ Tester l\'application après réorganisation');
        console.log('4. ✅ Conserver Old_files/ comme sauvegarde');
        
        console.log('\n🗂️  Organisation terminée !');
    }
}

// Exécuter l'organisation
const organizer = new ProjectFileOrganizer();
organizer.organize();


