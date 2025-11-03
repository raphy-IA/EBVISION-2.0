/**
 * Gestionnaire de chargement dynamique du branding white-label
 * Charge la configuration de branding et applique les thèmes en temps réel
 */

class BrandingLoader {
    constructor() {
        this.config = null;
        this.isLoaded = false;
        this.cache = {
            key: 'brandingConfig',
            expiry: 10 * 60 * 1000 // 10 minutes
        };
    }

    /**
     * Initialise le branding au chargement de la page
     */
    async init() {
        console.log('[Branding] Initialisation du branding...');
        
        try {
            await this.loadConfiguration();
            this.applyBranding();
            this.isLoaded = true;
            console.log('[Branding] Charge avec succes:', this.config?.app?.name);
        } catch (error) {
            console.error('[Branding] Erreur lors du chargement:', error);
            this.useFallbackBranding();
        }
    }

    /**
     * Charge la configuration depuis l'API
     */
    async loadConfiguration() {
        // Vérifier le cache local
        const cached = this.getCachedConfig();
        if (cached) {
            console.log('[Branding] Configuration chargee depuis le cache');
            this.config = cached;
            return;
        }

        // Charger depuis l'API
        console.log('[Branding] Chargement de la configuration depuis l\'API...');
        const response = await fetch('/api/branding/config');
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            this.config = data.data;
            this.cacheConfig(this.config);
        } else {
            throw new Error('Configuration invalide reçue');
        }
    }

    /**
     * Applique le branding à l'interface
     */
    applyBranding() {
        if (!this.config) return;

        console.log('🎨 Application du branding...');

        // Appliquer les couleurs
        this.applyColors();

        // Appliquer les textes
        this.applyTexts();

        // Appliquer le logo
        this.applyLogo();

        // Appliquer le favicon
        this.applyFavicon();

        // Appliquer le mode démo si activé
        if (this.config.demo?.mode) {
            this.applyDemoMode();
        }

        // Dispatcher un événement pour informer les autres scripts
        window.dispatchEvent(new CustomEvent('brandingLoaded', { 
            detail: this.config 
        }));
    }

    /**
     * Applique les couleurs du branding via CSS variables
     */
    applyColors() {
        const colors = this.config.branding?.colors;
        if (!colors) return;

        const root = document.documentElement;

        // Mapping des couleurs
        const colorMap = {
            primary: '--brand-primary',
            secondary: '--brand-secondary',
            accent: '--brand-accent',
            success: '--brand-success',
            warning: '--brand-warning',
            danger: '--brand-danger',
            info: '--brand-info',
            dark: '--brand-dark',
            light: '--brand-light'
        };

        // Appliquer chaque couleur
        Object.entries(colorMap).forEach(([key, cssVar]) => {
            if (colors[key]) {
                root.style.setProperty(cssVar, colors[key]);
                console.log(`  ✓ ${cssVar}: ${colors[key]}`);
            }
        });

        // Générer des variations automatiques
        this.generateColorVariations(colors);
    }

    /**
     * Génère des variations de couleurs (light/dark)
     */
    generateColorVariations(colors) {
        const root = document.documentElement;

        if (colors.primary) {
            const primaryLight = this.adjustColorBrightness(colors.primary, 20);
            const primaryDark = this.adjustColorBrightness(colors.primary, -20);
            root.style.setProperty('--brand-primary-light', primaryLight);
            root.style.setProperty('--brand-primary-dark', primaryDark);
        }

        if (colors.secondary) {
            const secondaryLight = this.adjustColorBrightness(colors.secondary, 20);
            const secondaryDark = this.adjustColorBrightness(colors.secondary, -20);
            root.style.setProperty('--brand-secondary-light', secondaryLight);
            root.style.setProperty('--brand-secondary-dark', secondaryDark);
        }
    }

    /**
     * Ajuste la luminosité d'une couleur hexadécimale
     */
    adjustColorBrightness(hex, percent) {
        // Convertir hex en RGB
        const num = parseInt(hex.replace('#', ''), 16);
        let r = (num >> 16) + Math.round(percent * 2.55);
        let g = ((num >> 8) & 0x00FF) + Math.round(percent * 2.55);
        let b = (num & 0x0000FF) + Math.round(percent * 2.55);

        // Limiter les valeurs entre 0 et 255
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // Reconvertir en hex
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    /**
     * Applique les textes personnalisés
     */
    applyTexts() {
        const ui = this.config.ui;
        const app = this.config.app;

        if (!ui || !app) return;

        // Titre de la page
        if (app.name) {
            document.title = app.name;
        }

        // Sidebar title
        const sidebarTitle = document.querySelector('.sidebar-header h3');
        if (sidebarTitle && ui.sidebarTitle) {
            const icon = sidebarTitle.querySelector('i');
            if (icon) {
                sidebarTitle.innerHTML = '';
                sidebarTitle.appendChild(icon);
                sidebarTitle.appendChild(document.createTextNode(' ' + ui.sidebarTitle));
            } else {
                sidebarTitle.textContent = ui.sidebarTitle;
            }
        }

        // Sidebar subtitle
        const sidebarSubtitle = document.querySelector('.sidebar-header p');
        if (sidebarSubtitle && ui.sidebarSubtitle) {
            sidebarSubtitle.textContent = ui.sidebarSubtitle;
        }

        // Footer
        const footerText = document.querySelector('.sidebar-footer p');
        if (footerText && ui.footer?.text) {
            footerText.textContent = ui.footer.copyright || ui.footer.text;
        }
    }

    /**
     * Applique le logo
     */
    applyLogo() {
        const logo = this.config.branding?.logo;
        if (!logo) return;

        // Logo principal dans la sidebar (si présent)
        const sidebarLogo = document.querySelector('.sidebar-header .brand-logo');
        if (sidebarLogo && logo.main) {
            sidebarLogo.src = logo.main;
            sidebarLogo.alt = this.config.app?.name || 'Logo';
        }

        // Logo icon
        const iconElements = document.querySelectorAll('.brand-icon');
        iconElements.forEach(icon => {
            if (logo.icon) {
                icon.src = logo.icon;
            }
        });
    }

    /**
     * Applique le favicon
     */
    applyFavicon() {
        const favicon = this.config.branding?.logo?.favicon;
        if (!favicon) return;

        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = favicon;
    }

    /**
     * Applique le mode démo
     */
    applyDemoMode() {
        const demo = this.config.demo;
        if (!demo?.mode) return;

        console.log('🎯 Mode démo activé');

        // Ajouter l'attribut data-demo
        document.body.setAttribute('data-demo', 'true');

        // Ajouter la bannière de démo
        if (demo.bannerText) {
            this.addDemoBanner(demo.bannerText);
        }

        // Ajouter le watermark si activé
        if (demo.watermark) {
            document.body.setAttribute('data-watermark', 'true');
        }
    }

    /**
     * Ajoute une bannière de démo
     */
    addDemoBanner(text) {
        // Vérifier si la bannière existe déjà
        if (document.querySelector('.demo-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'demo-banner';
        banner.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <span>${text}</span>
        `;
        
        // Insérer en haut du body
        document.body.insertBefore(banner, document.body.firstChild);
    }

    /**
     * Utilise un branding par défaut en cas d'erreur
     */
    useFallbackBranding() {
        console.warn('⚠️ Utilisation du branding par défaut');
        
        this.config = {
            app: {
                name: 'ENTERPRISE WORKFLOW MANAGEMENT',
                shortName: 'EWM'
            },
            branding: {
                colors: {
                    primary: '#2c3e50',
                    secondary: '#3498db'
                }
            },
            ui: {
                sidebarTitle: 'EWM',
                sidebarSubtitle: 'Management System'
            },
            demo: {
                mode: false
            }
        };

        this.applyBranding();
    }

    /**
     * Cache la configuration dans localStorage
     */
    cacheConfig(config) {
        try {
            const cacheData = {
                config,
                timestamp: Date.now()
            };
            localStorage.setItem(this.cache.key, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('⚠️ Impossible de mettre en cache la configuration:', error);
        }
    }

    /**
     * Récupère la configuration depuis le cache
     */
    getCachedConfig() {
        try {
            const cached = localStorage.getItem(this.cache.key);
            if (!cached) return null;

            const { config, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Vérifier si le cache est encore valide
            if (now - timestamp < this.cache.expiry) {
                return config;
            }

            // Cache expiré, le supprimer
            localStorage.removeItem(this.cache.key);
            return null;

        } catch (error) {
            console.warn('⚠️ Erreur lors de la lecture du cache:', error);
            return null;
        }
    }

    /**
     * Invalide le cache
     */
    invalidateCache() {
        localStorage.removeItem(this.cache.key);
        console.log('🗑️ Cache de branding invalidé');
    }

    /**
     * Recharge le branding
     */
    async reload() {
        this.invalidateCache();
        await this.init();
    }

    /**
     * Obtient la configuration actuelle
     */
    getConfig() {
        return this.config;
    }

    /**
     * Vérifie si le branding est chargé
     */
    isReady() {
        return this.isLoaded;
    }
}

// Instance globale
const brandingLoader = new BrandingLoader();

// Auto-initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    brandingLoader.init();
});

// Exposer l'instance globalement
window.BrandingLoader = brandingLoader;

// Fonction helper pour attendre que le branding soit chargé
window.whenBrandingReady = function(callback) {
    if (brandingLoader.isReady()) {
        callback(brandingLoader.getConfig());
    } else {
        window.addEventListener('brandingLoaded', (event) => {
            callback(event.detail);
        });
    }
};

