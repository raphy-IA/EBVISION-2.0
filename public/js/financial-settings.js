let financialSettings = {
    defaultCurrency: 'XAF',
    activeCurrencies: ['XAF', 'EUR', 'USD', 'GBP', 'CHF']
};

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadSidebar();
    initForm();
    loadFinancialSettings();
});

function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function loadSidebar() {
    // La sidebar moderne est gérée par modern-sidebar.js / menu-permissions.js
    // Ici on s'assure seulement que le conteneur est présent
}

function initForm() {
    const saveBtn = document.getElementById('saveFinancialSettings');
    const resetBtn = document.getElementById('resetFinancialSettings');

    if (saveBtn) {
        saveBtn.addEventListener('click', saveFinancialSettings);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetToDefaults);
    }
}

async function loadFinancialSettings() {
    try {
        const response = await fetchFinancialApi('/api/financial-settings');
        if (response.success) {
            financialSettings = response.data;
        }
        renderForm();
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres financiers:', error);
        showAlert('Erreur lors du chargement des paramètres financiers', 'danger');
        renderForm();
    }
}

function renderForm() {
    const select = document.getElementById('defaultCurrency');
    const container = document.getElementById('currenciesContainer');
    if (!select || !container || typeof CURRENCY_CONFIG === 'undefined') return;

    const supported = CURRENCY_CONFIG.getSupportedCurrencies();

    // Remplir le select
    select.innerHTML = '';
    supported.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${CURRENCY_CONFIG.getName(code)}`;
        if (code === (financialSettings.defaultCurrency || CURRENCY_CONFIG.defaultCurrency)) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // Remplir les badges de devises
    container.innerHTML = '';
    supported.forEach(code => {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'currency-badge btn btn-sm';
        if (financialSettings.activeCurrencies.includes(code)) {
            badge.classList.add('active');
        }
        badge.dataset.code = code;
        badge.innerHTML = `
            <i class="fas fa-money-bill"></i>
            <span>${code} - ${CURRENCY_CONFIG.getName(code)}</span>
        `;
        badge.addEventListener('click', () => toggleCurrency(code, badge));
        container.appendChild(badge);
    });
}

function toggleCurrency(code, badge) {
    const idx = financialSettings.activeCurrencies.indexOf(code);
    if (idx === -1) {
        financialSettings.activeCurrencies.push(code);
        badge.classList.add('active');
    } else {
        // Ne jamais désactiver la devise par défaut
        if (code === financialSettings.defaultCurrency) {
            showAlert('Vous ne pouvez pas désactiver la devise par défaut.', 'warning');
            return;
        }
        financialSettings.activeCurrencies.splice(idx, 1);
        badge.classList.remove('active');
    }
}

async function saveFinancialSettings() {
    try {
        const select = document.getElementById('defaultCurrency');
        if (!select) return;

        const newDefault = select.value || 'XAF';
        if (!financialSettings.activeCurrencies.includes(newDefault)) {
            financialSettings.activeCurrencies.push(newDefault);
        }

        const payload = {
            defaultCurrency: newDefault,
            activeCurrencies: financialSettings.activeCurrencies
        };

        const response = await fetchFinancialApi('/api/financial-settings', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (response.success) {
            financialSettings = response.data;
            showAlert('Paramètres financiers sauvegardés avec succès', 'success');
        } else {
            showAlert('Erreur lors de la sauvegarde des paramètres financiers', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres financiers:', error);
        showAlert('Erreur lors de la sauvegarde des paramètres financiers', 'danger');
    }
}

function resetToDefaults() {
    if (!confirm('Réinitialiser les paramètres financiers aux valeurs par défaut ?')) {
        return;
    }
    financialSettings = {
        defaultCurrency: 'XAF',
        activeCurrencies: ['XAF', 'EUR', 'USD', 'GBP', 'CHF']
    };
    renderForm();
}

async function fetchFinancialApi(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Token d\'authentification manquant');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
