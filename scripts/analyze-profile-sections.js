#!/usr/bin/env node

/**
 * Script pour analyser et ajouter la section de profil manquante
 * Usage: node scripts/analyze-profile-sections.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE DES SECTIONS DE PROFIL');
console.log('=================================\n');

class ProfileSectionAnalyzer {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithProfile = [];
        this.pagesWithoutProfile = [];
        this.profileTemplate = null;
    }

    async analyze() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Identifier les pages sans section de profil
            this.identifyMissingProfiles();
            
            // 3. Extraire le template de profil depuis dashboard.html
            this.extractProfileTemplate();
            
            // 4. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
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

        console.log(`📄 ${htmlFiles.length} pages à analyser`);

        for (const file of htmlFiles) {
            const filePath = path.join(this.publicDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Vérifier si la page a les scripts de profil
            const hasProfileScripts = content.includes('user-header.js') && 
                                    content.includes('profile-menu.js');
            
            // Vérifier si la page a une section de profil dans le template
            const hasProfileSection = content.includes('sidebar-user-profile') ||
                                    content.includes('user-profile-compact') ||
                                    content.includes('userProfileToggle');
            
            if (hasProfileScripts && hasProfileSection) {
                this.pagesWithProfile.push(file);
            } else {
                this.pagesWithoutProfile.push(file);
            }
        }

        console.log(`✅ Pages avec section de profil: ${this.pagesWithProfile.length}`);
        console.log(`❌ Pages sans section de profil: ${this.pagesWithoutProfile.length}`);
    }

    identifyMissingProfiles() {
        if (this.pagesWithoutProfile.length > 0) {
            console.log('\n📋 PAGES SANS SECTION DE PROFIL:');
            this.pagesWithoutProfile.forEach(page => {
                console.log(`   - ${page}`);
            });
        } else {
            console.log('\n✅ Toutes les pages ont déjà une section de profil !');
        }
    }

    extractProfileTemplate() {
        // Le template de profil est dans template-modern-sidebar.html
        const templatePath = path.join(this.publicDir, 'template-modern-sidebar.html');
        
        if (fs.existsSync(templatePath)) {
            const content = fs.readFileSync(templatePath, 'utf8');
            
            console.log('\n🔍 Extraction du template de profil depuis template-modern-sidebar.html...');
            
            // Extraire la section de profil
            this.profileTemplate = this.extractProfileSection(content);
            
            if (this.profileTemplate) {
                console.log('✅ Template de section de profil extrait avec succès');
            } else {
                console.log('❌ Impossible d\'extraire le template de section de profil');
            }
        } else {
            console.log('❌ Template de sidebar non trouvé');
        }
    }

    extractProfileSection(content) {
        // Extraire la section de profil utilisateur
        const profileMatch = content.match(/<!-- Zone de profil utilisateur -->([\s\S]*?)<!-- Menu déroulant du profil -->/i);
        if (profileMatch) {
            return profileMatch[1].trim();
        }
        
        // Alternative: extraire la div sidebar-user-profile
        const divMatch = content.match(/<div class="sidebar-user-profile">([\s\S]*?)<\/div>/i);
        if (divMatch) {
            return `<div class="sidebar-user-profile">${divMatch[1]}</div>`;
        }
        
        return null;
    }

    showReport() {
        console.log('\n📊 RAPPORT D\'ANALYSE');
        console.log('=====================');
        console.log(`✅ Pages avec section de profil: ${this.pagesWithProfile.length}`);
        console.log(`❌ Pages sans section de profil: ${this.pagesWithoutProfile.length}`);
        
        if (this.pagesWithoutProfile.length > 0) {
            console.log('\n📋 PAGES SANS SECTION DE PROFIL:');
            this.pagesWithoutProfile.forEach(page => {
                console.log(`   - ${page}`);
            });
            
            console.log('\n💡 RECOMMANDATIONS:');
            console.log('1. ✅ Vérifier que ces pages utilisent bien template-modern-sidebar.html');
            console.log('2. ✅ S\'assurer que les scripts user-header.js et profile-menu.js sont inclus');
            console.log('3. ✅ Vérifier que la sidebar est chargée correctement');
            
            if (this.profileTemplate) {
                console.log('\n🔧 SOLUTION:');
                console.log('Le template de section de profil est disponible dans template-modern-sidebar.html');
                console.log('Ces pages devraient automatiquement avoir la section de profil si elles utilisent:');
                console.log('   - template-modern-sidebar.html via sidebar.js');
                console.log('   - user-header.js et profile-menu.js');
            }
        } else {
            console.log('\n✅ Toutes les pages ont une section de profil !');
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.pagesWithoutProfile.length === 0) {
            console.log('✅ Toutes les pages ont une section de profil cohérente');
            console.log('✅ Le système de profil utilisateur est uniforme');
        } else {
            console.log('⚠️  Certaines pages n\'ont pas de section de profil');
            console.log('🔧 Vérification nécessaire pour ces pages');
        }
        
        console.log('\n🔍 Analyse terminée !');
    }
}

// Exécuter l'analyse
const analyzer = new ProfileSectionAnalyzer();
analyzer.analyze();

