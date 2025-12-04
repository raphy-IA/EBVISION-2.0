let financialSettings = {
    default_currency: 'XAF',
    active_currencies: ['XAF', 'EUR', 'USD', 'GBP', 'CHF'],
    default_tva: 19.25,
    default_payment_terms: 30,
    invoice_notes_default: ''
};

let taxes = [];
let bus = [];
let configuredBUs = [];
let currentBuSettings = {};

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadSidebar();
    initForm();
    loadFinancialSettings();
    loadTaxes();
    loadBUs();
    loadConfiguredBUs();
});

function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function loadSidebar() {
    // La sidebar moderne est gérée par modern-sidebar.js / menu-permissions.js
}

function initForm() {
    // Global Settings
    const saveGlobalBtn = document.getElementById('saveGlobalSettings');
    if (saveGlobalBtn) saveGlobalBtn.addEventListener('click', saveGlobalSettings);

    // BU Settings
    const buSelect = document.getElementById('buSelect');
    if (buSelect) buSelect.addEventListener('change', (e) => loadBuSettings(e.target.value));

    const saveBuBtn = document.getElementById('saveBuSettings');
    if (saveBuBtn) saveBuBtn.addEventListener('click', saveBuSettings);

    // Taxes Modal
    const taxModalEl = document.getElementById('taxModal');
    if (taxModalEl) {
        taxModalEl.addEventListener('hidden.bs.modal', () => {
            document.getElementById('taxForm').reset();
            document.getElementById('taxId').value = '';
        });
    }
}

// --- GLOBAL SETTINGS ---

async function loadFinancialSettings() {
    try {
        const response = await fetchFinancialApi('/api/financial-settings');
        if (response.success) {
            financialSettings = { ...financialSettings, ...response.data };
        }
        renderGlobalForm();
    } catch (error) {
        console.error('Erreur chargement paramètres:', error);
        showAlert('Erreur chargement paramètres', 'danger');
    }
}

