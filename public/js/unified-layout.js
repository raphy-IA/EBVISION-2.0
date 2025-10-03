/**
 * Script unifié pour la gestion de la sidebar et du profil utilisateur
 * EBVISION 2.0 - S'intègre avec le système de permissions existant
 */

class UnifiedLayoutManager {
    constructor() {
        this.currentUser = null;
        this.userPermissions = [];
        this.isInitialized = false;
        this.menuPermissionsManager = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🔧 Initialisation du layout unifié...');
            
            // Attendre que l'authentification soit prête
            await this.waitForAuth();
            
            // Charger les informations utilisateur
            await this.loadUserInfo();
            
            // Initialiser le gestionnaire de permissions de menu existant
            await this.initializeMenuPermissions();
            
            // Générer le header utilisateur unifié
            await this.generateUserHeader();
            
            // Configurer les événements
            this.setupEventListeners();
            
            // Marquer comme initialisé
            this.isInitialized = true;
            
            console.log('✅ Layout unifié initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du layout unifié:', error);
        }
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (typeof AuthManager !== 'undefined' && AuthManager.isAuthenticated()) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    async loadUserInfo() {
        try {
            const token = localStorage.getItem('authToken') || this.getCookie('authToken');
            if (!token) {
                throw new Error('Token d\'authentification manquant');
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des informations utilisateur');
            }

            const data = await response.json();
            this.currentUser = data.user;
            this.userPermissions = data.permissions || [];
            
            console.log('👤 Informations utilisateur chargées:', this.currentUser);
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des informations utilisateur:', error);
            // Rediriger vers la page de connexion
            window.location.href = '/login.html';
        }
    }

    async initializeMenuPermissions() {
        try {
            // Attendre que le système de sidebar existant soit chargé
            await this.waitForSidebarLoad();
            
            // Initialiser le gestionnaire de permissions de menu existant
            if (typeof MenuPermissionsManager !== 'undefined') {
                this.menuPermissionsManager = new MenuPermissionsManager();
                console.log('✅ Gestionnaire de permissions de menu initialisé');
            } else {
                console.warn('⚠️ MenuPermissionsManager non trouvé - permissions de menu non appliquées');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des permissions de menu:', error);
        }
    }

    async waitForSidebarLoad() {
        return new Promise((resolve) => {
            const checkSidebar = () => {
                const sidebarContainer = document.querySelector('.sidebar-container');
                if (sidebarContainer && sidebarContainer.innerHTML.trim() !== '') {
                    resolve();
                } else {
                    setTimeout(checkSidebar, 100);
                }
            };
            checkSidebar();
        });
    }

    // Les méthodes de génération de sidebar sont supprimées car nous utilisons le système existant

    async generateUserHeader() {
        const headerContainer = document.getElementById('user-header-container');
        if (!headerContainer) {
            console.error('❌ Conteneur header utilisateur non trouvé');
            return;
        }

        const headerHTML = this.createUserHeaderHTML();
        headerContainer.innerHTML = headerHTML;
        
        console.log('👤 Header utilisateur généré avec succès');
    }

    createUserHeaderHTML() {
        const user = this.currentUser;
        if (!user) {
            return '<div class="text-center text-white">Chargement...</div>';
        }

        return `
            <div class="user-header-left">
                <a href="/dashboard.html" class="app-logo">
                    <i class="fas fa-chart-line"></i>
                    EBVISION 2.0
                </a>
            </div>
            
            <div class="user-header-right">
                <button class="notification-badge" id="notificationBtn" title="Notifications">
                    <i class="fas fa-bell"></i>
                    <span class="badge" id="notificationCount" style="display: none;">0</span>
                </button>
                
                <button class="user-profile-toggle" id="userProfileToggle">
                    <div class="profile-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <div class="user-name">${user.nom} ${user.prenom}</div>
                        <div class="user-role">${user.role || 'Utilisateur'}</div>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Toggle sidebar sur mobile
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar-container');
                sidebar.classList.toggle('show');
            });
        }

        // Toggle profil utilisateur
        const profileToggle = document.getElementById('userProfileToggle');
        if (profileToggle) {
            profileToggle.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('profileModal'));
                modal.show();
            });
        }

        // Gestion de la déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Gestion du changement de mot de passe
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
                modal.show();
            });
        }

        // Gestion du formulaire de changement de mot de passe
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // Fermer la sidebar en cliquant à l'extérieur sur mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar-container');
            const sidebarToggle = document.querySelector('.sidebar-toggle');
            
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !sidebarToggle?.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Nettoyer le localStorage
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                
                // Rediriger vers la page de connexion
                window.location.href = '/login.html';
            } else {
                throw new Error('Erreur lors de la déconnexion');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion:', error);
            alert('Erreur lors de la déconnexion. Veuillez réessayer.');
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken') || this.getCookie('authToken');
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Mot de passe modifié avec succès !');
                document.getElementById('changePasswordForm').reset();
                bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            } else {
                alert(data.message || 'Erreur lors du changement de mot de passe.');
            }
        } catch (error) {
            console.error('❌ Erreur lors du changement de mot de passe:', error);
            alert('Erreur lors du changement de mot de passe. Veuillez réessayer.');
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Méthode publique pour recharger le layout
    async reload() {
        this.isInitialized = false;
        await this.init();
    }
}

// Fonction globale pour toggle les sous-menus
function toggleSubmenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        submenu.classList.toggle('show');
    }
}

// Initialiser le layout unifié quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedLayout = new UnifiedLayoutManager();
});

// Exporter pour utilisation dans d'autres scripts
window.UnifiedLayoutManager = UnifiedLayoutManager;
