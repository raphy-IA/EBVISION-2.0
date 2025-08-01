// Script pour gérer l'authentification et la déconnexion
class AuthManager {
    constructor() {
        this.isLoggingOut = false;
        this.init();
    }

    init() {
        this.addLogoutListeners();
        this.checkAuthStatus();
    }

    // Ajouter les écouteurs d'événements pour les boutons de déconnexion
    addLogoutListeners() {
        // Trouver tous les boutons de déconnexion
        const logoutButtons = document.querySelectorAll('button');
        
        logoutButtons.forEach(button => {
            if (button.textContent.includes('Déconnexion')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        });

        // Alternative : utiliser un sélecteur plus spécifique
        document.addEventListener('click', (e) => {
            if (e.target.closest('button') && e.target.closest('button').textContent.includes('Déconnexion')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    // Fonction de déconnexion
    logout() {
        // Afficher une confirmation
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            // Supprimer le token du localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            // Désactiver temporairement la vérification d'authentification
            this.isLoggingOut = true;
            
            // Rediriger vers la page de connexion avec un délai
            setTimeout(() => {
                window.location.href = '/';
            }, 100);
        }
    }

    // Vérifier le statut d'authentification
    checkAuthStatus() {
        // Ne pas vérifier si on est en train de se déconnecter
        if (this.isLoggingOut) {
            return;
        }

        const token = localStorage.getItem('authToken');
        
        // Si on est sur la page de login, ne pas rediriger
        if (window.location.pathname === '/' || window.location.pathname.includes('login')) {
            return;
        }

        if (!token) {
            // Si pas de token, rediriger vers la page de connexion
            console.log('🔒 Aucun token trouvé, redirection vers la page de connexion');
            window.location.href = '/';
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
                // Token invalide, supprimer et rediriger
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/';
            } else {
                console.log('✅ Token valide, utilisateur authentifié');
                // Token valide, mettre à jour l'affichage
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification du token:', error);
            // En cas d'erreur, supprimer le token et rediriger
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
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