// Script amélioré pour gérer l'authentification et la déconnexion
class AuthManager {
    constructor() {
        this.isLoggingOut = false;
        this.logoutAttempts = 0;
        this.maxLogoutAttempts = 3;
        this.init();
    }

    init() {
        this.addLogoutListeners();
        this.checkAuthStatus();
        this.setupPeriodicTokenCheck();
    }

    // Ajouter les écouteurs d'événements pour les boutons de déconnexion
    addLogoutListeners() {
        // Écouteur global pour tous les boutons de déconnexion
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, a, .logout-btn');
            if (button && (
                button.textContent.toLowerCase().includes('déconnexion') ||
                button.textContent.toLowerCase().includes('logout') ||
                button.classList.contains('logout-btn')
            )) {
                e.preventDefault();
                e.stopPropagation();
                this.logout();
            }
        });

        // Écouteur spécifique pour les liens de déconnexion
        const logoutLinks = document.querySelectorAll('a[href*="logout"], .logout-link');
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    // Fonction de déconnexion améliorée
    async logout() {
        if (this.isLoggingOut) {
            console.log('⚠️ Déconnexion déjà en cours...');
            return;
        }

        this.logoutAttempts++;
        
        if (this.logoutAttempts > this.maxLogoutAttempts) {
            console.log('⚠️ Trop de tentatives de déconnexion, redirection forcée');
            this.forceLogout();
            return;
        }

        console.log('🔒 Déconnexion en cours... (tentative ' + this.logoutAttempts + ')');
        
        try {
            // Appeler l'API de déconnexion
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Erreur lors de l\'appel API de déconnexion:', error);
        }

        // Nettoyer complètement le localStorage
        this.clearAllStorage();
        
        // Désactiver temporairement la vérification d'authentification
        this.isLoggingOut = true;
        
        // Rediriger vers la page de connexion
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 100);
    }

    // Déconnexion forcée
    forceLogout() {
        this.clearAllStorage();
        this.isLoggingOut = true;
        window.location.href = '/login.html';
    }

    // Nettoyer tout le localStorage
    clearAllStorage() {
        const keysToRemove = [
            'authToken',
            'user',
            'userInfo',
            'token',
            'session',
            'auth',
            'login'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Nettoyer aussi les cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('🧹 Stockage local nettoyé');
    }

    // Vérifier le statut d'authentification
    checkAuthStatus() {
        if (this.isLoggingOut) {
            return;
        }

        const token = localStorage.getItem('authToken');
        
        // Si on est sur la page de login, ne pas rediriger
        if (window.location.pathname === '/' || 
            window.location.pathname.includes('login') ||
            window.location.pathname.includes('index')) {
            return;
        }

        if (!token) {
            console.log('🔒 Aucun token trouvé, redirection vers la page de connexion');
            this.forceLogout();
            return;
        }

        // Vérifier la validité du token
        this.verifyToken(token);
    }

    // Vérifier la validité du token
    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log('🔒 Token invalide, redirection vers la page de connexion');
                this.forceLogout();
            } else {
                console.log('✅ Token valide, utilisateur authentifié');
                this.updateUserDisplay();
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification du token:', error);
            this.forceLogout();
        }
    }

    // Vérification périodique du token
    setupPeriodicTokenCheck() {
        setInterval(() => {
            if (!this.isLoggingOut) {
                this.checkAuthStatus();
            }
        }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
    }

    // Obtenir les informations de l'utilisateur connecté
    getUserInfo() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    // Mettre à jour l'affichage du nom d'utilisateur
    updateUserDisplay() {
        const userInfo = this.getUserInfo();
        const userElements = document.querySelectorAll('.navbar-text, .user-name');
        
        userElements.forEach(element => {
            if (userInfo) {
                element.innerHTML = `
                    <i class="fas fa-user me-1"></i>
                    ${userInfo.nom} ${userInfo.prenom}
                `;
            }
        });
    }

    // Obtenir le token d'authentification pour les requêtes API
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialiser le gestionnaire d'authentification
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Fonction globale pour la déconnexion (accessible depuis les boutons)
function logout() {
    if (window.authManager) {
        window.authManager.logout();
    } else {
        // Fallback si le gestionnaire n'est pas initialisé
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setTimeout(() => {
            window.location.href = '/';
        }, 100);
    }
}

// Fonction globale pour les requêtes API authentifiées
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('Token d\'authentification manquant');
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const fetchOptions = {
        ...options,
        headers
    };
    
    return fetch(url, fetchOptions);
} 