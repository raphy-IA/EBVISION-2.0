const fs = require('fs');
const path = require('path');

/**
 * Service de gestion du branding white-label
 * Permet de charger et gérer les configurations de marque pour chaque client
 */
class BrandingService {
    constructor() {
        this.brandingPath = path.join(process.cwd(), 'config', 'branding');
        this.currentBrand = process.env.BRAND_CONFIG || 'default';
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    }

    /**
     * Charge la configuration de branding pour un client spécifique
     * @param {string} brandId - Identifiant du branding (ex: 'demo', 'client-a')
     * @returns {Object} Configuration de branding
     */
    loadBrandConfig(brandId = null) {
        const brand = brandId || this.currentBrand;
        
        // Vérifier le cache
        const cached = this.cache.get(brand);
        if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
            console.log(`✅ Configuration branding '${brand}' chargée depuis le cache`);
            return cached.config;
        }

        const configPath = path.join(this.brandingPath, `${brand}.json`);
        
        try {
            // Vérifier si le fichier existe
            if (!fs.existsSync(configPath)) {
                console.warn(`⚠️ Configuration '${brand}' introuvable, utilisation de 'default'`);
                return this.loadBrandConfig('default');
            }

            // Lire et parser le fichier
            const configData = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);

            // Mettre en cache
            this.cache.set(brand, {
                config,
                timestamp: Date.now()
            });

            console.log(`✅ Configuration branding '${brand}' chargée avec succès`);
            return config;

        } catch (error) {
            console.error(`❌ Erreur lors du chargement de la configuration '${brand}':`, error.message);
            
            // Fallback vers default si ce n'est pas déjà default
            if (brand !== 'default') {
                return this.loadBrandConfig('default');
            }
            
            // Retourner une configuration minimale si default échoue
            return this.getMinimalConfig();
        }
    }

    /**
     * Retourne une configuration minimale en cas d'échec total
     */
    getMinimalConfig() {
        return {
            app: {
                name: 'ENTERPRISE WORKFLOW MANAGEMENT',
                shortName: 'EWM',
                tagline: 'Intelligent Resource Management',
                version: '2.0.0'
            },
            branding: {
                colors: {
                    primary: '#2c3e50',
                    secondary: '#3498db',
                    accent: '#27ae60'
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
    }

    /**
     * Obtient la configuration courante
     */
    getCurrentBrand() {
        return this.loadBrandConfig();
    }

    /**
     * Change le branding actif
     * @param {string} brandId - Nouvel identifiant de branding
     */
    setBrand(brandId) {
        const config = this.loadBrandConfig(brandId);
        if (config) {
            this.currentBrand = brandId;
            console.log(`✅ Branding changé vers: ${brandId}`);
            return true;
        }
        return false;
    }

    /**
     * Liste tous les brandings disponibles
     */
    listAvailableBrands() {
        try {
            const files = fs.readdirSync(this.brandingPath);
            const brands = files
                .filter(file => file.endsWith('.json') && !file.includes('template'))
                .map(file => file.replace('.json', ''));
            
            console.log(`📋 Brandings disponibles: ${brands.join(', ')}`);
            return brands;

        } catch (error) {
            console.error('❌ Erreur lors de la liste des brandings:', error.message);
            return ['default'];
        }
    }

    /**
     * Invalide le cache pour un branding
     * @param {string} brandId - Identifiant du branding (optionnel, invalide tout si null)
     */
    invalidateCache(brandId = null) {
        if (brandId) {
            this.cache.delete(brandId);
            console.log(`🗑️ Cache invalidé pour: ${brandId}`);
        } else {
            this.cache.clear();
            console.log('🗑️ Tout le cache des brandings a été invalidé');
        }
    }

    /**
     * Crée une configuration pour un nouveau client
     * @param {string} clientId - Identifiant du client
     * @param {Object} customConfig - Configuration personnalisée
     */
    createClientBranding(clientId, customConfig) {
        const newConfigPath = path.join(this.brandingPath, `${clientId}.json`);
        
        try {
            // Vérifier si le client existe déjà
            if (fs.existsSync(newConfigPath)) {
                throw new Error(`La configuration pour '${clientId}' existe déjà`);
            }

            // Charger le template
            const templatePath = path.join(this.brandingPath, 'client-template.json');
            const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

            // Fusionner avec la configuration personnalisée
            const finalConfig = this.deepMerge(template, customConfig);

            // Écrire le fichier
            fs.writeFileSync(newConfigPath, JSON.stringify(finalConfig, null, 2), 'utf-8');
            
            console.log(`✅ Configuration créée pour le client: ${clientId}`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur lors de la création de la configuration client:`, error.message);
            return false;
        }
    }

    /**
     * Fusion profonde d'objets
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Valide une configuration de branding
     * @param {Object} config - Configuration à valider
     */
    validateConfig(config) {
        const requiredFields = [
            'app.name',
            'app.shortName',
            'branding.colors.primary',
            'ui.sidebarTitle'
        ];

        const errors = [];

        requiredFields.forEach(field => {
            const keys = field.split('.');
            let value = config;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    errors.push(`Champ requis manquant: ${field}`);
                    break;
                }
            }
        });

        if (errors.length > 0) {
            console.error('❌ Erreurs de validation:', errors);
            return { valid: false, errors };
        }

        return { valid: true, errors: [] };
    }
}

// Singleton
let brandingServiceInstance = null;

function getBrandingService() {
    if (!brandingServiceInstance) {
        brandingServiceInstance = new BrandingService();
    }
    return brandingServiceInstance;
}

module.exports = {
    BrandingService,
    getBrandingService
};










