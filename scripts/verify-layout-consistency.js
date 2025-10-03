#!/usr/bin/env node

/**
 * Script de vérification de la cohérence du layout sur toutes les pages
 * Usage: node scripts/verify-layout-consistency.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DE LA COHÉRENCE DU LAYOUT');
console.log('==========================================\n');

class LayoutConsistencyChecker {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pages = [];
        this.issues = [];
        this.recommendations = [];
    }

    async check() {
        try {
            // 1. Identifier toutes les pages HTML
            this.identifyPages();
            
            // 2. Analyser chaque page
            for (const page of this.pages) {
                await this.analyzePage(page);
            }
            
            // 3. Vérifier la cohérence globale
            this.checkGlobalConsistency();
            
            // 4. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
    }

    identifyPages() {
        console.log('🔍 Identification des pages à vérifier...');
        
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup') &&
            file !== 'login.html' &&
            file !== 'logout.html'
        );

        this.pages = htmlFiles.map(file => ({
            filename: file,
            path: path.join(this.publicDir, file)
        }));

        console.log(`📄 ${this.pages.length} pages identifiées pour la vérification`);
    }

    async analyzePage(pageInfo) {
        try {
            const content = fs.readFileSync(pageInfo.path, 'utf8');
            
            const analysis = {
                filename: pageInfo.filename,
                hasUnifiedLayout: this.checkUnifiedLayout(content),
                hasSidebar: this.checkSidebar(content),
                hasUserHeader: this.checkUserHeader(content),
                hasPermissions: this.checkPermissions(content),
                hasBootstrap: this.checkBootstrap(content),
                hasFontAwesome: this.checkFontAwesome(content),
                hasAuthScripts: this.checkAuthScripts(content),
                hasCustomCSS: this.checkCustomCSS(content),
                hasCustomJS: this.checkCustomJS(content),
                issues: []
            };

            // Identifier les problèmes
            this.identifyIssues(analysis);
            
            this.pages.find(p => p.filename === pageInfo.filename).analysis = analysis;
            
        } catch (error) {
            console.error(`❌ Erreur lors de l'analyse de ${pageInfo.filename}:`, error.message);
        }
    }

    checkUnifiedLayout(content) {
        return content.includes('unified-layout.css') && 
               content.includes('unified-layout.js');
    }

    checkSidebar(content) {
        return content.includes('sidebar-container') || 
               content.includes('sidebar.js');
    }

    checkUserHeader(content) {
        return content.includes('user-header-container') || 
               content.includes('user-header.js');
    }

    checkPermissions(content) {
        return content.includes('menu-permissions.js');
    }

    checkBootstrap(content) {
        return content.includes('bootstrap@5.3.0');
    }

    checkFontAwesome(content) {
        return content.includes('font-awesome/6.4.0');
    }

    checkAuthScripts(content) {
        return content.includes('auth.js');
    }

    checkCustomCSS(content) {
        return content.includes('<style>') && 
               !content.includes('unified-layout.css');
    }

    checkCustomJS(content) {
        const scriptMatches = content.match(/<script[^>]*>/gi);
        return scriptMatches && scriptMatches.length > 5; // Plus que les scripts de base
    }

    identifyIssues(analysis) {
        // Vérifier les problèmes de cohérence
        if (!analysis.hasUnifiedLayout) {
            analysis.issues.push({
                type: 'layout',
                severity: 'high',
                message: 'Layout non unifié - utilise des styles/scripts personnalisés'
            });
        }

        if (!analysis.hasSidebar) {
            analysis.issues.push({
                type: 'sidebar',
                severity: 'critical',
                message: 'Sidebar manquante ou non standardisée'
            });
        }

        if (!analysis.hasUserHeader) {
            analysis.issues.push({
                type: 'header',
                severity: 'critical',
                message: 'Header utilisateur manquant ou non standardisé'
            });
        }

        if (!analysis.hasPermissions) {
            analysis.issues.push({
                type: 'permissions',
                severity: 'high',
                message: 'Système de permissions de menu non intégré'
            });
        }

        if (!analysis.hasBootstrap) {
            analysis.issues.push({
                type: 'bootstrap',
                severity: 'medium',
                message: 'Bootstrap non détecté ou version obsolète'
            });
        }

        if (!analysis.hasFontAwesome) {
            analysis.issues.push({
                type: 'icons',
                severity: 'medium',
                message: 'Font Awesome non détecté ou version obsolète'
            });
        }

        if (!analysis.hasAuthScripts) {
            analysis.issues.push({
                type: 'auth',
                severity: 'high',
                message: 'Scripts d\'authentification manquants'
            });
        }

        if (analysis.hasCustomCSS) {
            analysis.issues.push({
                type: 'custom-css',
                severity: 'low',
                message: 'Styles personnalisés détectés (peuvent causer des incohérences)'
            });
        }

        if (analysis.hasCustomJS) {
            analysis.issues.push({
                type: 'custom-js',
                severity: 'low',
                message: 'Scripts personnalisés détectés (peuvent causer des conflits)'
            });
        }
    }

    checkGlobalConsistency() {
        console.log('\n🔍 Vérification de la cohérence globale...');
        
        // Compter les pages avec différents types de problèmes
        const layoutIssues = this.pages.filter(p => p.analysis?.issues.some(i => i.type === 'layout')).length;
        const sidebarIssues = this.pages.filter(p => p.analysis?.issues.some(i => i.type === 'sidebar')).length;
        const headerIssues = this.pages.filter(p => p.analysis?.issues.some(i => i.type === 'header')).length;
        const permissionIssues = this.pages.filter(p => p.analysis?.issues.some(i => i.type === 'permissions')).length;
        
        // Générer des recommandations
        if (layoutIssues > 0) {
            this.recommendations.push({
                type: 'migration',
                priority: 'high',
                message: `${layoutIssues} pages nécessitent une migration vers le layout unifié`,
                action: 'Exécuter: node scripts/migrate-pages-to-unified-layout.js'
            });
        }

        if (sidebarIssues > 0) {
            this.recommendations.push({
                type: 'sidebar',
                priority: 'critical',
                message: `${sidebarIssues} pages ont des problèmes de sidebar`,
                action: 'Vérifier l\'intégration de sidebar.js et template-modern-sidebar.html'
            });
        }

        if (headerIssues > 0) {
            this.recommendations.push({
                type: 'header',
                priority: 'critical',
                message: `${headerIssues} pages ont des problèmes de header utilisateur`,
                action: 'Vérifier l\'intégration de user-header.js'
            });
        }

        if (permissionIssues > 0) {
            this.recommendations.push({
                type: 'permissions',
                priority: 'high',
                message: `${permissionIssues} pages n\'ont pas le système de permissions intégré`,
                action: 'Vérifier l\'intégration de menu-permissions.js'
            });
        }
    }

    showReport() {
        console.log('\n📊 RAPPORT DE COHÉRENCE DU LAYOUT');
        console.log('==================================');
        
        // Résumé global
        const totalPages = this.pages.length;
        const pagesWithIssues = this.pages.filter(p => p.analysis?.issues.length > 0).length;
        const criticalIssues = this.pages.filter(p => 
            p.analysis?.issues.some(i => i.severity === 'critical')
        ).length;
        const highIssues = this.pages.filter(p => 
            p.analysis?.issues.some(i => i.severity === 'high')
        ).length;

        console.log(`📄 Total des pages analysées: ${totalPages}`);
        console.log(`⚠️  Pages avec problèmes: ${pagesWithIssues}`);
        console.log(`🚨 Problèmes critiques: ${criticalIssues}`);
        console.log(`⚠️  Problèmes importants: ${highIssues}`);

        // Score de cohérence
        const consistencyScore = Math.round(((totalPages - pagesWithIssues) / totalPages) * 100);
        console.log(`📊 Score de cohérence: ${consistencyScore}/100`);

        // Détail par page
        if (pagesWithIssues > 0) {
            console.log('\n📋 DÉTAIL PAR PAGE:');
            this.pages.forEach(page => {
                if (page.analysis?.issues.length > 0) {
                    console.log(`\n📄 ${page.filename}:`);
                    page.analysis.issues.forEach(issue => {
                        const icon = issue.severity === 'critical' ? '🚨' : 
                                   issue.severity === 'high' ? '⚠️' : 
                                   issue.severity === 'medium' ? '🔶' : 'ℹ️';
                        console.log(`   ${icon} ${issue.message}`);
                    });
                }
            });
        }

        // Recommandations
        if (this.recommendations.length > 0) {
            console.log('\n💡 RECOMMANDATIONS:');
            this.recommendations.forEach(rec => {
                const icon = rec.priority === 'critical' ? '🚨' : 
                           rec.priority === 'high' ? '⚠️' : 'ℹ️';
                console.log(`\n${icon} ${rec.message}`);
                console.log(`   Action: ${rec.action}`);
            });
        }

        // Conclusion
        console.log('\n🎯 CONCLUSION:');
        if (consistencyScore >= 90) {
            console.log('✅ Excellent! Le layout est très cohérent.');
        } else if (consistencyScore >= 70) {
            console.log('🔶 Bon, mais des améliorations sont possibles.');
        } else if (consistencyScore >= 50) {
            console.log('⚠️  Moyen, des corrections importantes sont nécessaires.');
        } else {
            console.log('🚨 Critique, une refactorisation majeure est recommandée.');
        }

        console.log('\n🔍 Vérification terminée !');
    }
}

// Exécuter la vérification
const checker = new LayoutConsistencyChecker();
checker.check();
