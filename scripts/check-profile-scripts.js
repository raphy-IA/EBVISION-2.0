#!/usr/bin/env node

/**
 * Script pour vérifier que toutes les pages ont les scripts de profil nécessaires
 * Usage: node scripts/check-profile-scripts.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DES SCRIPTS DE PROFIL');
console.log('=====================================\n');

class ProfileScriptsChecker {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithAllScripts = [];
        this.pagesMissingScripts = [];
    }

    async check() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
    }

    analyzeAllPages() {
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup') &&
            file !== 'login.html' &&
            file !== 'logout.html' &&
            file !== 'index.html'
        );

        console.log(`📄 ${htmlFiles.length} pages à vérifier`);

        for (const file of htmlFiles) {
            const filePath = path.join(this.publicDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Vérifier les scripts nécessaires pour le profil
            const hasUserHeader = content.includes('user-header.js');
            const hasProfileMenu = content.includes('profile-menu.js');
            const hasSidebar = content.includes('sidebar.js');
            const hasAuth = content.includes('auth.js');
            const hasMenuPermissions = content.includes('menu-permissions.js');
            
            const missingScripts = [];
            if (!hasUserHeader) missingScripts.push('user-header.js');
            if (!hasProfileMenu) missingScripts.push('profile-menu.js');
            if (!hasSidebar) missingScripts.push('sidebar.js');
            if (!hasAuth) missingScripts.push('auth.js');
            if (!hasMenuPermissions) missingScripts.push('menu-permissions.js');
            
            if (missingScripts.length === 0) {
                this.pagesWithAllScripts.push(file);
            } else {
                this.pagesMissingScripts.push({
                    file,
                    missing: missingScripts
                });
            }
        }

        console.log(`✅ Pages avec tous les scripts: ${this.pagesWithAllScripts.length}`);
        console.log(`❌ Pages avec scripts manquants: ${this.pagesMissingScripts.length}`);
    }

    showReport() {
        console.log('\n📊 RAPPORT DE VÉRIFICATION');
        console.log('===========================');
        console.log(`✅ Pages avec tous les scripts: ${this.pagesWithAllScripts.length}`);
        console.log(`❌ Pages avec scripts manquants: ${this.pagesMissingScripts.length}`);
        
        if (this.pagesMissingScripts.length > 0) {
            console.log('\n📋 PAGES AVEC SCRIPTS MANQUANTS:');
            this.pagesMissingScripts.forEach(page => {
                console.log(`\n📄 ${page.file}:`);
                page.missing.forEach(script => {
                    console.log(`   ❌ ${script} manquant`);
                });
            });
            
            console.log('\n💡 RECOMMANDATIONS:');
            console.log('1. ✅ Ajouter les scripts manquants à ces pages');
            console.log('2. ✅ Vérifier que sidebar.js charge template-modern-sidebar.html');
            console.log('3. ✅ S\'assurer que la section de profil s\'affiche correctement');
        } else {
            console.log('\n✅ Toutes les pages ont tous les scripts nécessaires !');
            console.log('✅ La section de profil devrait s\'afficher sur toutes les pages');
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.pagesMissingScripts.length === 0) {
            console.log('✅ Toutes les pages sont correctement configurées pour le profil');
            console.log('✅ La section de profil devrait être cohérente partout');
        } else {
            console.log('⚠️  Certaines pages ont des scripts manquants');
            console.log('🔧 Correction nécessaire pour ces pages');
        }
        
        console.log('\n🔍 Vérification terminée !');
    }
}

// Exécuter la vérification
const checker = new ProfileScriptsChecker();
checker.check();

