// Configuration centralisée des devises pour l'application TRS
const CURRENCY_CONFIG = {
    // Devise par défaut
    DEFAULT_CURRENCY: 'XAF',
    
    // Liste des devises disponibles avec leurs symboles et formats
    AVAILABLE_CURRENCIES: {
        'XAF': {
            code: 'XAF',
            name: 'Franc CFA',
            symbol: 'F',
            symbolPosition: 'after', // Le symbole se place après le montant
            decimalPlaces: 0, // Pas de décimales pour le FCFA
            format: 'fr-FR'
        },
        'EUR': {
            code: 'EUR',
            name: 'Euro',
            symbol: '€',
            symbolPosition: 'before',
            decimalPlaces: 2,
            format: 'fr-FR'
        },
        'USD': {
            code: 'USD',
            name: 'Dollar US',
            symbol: '$',
            symbolPosition: 'before',
            decimalPlaces: 2,
            format: 'en-US'
        },
        'GBP': {
            code: 'GBP',
            name: 'Livre Sterling',
            symbol: '£',
            symbolPosition: 'before',
            decimalPlaces: 2,
            format: 'en-GB'
        }
    },
    
    // Fonction pour formater un montant selon la devise
    formatCurrency: function(amount, currencyCode = null) {
        const currency = currencyCode || this.DEFAULT_CURRENCY;
        const config = this.AVAILABLE_CURRENCIES[currency];
        
        if (!config) {
            console.warn(`Devise non reconnue: ${currency}, utilisation de ${this.DEFAULT_CURRENCY}`);
            return this.formatCurrency(amount, this.DEFAULT_CURRENCY);
        }
        
        // Formater le nombre selon la devise
        const formattedNumber = new Intl.NumberFormat(config.format, {
            minimumFractionDigits: config.decimalPlaces,
            maximumFractionDigits: config.decimalPlaces
        }).format(amount);
        
        // Ajouter le symbole selon la position
        if (config.symbolPosition === 'before') {
            return `${config.symbol}${formattedNumber}`;
        } else {
            return `${formattedNumber} ${config.symbol}`;
        }
    },
    
    // Fonction pour obtenir les options HTML pour les selects de devise
    getCurrencyOptions: function(selectedCurrency = null) {
        const defaultCurrency = selectedCurrency || this.DEFAULT_CURRENCY;
        let options = '';
        
        Object.values(this.AVAILABLE_CURRENCIES).forEach(currency => {
            const isSelected = currency.code === defaultCurrency ? 'selected' : '';
            const displayText = `${currency.code} (${currency.symbol})`;
            options += `<option value="${currency.code}" ${isSelected}>${displayText}</option>`;
        });
        
        return options;
    },
    
    // Fonction pour mettre à jour tous les champs de devise dans une page
    updateCurrencyFields: function() {
        const currencySelects = document.querySelectorAll('select[id*="devise"], select[id*="currency"]');
        currencySelects.forEach(select => {
            if (select.value === 'EUR' || select.value === '') {
                select.value = this.DEFAULT_CURRENCY;
            }
        });
    },
    
    // Fonction pour initialiser les champs de devise avec la devise par défaut
    initializeCurrencyFields: function() {
        const currencySelects = document.querySelectorAll('select[id*="devise"], select[id*="currency"]');
        currencySelects.forEach(select => {
            // Si le select est vide ou a EUR par défaut, utiliser XAF
            if (!select.value || select.value === 'EUR') {
                select.value = this.DEFAULT_CURRENCY;
            }
        });
    }
};

// Fonction utilitaire pour formater les montants (compatibilité avec l'existant)
function formatCurrency(amount, currencyCode = null) {
    return CURRENCY_CONFIG.formatCurrency(amount, currencyCode);
}

// Initialisation automatique au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    CURRENCY_CONFIG.initializeCurrencyFields();
});

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CURRENCY_CONFIG;
} 