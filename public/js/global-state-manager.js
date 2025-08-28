/**
 * Gestionnaire d'état global pour EB-Vision 2.0
 * Optimise les performances en évitant les rechargements répétitifs
 */
class GlobalStateManager {
    constructor() {
        // Singleton pattern
        if (GlobalStateManager.instance) {
            return GlobalStateManager.instance;
        }
        GlobalStateManager.instance = this;
        
        this.state = {
            user: null,
            notifications: [],
            tasks: [],
            sidebar: null,
            lastUpdate: 0
        };
        
        this.cacheExpiry = {
            user: 5 * 60 * 1000,      // 5 minutes
            notifications: 2 * 60 * 1000, // 2 minutes
            tasks: 3 * 60 * 1000,     // 3 minutes
            sidebar: 10 * 60 * 1000   // 10 minutes
        };
        
        this.isInitialized = false;
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('🔄 GlobalStateManager déjà initialisé');
            return;
        }

        console.log('🚀 Initialisation du GlobalStateManager');
        
        // Charger l'état depuis le localStorage
        this.loadStateFromStorage();
        
        // Initialiser les gestionnaires
        await this.initializeManagers();
        
        this.isInitialized = true;
        console.log('✅ GlobalStateManager initialisé avec succès');
    }

    async initializeManagers() {
        // Attendre que les autres gestionnaires soient disponibles
        await this.waitForManagers();
        
        // Synchroniser l'état avec les autres gestionnaires
        this.syncWithManagers();
    }

    waitForManagers() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkManagers = () => {
                attempts++;
                
                // Vérifier que les gestionnaires principaux sont disponibles
                const hasUserManager = typeof window.UserHeaderManager !== 'undefined';
                const hasProfileManager = typeof window.ProfileMenuManager !== 'undefined';
                
                if (hasUserManager && hasProfileManager) {
                    console.log('✅ Tous les gestionnaires sont disponibles');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Timeout: certains gestionnaires ne sont pas disponibles');
                    resolve();
                } else {
                    setTimeout(checkManagers, 100);
                }
            };
            
            checkManagers();
        });
    }

    syncWithManagers() {
        // Synchroniser avec UserHeaderManager
        if (window.UserHeaderManager && window.UserHeaderManager.instance) {
            const userManager = window.UserHeaderManager.instance;
            
            // Récupérer les données utilisateur du cache
            const cachedUser = userManager.getCachedUserData();
            if (cachedUser) {
                this.state.user = cachedUser;
                this.state.lastUpdate = Date.now();
            }
        }
        
        // Synchroniser avec ProfileMenuManager
        if (window.ProfileMenuManager && window.ProfileMenuManager.instance) {
            const profileManager = window.ProfileMenuManager.instance;
            
            // Récupérer les statistiques du cache
            const cachedStats = profileManager.getCachedStats();
            if (cachedStats) {
                this.state.notifications = cachedStats.notificationCount || 0;
                this.state.tasks = cachedStats.taskCount || 0;
            }
        }
    }

    // Gestion du cache utilisateur
    async getUserData(forceRefresh = false) {
        const now = Date.now();
        
        // Vérifier le cache si pas de forçage
        if (!forceRefresh && this.state.user && (now - this.state.lastUpdate) < this.cacheExpiry.user) {
            console.log('📋 Utilisation des données utilisateur du cache global');
            return this.state.user;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return null;
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.user) {
                    this.state.user = data.data.user;
                    this.state.lastUpdate = now;
                    this.saveStateToStorage();
                    return data.data.user;
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
        }

        return null;
    }

    // Gestion du cache des notifications
    async getNotificationStats(forceRefresh = false) {
        const now = Date.now();
        
        if (!forceRefresh && this.state.notifications && (now - this.state.lastUpdate) < this.cacheExpiry.notifications) {
            return { unread_count: this.state.notifications };
        }

        try {
            const response = await fetch('/api/notifications/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const stats = result.data || { unread_count: 0 };
                this.state.notifications = stats.unread_count;
                this.state.lastUpdate = now;
                this.saveStateToStorage();
                return stats;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des stats notifications:', error);
        }

        return { unread_count: 0 };
    }

    // Gestion du cache des tâches
    async getTaskStats(forceRefresh = false) {
        const now = Date.now();
        
        if (!forceRefresh && this.state.tasks && (now - this.state.lastUpdate) < this.cacheExpiry.tasks) {
            return { total_tasks: this.state.tasks };
        }

        try {
            const response = await fetch('/api/tasks/stats/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const stats = result || { total_tasks: 0 };
                this.state.tasks = stats.total_tasks;
                this.state.lastUpdate = now;
                this.saveStateToStorage();
                return stats;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des stats tâches:', error);
        }

        return { total_tasks: 0 };
    }

    // Sauvegarder l'état dans le localStorage
    saveStateToStorage() {
        try {
            localStorage.setItem('globalState', JSON.stringify({
                state: this.state,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Impossible de sauvegarder l\'état global:', error);
        }
    }

    // Charger l'état depuis le localStorage
    loadStateFromStorage() {
        try {
            const stored = localStorage.getItem('globalState');
            if (stored) {
                const { state, timestamp } = JSON.parse(stored);
                const now = Date.now();
                
                // Vérifier si le cache est encore valide
                if ((now - timestamp) < Math.max(...Object.values(this.cacheExpiry))) {
                    this.state = { ...this.state, ...state };
                    console.log('📋 État global chargé depuis le cache');
                }
            }
        } catch (error) {
            console.warn('Erreur lors du chargement de l\'état global:', error);
        }
    }

    // Invalider tout le cache
    invalidateAllCache() {
        this.state = {
            user: null,
            notifications: [],
            tasks: [],
            sidebar: null,
            lastUpdate: 0
        };
        
        localStorage.removeItem('globalState');
        localStorage.removeItem('userDataCache');
        localStorage.removeItem('notificationsCache');
        localStorage.removeItem('tasksCache');
        localStorage.removeItem('profileStatsCache');
        localStorage.removeItem('sidebarCache');
        
        console.log('🗑️ Tous les caches invalidés');
    }

    // Méthode pour forcer la mise à jour de toutes les données
    async forceRefreshAll() {
        console.log('🔄 Forçage de la mise à jour de toutes les données');
        
        const [userData, notificationStats, taskStats] = await Promise.all([
            this.getUserData(true),
            this.getNotificationStats(true),
            this.getTaskStats(true)
        ]);

        // Mettre à jour les gestionnaires
        if (window.UserHeaderManager && window.UserHeaderManager.instance) {
            window.UserHeaderManager.instance.forceUpdateUserDisplay(userData);
        }
        
        if (window.ProfileMenuManager && window.ProfileMenuManager.instance) {
            window.ProfileMenuManager.instance.forceUpdateStats();
        }

        return { userData, notificationStats, taskStats };
    }

    // Méthode pour nettoyer lors de la déconnexion
    cleanup() {
        this.invalidateAllCache();
        this.isInitialized = false;
        console.log('🧹 Nettoyage du GlobalStateManager');
    }

    // Obtenir des statistiques de performance
    getPerformanceStats() {
        const now = Date.now();
        const cacheAge = now - this.state.lastUpdate;
        
        return {
            cacheAge: Math.round(cacheAge / 1000), // en secondes
            isCacheValid: cacheAge < Math.max(...Object.values(this.cacheExpiry)),
            memoryUsage: this.getMemoryUsage(),
            cacheHits: this.cacheHits || 0,
            cacheMisses: this.cacheMisses || 0
        };
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
            };
        }
        return null;
    }
}

// Initialiser le gestionnaire global
let globalStateManager = null;

function initGlobalStateManager() {
    if (!globalStateManager) {
        console.log('🚀 Création du GlobalStateManager');
        globalStateManager = new GlobalStateManager();
    } else {
        console.log('🔄 GlobalStateManager déjà existant, réutilisation');
    }
}

// Fonctions globales pour l'utilisation
window.getGlobalState = function() {
    return globalStateManager ? globalStateManager.state : null;
};

window.forceRefreshAllData = function() {
    return globalStateManager ? globalStateManager.forceRefreshAll() : null;
};

window.invalidateAllCache = function() {
    if (globalStateManager) {
        globalStateManager.invalidateAllCache();
    }
};

window.getPerformanceStats = function() {
    return globalStateManager ? globalStateManager.getPerformanceStats() : null;
};

// Initialiser automatiquement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalStateManager);
} else {
    initGlobalStateManager();
}

