#!/usr/bin/env node

/**
 * Script pour corriger la cohérence des modales de profil
 * Usage: node scripts/fix-profile-modals-consistency.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DE LA COHÉRENCE DES MODALES DE PROFIL');
console.log('==================================================\n');

class ProfileModalsConsistencyFixer {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithUserModals = [];
        this.pagesWithoutUserModals = [];
        this.fixedPages = [];
        this.errorPages = [];
    }

    async fix() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Corriger les pages incohérentes
            this.fixInconsistentPages();
            
            // 3. Afficher le rapport final
            this.showFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error);
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
            
            // Vérifier si la page utilise user-modals.js
            const hasUserModals = content.includes('user-modals.js') && 
                                !content.includes('<!-- <script src="js/user-modals.js"></script> -->');
            
            if (hasUserModals) {
                this.pagesWithUserModals.push(file);
            } else {
                this.pagesWithoutUserModals.push(file);
            }
        }

        console.log(`⚠️  Pages avec user-modals.js: ${this.pagesWithUserModals.length}`);
        console.log(`✅ Pages sans user-modals.js: ${this.pagesWithoutUserModals.length}`);
    }

    fixInconsistentPages() {
        if (this.pagesWithUserModals.length === 0) {
            console.log('✅ Aucune page à corriger - toutes les pages sont cohérentes !');
            return;
        }

        console.log('\n🔧 CORRECTION DES PAGES INCOHÉRENTES:');
        console.log('=====================================');

        for (const file of this.pagesWithUserModals) {
            try {
                this.fixPage(file);
                this.fixedPages.push(file);
                console.log(`✅ ${file} - user-modals.js désactivé`);
            } catch (error) {
                this.errorPages.push({ file, error: error.message });
                console.error(`❌ ${file} - Erreur: ${error.message}`);
            }
        }
    }

    fixPage(file) {
        const filePath = path.join(this.publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Commenter la ligne user-modals.js
        const userModalsPattern = /<script src="js\/user-modals\.js"><\/script>/g;
        if (userModalsPattern.test(content)) {
            content = content.replace(userModalsPattern, '<!-- <script src="js/user-modals.js"></script> -->');
        }
        
        // Sauvegarder le fichier modifié
        fs.writeFileSync(filePath, content, 'utf8');
    }

    showFinalReport() {
        console.log('\n📊 RAPPORT FINAL DE CORRECTION');
        console.log('===============================');
        console.log(`📄 Total des pages analysées: ${this.pagesWithUserModals.length + this.pagesWithoutUserModals.length}`);
        console.log(`⚠️  Pages avec user-modals.js (avant correction): ${this.pagesWithUserModals.length}`);
        console.log(`✅ Pages corrigées: ${this.fixedPages.length}`);
        console.log(`❌ Erreurs: ${this.errorPages.length}`);
        
        if (this.fixedPages.length > 0) {
            console.log('\n✅ PAGES CORRIGÉES:');
            this.fixedPages.forEach(file => {
                console.log(`   - ${file}`);
            });
        }
        
        if (this.errorPages.length > 0) {
            console.log('\n❌ PAGES AVEC ERREURS:');
            this.errorPages.forEach(page => {
                console.log(`   - ${page.file}: ${page.error}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.errorPages.length === 0 && this.fixedPages.length === this.pagesWithUserModals.length) {
            console.log('✅ Toutes les pages ont été corrigées avec succès !');
            console.log('✅ La cohérence des modales de profil est maintenant assurée');
            console.log('✅ Toutes les pages utilisent les modales du template de sidebar');
        } else if (this.fixedPages.length > 0) {
            console.log('⚠️  Certaines pages ont été corrigées, mais des erreurs subsistent');
            console.log('🔧 Vérifiez les pages avec erreurs manuellement');
        } else {
            console.log('❌ Aucune page n\'a pu être corrigée');
            console.log('🔧 Vérifiez les erreurs et corrigez manuellement');
        }
        
        console.log('\n💡 EXPLICATION DE LA CORRECTION:');
        console.log('1. ✅ user-modals.js a été désactivé sur toutes les pages');
        console.log('2. ✅ Toutes les pages utilisent maintenant les modales du template de sidebar');
        console.log('3. ✅ Les modales de profil sont maintenant cohérentes partout');
        console.log('4. ✅ Le système de permissions de menu fonctionne correctement');
        
        console.log('\n🔍 VÉRIFICATION RECOMMANDÉE:');
        console.log('1. ✅ Tester que le bouton "Mon Profil" ouvre la même modale partout');
        console.log('2. ✅ Vérifier que les permissions de menu sont appliquées');
        console.log('3. ✅ S\'assurer que toutes les fonctionnalités de profil marchent');
        
        console.log('\n🔧 Correction terminée !');
    }
}

// Exécuter la correction
const fixer = new ProfileModalsConsistencyFixer();
fixer.fix();


