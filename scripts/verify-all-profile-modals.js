#!/usr/bin/env node

/**
 * Script pour vérifier que toutes les pages ont les mêmes modales de profil
 * Usage: node scripts/verify-all-profile-modals.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DE TOUTES LES MODALES DE PROFIL');
console.log('===============================================\n');

class ProfileModalsVerifier {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithModals = [];
        this.pagesWithoutModals = [];
        this.modalDifferences = [];
        this.referenceModal = null;
    }

    async verify() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Identifier les différences
            this.identifyDifferences();
            
            // 3. Afficher le rapport détaillé
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
            
            // Vérifier si la page a des modales de profil
            const hasProfileModal = content.includes('profileModal') || 
                                  content.includes('id="profileModal"') ||
                                  content.includes('Mon Profil');
            
            const hasChangePasswordModal = content.includes('changePasswordModal') ||
                                         content.includes('Changer le mot de passe');
            
            const hasTwoFactorModal = content.includes('twoFactorModal') ||
                                    content.includes('Authentification à deux facteurs');
            
            if (hasProfileModal || hasChangePasswordModal || hasTwoFactorModal) {
                this.pagesWithModals.push({
                    file,
                    hasProfileModal,
                    hasChangePasswordModal,
                    hasTwoFactorModal,
                    content: this.extractModals(content)
                });
            } else {
                this.pagesWithoutModals.push(file);
            }
        }

        console.log(`✅ Pages avec modales: ${this.pagesWithModals.length}`);
        console.log(`❌ Pages sans modales: ${this.pagesWithoutModals.length}`);
    }

    extractModals(content) {
        const modals = {};
        
        // Extraire la modale de profil
        const profileModalMatch = content.match(/<div[^>]*id="profileModal"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
        if (profileModalMatch) {
            modals.profileModal = profileModalMatch[0];
        }
        
        // Extraire la modale de changement de mot de passe
        const passwordModalMatch = content.match(/<div[^>]*id="changePasswordModal"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
        if (passwordModalMatch) {
            modals.changePasswordModal = passwordModalMatch[0];
        }
        
        // Extraire la modale 2FA
        const twoFactorModalMatch = content.match(/<div[^>]*id="twoFactorModal"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
        if (twoFactorModalMatch) {
            modals.twoFactorModal = twoFactorModalMatch[0];
        }
        
        return modals;
    }

    identifyDifferences() {
        if (this.pagesWithModals.length === 0) {
            console.log('❌ Aucune page avec modales trouvée');
            return;
        }

        // Prendre la première page comme référence
        this.referenceModal = this.pagesWithModals[0];
        console.log(`\n🔍 Référence: ${this.referenceModal.file}`);

        // Comparer avec toutes les autres pages
        for (let i = 1; i < this.pagesWithModals.length; i++) {
            const page = this.pagesWithModals[i];
            const differences = this.compareModals(this.referenceModal, page);
            
            if (differences.length > 0) {
                this.modalDifferences.push({
                    file: page.file,
                    differences
                });
            }
        }
    }

    compareModals(reference, page) {
        const differences = [];
        
        // Comparer les modales de profil
        if (reference.content.profileModal && page.content.profileModal) {
            if (reference.content.profileModal !== page.content.profileModal) {
                differences.push('Modale de profil différente');
            }
        } else if (reference.content.profileModal && !page.content.profileModal) {
            differences.push('Modale de profil manquante');
        } else if (!reference.content.profileModal && page.content.profileModal) {
            differences.push('Modale de profil en trop');
        }
        
        // Comparer les modales de changement de mot de passe
        if (reference.content.changePasswordModal && page.content.changePasswordModal) {
            if (reference.content.changePasswordModal !== page.content.changePasswordModal) {
                differences.push('Modale changement mot de passe différente');
            }
        } else if (reference.content.changePasswordModal && !page.content.changePasswordModal) {
            differences.push('Modale changement mot de passe manquante');
        } else if (!reference.content.changePasswordModal && page.content.changePasswordModal) {
            differences.push('Modale changement mot de passe en trop');
        }
        
        // Comparer les modales 2FA
        if (reference.content.twoFactorModal && page.content.twoFactorModal) {
            if (reference.content.twoFactorModal !== page.content.twoFactorModal) {
                differences.push('Modale 2FA différente');
            }
        } else if (reference.content.twoFactorModal && !page.content.twoFactorModal) {
            differences.push('Modale 2FA manquante');
        } else if (!reference.content.twoFactorModal && page.content.twoFactorModal) {
            differences.push('Modale 2FA en trop');
        }
        
        return differences;
    }

    showDetailedReport() {
        console.log('\n📊 RAPPORT DÉTAILLÉ');
        console.log('===================');
        console.log(`✅ Pages avec modales: ${this.pagesWithModals.length}`);
        console.log(`❌ Pages sans modales: ${this.pagesWithoutModals.length}`);
        console.log(`⚠️  Pages avec différences: ${this.modalDifferences.length}`);
        
        if (this.pagesWithoutModals.length > 0) {
            console.log('\n📋 PAGES SANS MODALES:');
            this.pagesWithoutModals.forEach(page => {
                console.log(`   - ${page}`);
            });
        }
        
        if (this.modalDifferences.length > 0) {
            console.log('\n⚠️  PAGES AVEC DIFFÉRENCES:');
            this.modalDifferences.forEach(page => {
                console.log(`\n📄 ${page.file}:`);
                page.differences.forEach(diff => {
                    console.log(`   ❌ ${diff}`);
                });
            });
        }
        
        // Afficher les détails des modales de référence
        if (this.referenceModal) {
            console.log('\n🔍 MODALES DE RÉFÉRENCE:');
            console.log(`📄 Page: ${this.referenceModal.file}`);
            console.log(`   ✅ Modale profil: ${this.referenceModal.hasProfileModal ? 'Oui' : 'Non'}`);
            console.log(`   ✅ Modale mot de passe: ${this.referenceModal.hasChangePasswordModal ? 'Oui' : 'Non'}`);
            console.log(`   ✅ Modale 2FA: ${this.referenceModal.hasTwoFactorModal ? 'Oui' : 'Non'}`);
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.modalDifferences.length === 0 && this.pagesWithoutModals.length === 0) {
            console.log('✅ Toutes les pages ont des modales de profil identiques !');
            console.log('✅ La cohérence des modales est parfaite');
        } else {
            console.log('⚠️  Des incohérences ont été détectées dans les modales');
            console.log('🔧 Correction nécessaire pour assurer la cohérence');
        }
        
        console.log('\n💡 RECOMMANDATIONS:');
        if (this.pagesWithoutModals.length > 0) {
            console.log('1. ✅ Ajouter les modales manquantes aux pages sans modales');
        }
        if (this.modalDifferences.length > 0) {
            console.log('2. ✅ Standardiser les modales différentes');
        }
        console.log('3. ✅ Utiliser le template de sidebar pour toutes les modales');
        console.log('4. ✅ Vérifier que toutes les pages chargent le même template');
        
        console.log('\n🔍 Vérification terminée !');
    }
}

// Exécuter la vérification
const verifier = new ProfileModalsVerifier();
verifier.verify();

