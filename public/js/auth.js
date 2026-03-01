// Script amélioré pour gérer l'authentification et la déconnexion
if (typeof AuthManager === 'undefined') {
    class AuthManager {
        constructor() {
            this.isLoggingOut = false;
            this.logoutAttempts = 0;
            this.maxLogoutAttempts = 3;
            // Gestion de l'inactivité utilisateur (15 minutes)
            this.inactivityDelay = 15 * 60 * 1000; // 15 minutes en ms
            this.inactivityTimeoutId = null;
            this.init();
        }

        init() {
            this.addLogoutListeners();
            this.checkAuthStatus();
            this.setupPeriodicTokenCheck();
            this.setupInactivityTracking();
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
                'login',
                'userDataCache',
                'notificationsCache',
                'sidebarCache'
            ];

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            // Nettoyer aussi les cookies
            document.cookie.split(";").forEach(function (c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // Invalider les caches des managers
            if (window.UserHeaderManager && window.UserHeaderManager.instance) {
                window.UserHeaderManager.instance.invalidateCache();
            }

            console.log('🧹 Stockage local nettoyé et caches invalidés');
        }

        // Vérifier le statut d'authentification
        checkAuthStatus() {
            if (this.isLoggingOut) {
                return;
            }

            const token = localStorage.getItem('authToken');

            // Si on est sur la page de login ou d'accueil, ne pas rediriger
            if (window.location.pathname === '/login.html' ||
                window.location.pathname.includes('login')) {
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

                if (response.status === 401) {
                    console.log('🔒 Token expiré ou invalide (401), redirection vers la page de connexion');
                    this.forceLogout();
                } else if (!response.ok) {
                    // Erreur serveur (500, 503, etc.) ou timeout
                    // On ne déconnecte pas l'utilisateur pour une erreur technique temporaire
                    console.warn(`⚠️ Erreur serveur lors de la vérification (${response.status}). Session maintenue.`);
                } else {
                    console.log('✅ Token valide, utilisateur authentifié');
                    this.updateUserDisplay();
                }
            } catch (error) {
                // Erreur réseau (DNS, offline, etc.)
                // On ne déconnecte pas l'utilisateur si internet est coupé ou serveur injoignable
                console.error('❌ Erreur réseau lors de la vérification du token. Session maintenue.', error);
            }
        }

        // Vérification périodique du token
        setupPeriodicTokenCheck() {
            setInterval(() => {
                if (!this.isLoggingOut) {
                    this.checkAuthStatus();
                }
            }, 2 * 60 * 1000); // Vérifier toutes les 2 minutes pour plus de réactivité
        }

        // === Gestion de l'inactivité utilisateur ===

        // Initialiser le suivi d'inactivité
        setupInactivityTracking() {
            const reset = this.resetInactivityTimer.bind(this);

            // Événements considérés comme activité utilisateur
            window.addEventListener('mousemove', reset);
            window.addEventListener('mousedown', reset);
            window.addEventListener('keydown', reset);
            window.addEventListener('touchstart', reset);
            window.addEventListener('scroll', reset, { passive: true });

            // Stocker le dernier moment d'activité dans le localStorage
            // pour synchroniser l'inactivité entre les onglets
            localStorage.setItem('lastActivityTime', Date.now().toString());

            // Démarrer le timer une première fois
            this.resetInactivityTimer();
        }

        // Réinitialiser le timer d'inactivité
        resetInactivityTimer() {
            if (this.isLoggingOut) {
                return;
            }

            // Mettre à jour le timestamp d'activité
            localStorage.setItem('lastActivityTime', Date.now().toString());

            if (this.inactivityTimeoutId) {
                clearTimeout(this.inactivityTimeoutId);
            }

            this.inactivityTimeoutId = setTimeout(() => {
                this.checkInactivityAcrossTabs();
            }, this.inactivityDelay);
        }

        // Vérifier l'inactivité en tenant compte de tous les onglets
        checkInactivityAcrossTabs() {
            if (this.isLoggingOut) return;

            const lastActivity = parseInt(localStorage.getItem('lastActivityTime') || '0');
            const now = Date.now();
            const timePassed = now - lastActivity;

            if (timePassed >= this.inactivityDelay) {
                console.log('🔒 Inactivité détectée (15 min), déconnexion...');
                this.logoutAfterInactivity();
            } else {
                // L'activité a eu lieu dans un autre onglet, on relance le timer
                const remaining = this.inactivityDelay - timePassed;
                this.inactivityTimeoutId = setTimeout(() => {
                    this.checkInactivityAcrossTabs();
                }, remaining);
            }
        }

        // Déconnexion déclenchée par inactivité
        logoutAfterInactivity() {
            if (this.isLoggingOut) {
                return;
            }

            console.log('🔒 Déconnexion automatique après 15 minutes d\'inactivité');
            this.logout();
        }

        // Obtenir les informations de l'utilisateur connecté
        getUserInfo() {
            // Utiliser le SessionManager si disponible, sinon fallback sur localStorage
            if (window.sessionManager && window.sessionManager.isLoaded) {
                try {
                    return window.sessionManager.getUser();
                } catch (error) {
                    console.warn('SessionManager non disponible, utilisation du fallback localStorage');
                }
            }

            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        }

        // Mettre à jour l'affichage du nom d'utilisateur
        updateUserDisplay() {
            const userInfo = this.getUserInfo();
            // Ne plus cibler .user-name (utilisé dans la carte profil de la sidebar)
            // On se limite ici aux éléments de la barre de navigation
            const userElements = document.querySelectorAll('.navbar-text');

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

    // Rendre la classe accessible globalement si besoin
    window.AuthManager = AuthManager;
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
            window.location.href = '/login.html';
        }, 100);
    }
}

// Fonction globale pour vérifier l'authentification
function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token;
}

// Fonction globale pour obtenir l'ID de l'utilisateur connecté
function getCurrentUserId() {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
        try {
            const user = JSON.parse(userInfo);
            return user.id;
        } catch (error) {
            console.error('Erreur lors du parsing des données utilisateur:', error);
        }
    }
    return null;
}

// Fonction globale pour obtenir les informations complètes de l'utilisateur connecté
function getCurrentUser() {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
        try {
            const user = JSON.parse(userInfo);
            return user;
        } catch (error) {
            console.error('Erreur lors du parsing des données utilisateur:', error);
        }
    }
    return null;
}

// Fonction globale pour les requêtes API authentifiées
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');

    if (!token) {
        // Rediriger vers la page de connexion si pas de token
        window.location.href = '/login.html';
        throw new Error('Token d\'authentification manquant');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers
    };

    const fetchOptions = {
        ...options,
        headers,
        cache: 'no-store',
        credentials: options.credentials || 'include'
    };

    let response = await fetch(url, fetchOptions);

    // Si la réponse est 304 (Not Modified), refaire une requête avec un cache-buster
    if (response.status === 304) {
        const cacheBusterUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
        response = await fetch(cacheBusterUrl, {
            ...fetchOptions,
            cache: 'no-store'
        });
    }

    // Si la réponse est 401 (non autorisé), rediriger vers la page de connexion
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        throw new Error('Session expirée');
    }

    return response;
} 