function renderGlobalForm() {
    // Devises
    const select = document.getElementById('defaultCurrency');
    const container = document.getElementById('currenciesContainer');

    if (select && container && typeof CURRENCY_CONFIG !== 'undefined') {
        const supported = CURRENCY_CONFIG.getSupportedCurrencies();
        select.innerHTML = '';
        supported.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${code} - ${CURRENCY_CONFIG.getName(code)}`;
            if (code === (financialSettings.default_currency || CURRENCY_CONFIG.defaultCurrency)) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        container.innerHTML = '';
        supported.forEach(code => {
            const badge = document.createElement('button');
            badge.type = 'button';
            badge.className = 'currency-badge btn btn-sm';
            if (financialSettings.active_currencies && financialSettings.active_currencies.includes(code)) {
                badge.classList.add('active');
            }
            badge.innerHTML = `<i class="fas fa-money-bill"></i> <span>${code}</span>`;
            badge.addEventListener('click', () => toggleCurrency(code, badge));
            container.appendChild(badge);
        });
    }

    // Autres globaux
    if (document.getElementById('defaultTva')) document.getElementById('defaultTva').value = financialSettings.default_tva || 19.25;
    if (document.getElementById('defaultPaymentTerms')) document.getElementById('defaultPaymentTerms').value = financialSettings.default_payment_terms || 30;
    if (document.getElementById('invoiceNotesDefault')) document.getElementById('invoiceNotesDefault').value = financialSettings.invoice_notes_default || '';
}

function toggleCurrency(code, badge) {
    if (!financialSettings.active_currencies) financialSettings.active_currencies = [];
    const idx = financialSettings.active_currencies.indexOf(code);
    if (idx === -1) {
        financialSettings.active_currencies.push(code);
        badge.classList.add('active');
    } else {
        if (code === financialSettings.default_currency) {
            showAlert('Impossible de désactiver la devise par défaut.', 'warning');
            return;
        }
        financialSettings.active_currencies.splice(idx, 1);
        badge.classList.remove('active');
    }
}

async function saveGlobalSettings() {
    try {
        const select = document.getElementById('defaultCurrency');
        const newDefault = select ? (select.value || 'XAF') : 'XAF';

        if (!financialSettings.active_currencies.includes(newDefault)) {
            financialSettings.active_currencies.push(newDefault);
        }

        const payload = {
            default_currency: newDefault,
            active_currencies: financialSettings.active_currencies,
            default_tva: parseFloat(document.getElementById('defaultTva')?.value || 0),
            default_payment_terms: parseInt(document.getElementById('defaultPaymentTerms')?.value || 30),
            invoice_notes_default: document.getElementById('invoiceNotesDefault')?.value || ''
        };

        const response = await fetchFinancialApi('/api/financial-settings', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (response.success) {
            financialSettings = { ...financialSettings, ...payload };
            showAlert('Param\u00e8tres globaux sauvegard\u00e9s', 'success');
        } else {
            showAlert('Erreur sauvegarde', 'danger');
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur sauvegarde', 'danger');
    }
}

// --- TAXES ---

async function loadTaxes() {
    try {
        const response = await fetchFinancialApi('/api/financial-settings/taxes/list');
        if (response.success) {
            taxes = response.data;
            renderTaxesTable();
        }
    } catch (error) {
        console.error('Erreur chargement taxes:', error);
    }
}

function renderTaxesTable() {
    const tbody = document.querySelector('#taxesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = taxes.map(tax => `
        <tr>
            <td>${tax.name}</td>
            <td>${tax.rate}%</td>
            <td><span class="badge bg-${tax.type === 'ADDED' ? 'info' : 'warning'}">${tax.type === 'ADDED' ? 'Ajout\u00e9e' : 'Retenue'}</span></td>
            <td>${tax.description || '-'}</td>
            <td>${tax.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick='openTaxModal(${JSON.stringify(tax)})'>
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTax(${tax.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.openTaxModal = function (tax = null) {
    const modal = new bootstrap.Modal(document.getElementById('taxModal'));
    if (tax) {
        document.getElementById('taxId').value = tax.id;
        document.getElementById('taxName').value = tax.name;
        document.getElementById('taxRate').value = tax.rate;
        document.getElementById('taxType').value = tax.type;
        document.getElementById('taxDescription').value = tax.description || '';
        document.getElementById('taxActive').checked = tax.is_active;
    } else {
        document.getElementById('taxForm').reset();
        document.getElementById('taxId').value = '';
    }
    modal.show();
};

window.saveTax = async function () {
    const id = document.getElementById('taxId').value;
    const payload = {
        name: document.getElementById('taxName').value,
        rate: parseFloat(document.getElementById('taxRate').value),
        type: document.getElementById('taxType').value,
        description: document.getElementById('taxDescription').value,
        is_active: document.getElementById('taxActive').checked
    };

    try {
        const url = id ? `/api/financial-settings/taxes/${id}` : '/api/financial-settings/taxes';
        const method = id ? 'PUT' : 'POST';

        const response = await fetchFinancialApi(url, {
            method: method,
            body: JSON.stringify(payload)
        });

        if (response.success) {
            bootstrap.Modal.getInstance(document.getElementById('taxModal')).hide();
            loadTaxes();
            showAlert('Taxe enregistr\u00e9e', 'success');
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur enregistrement taxe', 'danger');
    }
};

window.deleteTax = async function (id) {
    if (!confirm('Voulez-vous vraiment supprimer cette taxe ?')) return;
    try {
        const response = await fetchFinancialApi(`/api/financial-settings/taxes/${id}`, { method: 'DELETE' });
        if (response.success) {
            loadTaxes();
            showAlert('Taxe supprim\u00e9e', 'success');
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur suppression taxe', 'danger');
    }
};

// --- BU SETTINGS ---

async function loadBUs() {
    try {
        const response = await fetchFinancialApi('/api/financial-settings/bus/list');
        if (response.success) {
            bus = response.data;
            const select = document.getElementById('buSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Choisir une BU --</option>' +
                    bus.map(bu => `<option value="${bu.id}">${bu.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement BUs:', error);
    }
}

// Charger la liste des BUs d\u00e9j\u00e0 configur\u00e9es
async function loadConfiguredBUs() {
    try {
        const response = await fetchFinancialApi('/api/financial-settings/bu-settings/configured-list');
        if (response.success) {
            configuredBUs = response.data;
            renderConfiguredBUsTable();
        }
    } catch (error) {
        console.error('Erreur chargement BUs configur\u00e9es:', error);
    }
}

// Afficher le tableau des BUs configur\u00e9es
function renderConfiguredBUsTable() {
    const tbody = document.querySelector('#buConfigTable tbody');
    if (!tbody) return;

    if (configuredBUs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune BU configur\u00e9e pour le moment.</td></tr>';
        return;
    }

    tbody.innerHTML = configuredBUs.map(config => {
        const taxNames = config.active_tax_ids && config.active_tax_ids.length > 0
            ? taxes.filter(t => config.active_tax_ids.includes(t.id)).map(t => t.name).join(', ')
            : 'Aucune';

        const templateLabel = config.invoice_template === 'FEES' ? 'Honoraires/D\u00e9bours' : 'Standard';

        return `
            <tr>
                <td><strong>${config.bu_name}</strong></td>
                <td><code>${config.invoice_prefix || '-'}</code></td>
                <td><span class="badge bg-secondary">${templateLabel}</span></td>
                <td>${taxNames}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick='editBuConfig(${JSON.stringify(config)})'>
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBuConfig('${config.business_unit_id}', '${config.bu_name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Afficher le formulaire pour nouvelle config ou \u00e9dition
window.showBuConfigForm = function (buId = null) {
    document.getElementById('buConfiguredList').style.display = 'none';
    document.getElementById('buConfigFormContainer').style.display = 'block';

    const title = document.getElementById('buConfigFormTitle');
    title.textContent = buId ? 'Modifier la Configuration BU' : 'Nouvelle Configuration BU';

    if (buId) {
        document.getElementById('buSelect').value = buId;
        loadBuSettings(buId);
    } else {
        document.getElementById('buSelect').value = '';
        document.getElementById('buConfigForm').style.display = 'none';
    }
};

// Annuler et retourner \u00e0 la liste
window.cancelBuConfigForm = function () {
    document.getElementById('buConfigFormContainer').style.display = 'none';
    document.getElementById('buConfiguredList').style.display = 'block';
};

// \u00c9diter une config existante
window.editBuConfig = function (config) {
    showBuConfigForm(config.business_unit_id);
};

// Supprimer une config BU
window.deleteBuConfig = async function (buId, buName) {
    if (!confirm(`Voulez-vous vraiment supprimer la configuration de "${buName}" ?`)) return;
    try {
        const response = await fetchFinancialApi(`/api/financial-settings/bu-settings/${buId}`, { method: 'DELETE' });
        if (response.success) {
            loadConfiguredBUs();
            showAlert('Configuration supprim\u00e9e', 'success');
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur suppression config BU', 'danger');
    }
};

async function loadBuSettings(buId) {
    const form = document.getElementById('buConfigForm');
    if (!buId) {
        form.style.display = 'none';
        return;
    }

    try {
        const response = await fetchFinancialApi(`/api/financial-settings/bu-settings/${buId}`);
        if (response.success) {
            currentBuSettings = response.data;

            document.getElementById('buInvoicePrefix').value = currentBuSettings.invoice_prefix || '';
            document.getElementById('buInvoiceStart').value = currentBuSettings.invoice_start_number || 1;
            document.getElementById('buInvoiceTemplate').value = currentBuSettings.invoice_template || 'FEES';
            document.getElementById('buInvoiceFooter').value = currentBuSettings.invoice_footer || '';

            // Render taxes checkboxes
            const taxesContainer = document.getElementById('buTaxesContainer');
            const activeTaxIds = currentBuSettings.active_tax_ids || [];

            taxesContainer.innerHTML = taxes.map(tax => `
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" value="${tax.id}" id="tax_${tax.id}" 
                        ${activeTaxIds.includes(tax.id) ? 'checked' : ''}>
                    <label class="form-check-label" for="tax_${tax.id}">
                        ${tax.name} (${tax.rate}%)
                    </label>
                </div>
            `).join('');

            form.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur chargement config BU', 'danger');
    }
}

async function saveBuSettings() {
    const buId = document.getElementById('buSelect').value;
    if (!buId) return;

    // R\u00e9cup\u00e9rer les taxes coch\u00e9es
    const activeTaxIds = Array.from(document.querySelectorAll('#buTaxesContainer input:checked'))
        .map(cb => parseInt(cb.value));

    const payload = {
        invoice_prefix: document.getElementById('buInvoicePrefix').value,
        invoice_start_number: parseInt(document.getElementById('buInvoiceStart').value),
        invoice_template: document.getElementById('buInvoiceTemplate').value,
        invoice_footer: document.getElementById('buInvoiceFooter').value,
        active_tax_ids: activeTaxIds
    };

    try {
        const response = await fetchFinancialApi(`/api/financial-settings/bu-settings/${buId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (response.success) {
            showAlert('Configuration BU sauvegard\u00e9e', 'success');
            cancelBuConfigForm();
            loadConfiguredBUs();
        }
    } catch (error) {
        console.error(error);
        showAlert('Erreur sauvegarde config BU', 'danger');
    }
}

// --- UTILS ---

async function fetchFinancialApi(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Token manquant');

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}
