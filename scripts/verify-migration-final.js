#!/usr/bin/env node

/**
 * Script de vérification finale de la migration - exclut les pages qui n'ont pas besoin de sidebar
 * Usage: node scripts/verify-migration-final.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 VÉRIFICATION FINALE DE LA MIGRATION');
console.log('======================================\n');

class FinalMigrationChecker {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.results = {
            totalPages: 0,
            pagesToCheck: 0,
            migratedPages: 0,
            issues: []
        };
        
        // Pages qui n'ont PAS besoin de sidebar (exceptions logiques)
        this.excludedPages = [
            'index.html',      // Page d'accueil
            'logout.html',     // Page de déconnexion
            'login.html'       // Page de connexion
        ];
    }

    async check() {
        try {
            // 1. Identifier toutes les pages HTML
            this.identifyAllPages();
            
            // 2. Filtrer les pages à vérifier (exclure les exceptions)
            this.filterPagesToCheck();
            
            // 3. Vérifier les pages migrées
            this.checkMigratedPages();
            
            // 4. Vérifier l'utilisation du layout unifié
            this.checkUnifiedLayoutUsage();
            
            // 5. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
    }

    identifyAllPages() {
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup')
        );

        this.results.totalPages = htmlFiles.length;
        console.log(`📄 Total des pages HTML: ${this.results.totalPages}`);
    }

    filterPagesToCheck() {
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup') &&
            !this.excludedPages.includes(file)
        );

        this.results.pagesToCheck = htmlFiles.length;
        console.log(`🔍 Pages à vérifier (avec sidebar): ${this.results.pagesToCheck}`);
        console.log(`🚫 Pages exclues (sans sidebar): ${this.excludedPages.join(', ')}`);
    }

    checkMigratedPages() {
        const files = fs.readdirSync(this.publicDir);
        const backupFiles = files.filter(file => file.includes('.backup.'));
        
        this.results.migratedPages = backupFiles.length;
        console.log(`🔄 Pages avec sauvegardes (migrées): ${this.results.migratedPages}`);
    }

    checkUnifiedLayoutUsage() {
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup') &&
            !this.excludedPages.includes(file)
        );

        let unifiedCount = 0;
        let issues = [];

        for (const file of htmlFiles) {
            const filePath = path.join(this.publicDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const hasUnifiedCSS = content.includes('unified-layout.css');
            const hasUnifiedJS = content.includes('unified-layout.js');
            const hasUserHeader = content.includes('user-header-container');
            const hasSidebar = content.includes('sidebar-container');
            const hasAuth = content.includes('auth.js');
            const hasMenuPermissions = content.includes('menu-permissions.js');
            
            if (hasUnifiedCSS && hasUnifiedJS && hasUserHeader && hasSidebar && hasAuth && hasMenuPermissions) {
                unifiedCount++;
                console.log(`✅ ${file} - Layout unifié complet`);
            } else {
                issues.push({
                    file,
                    problems: []
                });
                
                if (!hasUnifiedCSS) issues[issues.length - 1].problems.push('CSS unifié manquant');
                if (!hasUnifiedJS) issues[issues.length - 1].problems.push('JS unifié manquant');
                if (!hasUserHeader) issues[issues.length - 1].problems.push('Header utilisateur manquant');
                if (!hasSidebar) issues[issues.length - 1].problems.push('Sidebar manquante');
                if (!hasAuth) issues[issues.length - 1].problems.push('Script d\'authentification manquant');
                if (!hasMenuPermissions) issues[issues.length - 1].problems.push('Script de permissions manquant');
                
                console.log(`⚠️  ${file} - Problèmes détectés`);
            }
        }

        this.results.unifiedLayoutPages = unifiedCount;
        this.results.issues = issues;
    }

    showReport() {
        console.log('\n📊 RAPPORT FINAL DE MIGRATION');
        console.log('==============================');
        
        const successRate = Math.round((this.results.unifiedLayoutPages / this.results.pagesToCheck) * 100);
        
        console.log(`📄 Total des pages HTML: ${this.results.totalPages}`);
        console.log(`🔍 Pages à vérifier (avec sidebar): ${this.results.pagesToCheck}`);
        console.log(`🚫 Pages exclues (sans sidebar): ${this.excludedPages.length}`);
        console.log(`🔄 Pages migrées: ${this.results.migratedPages}`);
        console.log(`✅ Pages avec layout unifié: ${this.results.unifiedLayoutPages}`);
        console.log(`📊 Taux de succès: ${successRate}%`);
        
        if (this.results.issues.length > 0) {
            console.log('\n⚠️  PAGES AVEC PROBLÈMES:');
            this.results.issues.forEach(issue => {
                console.log(`\n📄 ${issue.file}:`);
                issue.problems.forEach(problem => {
                    console.log(`   ❌ ${problem}`);
                });
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (successRate >= 95) {
            console.log('🎉 EXCELLENT! La migration est un succès complet!');
            console.log('✅ Toutes les pages applicatives utilisent le layout unifié');
            console.log('✅ La sidebar et le profil utilisateur sont cohérents');
            console.log('✅ Le système de permissions est intégré');
            console.log('✅ Les pages d\'exception (index, logout, login) sont correctement exclues');
        } else if (successRate >= 80) {
            console.log('🔶 BON! La migration est largement réussie');
            console.log('⚠️  Quelques pages nécessitent des ajustements mineurs');
        } else if (successRate >= 60) {
            console.log('⚠️  MOYEN! La migration est partiellement réussie');
            console.log('🔧 Des corrections sont nécessaires');
        } else {
            console.log('🚨 CRITIQUE! La migration a échoué');
            console.log('🔧 Une intervention manuelle est nécessaire');
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        if (successRate >= 95) {
            console.log('1. ✅ Tester l\'application en local');
            console.log('2. ✅ Vérifier que la sidebar et le profil fonctionnent sur toutes les pages');
            console.log('3. ✅ Tester les permissions de menu');
            console.log('4. ✅ Commiter et pousser les changements');
            console.log('5. ✅ Déployer sur le serveur de production');
        } else {
            console.log('1. 🔧 Corriger les pages avec problèmes');
            console.log('2. 🔄 Relancer la vérification');
            console.log('3. ✅ Procéder au déploiement une fois corrigé');
        }
        
        console.log('\n🎯 Vérification terminée !');
    }
}

// Exécuter la vérification
const checker = new FinalMigrationChecker();
checker.check();


