// Gestion Bancaire - Établissements et Comptes

let institutionsData = [];
let bankAccountsData = [];
let businessUnitsData = [];

// ========== ÉTABLISSEMENTS FINANCIERS ==========

async function loadInstitutions() {
    try {
        const response = await fetch('/api/financial-institutions', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            institutionsData = result.data || [];
            renderInstitutionsTable();
            updateInstitutionFilters();
        }
    } catch (error) {
        console.error('Erreur chargement institutions:', error);
    }
}

function renderInstitutionsTable() {
    const tbody = document.querySelector('#institutionsTable tbody');
    if (!tbody) return;

    if (institutionsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun établissement</td></tr>';
        return;
    }

    tbody.innerHTML = institutionsData.map(inst => `
        <tr>
            <td><strong>${inst.code}</strong></td>
            <td>${inst.name}</td>
            <td><span class="badge bg-${inst.type === 'BANK' ? 'primary' : 'info'}">${inst.type}</span></td>
            <td>${inst.country || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editInstitution('${inst.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInstitution('${inst.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openInstitutionModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('institutionModal'));

    // Charger les pays
    loadCountriesForInstitution();

    if (id) {
        const inst = institutionsData.find(i => i.id === id);
        if (inst) {
            document.getElementById('institutionId').value = inst.id;
            document.getElementById('institutionCode').value = inst.code;
            document.getElementById('institutionName').value = inst.name;
            document.getElementById('institutionType').value = inst.type;
            // Attendre que les pays soient chargés avant de sélectionner
            setTimeout(() => {
                document.getElementById('institutionCountry').value = inst.country || '';
            }, 100);
        }
    } else {
        document.getElementById('institutionForm').reset();
        document.getElementById('institutionId').value = '';
        // Sélectionner Cameroun par défaut après chargement des pays
        setTimeout(() => {
            const countrySelect = document.getElementById('institutionCountry');
            const cameroonOption = Array.from(countrySelect.options).find(opt =>
                opt.text.includes('Cameroun') || opt.value === 'Cameroun'
            );
            if (cameroonOption) {
                countrySelect.value = cameroonOption.value;
            }
        }, 100);
    }

    modal.show();
}

function editInstitution(id) {
    openInstitutionModal(id);
}

async function saveInstitution() {
    const id = document.getElementById('institutionId').value;
    const data = {
        code: document.getElementById('institutionCode').value.trim(),
        name: document.getElementById('institutionName').value.trim(),
        type: document.getElementById('institutionType').value,
        country: document.getElementById('institutionCountry').value.trim()
    };

    if (!data.code || !data.name) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    try {
        const url = id ? `/api/financial-institutions/${id}` : '/api/financial-institutions';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('institutionModal')).hide();
            loadInstitutions();
            alert('Établissement enregistré avec succès');
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.error || 'Impossible de sauvegarder'));
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteInstitution(id) {
    if (!confirm('Supprimer cet établissement ? Les comptes bancaires associés seront également supprimés.')) return;

    try {
        const response = await fetch(`/api/financial-institutions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            loadInstitutions();
            loadBankAccounts();
            alert('Établissement supprimé');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
    }
}

// ========== COMPTES BANCAIRES ==========

