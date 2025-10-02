// Gestionnaire des permissions de menu pour la sidebar
class MenuPermissionsManager {
    constructor() {
        this.userPermissions = [];
        this.init();
    }

    async init() {
        // Vérifier si l'utilisateur est SUPER_ADMIN
        const userRole = this.getUserRole();
        if (userRole === 'SUPER_ADMIN') {
            console.log('✅ SUPER_ADMIN détecté - Bypass complet du filtrage des menus');
            return; // Ne pas appliquer de filtrage pour SUPER_ADMIN
        }
        
        await this.loadUserPermissions();
        this.applyMenuPermissions();
    }

    getUserRole() {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            return userData.role || userData.principal_role || null;
        } catch (error) {
            console.error('Erreur lors de la récupération du rôle:', error);
            return null;
        }
    }

    async loadUserPermissions() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('⚠️ Aucun token d\'authentification trouvé');
                return;
            }

            console.log('🔍 Chargement des permissions utilisateur...');
            
            // Récupérer les permissions de l'utilisateur connecté
            const response = await authenticatedFetch('/api/permissions/users/me/permissions');
            if (response.ok) {
                const data = await response.json();
                this.userPermissions = data.permissions || [];
                console.log('🔐 Permissions utilisateur chargées:', this.userPermissions.length);
                console.log('📋 Permissions:', this.userPermissions.map(p => p.code));
            } else {
                console.error('❌ Erreur API lors du chargement des permissions:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des permissions:', error);
        }
    }

    hasPermission(permissionCode) {
        return this.userPermissions.some(perm => 
            perm.code === permissionCode && perm.granted === true
        );
    }

    applyMenuPermissions() {
        console.log('🎯 Application des permissions de menu granulaires...');
        
        // Appliquer les permissions par section (mode granulaire)
        // Une section est visible si l'utilisateur a AU MOINS UNE permission commençant par le préfixe de la section
        this.applySectionPermissions();
        
        // Appliquer les permissions granulaires pour les liens individuels
        // Utilise les attributs data-permission présents dans le HTML
        this.applyDataPermissionBasedPermissions();
    }

    applySectionPermissions() {
        console.log('🎯 Application des permissions de section (mode granulaire)...');
        
        // Mappings préfixe de permission -> texte de la section
        const sectionMappings = {
            'menu.dashboard': 'DASHBOARD',
            'menu.rapports': 'RAPPORTS',
            'menu.gestion_des_temps': 'GESTION DES TEMPS',
            'menu.gestion_mission': 'GESTION MISSION',
            'menu.market_pipeline': 'MARKET PIPELINE',
            'menu.gestion_rh': 'GESTION RH',
            'menu.configurations': 'CONFIGURATIONS',
            'menu.business_unit': 'BUSINESS UNIT',
            'menu.parametres_administration': 'PARAMÈTRES ADMINISTRATION'
        };

        // Parcourir toutes les sections de la sidebar
        const sections = document.querySelectorAll('.sidebar-section');
        console.log(`📊 Nombre de sections trouvées: ${sections.length}`);
        
        sections.forEach((section, index) => {
            const titleElement = section.querySelector('.sidebar-section-title');
            if (titleElement) {
                const sectionText = titleElement.textContent.trim();
                console.log(`🔍 Section ${index + 1}: "${sectionText}"`);
                
                // Trouver le préfixe de permission correspondant
                const permissionEntry = Object.entries(sectionMappings).find(([prefix, text]) => 
                    sectionText.includes(text)
                );
                
                if (permissionEntry) {
                    const [permissionPrefix, sectionName] = permissionEntry;
                    
                    // Vérifier si l'utilisateur a AU MOINS UNE permission commençant par ce préfixe
                    const hasAnyPermission = this.userPermissions.some(perm => 
                        perm.code.startsWith(permissionPrefix + '.')
                    );
                    
                    console.log(`  - Préfixe: ${permissionPrefix}.* (${hasAnyPermission ? '✅ accordé' : '❌ refusé'})`);
                    
                    if (!hasAnyPermission) {
                        section.style.display = 'none';
                        console.log(`🚫 Section masquée: ${sectionText} (aucune permission ${permissionPrefix}.*)`);
                    } else {
                        section.style.display = '';
                        console.log(`✅ Section visible: ${sectionText} (permissions ${permissionPrefix}.* trouvées)`);
                    }
                } else {
                    console.log(`⚠️ Aucun mapping trouvé pour la section: ${sectionText}`);
                }
            }
        });
    }

    /**
     * Applique les permissions basées sur les attributs data-permission des liens
     * Cette méthode utilise les vraies permissions de la base de données
     */
    applyDataPermissionBasedPermissions() {
        console.log('🔗 Application des permissions basées sur data-permission...');
        
        // Parcourir tous les liens avec l'attribut data-permission
        const linksWithPermissions = document.querySelectorAll('.sidebar-nav-link[data-permission]');
        console.log(`📊 Nombre de liens avec permissions trouvés: ${linksWithPermissions.length}`);
        
        linksWithPermissions.forEach((link, index) => {
            const permissionCode = link.getAttribute('data-permission');
            const linkText = link.textContent.trim();
            
            console.log(`🔍 Lien ${index + 1}: "${linkText}" (permission: ${permissionCode})`);
            
            // Vérifier si l'utilisateur a cette permission
            const hasPermission = this.hasPermission(permissionCode);
            
            if (!hasPermission) {
                link.style.display = 'none';
                console.log(`🚫 Lien masqué: ${linkText} (permission: ${permissionCode})`);
            } else {
                link.style.display = '';
                console.log(`✅ Lien visible: ${linkText} (permission: ${permissionCode})`);
            }
        });
        
        // Vérifier s'il reste des liens visibles dans chaque section
        this.checkEmptySections();
    }

    /**
     * Vérifie et masque les sections qui n'ont plus de liens visibles
     */
    checkEmptySections() {
        console.log('🔍 Vérification des sections vides...');
        
        const sections = document.querySelectorAll('.sidebar-section');
        sections.forEach((section, index) => {
            const visibleLinks = section.querySelectorAll('.sidebar-nav-link:not([style*="display: none"])');
            const sectionTitle = section.querySelector('.sidebar-section-title')?.textContent.trim();
            
            if (visibleLinks.length === 0 && sectionTitle) {
                console.log(`🚫 Section masquée car vide: ${sectionTitle}`);
                section.style.display = 'none';
            } else if (visibleLinks.length > 0 && sectionTitle) {
                console.log(`✅ Section visible avec ${visibleLinks.length} lien(s): ${sectionTitle}`);
                section.style.display = '';
            }
        });
    }



    /**
     * Vérifie si un lien de menu spécifique doit être visible
     * @param {string} permissionCode - Code de permission à vérifier
     * @returns {boolean} - true si l'utilisateur a la permission
     */
    isMenuLinkVisible(permissionCode) {
        return this.hasPermission(permissionCode);
    }

    // Méthode pour rafraîchir les permissions (utile après changement de rôle)
    async refreshPermissions() {
        await this.loadUserPermissions();
        this.applyMenuPermissions();
    }
}

