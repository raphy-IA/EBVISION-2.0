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
        
        // Appliquer les permissions par section
        this.applySectionPermissions();
        
        // Appliquer les permissions granulaires pour les liens individuels
        this.applyGranularLinkPermissions();
    }

    applySectionPermissions() {
        console.log('🎯 Application des permissions de section...');
        
        // Mappings permission -> texte de la section
        const sectionMappings = {
            'menu.dashboard': 'DASHBOARD',
            'menu.reports': 'RAPPORTS',
            'menu.time_entries': 'GESTION DES TEMPS',
            'menu.missions': 'GESTION MISSION',
            'menu.opportunities': 'MARKET PIPELINE',
            'menu.collaborateurs': 'GESTION RH',
            'menu.settings': 'CONFIGURATIONS',
            'menu.business_units': 'BUSINESS UNIT',
            'menu.users': 'PARAMÈTRES ADMINISTRATION'
        };

        // Parcourir toutes les sections de la sidebar
        const sections = document.querySelectorAll('.sidebar-section');
        console.log(`📊 Nombre de sections trouvées: ${sections.length}`);
        
        sections.forEach((section, index) => {
            const titleElement = section.querySelector('.sidebar-section-title');
            if (titleElement) {
                const sectionText = titleElement.textContent.trim();
                console.log(`🔍 Section ${index + 1}: "${sectionText}"`);
                
                // Trouver la permission correspondante
                const permission = Object.entries(sectionMappings).find(([perm, text]) => 
                    sectionText.includes(text)
                );
                
                if (permission) {
                    const hasPerm = this.hasPermission(permission[0]);
                    console.log(`  - Permission requise: ${permission[0]} (accordée: ${hasPerm})`);
                    
                    if (!hasPerm) {
                        section.style.display = 'none';
                        console.log(`🚫 Section masquée: ${sectionText} (permission: ${permission[0]})`);
                    } else {
                        console.log(`✅ Section visible: ${sectionText} (permission: ${permission[0]})`);
                    }
                } else {
                    console.log(`⚠️ Aucune permission trouvée pour la section: ${sectionText}`);
                }
            }
        });
    }

    applyGranularLinkPermissions() {
        console.log('🔗 Application des permissions granulaires pour les liens...');
        
        // Mappings des permissions granulaires vers les sélecteurs de liens
        const linkPermissions = {
            // Dashboard
            'menu.dashboard.main': 'a[href="dashboard.html"]',
            'menu.dashboard.personal': 'a[href="dashboard-personal.html"]',
            'menu.dashboard.team': 'a[href="dashboard-team.html"]',
            'menu.dashboard.direction': 'a[href="dashboard-direction.html"]',
            'menu.dashboard.recovery': 'a[href="dashboard-recovery.html"]',
            'menu.dashboard.profitability': 'a[href="dashboard-profitability.html"]',
            'menu.dashboard.chargeability': 'a[href="dashboard-chargeability.html"]',
            'menu.dashboard.analytics': 'a[href="analytics.html"]',
            'menu.dashboard.optimized': 'a[href="dashboard-optimized.html"]',
            
            // Rapports
            'menu.reports.general': 'a[href="reports.html"]',
            'menu.reports.missions': 'a[href="reports-missions.html"]',
            'menu.reports.opportunities': 'a[href="reports-opportunities.html"]',
            'menu.reports.hr': 'a[href="reports-hr.html"]',
            'menu.reports.prospecting': 'a[href="reports-prospecting.html"]',
            
            // Gestion des Temps
            'menu.time_entries.input': 'a[href="time-sheet-modern.html"]',
            'menu.time_entries.approval': 'a[href="time-approval.html"]',
            
            // Gestion Mission
            'menu.missions.list': 'a[href="missions.html"]',
            'menu.missions.types': 'a[href="mission-types.html"]',
            'menu.missions.tasks': 'a[href="tasks.html"]',
            'menu.missions.invoices': 'a[href="invoices.html"]',
            
            // Market Pipeline
            'menu.opportunities.clients': 'a[href="clients.html"]',
            'menu.opportunities.list': 'a[href="opportunities.html"]',
            'menu.opportunities.types': 'a[href="opportunity-types.html"]',
            'menu.opportunities.campaigns': 'a[href="campaigns.html"]',
            'menu.opportunities.validations': 'a[href="campaign-validations.html"]',
            
            // Gestion RH
            'menu.collaborateurs.list': 'a[href="collaborateurs.html"]',
            'menu.collaborateurs.grades': 'a[href="grades.html"]',
            'menu.collaborateurs.positions': 'a[href="postes.html"]',
            
            // Configurations
            'menu.settings.fiscal_years': 'a[href="fiscal-years.html"]',
            'menu.settings.countries': 'a[href="pays.html"]',
            
            // Business Unit
            'menu.business_units.list': 'a[href="business-units.html"]',
            'menu.business_units.divisions': 'a[href="divisions.html"]',
            'menu.business_units.managers': 'a[href="managers.html"]',
            'menu.business_units.internal_activities': 'a[href="internal-activities.html"]',
            'menu.business_units.sectors': 'a[href="sectors.html"]',
            'menu.business_units.opportunity_config': 'a[href="opportunity-config.html"]',
            'menu.business_units.sources': 'a[href="sources.html"]',
            'menu.business_units.templates': 'a[href="templates.html"]',
            'menu.business_units.campaigns': 'a[href="bu-campaigns.html"]',
            'menu.business_units.campaign_validations': 'a[href="bu-campaign-validations.html"]',
            
            // Paramètres Administration
            'menu.users.notifications': 'a[href="notification-settings.html"]',
            'menu.users.list': 'a[href="users.html"]',
            'menu.users.permissions': 'a[href="permissions-admin.html"]'
        };

        // Appliquer les permissions pour chaque lien
        Object.entries(linkPermissions).forEach(([permissionCode, selector]) => {
            const hasPermission = this.hasPermission(permissionCode);
            console.log(`🔍 Vérification permission ${permissionCode}: ${hasPermission}`);
            
            if (!hasPermission) {
                this.hideMenuElement(selector);
                console.log(`🚫 Lien masqué: ${selector} (permission: ${permissionCode})`);
            } else {
                console.log(`✅ Lien visible: ${selector} (permission: ${permissionCode})`);
            }
        });

        // Permissions spéciales basées sur le texte du lien
        this.applyTextBasedPermissions();
    }

    applyTextBasedPermissions() {
        console.log('📝 Application des permissions basées sur le texte...');
        
        // Mappings permission -> texte du lien
        const textBasedPermissions = {
            'menu.dashboard.main': 'Dashboard',
            'menu.dashboard.personal': 'Dashboard Personnel',
            'menu.dashboard.team': 'Dashboard Équipe',
            'menu.dashboard.direction': 'Dashboard Direction',
            'menu.dashboard.recovery': 'Dashboard Recouvrement',
            'menu.dashboard.profitability': 'Dashboard Rentabilité',
            'menu.dashboard.chargeability': 'Dashboard Chargeabilité',
            'menu.dashboard.analytics': 'Analytics & Indicateurs',
            'menu.dashboard.optimized': 'Dashboard Optimisé',
            
            'menu.reports.general': 'Rapports généraux',
            'menu.reports.missions': 'Rapports missions',
            'menu.reports.opportunities': 'Rapports opportunités',
            'menu.reports.hr': 'Rapports RH',
            'menu.reports.prospecting': 'Rapports de prospection',
            
            'menu.time_entries.input': 'Saisie des temps',
            'menu.time_entries.approval': 'Validation des temps',
            
            'menu.missions.list': 'Missions',
            'menu.missions.types': 'Types de mission',
            'menu.missions.tasks': 'Tâches',
            'menu.missions.invoices': 'Factures et paiements',
            
            'menu.opportunities.clients': 'Clients et prospects',
            'menu.opportunities.list': 'Opportunités',
            'menu.opportunities.types': 'Types d\'opportunité',
            'menu.opportunities.campaigns': 'Campagnes de prospection',
            'menu.opportunities.validations': 'Validation des campagnes',
            
            'menu.collaborateurs.list': 'Collaborateurs',
            'menu.collaborateurs.grades': 'Grades',
            'menu.collaborateurs.positions': 'Postes',
            
            'menu.settings.fiscal_years': 'Années fiscales',
            'menu.settings.countries': 'Pays',
            
            'menu.business_units.list': 'Unités d\'affaires',
            'menu.business_units.divisions': 'Divisions',
            'menu.business_units.managers': 'Responsables BU/Division',
            'menu.business_units.internal_activities': 'Activités internes',
            'menu.business_units.sectors': 'Secteurs d\'activité',
            'menu.business_units.opportunity_config': 'Configuration types d\'opportunité',
            'menu.business_units.sources': 'Sources & Entreprises',
            'menu.business_units.templates': 'Modèles de prospection',
            'menu.business_units.campaigns': 'Campagnes de prospection',
            'menu.business_units.campaign_validations': 'Validations de campagnes',
            
            'menu.users.notifications': 'Configuration notifications',
            'menu.users.list': 'Utilisateurs',
            'menu.users.permissions': 'Administration des Permissions'
        };

        // Parcourir tous les liens de la sidebar
        const allLinks = document.querySelectorAll('.sidebar-section a');
        console.log(`🔗 Nombre de liens trouvés: ${allLinks.length}`);
        
        allLinks.forEach((link, index) => {
            const linkText = link.textContent.trim();
            console.log(`🔍 Lien ${index + 1}: "${linkText}"`);
            
            // Trouver la permission correspondante
            const permission = Object.entries(textBasedPermissions).find(([perm, text]) => 
                linkText.includes(text)
            );
            
            if (permission) {
                const hasPerm = this.hasPermission(permission[0]);
                console.log(`  - Permission requise: ${permission[0]} (accordée: ${hasPerm})`);
                
                if (!hasPerm) {
                    link.style.display = 'none';
                    console.log(`🚫 Lien masqué: ${linkText} (permission: ${permission[0]})`);
                } else {
                    console.log(`✅ Lien visible: ${linkText} (permission: ${permission[0]})`);
                }
            } else {
                console.log(`⚠️ Aucune permission trouvée pour le lien: ${linkText}`);
            }
        });
    }

    hideMenuElement(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        } catch (error) {
            console.warn('⚠️ Sélecteur non supporté:', selector);
        }
    }

    // Méthode pour vérifier si une section de menu doit être visible
    isMenuSectionVisible(sectionTitle) {
        const sectionPermissions = {
            'DASHBOARD': 'menu.dashboard',
            'RAPPORTS': 'menu.reports',
            'GESTION DES TEMPS': 'menu.time_entries',
            'GESTION MISSION': 'menu.missions',
            'MARKET PIPELINE': 'menu.opportunities',
            'GESTION RH': 'menu.collaborateurs',
            'CONFIGURATIONS': 'menu.settings',
            'BUSINESS UNIT': 'menu.business_units',
            'PARAMÈTRES ADMINISTRATION': 'menu.users'
        };

        const permission = sectionPermissions[sectionTitle];
        return permission ? this.hasPermission(permission) : true;
    }

    // Méthode pour vérifier si un lien spécifique doit être visible
    isMenuLinkVisible(linkText) {
        const linkPermissions = {
            'Dashboard': 'menu.dashboard.main',
            'Dashboard Personnel': 'menu.dashboard.personal',
            'Dashboard Équipe': 'menu.dashboard.team',
            'Dashboard Direction': 'menu.dashboard.direction',
            'Dashboard Recouvrement': 'menu.dashboard.recovery',
            'Dashboard Rentabilité': 'menu.dashboard.profitability',
            'Dashboard Chargeabilité': 'menu.dashboard.chargeability',
            'Analytics & Indicateurs': 'menu.dashboard.analytics',
            'Dashboard Optimisé': 'menu.dashboard.optimized',
            
            'Rapports généraux': 'menu.reports.general',
            'Rapports missions': 'menu.reports.missions',
            'Rapports opportunités': 'menu.reports.opportunities',
            'Rapports RH': 'menu.reports.hr',
            'Rapports de prospection': 'menu.reports.prospecting',
            
            'Saisie des temps': 'menu.time_entries.input',
            'Validation des temps': 'menu.time_entries.approval',
            
            'Missions': 'menu.missions.list',
            'Types de mission': 'menu.missions.types',
            'Tâches': 'menu.missions.tasks',
            'Factures et paiements': 'menu.missions.invoices',
            
            'Clients et prospects': 'menu.opportunities.clients',
            'Opportunités': 'menu.opportunities.list',
            'Types d\'opportunité': 'menu.opportunities.types',
            'Campagnes de prospection': 'menu.opportunities.campaigns',
            'Validation des campagnes': 'menu.opportunities.validations',
            
            'Collaborateurs': 'menu.collaborateurs.list',
            'Grades': 'menu.collaborateurs.grades',
            'Postes': 'menu.collaborateurs.positions',
            
            'Années fiscales': 'menu.settings.fiscal_years',
            'Pays': 'menu.settings.countries',
            
            'Unités d\'affaires': 'menu.business_units.list',
            'Divisions': 'menu.business_units.divisions',
            'Responsables BU/Division': 'menu.business_units.managers',
            'Activités internes': 'menu.business_units.internal_activities',
            'Secteurs d\'activité': 'menu.business_units.sectors',
            'Configuration types d\'opportunité': 'menu.business_units.opportunity_config',
            'Sources & Entreprises': 'menu.business_units.sources',
            'Modèles de prospection': 'menu.business_units.templates',
            'Campagnes de prospection': 'menu.business_units.campaigns',
            'Validations de campagnes': 'menu.business_units.campaign_validations',
            
            'Configuration notifications': 'menu.users.notifications',
            'Utilisateurs': 'menu.users.list',
            'Administration des Permissions': 'menu.users.permissions'
        };

        const permission = linkPermissions[linkText];
        return permission ? this.hasPermission(permission) : true;
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
function hasMenuLinkPermission(linkText) {
    return menuPermissionsManager ? menuPermissionsManager.isMenuLinkVisible(linkText) : true;
}

// Fonction pour rafraîchir les permissions
async function refreshMenuPermissions() {
    if (menuPermissionsManager) {
        await menuPermissionsManager.refreshPermissions();
    }
}
