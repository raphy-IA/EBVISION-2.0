#!/usr/bin/env node

/**
 * Script de test pour vérifier le fonctionnement du layout unifié
 * Usage: node scripts/test-unified-layout.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TEST DU LAYOUT UNIFIÉ');
console.log('========================\n');

class UnifiedLayoutTester {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }

    async runTests() {
        try {
            console.log('🚀 Démarrage des tests...\n');
            
            // Tests de structure
            await this.testFileStructure();
            
            // Tests de contenu
            await this.testFileContent();
            
            // Tests de cohérence
            await this.testConsistency();
            
            // Tests d'intégration
            await this.testIntegration();
            
            // Afficher les résultats
            this.showResults();
            
        } catch (error) {
            console.error('❌ Erreur lors des tests:', error);
        }
    }

    async testFileStructure() {
        console.log('📁 Test de la structure des fichiers...');
        
        const requiredFiles = [
            'template-base.html',
            'css/unified-layout.css',
            'js/unified-layout.js',
            'scripts/migrate-pages-to-unified-layout.js',
            'scripts/verify-layout-consistency.js',
            'GUIDE-MIGRATION-LAYOUT-UNIFIE.md'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.publicDir, file);
            if (fs.existsSync(filePath)) {
                this.addResult('passed', `Fichier requis trouvé: ${file}`);
            } else {
                this.addResult('failed', `Fichier requis manquant: ${file}`);
            }
        }
    }

    async testFileContent() {
        console.log('📄 Test du contenu des fichiers...');
        
        // Test du template de base
        await this.testTemplateBase();
        
        // Test du CSS unifié
        await this.testUnifiedCSS();
        
        // Test du JavaScript unifié
        await this.testUnifiedJS();
    }

    async testTemplateBase() {
        const templatePath = path.join(this.publicDir, 'template-base.html');
        if (!fs.existsSync(templatePath)) {
            this.addResult('failed', 'Template de base non trouvé');
            return;
        }

        const content = fs.readFileSync(templatePath, 'utf8');
        
        const requiredElements = [
            'unified-layout.css',
            'unified-layout.js',
            'user-header-container',
            'sidebar-container',
            'main-content-area',
            'common-modals',
            'profileModal',
            'changePasswordModal',
            'twoFactorModal'
        ];

        for (const element of requiredElements) {
            if (content.includes(element)) {
                this.addResult('passed', `Élément requis trouvé dans template: ${element}`);
            } else {
                this.addResult('failed', `Élément requis manquant dans template: ${element}`);
            }
        }
    }

    async testUnifiedCSS() {
        const cssPath = path.join(this.publicDir, 'css', 'unified-layout.css');
        if (!fs.existsSync(cssPath)) {
            this.addResult('failed', 'CSS unifié non trouvé');
            return;
        }

        const content = fs.readFileSync(cssPath, 'utf8');
        
        const requiredStyles = [
            ':root',
            '--sidebar-width',
            '--header-height',
            '#user-header-container',
            '#sidebar-container',
            '.main-content-area',
            '.page-wrapper',
            '.sidebar',
            '.sidebar-menu',
            '.user-profile-toggle',
            '@media (max-width: 768px)'
        ];

        for (const style of requiredStyles) {
            if (content.includes(style)) {
                this.addResult('passed', `Style requis trouvé: ${style}`);
            } else {
                this.addResult('failed', `Style requis manquant: ${style}`);
            }
        }
    }

    async testUnifiedJS() {
        const jsPath = path.join(this.publicDir, 'js', 'unified-layout.js');
        if (!fs.existsSync(jsPath)) {
            this.addResult('failed', 'JavaScript unifié non trouvé');
            return;
        }

        const content = fs.readFileSync(jsPath, 'utf8');
        
        const requiredMethods = [
            'class UnifiedLayoutManager',
            'async init()',
            'async loadUserInfo()',
            'async initializeMenuPermissions()',
            'async generateUserHeader()',
            'setupEventListeners()',
            'handleLogout()',
            'handlePasswordChange()'
        ];

        for (const method of requiredMethods) {
            if (content.includes(method)) {
                this.addResult('passed', `Méthode requise trouvée: ${method}`);
            } else {
                this.addResult('failed', `Méthode requise manquante: ${method}`);
            }
        }
    }

    async testConsistency() {
        console.log('🔄 Test de la cohérence...');
        
        // Vérifier que les pages existantes ont des structures cohérentes
        const htmlFiles = fs.readdirSync(this.publicDir)
            .filter(file => file.endsWith('.html') && 
                           !file.startsWith('template-') && 
                           !file.includes('backup') &&
                           file !== 'login.html' &&
                           file !== 'logout.html');

        let consistentPages = 0;
        let inconsistentPages = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(this.publicDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Vérifier les éléments de base
            const hasBootstrap = content.includes('bootstrap@5.3.0');
            const hasFontAwesome = content.includes('font-awesome/6.4.0');
            const hasAuth = content.includes('auth.js');
            
            if (hasBootstrap && hasFontAwesome && hasAuth) {
                consistentPages++;
                this.addResult('passed', `Page cohérente: ${file}`);
            } else {
                inconsistentPages++;
                this.addResult('warning', `Page incohérente: ${file} (Bootstrap: ${hasBootstrap}, FontAwesome: ${hasFontAwesome}, Auth: ${hasAuth})`);
            }
        }

        this.addResult('passed', `Pages cohérentes: ${consistentPages}/${htmlFiles.length}`);
    }

    async testIntegration() {
        console.log('🔗 Test de l'intégration...');
        
        // Vérifier l'intégration avec les scripts existants
        const existingScripts = [
            'js/sidebar.js',
            'js/menu-permissions.js',
            'js/user-header.js',
            'js/profile-menu.js',
            'js/auth.js'
        ];

        for (const script of existingScripts) {
            const scriptPath = path.join(this.publicDir, script);
            if (fs.existsSync(scriptPath)) {
                this.addResult('passed', `Script existant trouvé: ${script}`);
            } else {
                this.addResult('warning', `Script existant manquant: ${script}`);
            }
        }

        // Vérifier le template de sidebar existant
        const sidebarTemplatePath = path.join(this.publicDir, 'template-modern-sidebar.html');
        if (fs.existsSync(sidebarTemplatePath)) {
            this.addResult('passed', 'Template de sidebar existant trouvé');
        } else {
            this.addResult('failed', 'Template de sidebar existant manquant');
        }
    }

    addResult(type, message) {
        this.testResults[type]++;
        this.testResults.details.push({ type, message });
        
        const icon = type === 'passed' ? '✅' : type === 'failed' ? '❌' : '⚠️';
        console.log(`   ${icon} ${message}`);
    }

    showResults() {
        console.log('\n📊 RÉSULTATS DES TESTS');
        console.log('======================');
        
        const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
        const successRate = Math.round((this.testResults.passed / total) * 100);
        
        console.log(`✅ Tests réussis: ${this.testResults.passed}`);
        console.log(`❌ Tests échoués: ${this.testResults.failed}`);
        console.log(`⚠️  Avertissements: ${this.testResults.warnings}`);
        console.log(`📊 Taux de réussite: ${successRate}%`);
        
        // Résumé des échecs
        const failures = this.testResults.details.filter(d => d.type === 'failed');
        if (failures.length > 0) {
            console.log('\n❌ ÉCHECS:');
            failures.forEach(failure => {
                console.log(`   - ${failure.message}`);
            });
        }
        
        // Résumé des avertissements
        const warnings = this.testResults.details.filter(d => d.type === 'warning');
        if (warnings.length > 0) {
            console.log('\n⚠️  AVERTISSEMENTS:');
            warnings.forEach(warning => {
                console.log(`   - ${warning.message}`);
            });
        }
        
        // Conclusion
        console.log('\n🎯 CONCLUSION:');
        if (successRate >= 90) {
            console.log('✅ Excellent! Le layout unifié est prêt pour la migration.');
        } else if (successRate >= 70) {
            console.log('🔶 Bon, mais quelques corrections sont nécessaires.');
        } else if (successRate >= 50) {
            console.log('⚠️  Moyen, des corrections importantes sont nécessaires.');
        } else {
            console.log('🚨 Critique, le layout unifié nécessite des corrections majeures.');
        }
        
        // Prochaines étapes
        console.log('\n📋 PROCHAINES ÉTAPES:');
        if (this.testResults.failed === 0) {
            console.log('1. ✅ Tous les tests sont passés');
            console.log('2. 🚀 Vous pouvez procéder à la migration');
            console.log('3. 📝 Exécuter: node scripts/migrate-pages-to-unified-layout.js');
        } else {
            console.log('1. ❌ Corriger les échecs identifiés');
            console.log('2. 🔄 Relancer les tests');
            console.log('3. 🚀 Procéder à la migration une fois tous les tests passés');
        }
        
        console.log('\n🧪 Tests terminés !');
    }
}

// Exécuter les tests
const tester = new UnifiedLayoutTester();
tester.runTests();