// Initialisation globale
let menuPermissionsManager;

// Fonction d'initialisation qui attend que la sidebar soit chargée
function initializeMenuPermissions() {
    // Attendre que la sidebar soit chargée
    const checkSidebar = setInterval(() => {
        const sidebarSections = document.querySelectorAll('.sidebar-section');
        if (sidebarSections.length > 0) {
            clearInterval(checkSidebar);
            console.log('🚀 Initialisation du gestionnaire de permissions de menu granulaires...');
            menuPermissionsManager = new MenuPermissionsManager();
        }
    }, 100);

    // Timeout de sécurité (5 secondes)
    setTimeout(() => {
        clearInterval(checkSidebar);
        if (!menuPermissionsManager) {
            console.warn('⚠️ Timeout: Sidebar non trouvée, initialisation forcée du gestionnaire de permissions');
            menuPermissionsManager = new MenuPermissionsManager();
        }
    }, 5000);
}

// Initialiser dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', initializeMenuPermissions);

// Réinitialiser si la sidebar est rechargée dynamiquement
window.addEventListener('sidebarLoaded', () => {
    console.log('🔄 Réinitialisation du gestionnaire de permissions après rechargement de la sidebar');
    if (menuPermissionsManager) {
        menuPermissionsManager.refreshPermissions();
    } else {
        initializeMenuPermissions();
    }
});

// Fonction globale pour vérifier les permissions de menu
function hasMenuPermission(permissionCode) {
    return menuPermissionsManager ? menuPermissionsManager.hasPermission(permissionCode) : false;
}

// Fonction pour vérifier les permissions de lien spécifique
function hasMenuLinkPermission(permissionCode) {
    return menuPermissionsManager ? menuPermissionsManager.isMenuLinkVisible(permissionCode) : true;
}

// Fonction pour rafraîchir les permissions
async function refreshMenuPermissions() {
    if (menuPermissionsManager) {
        await menuPermissionsManager.refreshPermissions();
    }
}
