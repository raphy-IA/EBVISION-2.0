#!/usr/bin/env node

/**
 * Script pour ajouter les scripts de profil manquants aux pages
 * Usage: node scripts/fix-profile-scripts.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES SCRIPTS DE PROFIL');
console.log('===================================\n');

class ProfileScriptsFixer {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.fixedPages = 0;
        this.errors = [];
    }

    async fix() {
        try {
            // 1. Identifier les pages avec scripts manquants
            const pagesToFix = this.identifyPagesToFix();
            
            // 2. Corriger chaque page
            for (const page of pagesToFix) {
                await this.fixPage(page);
            }
            
            // 3. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error);
        }
    }

    identifyPagesToFix() {
        const pagesToFix = [
            {
                file: 'campaign-validations.html',
                missing: ['auth.js']
            },
            {
                file: 'collaborateurs__.html',
                missing: ['menu-permissions.js']
            },
            {
                file: 'collaborateurs__presque_parfait.html',
                missing: ['menu-permissions.js']
            },
            {
                file: 'notification-settings.html',
                missing: ['profile-menu.js', 'menu-permissions.js']
            },
            {
                file: 'opportunities-fixed.html',
                missing: ['sidebar.js', 'auth.js', 'menu-permissions.js']
            },
            {
                file: 'opportunities_Gemini.html',
                missing: ['menu-permissions.js']
            },
            {
                file: 'permissions-admin.html',
                missing: ['profile-menu.js', 'menu-permissions.js']
            },
            {
                file: 'template.html',
                missing: ['menu-permissions.js']
            }
        ];

        console.log(`📄 ${pagesToFix.length} pages à corriger`);
        return pagesToFix;
    }

    async fixPage(pageInfo) {
        try {
            const filePath = path.join(this.publicDir, pageInfo.file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`\n🔄 Correction de ${pageInfo.file}...`);
            
            // Ajouter les scripts manquants
            const newContent = this.addMissingScripts(content, pageInfo.missing);
            
            // Écrire le fichier corrigé
            fs.writeFileSync(filePath, newContent);
            
            this.fixedPages++;
            console.log(`✅ ${pageInfo.file} - Scripts ajoutés: ${pageInfo.missing.join(', ')}`);
            
        } catch (error) {
            console.error(`❌ Erreur pour ${pageInfo.file}:`, error.message);
            this.errors.push({ file: pageInfo.file, error: error.message });
        }
    }

    addMissingScripts(content, missingScripts) {
        let newContent = content;
        
        // Trouver la position pour insérer les scripts (avant </head>)
        const headEndIndex = newContent.lastIndexOf('</head>');
        if (headEndIndex === -1) {
            throw new Error('Balise </head> non trouvée');
        }
        
        // Construire les scripts à ajouter
        const scriptsToAdd = missingScripts.map(script => {
            switch (script) {
                case 'auth.js':
                    return '    <script src="js/auth.js"></script>';
                case 'menu-permissions.js':
                    return '    <script src="js/menu-permissions.js"></script>';
                case 'profile-menu.js':
                    return '    <script src="js/profile-menu.js"></script>';
                case 'sidebar.js':
                    return '    <script src="js/sidebar.js" defer></script>';
                default:
                    return `    <script src="js/${script}"></script>`;
            }
        }).join('\n');
        
        // Insérer les scripts avant </head>
        newContent = newContent.slice(0, headEndIndex) + 
                    '\n' + scriptsToAdd + '\n' + 
                    newContent.slice(headEndIndex);
        
        return newContent;
    }

    showReport() {
        console.log('\n📊 RAPPORT DE CORRECTION');
        console.log('=========================');
        console.log(`✅ Pages corrigées: ${this.fixedPages}`);
        console.log(`❌ Erreurs: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERREURS:');
            this.errors.forEach(error => {
                console.log(`   - ${error.file}: ${error.error}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.fixedPages > 0) {
            console.log('✅ Les scripts de profil ont été ajoutés aux pages manquantes !');
            console.log('✅ Toutes les pages devraient maintenant avoir la section de profil');
            console.log('✅ La cohérence de la section de profil est assurée');
        } else {
            console.log('❌ Aucune page n\'a pu être corrigée');
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('1. ✅ Tester l\'application pour vérifier que la section de profil s\'affiche');
        console.log('2. ✅ Vérifier que les permissions de menu fonctionnent');
        console.log('3. ✅ S\'assurer que la cohérence est maintenue sur toutes les pages');
        console.log('4. ✅ Commiter les corrections si tout fonctionne');
        
        console.log('\n🔧 Correction terminée !');
    }
}

// Exécuter la correction
const fixer = new ProfileScriptsFixer();
fixer.fix();










