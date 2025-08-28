/**
 * Moniteur de performance pour EB-Vision 2.0
 * Surveille les optimisations et les performances de la zone de profil utilisateur
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            apiCalls: 0,
            sidebarLoads: 0,
            userDataLoads: 0,
            startTime: Date.now()
        };
        
        this.init();
    }

    init() {
        console.log('📊 Initialisation du moniteur de performance');
        
        // Intercepter les appels API
        this.interceptAPICalls();
        
        // Surveiller les chargements de page
        this.monitorPageLoads();
        
        // Surveiller l'utilisation du cache
        this.monitorCacheUsage();
        
        // Afficher les statistiques périodiquement
        this.startPeriodicReporting();
    }

    interceptAPICalls() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = function(...args) {
            const url = args[0];
            
            // Compter les appels API spécifiques
            if (typeof url === 'string') {
                if (url.includes('/api/auth/me')) {
                    self.metrics.apiCalls++;
                    console.log('📡 API Call: /api/auth/me');
                } else if (url.includes('/api/notifications/stats')) {
                    self.metrics.apiCalls++;
                    console.log('📡 API Call: /api/notifications/stats');
                } else if (url.includes('/api/tasks/stats')) {
                    self.metrics.apiCalls++;
                    console.log('📡 API Call: /api/tasks/stats');
                } else if (url.includes('/template-modern-sidebar.html')) {
                    self.metrics.sidebarLoads++;
                    console.log('📡 Sidebar template loaded');
                }
            }
            
            return originalFetch.apply(this, args);
        };
    }

    monitorPageLoads() {
        this.metrics.pageLoads++;
        
        // Surveiller les performances de chargement
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`📄 Page loaded in ${loadTime.toFixed(2)}ms`);
            
            // Vérifier si la sidebar est en cache
            const sidebarCache = localStorage.getItem('sidebarCache');
            if (sidebarCache) {
                this.metrics.cacheHits++;
                console.log('✅ Sidebar loaded from cache');
            } else {
                this.metrics.cacheMisses++;
                console.log('❌ Sidebar loaded from server');
            }
            
            // Vérifier si les données utilisateur sont en cache
            const userCache = localStorage.getItem('userDataCache');
            if (userCache) {
                this.metrics.cacheHits++;
                console.log('✅ User data loaded from cache');
            } else {
                this.metrics.cacheMisses++;
                console.log('❌ User data loaded from server');
            }
        });
    }

    monitorCacheUsage() {
        // Surveiller les accès au localStorage
        const originalGetItem = localStorage.getItem;
        const originalSetItem = localStorage.setItem;
        const self = this;
        
        localStorage.getItem = function(key) {
            const value = originalGetItem.call(this, key);
            if (value && (key.includes('Cache') || key.includes('userData'))) {
                self.metrics.cacheHits++;
            }
            return value;
        };
        
        localStorage.setItem = function(key, value) {
            if (key.includes('Cache') || key.includes('userData')) {
                self.metrics.cacheMisses++;
            }
            return originalSetItem.call(this, key, value);
        };
    }

    startPeriodicReporting() {
        setInterval(() => {
            this.reportMetrics();
        }, 30000); // Rapport toutes les 30 secondes
    }

    reportMetrics() {
        const uptime = Math.round((Date.now() - this.metrics.startTime) / 1000);
        const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
            ? Math.round((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100)
            : 0;
        
        console.log('📊 === RAPPORT DE PERFORMANCE ===');
        console.log(`⏱️  Temps de fonctionnement: ${uptime}s`);
        console.log(`📄 Pages chargées: ${this.metrics.pageLoads}`);
        console.log(`📡 Appels API: ${this.metrics.apiCalls}`);
        console.log(`📋 Sidebar chargements: ${this.metrics.sidebarLoads}`);
        console.log(`✅ Cache hits: ${this.metrics.cacheHits}`);
        console.log(`❌ Cache misses: ${this.metrics.cacheMisses}`);
        console.log(`📈 Taux de cache: ${cacheHitRate}%`);
        
        // Afficher les statistiques de mémoire si disponibles
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            console.log(`💾 Mémoire utilisée: ${usedMB}MB / ${totalMB}MB`);
        }
        
        console.log('================================');
    }

    getDetailedMetrics() {
        const uptime = Math.round((Date.now() - this.metrics.startTime) / 1000);
        const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
            ? Math.round((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100)
            : 0;
        
        return {
            uptime,
            pageLoads: this.metrics.pageLoads,
            apiCalls: this.metrics.apiCalls,
            sidebarLoads: this.metrics.sidebarLoads,
            cacheHits: this.metrics.cacheHits,
            cacheMisses: this.metrics.cacheMisses,
            cacheHitRate,
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }

    // Méthode pour afficher les métriques dans l'interface
    showMetricsInUI() {
        const metrics = this.getDetailedMetrics();
        
        // Créer un élément pour afficher les métriques
        const metricsDiv = document.createElement('div');
        metricsDiv.id = 'performance-metrics';
        metricsDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
        `;
        
        metricsDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">📊 Performance</div>
            <div>⏱️ Uptime: ${metrics.uptime}s</div>
            <div>📄 Pages: ${metrics.pageLoads}</div>
            <div>📡 API: ${metrics.apiCalls}</div>
            <div>📋 Sidebar: ${metrics.sidebarLoads}</div>
            <div>✅ Cache: ${metrics.cacheHitRate}%</div>
            ${metrics.memory ? `<div>💾 RAM: ${metrics.memory.used}MB</div>` : ''}
            <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
                <button onclick="window.performanceMonitor.hideMetrics()" style="background: #666; border: none; color: white; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Fermer</button>
            </div>
        `;
        
        document.body.appendChild(metricsDiv);
    }

    hideMetrics() {
        const metricsDiv = document.getElementById('performance-metrics');
        if (metricsDiv) {
            metricsDiv.remove();
        }
    }
}

// Initialiser le moniteur de performance
window.performanceMonitor = new PerformanceMonitor();

// Fonctions globales pour l'utilisation
window.showPerformanceMetrics = function() {
    window.performanceMonitor.showMetricsInUI();
};

window.getPerformanceMetrics = function() {
    return window.performanceMonitor.getDetailedMetrics();
};

// Afficher automatiquement les métriques en mode développement
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        window.showPerformanceMetrics();
    }, 5000);
}

