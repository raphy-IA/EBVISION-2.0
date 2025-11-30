/**
 * Gestionnaire de contexte pour la devise de l'application
 * Charge la configuration depuis le backend et met à jour l'interface
 */

const CurrencyContext = {
    isInitialized: false,

    /**
     * Initialise le contexte de devise
     */
    init: async function () {
        if (this.isInitialized) return;

        try {
            const token = localStorage.getItem('authToken');
            if (!token) return; // Pas authentifié, on laisse la valeur par défaut

            const response = await fetch('/api/financial-settings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.defaultCurrency) {
                    // Mettre à jour la configuration globale
                    if (typeof CURRENCY_CONFIG !== 'undefined') {
                        CURRENCY_CONFIG.defaultCurrency = result.data.defaultCurrency;
                        console.log(`💰 Devise configurée : ${CURRENCY_CONFIG.defaultCurrency}`);
                    }
                }
            }
        } catch (error) {
            console.error('Erreur chargement devise:', error);
            // On garde la valeur par défaut de CURRENCY_CONFIG
        }

        this.isInitialized = true;
        this.updateUI();
    },

    /**
     * Met à jour les éléments de l'interface liés à la devise
     */
    updateUI: function () {
        if (typeof CURRENCY_CONFIG === 'undefined') return;

        const currencyCode = CURRENCY_CONFIG.defaultCurrency;
        const currency = CURRENCY_CONFIG.currencies[currencyCode];

        if (!currency) return;

        // 1. Mettre à jour les icônes (.currency-icon)
        document.querySelectorAll('.currency-icon').forEach(el => {
            // Enlever les anciennes classes d'icônes (fa-euro-sign, fa-dollar-sign, etc.)
            el.classList.remove('fa-euro-sign', 'fa-dollar-sign', 'fa-pound-sign', 'fa-coins', 'fa-money-bill-wave');
            // Ajouter la nouvelle classe
            if (currency.iconClass) {
                // Extraire les classes (ex: "fas fa-euro-sign")
                const classes = currency.iconClass.split(' ');
                classes.forEach(cls => {
                    if (cls !== 'fas' && cls !== 'far') { // On garde le style de base si présent
                        el.classList.add(cls);
                    }
                });
            } else {
                el.classList.add('fa-money-bill'); // Fallback
            }
        });

        // 2. Mettre à jour les symboles textuels (.currency-symbol)
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = currency.symbol;
        });

        // 3. Mettre à jour les labels qui contiennent le symbole (.currency-label)
        // Note: Pour les labels, on suppose qu'ils ont un span .currency-symbol à l'intérieur
        // Si ce n'est pas le cas, on ne touche pas pour éviter d'écraser le texte du label
    }
};

// Initialisation automatique au chargement
document.addEventListener('DOMContentLoaded', () => {
    CurrencyContext.init();
});
