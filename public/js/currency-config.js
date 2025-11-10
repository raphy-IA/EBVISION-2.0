/**
 * Configuration des devises pour l'application
 * Ce fichier définit les paramètres de formatage des montants monétaires
 */

const CURRENCY_CONFIG = {
    // Devise par défaut
    defaultCurrency: 'XAF',
    
    // Configuration des devises supportées
    currencies: {
        'XAF': {
            code: 'XAF',
            symbol: 'FCFA',
            name: 'Franc CFA',
            decimals: 0,
            symbolPosition: 'after', // 'before' ou 'after'
            thousandsSeparator: ' ',
            decimalSeparator: ',',
            format: '{amount} {symbol}' // {amount} sera remplacé par le montant, {symbol} par le symbole
        },
        'EUR': {
            code: 'EUR',
            symbol: '€',
            name: 'Euro',
            decimals: 2,
            symbolPosition: 'after',
            thousandsSeparator: ' ',
            decimalSeparator: ',',
            format: '{amount} {symbol}'
        },
        'USD': {
            code: 'USD',
            symbol: '$',
            name: 'Dollar américain',
            decimals: 2,
            symbolPosition: 'before',
            thousandsSeparator: ',',
            decimalSeparator: '.',
            format: '{symbol}{amount}'
        },
        'GBP': {
            code: 'GBP',
            symbol: '£',
            name: 'Livre sterling',
            decimals: 2,
            symbolPosition: 'before',
            thousandsSeparator: ',',
            decimalSeparator: '.',
            format: '{symbol}{amount}'
        },
        'CHF': {
            code: 'CHF',
            symbol: 'CHF',
            name: 'Franc suisse',
            decimals: 2,
            symbolPosition: 'after',
            thousandsSeparator: ' ',
            decimalSeparator: '.',
            format: '{amount} {symbol}'
        }
    },
    
    /**
     * Formate un montant selon la devise spécifiée
     * @param {number} amount - Le montant à formater
     * @param {string} currencyCode - Le code de la devise (XAF, EUR, USD, etc.)
     * @returns {string} Le montant formaté
     */
    format: function(amount, currencyCode = null) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '-';
        }
        
        const currency = currencyCode 
            ? this.currencies[currencyCode] || this.currencies[this.defaultCurrency]
            : this.currencies[this.defaultCurrency];
        
        // Arrondir selon le nombre de décimales
        const roundedAmount = Math.round(amount * Math.pow(10, currency.decimals)) / Math.pow(10, currency.decimals);
        
        // Séparer partie entière et décimale
        const parts = roundedAmount.toFixed(currency.decimals).split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1];
        
        // Ajouter les séparateurs de milliers
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
        
        // Construire le montant formaté
        let formattedAmount = formattedInteger;
        if (currency.decimals > 0 && decimalPart) {
            formattedAmount += currency.decimalSeparator + decimalPart;
        }
        
        // Appliquer le format
        return currency.format
            .replace('{amount}', formattedAmount)
            .replace('{symbol}', currency.symbol);
    },
    
    /**
     * Parse un montant formaté en nombre
     * @param {string} formattedAmount - Le montant formaté
     * @param {string} currencyCode - Le code de la devise
     * @returns {number} Le montant en nombre
     */
    parse: function(formattedAmount, currencyCode = null) {
        if (!formattedAmount) return 0;
        
        const currency = currencyCode 
            ? this.currencies[currencyCode] || this.currencies[this.defaultCurrency]
            : this.currencies[this.defaultCurrency];
        
        // Retirer le symbole
        let cleanAmount = formattedAmount.replace(currency.symbol, '').trim();
        
        // Remplacer les séparateurs
        cleanAmount = cleanAmount
            .replace(new RegExp('\\' + currency.thousandsSeparator, 'g'), '')
            .replace(currency.decimalSeparator, '.');
        
        return parseFloat(cleanAmount) || 0;
    },
    
    /**
     * Obtient le symbole d'une devise
     * @param {string} currencyCode - Le code de la devise
     * @returns {string} Le symbole de la devise
     */
    getSymbol: function(currencyCode = null) {
        const currency = currencyCode 
            ? this.currencies[currencyCode] || this.currencies[this.defaultCurrency]
            : this.currencies[this.defaultCurrency];
        
        return currency.symbol;
    },
    
    /**
     * Obtient le nom d'une devise
     * @param {string} currencyCode - Le code de la devise
     * @returns {string} Le nom de la devise
     */
    getName: function(currencyCode = null) {
        const currency = currencyCode 
            ? this.currencies[currencyCode] || this.currencies[this.defaultCurrency]
            : this.currencies[this.defaultCurrency];
        
        return currency.name;
    },
    
    /**
     * Vérifie si une devise est supportée
     * @param {string} currencyCode - Le code de la devise
     * @returns {boolean} True si la devise est supportée
     */
    isSupported: function(currencyCode) {
        return !!this.currencies[currencyCode];
    },
    
    /**
     * Obtient la liste des devises supportées
     * @returns {Array} Liste des codes de devises
     */
    getSupportedCurrencies: function() {
        return Object.keys(this.currencies);
    }
};

// Fonction helper globale pour formater les montants
function formatCurrency(amount, currencyCode = null) {
    return CURRENCY_CONFIG.format(amount, currencyCode);
}

// Fonction helper globale pour parser les montants
function parseCurrency(formattedAmount, currencyCode = null) {
    return CURRENCY_CONFIG.parse(formattedAmount, currencyCode);
}

// Export pour utilisation en module (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CURRENCY_CONFIG, formatCurrency, parseCurrency };
}

console.log('💰 Configuration des devises chargée');
