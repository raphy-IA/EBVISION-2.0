/**
 * Gestionnaire des permissions de pages côté client
 * Vérifie les permissions avant d'afficher les pages
 */

class PagePermissionsManager {
    constructor() {
        this.permissions = new Map();
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            await this.loadUserPermissions();
            this.initialized = true;
            console.log('✅ PagePermissionsManager initialisé');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de PagePermissionsManager:', error);
        }
    }

    /**
     * Charger les permissions de l'utilisateur
     */
    async loadUserPermissions() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Token d\'authentification manquant');
            }

            const response = await fetch('/api/page-permissions/check-page-permission', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pageName: 'test' })
            });

            if (response.ok) {
                console.log('✅ Permissions utilisateur chargées');
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des permissions:', error);
        }
    }

    /**
     * Vérifier si l'utilisateur peut accéder à une page
     */
    async canAccessPage(pageName) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return false;
            }

            const response = await fetch('/api/page-permissions/check-page-permission', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pageName })
            });

            if (response.ok) {
                const result = await response.json();
                return result.success;
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des permissions:', error);
            return false;
        }
    }

    /**
     * Rediriger vers une page d'erreur si l'accès est refusé
     */
    redirectToAccessDenied(reason = 'Accès non autorisé') {
        // Créer une page d'erreur temporaire
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <i class="fas fa-ban fa-3x text-danger mb-3"></i>
                                <h3 class="card-title">Accès Refusé</h3>
                                <p class="card-text">${reason}</p>
                                <p class="text-muted">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                                <button class="btn btn-primary" onclick="window.history.back()">
                                    <i class="fas fa-arrow-left me-2"></i>Retour
                                </button>
                                <button class="btn btn-secondary ms-2" onclick="window.location.href='/dashboard.html'">
                                    <i class="fas fa-home me-2"></i>Tableau de bord
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Masquer les éléments selon les permissions
     */
    hideUnauthorizedElements() {
        // Masquer les boutons selon les rôles
        const userRole = this.getCurrentUserRole();

        // SUPER_ADMIN peut voir tous les éléments
        if (userRole === 'SUPER_ADMIN') {
            console.log('✅ SUPER_ADMIN - Tous les éléments visibles');
            return;
        }

        // Boutons de génération de comptes utilisateur (ADMIN, ADMIN_IT seulement)
        if (!['ADMIN', 'ADMIN_IT'].includes(userRole)) {
            const generateAccountBtns = document.querySelectorAll('[onclick*="generateUserAccount"]');
            generateAccountBtns.forEach(btn => btn.style.display = 'none');
        }

        // Boutons de suppression (ADMIN seulement)
        if (userRole !== 'ADMIN') {
            const deleteBtns = document.querySelectorAll('[onclick*="delete"]');
            deleteBtns.forEach(btn => btn.style.display = 'none');
        }

        // Boutons de gestion RH (MANAGER et plus)
        if (!['MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN', 'ADMIN_IT'].includes(userRole)) {
            const rhBtns = document.querySelectorAll('[onclick*="gestionRH"]');
            rhBtns.forEach(btn => btn.style.display = 'none');
        }
    }

    /**
     * Obtenir le rôle de l'utilisateur actuel
     */
    getCurrentUserRole() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                // Support des rôles multiples
                if (user.roles && Array.isArray(user.roles)) {
                    // Si l'utilisateur a le rôle SUPER_ADMIN, le retourner en priorité
                    if (user.roles.includes('SUPER_ADMIN')) {
                        return 'SUPER_ADMIN';
                    }
                    // Sinon retourner le premier rôle
                    return user.roles[0] || 'USER';
                }
                // Fallback pour l'ancien système (compatibilité)
                return user.role || 'USER';
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du rôle utilisateur:', error);
        }
        return 'USER';
    }

    /**
     * Vérifier et protéger une page
     */
    async protectPage(pageName) {
        const canAccess = await this.canAccessPage(pageName);

        if (!canAccess) {
            this.redirectToAccessDenied(`Accès non autorisé à la page: ${pageName}`);
            return false;
        }

        // Masquer les éléments non autorisés
        this.hideUnauthorizedElements();
        return true;
    }
}

// Instance globale
window.pagePermissionsManager = new PagePermissionsManager();

/**
 * Fonction utilitaire pour vérifier les permissions d'une page
 */
async function checkPageAccess(pageName) {
    return await window.pagePermissionsManager.canAccessPage(pageName);
}

/**
 * Fonction utilitaire pour protéger une page
 */
async function protectPage(pageName) {
    return await window.pagePermissionsManager.protectPage(pageName);
}

/**
 * Fonction pour masquer les éléments non autorisés
 */
function hideUnauthorizedElements() {
    window.pagePermissionsManager.hideUnauthorizedElements();
}

// Auto-protection des pages sensibles
document.addEventListener('DOMContentLoaded', async function () {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    // Vérifier le rôle de l'utilisateur
    const userRole = window.pagePermissionsManager.getCurrentUserRole();

    // SUPER_ADMIN a accès à toutes les pages
    if (userRole === 'SUPER_ADMIN') {
        console.log(`✅ SUPER_ADMIN - Accès total à toutes les pages`);
        hideUnauthorizedElements();
        return;
    }

    // Liste des pages sensibles qui doivent être protégées par permissions
    // IMPORTANT: Les pages listées ici seront vérifiées via l'API backend
    const sensitivePages = [
        // Administration
        'users', 'permissions-admin', 'collaborateurs',

        // Dashboards (tous)
        'dashboard-direction', 'dashboard-rentabilite', 'dashboard-recouvrement',
        'dashboard-personnel', 'dashboard-equipe', 'dashboard-chargeabilite',
        'dashboard-optimise', 'analytics',

        // Finances
        'invoices', 'invoice-details', 'taux-horaires', 'financial-settings',

        // Missions et Projets
        'missions', 'mission-details', 'mission-types',
        'create-mission-step0', 'create-mission-step1', 'create-mission-step2',
        'create-mission-step3', 'create-mission-step4', 'edit-mission-planning',

        // Reports et Analytics
        'reports', 'time-reports',

        // RH et Évaluations
        'evaluations-dashboard', 'evaluations-campaigns', 'evaluation-form',
        'evaluation-view', 'performance-reviews',

        // Configuration
        'business-units', 'divisions', 'grades', 'postes', 'secteurs',
        'fiscal-years', 'objectives-config', 'objectives-management',
        'notification-settings',

        // Opportunities et Campagnes
        'opportunities', 'opportunities-new', 'opportun ities-fixed',
        'campaign-execution', 'campaign-validations'
    ];

    if (sensitivePages.includes(currentPage)) {
        console.log(`🔒 Protection de la page: ${currentPage}`);
        const hasAccess = await protectPage(currentPage);

        if (!hasAccess) {
            console.log(`❌ Accès refusé à la page: ${currentPage}`);
            return;
        }

        console.log(`✅ Accès autorisé à la page: ${currentPage}`);
    } else {
        // Pour les pages non sensibles, juste masquer les éléments non autorisés
        hideUnauthorizedElements();
    }
});
