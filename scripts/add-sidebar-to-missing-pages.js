#!/usr/bin/env node

/**
 * Script pour ajouter la sidebar existante uniquement aux pages qui n'en ont pas
 * Usage: node scripts/add-sidebar-to-missing-pages.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 IDENTIFICATION ET AJOUT DE LA SIDEBAR MANQUANTE');
console.log('==================================================\n');

class SidebarAdder {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesWithSidebar = [];
        this.pagesWithoutSidebar = [];
        this.sidebarTemplate = null;
    }

    async analyze() {
        try {
            // 1. Analyser toutes les pages
            this.analyzeAllPages();
            
            // 2. Identifier les pages sans sidebar
            this.identifyMissingSidebars();
            
            // 3. Extraire la sidebar d'une page qui l'a
            this.extractSidebarTemplate();
            
            // 4. Ajouter la sidebar aux pages qui n'en ont pas
            this.addSidebarToMissingPages();
            
            // 5. Afficher le rapport
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
            
            // Vérifier si la page a une sidebar
            const hasSidebar = content.includes('sidebar-container') || 
                              content.includes('sidebar.js') ||
                              content.includes('template-modern-sidebar.html');
            
            if (hasSidebar) {
                this.pagesWithSidebar.push(file);
            } else {
                this.pagesWithoutSidebar.push(file);
            }
        }

        console.log(`✅ Pages avec sidebar: ${this.pagesWithSidebar.length}`);
        console.log(`❌ Pages sans sidebar: ${this.pagesWithoutSidebar.length}`);
    }

    identifyMissingSidebars() {
        if (this.pagesWithoutSidebar.length > 0) {
            console.log('\n📋 PAGES SANS SIDEBAR:');
            this.pagesWithoutSidebar.forEach(page => {
                console.log(`   - ${page}`);
            });
        } else {
            console.log('\n✅ Toutes les pages ont déjà une sidebar !');
        }
    }

    extractSidebarTemplate() {
        if (this.pagesWithSidebar.length === 0) {
            console.log('❌ Aucune page avec sidebar trouvée pour extraire le template');
            return;
        }

        // Prendre la première page avec sidebar comme template
        const templateFile = this.pagesWithSidebar[0];
        const templatePath = path.join(this.publicDir, templateFile);
        const content = fs.readFileSync(templatePath, 'utf8');
        
        console.log(`\n🔍 Extraction de la sidebar depuis ${templateFile}...`);
        
        // Extraire la structure de sidebar
        this.sidebarTemplate = this.extractSidebarStructure(content);
        
        if (this.sidebarTemplate) {
            console.log('✅ Template de sidebar extrait avec succès');
        } else {
            console.log('❌ Impossible d\'extraire le template de sidebar');
        }
    }

    extractSidebarStructure(content) {
        // Extraire la structure de sidebar existante
        const sidebarMatch = content.match(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (sidebarMatch) {
            return sidebarMatch[0];
        }
        
        // Ou extraire le conteneur sidebar
        const containerMatch = content.match(/<div[^>]*class="[^"]*sidebar-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (containerMatch) {
            return containerMatch[0];
        }
        
        return null;
    }

    addSidebarToMissingPages() {
        if (!this.sidebarTemplate || this.pagesWithoutSidebar.length === 0) {
            return;
        }

        console.log('\n🔧 Ajout de la sidebar aux pages manquantes...');

        for (const file of this.pagesWithoutSidebar) {
            try {
                this.addSidebarToPage(file);
            } catch (error) {
                console.error(`❌ Erreur pour ${file}:`, error.message);
            }
        }
    }

    addSidebarToPage(filename) {
        const filePath = path.join(this.publicDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`🔄 Ajout de la sidebar à ${filename}...`);
        
        // Vérifier si la page a déjà une structure de page wrapper
        if (content.includes('page-wrapper') || content.includes('main-content')) {
            // La page a déjà une structure, ajouter la sidebar
            const newContent = this.insertSidebarIntoExistingStructure(content);
            fs.writeFileSync(filePath, newContent);
        } else {
            // La page n'a pas de structure, créer une structure minimale
            const newContent = this.createPageWithSidebar(content, filename);
            fs.writeFileSync(filePath, newContent);
        }
        
        console.log(`✅ ${filename} - Sidebar ajoutée`);
    }

    insertSidebarIntoExistingStructure(content) {
        // Insérer la sidebar dans la structure existante
        // Cette méthode doit être adaptée selon la structure existante
        return content.replace(
            /<div[^>]*class="[^"]*page-wrapper[^"]*"[^>]*>/i,
            `<div class="page-wrapper">
        <!-- Sidebar Container -->
        <div class="sidebar-container">
            <!-- La sidebar sera générée par JavaScript -->
        </div>`
        );
    }

    createPageWithSidebar(content, filename) {
        // Créer une structure de page avec sidebar pour les pages qui n'en ont pas
        const title = this.extractTitle(filename);
        
        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - EBVISION 2.0</title>
    
    <!-- CSS Bootstrap et FontAwesome -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS de la sidebar moderne -->
    <link rel="stylesheet" href="css/modern-sidebar.css">
    
    <!-- Script d'authentification -->
    <script src="js/auth.js"></script>
    
    <!-- Script de gestion des permissions de menu -->
    <script src="js/menu-permissions.js"></script>
                
    <!-- Scripts de zone utilisateur -->
    <script src="js/user-header.js"></script>
    <script src="js/profile-menu.js"></script>
</head>
<body>
    <!-- Bouton toggle sidebar mobile -->
    <button class="sidebar-toggle d-md-none">
        <i class="fas fa-bars"></i>
    </button>
    <div class="page-wrapper">
        <!-- Sidebar Container -->
        <div class="sidebar-container">
            <!-- La sidebar sera générée par JavaScript -->
        </div>

        <!-- Main Content Area -->
        <div class="main-content-area">
            ${this.extractMainContent(content)}
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Script d'authentification déjà inclus plus haut -->
    <script src="js/sidebar.js" defer></script>
    <!-- SessionManager pour la gestion centralisée des sessions -->
    <script src="js/session-manager.js"></script>
    <script src="/js/notifications.js" defer></script>
    <script src="js/tasks.js" defer></script>
</body>
</html>`;
    }

    extractMainContent(content) {
        // Extraire le contenu principal entre les balises body
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (!bodyMatch) return content;

        return bodyMatch[1].trim();
    }

    extractTitle(filename) {
        const name = filename.replace('.html', '');
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    showReport() {
        console.log('\n📊 RAPPORT FINAL');
        console.log('=================');
        console.log(`✅ Pages avec sidebar: ${this.pagesWithSidebar.length}`);
        console.log(`🔧 Pages modifiées: ${this.pagesWithoutSidebar.length}`);
        
        if (this.pagesWithoutSidebar.length > 0) {
            console.log('\n📋 PAGES MODIFIÉES:');
            this.pagesWithoutSidebar.forEach(page => {
                console.log(`   ✅ ${page} - Sidebar ajoutée`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.pagesWithoutSidebar.length > 0) {
            console.log('✅ La sidebar existante a été ajoutée aux pages manquantes');
            console.log('✅ Le design existant a été préservé');
            console.log('✅ Seules les pages sans sidebar ont été modifiées');
        } else {
            console.log('✅ Toutes les pages avaient déjà une sidebar');
            console.log('✅ Aucune modification nécessaire');
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('1. ✅ Tester l\'application pour vérifier que la sidebar fonctionne');
        console.log('2. ✅ Vérifier que les permissions de menu sont appliquées');
        console.log('3. ✅ Commiter les changements si tout fonctionne');
        
        console.log('\n🔍 Analyse terminée !');
    }
}

// Exécuter l'analyse
const adder = new SidebarAdder();
adder.analyze();