async function loadBankAccounts() {
    try {
        const buFilter = document.getElementById('filterBankAccountBU')?.value || '';
        const instFilter = document.getElementById('filterBankAccountInst')?.value || '';

        let url = '/api/bank-accounts?';
        if (buFilter) url += `business_unit_id=${buFilter}&`;
        if (instFilter) url += `financial_institution_id=${instFilter}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            bankAccountsData = result.data || [];
            renderBankAccountsTable();
        }
    } catch (error) {
        console.error('Erreur chargement comptes:', error);
    }
}

function renderBankAccountsTable() {
    const tbody = document.querySelector('#bankAccountsTable tbody');
    if (!tbody) return;

    if (bankAccountsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun compte bancaire</td></tr>';
        return;
    }

    tbody.innerHTML = bankAccountsData.map(acc => `
        <tr>
            <td><strong>${acc.business_unit_name || acc.business_unit_code || '-'}</strong></td>
            <td>${acc.institution_name || '-'}</td>
            <td><code>${acc.account_number}</code></td>
            <td>${acc.account_name}</td>
            <td>${acc.is_default ? '<span class="badge bg-success"><i class="fas fa-check"></i> Défaut</span>' : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editBankAccount('${acc.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteBankAccount('${acc.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openBankAccountModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('bankAccountModal'));

    loadBUForBankAccounts();
    loadInstitutionsForBankAccounts();

    if (id) {
        const acc = bankAccountsData.find(a => a.id === id);
        if (acc) {
            document.getElementById('bankAccountId').value = acc.id;
            setTimeout(() => {
                document.getElementById('bankAccountBU').value = acc.business_unit_id;
                document.getElementById('bankAccountInstitution').value = acc.financial_institution_id;
            }, 100);
            document.getElementById('bankAccountNumber').value = acc.account_number;
            document.getElementById('bankAccountName').value = acc.account_name;
            document.getElementById('bankAccountDefault').checked = acc.is_default;
        }
    } else {
        document.getElementById('bankAccountForm').reset();
        document.getElementById('bankAccountId').value = '';
    }

    modal.show();
}

function editBankAccount(id) {
    openBankAccountModal(id);
}

async function saveBankAccount() {
    const id = document.getElementById('bankAccountId').value;
    const data = {
        business_unit_id: document.getElementById('bankAccountBU').value,
        financial_institution_id: document.getElementById('bankAccountInstitution').value,
        account_number: document.getElementById('bankAccountNumber').value.trim(),
        account_name: document.getElementById('bankAccountName').value.trim(),
        is_default: document.getElementById('bankAccountDefault').checked
    };

    if (!data.business_unit_id || !data.financial_institution_id || !data.account_number || !data.account_name) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    try {
        const url = id ? `/api/bank-accounts/${id}` : '/api/bank-accounts';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('bankAccountModal')).hide();
            loadBankAccounts();
            alert('Compte bancaire enregistré avec succès');
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.error || 'Impossible de sauvegarder'));
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteBankAccount(id) {
    if (!confirm('Supprimer ce compte bancaire ?')) return;

    try {
        const response = await fetch(`/api/bank-accounts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            loadBankAccounts();
            alert('Compte supprimé');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
    }
}

// ========== HELPERS ==========

async function loadBUForBankAccounts() {
    try {
        const response = await fetch('/api/business-units', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            businessUnitsData = result.data || result || [];

            const select = document.getElementById('bankAccountBU');
            const filter = document.getElementById('filterBankAccountBU');

            if (select) {
                select.innerHTML = '<option value="">Sélectionner...</option>' +
                    businessUnitsData.map(bu => `<option value="${bu.id}">${bu.code || ''} - ${bu.nom}</option>`).join('');
            }

            if (filter) {
                filter.innerHTML = '<option value="">Toutes les BU</option>' +
                    businessUnitsData.map(bu => `<option value="${bu.id}">${bu.code || ''} - ${bu.nom}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement BU:', error);
    }
}

function loadInstitutionsForBankAccounts() {
    const select = document.getElementById('bankAccountInstitution');
    const filter = document.getElementById('filterBankAccountInst');

    if (select) {
        select.innerHTML = '<option value="">Sélectionner...</option>' +
            institutionsData.map(inst => `<option value="${inst.id}">${inst.name} (${inst.code})</option>`).join('');
    }

    if (filter) {
        filter.innerHTML = '<option value="">Tous les établissements</option>' +
            institutionsData.map(inst => `<option value="${inst.id}">${inst.name}</option>`).join('');
    }
}

function updateInstitutionFilters() {
    loadInstitutionsForBankAccounts();
}

// Charger les pays depuis l'API
async function loadCountriesForInstitution() {
    try {
        const response = await fetch('/api/pays', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const countries = result.data || result || [];

            const select = document.getElementById('institutionCountry');
            if (select) {
                select.innerHTML = '<option value="">Sélectionner un pays...</option>' +
                    countries.map(country => `<option value="${country.nom}">${country.nom}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement pays:', error);
        // Fallback: ajouter au moins Cameroun
        const select = document.getElementById('institutionCountry');
        if (select) {
            select.innerHTML = '<option value="Cameroun">Cameroun</option>';
        }
    }
}

// ========== INITIALISATION ==========

document.addEventListener('DOMContentLoaded', function () {
    const bankingTab = document.getElementById('banking-tab');

    if (bankingTab) {
        bankingTab.addEventListener('shown.bs.tab', function () {
            loadInstitutions();
            loadBankAccounts();
        });
    }
});
