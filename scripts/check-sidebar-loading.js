#!/usr/bin/env node

/**
 * Script pour vérifier que toutes les pages chargent correctement la sidebar et les modales
 * Usage: node scripts/check-sidebar-loading.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DU CHARGEMENT DE LA SIDEBAR');
console.log('===========================================\n');

class SidebarLoadingChecker {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithSidebar = [];
        this.pagesWithoutSidebar = [];
        this.pagesWithTemplate = [];
        this.pagesWithoutTemplate = [];
    }

    async check() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Afficher le rapport détaillé
            this.showDetailedReport();
            
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
            
            // Vérifier si la page a sidebar.js
            const hasSidebarJS = content.includes('sidebar.js');
            
            // Vérifier si la page a le conteneur sidebar
            const hasSidebarContainer = content.includes('sidebar-container');
            
            // Vérifier si la page référence le template
            const hasTemplateReference = content.includes('template-modern-sidebar.html');
            
            // Vérifier si la page a les scripts de profil
            const hasProfileScripts = content.includes('user-header.js') && 
                                    content.includes('profile-menu.js');
            
            if (hasSidebarJS && hasSidebarContainer) {
                this.pagesWithSidebar.push({
                    file,
                    hasTemplateReference,
                    hasProfileScripts
                });
            } else {
                this.pagesWithoutSidebar.push({
                    file,
                    hasSidebarJS,
                    hasSidebarContainer,
                    hasTemplateReference,
                    hasProfileScripts
                });
            }
        }

        console.log(`✅ Pages avec sidebar: ${this.pagesWithSidebar.length}`);
        console.log(`❌ Pages sans sidebar: ${this.pagesWithoutSidebar.length}`);
    }

    showDetailedReport() {
        console.log('\n📊 RAPPORT DÉTAILLÉ');
        console.log('===================');
        console.log(`✅ Pages avec sidebar: ${this.pagesWithSidebar.length}`);
        console.log(`❌ Pages sans sidebar: ${this.pagesWithoutSidebar.length}`);
        
        if (this.pagesWithSidebar.length > 0) {
            console.log('\n✅ PAGES AVEC SIDEBAR:');
            this.pagesWithSidebar.forEach(page => {
                const templateStatus = page.hasTemplateReference ? '✅' : '❌';
                const profileStatus = page.hasProfileScripts ? '✅' : '❌';
                console.log(`   ${page.file} - Template: ${templateStatus} - Profil: ${profileStatus}`);
            });
        }
        
        if (this.pagesWithoutSidebar.length > 0) {
            console.log('\n❌ PAGES SANS SIDEBAR:');
            this.pagesWithoutSidebar.forEach(page => {
                const sidebarStatus = page.hasSidebarJS ? '✅' : '❌';
                const containerStatus = page.hasSidebarContainer ? '✅' : '❌';
                const templateStatus = page.hasTemplateReference ? '✅' : '❌';
                const profileStatus = page.hasProfileScripts ? '✅' : '❌';
                
                console.log(`\n📄 ${page.file}:`);
                console.log(`   - sidebar.js: ${sidebarStatus}`);
                console.log(`   - sidebar-container: ${containerStatus}`);
                console.log(`   - template reference: ${templateStatus}`);
                console.log(`   - scripts profil: ${profileStatus}`);
            });
        }
        
        // Analyser les problèmes
        const pagesWithoutSidebarJS = this.pagesWithoutSidebar.filter(p => !p.hasSidebarJS);
        const pagesWithoutContainer = this.pagesWithoutSidebar.filter(p => !p.hasSidebarContainer);
        const pagesWithoutProfileScripts = this.pagesWithSidebar.filter(p => !p.hasProfileScripts);
        
        console.log('\n🔍 ANALYSE DES PROBLÈMES:');
        if (pagesWithoutSidebarJS.length > 0) {
            console.log(`\n❌ ${pagesWithoutSidebarJS.length} pages sans sidebar.js:`);
            pagesWithoutSidebarJS.forEach(page => {
                console.log(`   - ${page.file}`);
            });
        }
        
        if (pagesWithoutContainer.length > 0) {
            console.log(`\n❌ ${pagesWithoutContainer.length} pages sans sidebar-container:`);
            pagesWithoutContainer.forEach(page => {
                console.log(`   - ${page.file}`);
            });
        }
        
        if (pagesWithoutProfileScripts.length > 0) {
            console.log(`\n⚠️  ${pagesWithoutProfileScripts.length} pages avec sidebar mais sans scripts profil:`);
            pagesWithoutProfileScripts.forEach(page => {
                console.log(`   - ${page.file}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.pagesWithoutSidebar.length === 0) {
            console.log('✅ Toutes les pages ont la sidebar configurée !');
            console.log('✅ Les modales devraient être cohérentes partout');
        } else {
            console.log('⚠️  Certaines pages n\'ont pas la sidebar configurée');
            console.log('🔧 Correction nécessaire pour assurer la cohérence');
        }
        
        console.log('\n💡 RECOMMANDATIONS:');
        if (pagesWithoutSidebarJS.length > 0) {
            console.log('1. ✅ Ajouter sidebar.js aux pages manquantes');
        }
        if (pagesWithoutContainer.length > 0) {
            console.log('2. ✅ Ajouter sidebar-container aux pages manquantes');
        }
        if (pagesWithoutProfileScripts.length > 0) {
            console.log('3. ✅ Ajouter les scripts de profil aux pages manquantes');
        }
        console.log('4. ✅ Vérifier que toutes les pages chargent le même template');
        console.log('5. ✅ Tester que les modales sont identiques partout');
        
        console.log('\n🔍 Vérification terminée !');
    }
}

// Exécuter la vérification
const checker = new SidebarLoadingChecker();
checker.check();


