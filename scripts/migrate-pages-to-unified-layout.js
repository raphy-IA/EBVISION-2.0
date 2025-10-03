#!/usr/bin/env node

/**
 * Script de migration pour convertir toutes les pages vers le layout unifié
 * Usage: node scripts/migrate-pages-to-unified-layout.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 MIGRATION VERS LE LAYOUT UNIFIÉ');
console.log('==================================\n');

class PageMigrator {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.pagesToMigrate = [];
        this.migratedPages = [];
        this.errors = [];
    }

    async migrate() {
        try {
            // 1. Identifier toutes les pages HTML
            this.identifyPages();
            
            // 2. Migrer chaque page
            for (const page of this.pagesToMigrate) {
                await this.migratePage(page);
            }
            
            // 3. Afficher le résumé
            this.showSummary();
            
        } catch (error) {
            console.error('❌ Erreur lors de la migration:', error);
        }
    }

    identifyPages() {
        console.log('🔍 Identification des pages à migrer...');
        
        const files = fs.readdirSync(this.publicDir);
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && 
            !file.startsWith('template-') && 
            !file.includes('backup') &&
            file !== 'login.html' &&
            file !== 'logout.html' &&
            file !== 'index.html'
        );

        this.pagesToMigrate = htmlFiles.map(file => ({
            filename: file,
            path: path.join(this.publicDir, file),
            title: this.extractTitle(file)
        }));

        console.log(`📄 ${this.pagesToMigrate.length} pages identifiées pour la migration`);
    }

    extractTitle(filename) {
        // Extraire un titre à partir du nom de fichier
        const name = filename.replace('.html', '');
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async migratePage(pageInfo) {
        try {
            console.log(`\n🔄 Migration de ${pageInfo.filename}...`);
            
            // Lire le contenu actuel
            const content = fs.readFileSync(pageInfo.path, 'utf8');
            
            // Analyser la structure actuelle
            const analysis = this.analyzePageStructure(content);
            
            // Générer le nouveau contenu
            const newContent = this.generateUnifiedContent(pageInfo, analysis);
            
            // Créer une sauvegarde
            this.createBackup(pageInfo.path);
            
            // Écrire le nouveau contenu
            fs.writeFileSync(pageInfo.path, newContent);
            
            this.migratedPages.push(pageInfo.filename);
            console.log(`✅ ${pageInfo.filename} migré avec succès`);
            
        } catch (error) {
            console.error(`❌ Erreur lors de la migration de ${pageInfo.filename}:`, error.message);
            this.errors.push({ page: pageInfo.filename, error: error.message });
        }
    }

    analyzePageStructure(content) {
        const analysis = {
            hasSidebar: content.includes('sidebar-container') || content.includes('sidebar'),
            hasUserHeader: content.includes('user-header') || content.includes('profile'),
            hasBootstrap: content.includes('bootstrap'),
            hasFontAwesome: content.includes('font-awesome'),
            hasCustomCSS: content.includes('<style>'),
            hasCustomJS: content.includes('<script>'),
            mainContent: this.extractMainContent(content),
            customStyles: this.extractCustomStyles(content),
            customScripts: this.extractCustomScripts(content),
            pageActions: this.extractPageActions(content)
        };

        return analysis;
    }

    extractMainContent(content) {
        // Extraire le contenu principal entre les balises body
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (!bodyMatch) return '';

        let bodyContent = bodyMatch[1];
        
        // Supprimer les éléments de sidebar et header existants
        bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*user-header[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        bodyContent = bodyContent.replace(/<button[^>]*class="[^"]*sidebar-toggle[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
        
        return bodyContent.trim();
    }

    extractCustomStyles(content) {
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (!styleMatch) return '';

        return styleMatch.map(style => style.trim()).join('\n\n');
    }

    extractCustomScripts(content) {
        const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        if (!scriptMatches) return '';

        // Filtrer les scripts qui ne sont pas des imports
        return scriptMatches
            .filter(script => !script.includes('src='))
            .map(script => script.trim())
            .join('\n\n');
    }

    extractPageActions(content) {
        // Extraire les boutons d'action spécifiques à la page
        const actionMatches = content.match(/<div[^>]*class="[^"]*page-actions[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
        if (!actionMatches) return '';

        return actionMatches.map(action => action.trim()).join('\n');
    }

    generateUnifiedContent(pageInfo, analysis) {
        const template = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageInfo.title} - EBVISION 2.0</title>
    
    <!-- CSS Bootstrap et FontAwesome -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS unifié pour la sidebar et le profil -->
    <link rel="stylesheet" href="css/unified-layout.css">
    
    <!-- Scripts d'authentification et permissions -->
    <script src="js/auth.js"></script>
    <script src="js/menu-permissions.js"></script>
    <script src="js/user-header.js"></script>
    <script src="js/profile-menu.js"></script>
    
    <!-- Scripts de sidebar existants -->
    <script src="js/sidebar.js" defer></script>
    
    ${analysis.customStyles ? `<!-- Styles spécifiques à la page -->
    <style>
        ${analysis.customStyles.replace(/<style[^>]*>|<\/style>/gi, '')}
    </style>` : ''}
    
    <!-- Scripts spécifiques à la page -->
    ${analysis.customScripts ? `<script>
        ${analysis.customScripts.replace(/<script[^>]*>|<\/script>/gi, '')}
    </script>` : ''}
</head>
<body>
    <!-- Zone de profil utilisateur (header) -->
    <div id="user-header-container">
        <!-- Le contenu sera chargé dynamiquement par user-header.js -->
    </div>

    <!-- Conteneur principal avec sidebar et contenu -->
    <div class="page-wrapper">
        <!-- Sidebar unifiée -->
        <div class="sidebar-container">
            <!-- Le contenu sera chargé dynamiquement par sidebar.js -->
        </div>

        <!-- Zone de contenu principal -->
        <div class="main-content-area">
            <!-- En-tête de page -->
            <div class="page-header">
                <div class="container-fluid">
                    <div class="row align-items-center">
                        <div class="col">
                            <h1 class="page-title">${pageInfo.title}</h1>
                            <p class="page-subtitle">Gestion et administration</p>
                        </div>
                        <div class="col-auto">
                            ${analysis.pageActions || ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contenu principal de la page -->
            <div class="container-fluid">
                ${analysis.mainContent}
            </div>
        </div>
    </div>

    <!-- Modales communes -->
    <div id="common-modals">
        <!-- Modales de profil utilisateur -->
        <div class="modal fade" id="profileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Profil Utilisateur</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <div class="profile-avatar-large">
                                <i class="fas fa-user"></i>
                            </div>
                            <h5 id="profile-name">Nom Utilisateur</h5>
                            <p id="profile-email" class="text-muted">email@example.com</p>
                        </div>
                        
                        <div class="list-group">
                            <a href="#" class="list-group-item list-group-item-action" id="profile-settings">
                                <i class="fas fa-cog me-2"></i>Paramètres du profil
                            </a>
                            <a href="#" class="list-group-item list-group-item-action" id="security-settings">
                                <i class="fas fa-shield-alt me-2"></i>Sécurité et 2FA
                            </a>
                            <a href="#" class="list-group-item list-group-item-action" id="notification-settings">
                                <i class="fas fa-bell me-2"></i>Notifications
                            </a>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        <button type="button" class="btn btn-danger" id="logout-btn">
                            <i class="fas fa-sign-out-alt me-1"></i>Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modale de changement de mot de passe -->
        <div class="modal fade" id="changePasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Changer le mot de passe</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="changePasswordForm">
                            <div class="mb-3">
                                <label for="currentPassword" class="form-label">Mot de passe actuel</label>
                                <input type="password" class="form-control" id="currentPassword" required>
                            </div>
                            <div class="mb-3">
                                <label for="newPassword" class="form-label">Nouveau mot de passe</label>
                                <input type="password" class="form-control" id="newPassword" required>
                                <div class="form-text">Minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux</div>
                            </div>
                            <div class="mb-3">
                                <label for="confirmPassword" class="form-label">Confirmer le nouveau mot de passe</label>
                                <input type="password" class="form-control" id="confirmPassword" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" id="savePasswordBtn">Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modale de configuration 2FA -->
        <div class="modal fade" id="twoFactorModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Authentification à deux facteurs (2FA)</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="2fa-status">
                            <!-- Le contenu sera chargé dynamiquement -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts Bootstrap -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Scripts unifiés -->
    <script src="js/unified-layout.js"></script>
    
    <!-- Scripts spécifiques à la page -->
    ${analysis.customScripts ? `<script>
        ${analysis.customScripts.replace(/<script[^>]*>|<\/script>/gi, '')}
    </script>` : ''}
</body>
</html>`;

        return template;
    }

    createBackup(filePath) {
        const backupPath = filePath + '.backup.' + Date.now();
        fs.copyFileSync(filePath, backupPath);
        console.log(`📁 Sauvegarde créée: ${path.basename(backupPath)}`);
    }

    showSummary() {
        console.log('\n📊 RÉSUMÉ DE LA MIGRATION');
        console.log('==========================');
        console.log(`✅ Pages migrées avec succès: ${this.migratedPages.length}`);
        console.log(`❌ Erreurs: ${this.errors.length}`);
        
        if (this.migratedPages.length > 0) {
            console.log('\n📄 Pages migrées:');
            this.migratedPages.forEach(page => {
                console.log(`   ✅ ${page}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ Erreurs:');
            this.errors.forEach(error => {
                console.log(`   ❌ ${error.page}: ${error.error}`);
            });
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('   1. Tester les pages migrées');
        console.log('   2. Vérifier que la sidebar et le profil sont cohérents');
        console.log('   3. Ajuster les styles si nécessaire');
        console.log('   4. Supprimer les sauvegardes une fois satisfait');
        
        console.log('\n🎉 Migration terminée !');
    }
}

// Exécuter la migration
const migrator = new PageMigrator();
migrator.migrate();
