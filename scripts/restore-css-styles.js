#!/usr/bin/env node

/**
 * Script de récupération des styles CSS - Restaure les styles personnalisés tout en gardant le layout unifié
 * Usage: node scripts/restore-css-styles.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 RÉCUPÉRATION DES STYLES CSS');
console.log('==============================\n');

class CSSStyleRestorer {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.restoredPages = 0;
        this.errors = [];
    }

    async restore() {
        try {
            // 1. Identifier toutes les sauvegardes
            const backupFiles = this.getBackupFiles();
            
            console.log(`📁 ${backupFiles.length} sauvegardes trouvées`);
            
            // 2. Restaurer les styles pour chaque page
            for (const backupFile of backupFiles) {
                await this.restorePageStyles(backupFile);
            }
            
            // 3. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la récupération:', error);
        }
    }

    getBackupFiles() {
        const files = fs.readdirSync(this.publicDir);
        return files.filter(file => file.includes('.backup.'));
    }

    async restorePageStyles(backupFile) {
        try {
            const originalFile = backupFile.replace(/\.backup\.\d+$/, '');
            const backupPath = path.join(this.publicDir, backupFile);
            const originalPath = path.join(this.publicDir, originalFile);
            
            console.log(`\n🔄 Récupération des styles pour ${originalFile}...`);
            
            // Lire la sauvegarde (styles originaux)
            const backupContent = fs.readFileSync(backupPath, 'utf8');
            
            // Lire le fichier actuel (layout unifié)
            const currentContent = fs.readFileSync(originalPath, 'utf8');
            
            // Extraire les styles de la sauvegarde
            const originalStyles = this.extractStyles(backupContent);
            const originalScripts = this.extractScripts(backupContent);
            
            // Extraire le contenu principal de la sauvegarde
            const originalMainContent = this.extractMainContent(backupContent);
            
            // Reconstruire le fichier avec layout unifié + styles originaux
            const restoredContent = this.buildRestoredContent(
                originalFile, 
                originalStyles, 
                originalScripts, 
                originalMainContent
            );
            
            // Écrire le fichier restauré
            fs.writeFileSync(originalPath, restoredContent);
            
            this.restoredPages++;
            console.log(`✅ ${originalFile} - Styles restaurés avec succès`);
            
        } catch (error) {
            console.error(`❌ Erreur pour ${backupFile}:`, error.message);
            this.errors.push({ file: backupFile, error: error.message });
        }
    }

    extractStyles(content) {
        // Extraire tous les styles (inline et externes)
        const styles = [];
        
        // Styles inline
        const inlineStyleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (inlineStyleMatches) {
            inlineStyleMatches.forEach(style => {
                const cleanStyle = style.replace(/<style[^>]*>|<\/style>/gi, '').trim();
                if (cleanStyle) {
                    styles.push(cleanStyle);
                }
            });
        }
        
        // Liens CSS externes (sauf Bootstrap et FontAwesome)
        const cssLinkMatches = content.match(/<link[^>]*rel="stylesheet"[^>]*>/gi);
        if (cssLinkMatches) {
            cssLinkMatches.forEach(link => {
                if (!link.includes('bootstrap') && !link.includes('font-awesome')) {
                    styles.push(link);
                }
            });
        }
        
        return styles;
    }

    extractScripts(content) {
        // Extraire les scripts inline (pas les imports)
        const scripts = [];
        const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        
        if (scriptMatches) {
            scriptMatches.forEach(script => {
                if (!script.includes('src=')) {
                    const cleanScript = script.replace(/<script[^>]*>|<\/script>/gi, '').trim();
                    if (cleanScript) {
                        scripts.push(cleanScript);
                    }
                }
            });
        }
        
        return scripts;
    }

    extractMainContent(content) {
        // Extraire le contenu principal entre les balises body
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (!bodyMatch) return '';

        let bodyContent = bodyMatch[1];
        
        // Supprimer les éléments de sidebar et header existants pour éviter les doublons
        bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*user-header[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        bodyContent = bodyContent.replace(/<button[^>]*class="[^"]*sidebar-toggle[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
        
        return bodyContent.trim();
    }

    buildRestoredContent(filename, styles, scripts, mainContent) {
        const pageTitle = this.extractTitle(filename);
        
        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle} - EBVISION 2.0</title>
    
    <!-- CSS Bootstrap et FontAwesome -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS unifié pour la sidebar et le profil -->
    <link rel="stylesheet" href="css/unified-layout.css">
    
    <!-- CSS spécifiques à la page (restaurés) -->
    ${styles.map(style => {
        if (style.startsWith('<link')) {
            return `    ${style}`;
        } else {
            return `    <style>
        ${style}
    </style>`;
        }
    }).join('\n')}
    
    <!-- Scripts d'authentification et permissions -->
    <script src="js/auth.js"></script>
    <script src="js/menu-permissions.js"></script>
    <script src="js/user-header.js"></script>
    <script src="js/profile-menu.js"></script>
    
    <!-- Scripts de sidebar existants -->
    <script src="js/sidebar.js" defer></script>
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
                            <h1 class="page-title">${pageTitle}</h1>
                            <p class="page-subtitle">Gestion et administration</p>
                        </div>
                        <div class="col-auto">
                            <!-- Actions spécifiques à la page -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contenu principal de la page -->
            <div class="container-fluid">
                ${mainContent}
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
    
    <!-- Scripts spécifiques à la page (restaurés) -->
    ${scripts.map(script => `<script>
        ${script}
    </script>`).join('\n')}
</body>
</html>`;
    }

    extractTitle(filename) {
        const name = filename.replace('.html', '');
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    showReport() {
        console.log('\n📊 RAPPORT DE RÉCUPÉRATION');
        console.log('===========================');
        console.log(`✅ Pages restaurées: ${this.restoredPages}`);
        console.log(`❌ Erreurs: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERREURS:');
            this.errors.forEach(error => {
                console.log(`   - ${error.file}: ${error.error}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.restoredPages > 0) {
            console.log('✅ Les styles CSS ont été restaurés avec succès !');
            console.log('✅ Le layout unifié est préservé');
            console.log('✅ Les styles personnalisés de chaque page sont restaurés');
            console.log('✅ La sidebar et le profil utilisateur restent cohérents');
        } else {
            console.log('❌ Aucune page n\'a pu être restaurée');
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('1. ✅ Tester l\'application pour vérifier que les styles sont restaurés');
        console.log('2. ✅ Vérifier que la sidebar et le profil fonctionnent');
        console.log('3. ✅ Ajuster si nécessaire');
        console.log('4. ✅ Commiter les corrections');
        
        console.log('\n🔧 Récupération terminée !');
    }
}

// Exécuter la récupération
const restorer = new CSSStyleRestorer();
restorer.restore();

