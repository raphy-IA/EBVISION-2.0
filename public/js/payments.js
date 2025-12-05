/**
 * Payments Management JavaScript
 */

// ========== UTILITY FUNCTIONS ==========

// Format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: localStorage.getItem('defaultCurrency') || 'XAF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Show error message
function showError(message) {
    alert('❌ ' + message);
}

// Show success message
function showSuccess(message) {
    alert('✅ ' + message);
}

// Authenticated fetch
function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
}

// ========== MAIN CODE ==========

let availableInvoices = [];
let allocationRows = [];
let currentPaymentId = null; // null = mode création, ID = mode édition
let paymentModal;
let allocationModal; // Nouveau modal
let viewPaymentModal; // Modal détails paiement
let modalAllocationRows = []; // Allocations pour le modal
let modalAvailableInvoices = []; // Factures pour le modal


// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    allocationModal = new bootstrap.Modal(document.getElementById('allocationModal'));
    viewPaymentModal = new bootstrap.Modal(document.getElementById('viewPaymentModal'));
    await loadBusinessUnits();
    await loadPayments();
});

// Charger les BU
async function loadBusinessUnits() {
    try {
        const response = await authenticatedFetch('/api/business-units');
        const data = await response.json();

        const select = document.getElementById('filterBU');
        data.data.forEach(bu => {
            select.innerHTML += `<option value="${bu.id}">${bu.nom}</option>`;
        });
    } catch (error) {
        console.error('Erreur chargement BU:', error);
    }
}

// Charger les paiements
async function loadPayments() {
    try {
        const filters = {
            business_unit_id: document.getElementById('filterBU').value,
            payment_mode: document.getElementById('filterMode').value,
            date_from: document.getElementById('filterDateFrom').value,
            date_to: document.getElementById('filterDateTo').value
        };

        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        const response = await authenticatedFetch(`/api/payments?${params}`);
        const data = await response.json();

        displayPayments(data.data);
    } catch (error) {
        console.error('Erreur chargement paiements:', error);
        showError('Erreur lors du chargement des paiements');
    }
}

// Afficher les paiements
function displayPayments(payments) {
    const tbody = document.getElementById('paymentsTable');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Aucun paiement trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(p => `
        <tr>
            <td><strong>${p.payment_number}</strong></td>
            <td>${formatDate(p.payment_date)}</td>
            <td>${p.business_unit_nom || '-'}</td>
            <td>
                <div>${p.account_name}</div>
                <small class="text-muted">${p.institution_name}</small>
            </td>
            <td><span class="badge bg-secondary">${p.payment_mode}</span></td>
            <td class="text-end fw-bold">${formatCurrency(p.amount)}</td>
            <td class="text-end text-warning fw-bold">${formatCurrency(p.amount - (p.allocated_amount || 0))}</td>
            <td>${p.reference || '-'}</td>
            <td><span class="badge bg-info">${p.invoices_count} alloc.</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewPayment('${p.id}')" title="Détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editPayment('${p.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="openAllocationModal('${p.id}')" title="Gérer les Allocations">
                    <i class="fas fa-file-invoice-dollar"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePayment('${p.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Ouvrir le modal d'ajout
async function openAddPaymentModal() {
    currentPaymentId = null;
    document.getElementById('paymentForm').reset();
    document.querySelector('#paymentModal .modal-title').textContent = 'Enregistrer un Paiement';
    document.getElementById('paymentDate').valueAsDate = new Date();

    await loadBankAccounts();
    paymentModal.show();
}

// Charger les comptes bancaires
async function loadBankAccounts() {
    try {
        const response = await authenticatedFetch('/api/bank-accounts?is_active=true');
        const data = await response.json();

        const select = document.getElementById('bankAccountId');
        // Garder la valeur actuelle si on est en édition
        const currentValue = select.value;
        select.innerHTML = '<option value="">Sélectionner...</option>';

        data.data.forEach(account => {
            select.innerHTML += `
                <option value="${account.id}" data-bu="${account.business_unit_id}">
                    ${account.business_unit_nom} - ${account.account_name} (${account.institution_name})
                </option>
            `;
        });

        if (currentValue) select.value = currentValue;

    } catch (error) {
        console.error('Erreur chargement comptes:', error);
    }
}

// Charger les factures pour le compte sélectionné (seulement pour info ou debug maintenant)
async function loadInvoicesForAccount() {
    // Cette fonction n'est plus critique pour la création mais peut rester
    // pour de futurs besoins. On la laisse vide pour simplifier.
}

// Éditer un paiement
async function editPayment(id) {
    try {
        const response = await authenticatedFetch(`/api/payments/${id}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);
        const p = data.data;

        currentPaymentId = id;
        document.querySelector('#paymentModal .modal-title').textContent = 'Modifier le Paiement';

        // Charger les comptes d'abord
        await loadBankAccounts();

        // Remplir le formulaire
        document.getElementById('bankAccountId').value = p.bank_account_id;
        document.getElementById('paymentDate').value = p.payment_date.split('T')[0];
        document.getElementById('paymentMode').value = p.payment_mode;
        document.getElementById('paymentAmount').value = p.amount;
        document.getElementById('paymentReference').value = p.reference || '';
        document.getElementById('paymentNotes').value = p.notes || '';

        paymentModal.show();

    } catch (error) {
        console.error('Erreur chargement paiement:', error);
        showError('Impossible de charger le paiement à modifier');
    }
}

// Sauvegarder le paiement
async function savePayment() {
    try {
        const form = document.getElementById('paymentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = {
            bank_account_id: document.getElementById('bankAccountId').value,
            payment_date: document.getElementById('paymentDate').value,
            payment_mode: document.getElementById('paymentMode').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            reference: document.getElementById('paymentReference').value,
            notes: document.getElementById('paymentNotes').value
        };

        const url = currentPaymentId
            ? `/api/payments/${currentPaymentId}`
            : '/api/payments';

        const method = currentPaymentId ? 'PUT' : 'POST';

        const response = await authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(currentPaymentId ? 'Paiement modifié avec succès' : 'Paiement enregistré avec succès');
            paymentModal.hide();
            loadPayments();
        } else {
            showError(result.error);
        }

    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showError('Erreur lors de l\'enregistrement du paiement');
    }
}

// GESTION DES ALLOCATIONS (POST-PAIEMENT)
// =================================================================

// Ouvrir le modal d'allocation
async function openAllocationModal(paymentId) {
    try {
        const response = await authenticatedFetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);
        const payment = data.data;

        // Stocker les infos du paiement
        document.getElementById('allocationPaymentId').value = payment.id;
        document.getElementById('allocationPaymentAmount').value = payment.amount;
        document.getElementById('displayPaymentAmount').textContent = formatCurrency(payment.amount);

        // Charger les factures disponibles pour la BU du paiement
        // On récupère TOUTES les factures de la BU qui sont émises et qui ont un reste à payer > 0
        // PLUS les factures déjà allouées à ce paiement (pour pouvoir modifier/voir)
        await loadAvailableInvoicesForModal(payment.business_unit_id);

        // Initialiser les allocations existantes
        modalAllocationRows = (payment.allocations || []).map(alloc => ({
            id: Date.now() + Math.random(),
            invoice_id: alloc.invoice_id,
            allocated_amount: parseFloat(alloc.allocated_amount),
            // Infos pour l'affichage (non sauvegardées mais utiles)
            numero_facture: alloc.numero_facture,
            montant_restant: parseFloat(alloc.montant_restant) + parseFloat(alloc.allocated_amount), // Reste original avant ce paiement
            montant_ttc: parseFloat(alloc.montant_ttc)
        }));

        renderModalAllocations();
        recalculateModalTotals();

        allocationModal.show();

    } catch (error) {
        console.error('Erreur ouverture modal allocation:', error);
        showError('Impossible de charger les détails du paiement');
    }
}

// Charger les factures pour le modal
async function loadAvailableInvoicesForModal(buId) {
    try {
        // Obtenir les factures filtres par BU
        // Note: Idéalement il faudrait une API qui donne les factures éligibles
        const response = await authenticatedFetch(`/api/invoices?business_unit_id=${buId}&workflow_status=EMISE`);
        const data = await response.json();
        const allInvoices = data.data || data.invoices || [];

        // Filtrer celles qui ont un reste à payer
        modalAvailableInvoices = allInvoices.filter(inv => parseFloat(inv.montant_restant || 0) > 0);
    } catch (error) {
        console.error('Erreur chargement factures modal:', error);
        modalAvailableInvoices = [];
    }
}

// Ajouter une ligne au modal
function addAllocationRowToModal() {
    modalAllocationRows.push({
        id: Date.now(),
        invoice_id: '',
        allocated_amount: 0,
        montant_restant: 0,
        montant_ttc: 0
    });
    renderModalAllocations();
}

// Supprimer une ligne du modal
function removeAllocationRowFromModal(rowId) {
    modalAllocationRows = modalAllocationRows.filter(r => r.id != rowId);
    renderModalAllocations();
    recalculateModalTotals();
}

// Mettre à jour une allocation dans le modal
function updateAllocationInModal(rowId, field, value) {
    const row = modalAllocationRows.find(r => r.id == rowId);
    if (!row) return;

    if (field === 'invoice_id') {
        const invoice = modalAvailableInvoices.find(inv => inv.id === value);
        if (invoice) {
            row.invoice_id = value;
            row.numero_facture = invoice.numero_facture; // Pour affichage si besoin
            row.montant_restant = parseFloat(invoice.montant_restant);
            row.montant_ttc = parseFloat(invoice.montant_ttc);

            // Pré-remplir le montant alloué ??
            // On pourrait mettre le min(reste, non_alloué_paiement)
        }
    } else if (field === 'allocated_amount') {
        row.allocated_amount = parseFloat(value) || 0;
    }

    renderModalAllocations();
    recalculateModalTotals();
}

// Recalculer les totaux du modal
function recalculateModalTotals() {
    const paymentAmount = parseFloat(document.getElementById('allocationPaymentAmount').value || 0);
    const totalAllocated = modalAllocationRows.reduce((sum, r) => sum + (r.allocated_amount || 0), 0);
    const remaining = paymentAmount - totalAllocated;

    document.getElementById('displayAllocatedAmount').textContent = formatCurrency(totalAllocated);

    const unallocatedEl = document.getElementById('displayUnallocatedAmount');
    unallocatedEl.textContent = formatCurrency(remaining);

    if (remaining < 0) {
        unallocatedEl.classList.remove('text-success');
        unallocatedEl.classList.add('text-danger');
    } else if (remaining === 0) {
        unallocatedEl.classList.remove('text-danger');
        unallocatedEl.classList.add('text-success');
    } else {
        unallocatedEl.classList.remove('text-danger', 'text-success');
    }
}

// Rendu du tableau modal
function renderModalAllocations() {
    const tbody = document.getElementById('modalAllocationsTable');

    // Pour ne pas pouvoir sélectionner deux fois la même facture, on peut filtrer

    tbody.innerHTML = modalAllocationRows.map(row => {
        // Options pour le select
        // On inclut la facture actuellement sélectionnée même si elle n'est plus "disponible" (car déjà prise ici)
        // Mais c'est complexe. Simplifions : on liste toutes les factures dispos.

        const options = modalAvailableInvoices.map(inv =>
            `<option value="${inv.id}" ${inv.id === row.invoice_id ? 'selected' : ''}>
                ${inv.numero_facture} (${formatCurrency(inv.montant_restant)})
            </option>`
        ).join('');

        // Si la facture sélectionnée n'est pas dans la liste (cas d'une facture déjà payée à 100% mais qu'on modifie), il faudrait l'ajouter
        // Pour l'instant on suppose qu'elle est dans la liste ou qu'on gère le cas simples.

        return `
            <tr>
                <td>
                    <select class="form-select form-select-sm" 
                        onchange="updateAllocationInModal(${row.id}, 'invoice_id', this.value)">
                        <option value="">Sélectionner une facture</option>
                        ${options}
                    </select>
                </td>
                <td>${formatCurrency(row.montant_ttc)}</td>
                <td>${formatCurrency(row.montant_restant)}</td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${row.allocated_amount}" 
                           onchange="updateAllocationInModal(${row.id}, 'allocated_amount', this.value)"
                           step="100">
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAllocationRowFromModal(${row.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Sauvegarder les allocations
async function saveAllocationsFromModal() {
    const paymentId = document.getElementById('allocationPaymentId').value;
    const paymentAmount = parseFloat(document.getElementById('allocationPaymentAmount').value);

    const validAllocations = modalAllocationRows.filter(r => r.invoice_id && r.allocated_amount > 0);

    // Validation somme
    const totalAllocated = validAllocations.reduce((sum, r) => sum + r.allocated_amount, 0);

    if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
        if (!confirm(`Attention : Le montant total alloué (${formatCurrency(totalAllocated)}) ne correspond pas au montant du paiement (${formatCurrency(paymentAmount)}). Continuer ?`)) {
            return;
        }
    }

    try {
        const response = await authenticatedFetch(`/api/payments/${paymentId}/allocations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                allocations: validAllocations.map(r => ({
                    invoice_id: r.invoice_id,
                    allocated_amount: r.allocated_amount,
                    notes: ''
                }))
            })
        });

        if (response.ok) {
            showSuccess('Allocations mises à jour avec succès');
            allocationModal.hide();
            loadPayments(); // Recharger la liste
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur sauvegarde allocations:', error);
        showError('Erreur de connexion');
    }
}

// =================================================================
// GESTION DES ALLOCATIONS (POST-PAIEMENT)
// =================================================================

// Ouvrir le modal d'allocation
async function openAllocationModal(paymentId) {
    try {
        const response = await authenticatedFetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);
        const payment = data.data;

        // Stocker les infos du paiement
        document.getElementById('allocationPaymentId').value = payment.id;
        document.getElementById('allocationPaymentAmount').value = payment.amount;
        document.getElementById('allocationPaymentBU').value = payment.business_unit_id; // Stocker la BU
        document.getElementById('displayPaymentAmount').textContent = formatCurrency(payment.amount);

        // Charger les factures disponibles pour la BU du paiement
        await loadAvailableInvoicesForModal(payment.business_unit_id);

        // Initialiser les allocations existantes
        modalAllocationRows = (payment.allocations || []).map(alloc => ({
            id: Date.now() + Math.random(),
            invoice_id: alloc.invoice_id,
            allocated_amount: parseFloat(alloc.allocated_amount),
            // Infos pour l'affichage (non sauvegardées mais utiles)
            numero_facture: alloc.numero_facture,
            // Reste originel = reste actuel + ce qu'on avait alloué
            montant_restant: parseFloat(alloc.montant_restant) + parseFloat(alloc.allocated_amount),
            montant_ttc: parseFloat(alloc.montant_ttc)
        }));

        renderModalAllocations();
        recalculateModalTotals();

        allocationModal.show();

    } catch (error) {
        console.error('Erreur ouverture modal allocation:', error);
        showError('Impossible de charger les détails du paiement');
    }
}

// Charger les factures pour le modal
async function loadAvailableInvoicesForModal(buId) {
    try {
        const response = await authenticatedFetch(`/api/invoices?business_unit_id=${buId}&workflow_status=EMISE`);
        const data = await response.json();
        const allInvoices = data.data || data.invoices || [];

        // Filtrer celles qui ont un reste à payer > 0
        // Pour être sûr d'avoir aussi les factures complètement payées par CE paiement si on modifie,
        // c'est compliqué. Simplification: on prend celles qui ont un reste > 0.
        // Si une facture est déjà payée totalement par ce paiement, elle n'apparaitra pas dans "available" 
        // MAIS elle sera déjà dans `modalAllocationRows` donc on aura son numero_facture via row.numero_facture.
        // Si on veut changer l'allocation d'une facture payée, elle ne sera pas dans la liste déroulante pour la RÉ-AJOUTER, 
        // mais elle sera déjà présente dans la ligne. C'est acceptable.

        modalAvailableInvoices = allInvoices.filter(inv => parseFloat(inv.montant_restant || 0) > 0);
    } catch (error) {
        console.error('Erreur chargement factures modal:', error);
        modalAvailableInvoices = [];
    }
}

// Ajouter une ligne au modal
function addAllocationRowToModal() {
    modalAllocationRows.push({
        id: Date.now(),
        invoice_id: '',
        allocated_amount: 0,
        montant_restant: 0,
        montant_ttc: 0
    });
    renderModalAllocations();
}

// Supprimer une ligne du modal
function removeAllocationRowFromModal(rowId) {
    modalAllocationRows = modalAllocationRows.filter(r => r.id != rowId);
    renderModalAllocations();
    recalculateModalTotals();
}

// Mettre à jour une allocation dans le modal
function updateAllocationInModal(rowId, field, value) {
    const row = modalAllocationRows.find(r => r.id == rowId);
    if (!row) return;

    if (field === 'invoice_id') {
        const invoice = modalAvailableInvoices.find(inv => inv.id === value);
        if (invoice) {
            row.invoice_id = value;
            row.numero_facture = invoice.numero_facture;
            row.montant_restant = parseFloat(invoice.montant_restant);
            row.montant_ttc = parseFloat(invoice.montant_ttc);

            // Pré-remplir avec le reste à payer ou le reste du paiement
            const paymentAmount = parseFloat(document.getElementById('allocationPaymentAmount').value || 0);
            const currentTotal = modalAllocationRows.reduce((sum, r) => sum + (r.id === rowId ? 0 : r.allocated_amount), 0);
            const availablePayment = Math.max(0, paymentAmount - currentTotal);

            // On propose le min(reste facture, reste paiement)
            row.allocated_amount = Math.min(row.montant_restant, availablePayment);
        }
    } else if (field === 'allocated_amount') {
        row.allocated_amount = parseFloat(value) || 0;
    }

    renderModalAllocations();
    recalculateModalTotals();
}

// Recalculer les totaux du modal
function recalculateModalTotals() {
    const paymentAmount = parseFloat(document.getElementById('allocationPaymentAmount').value || 0);
    const totalAllocated = modalAllocationRows.reduce((sum, r) => sum + (r.allocated_amount || 0), 0);
    const remaining = paymentAmount - totalAllocated;

    document.getElementById('displayAllocatedAmount').textContent = formatCurrency(totalAllocated);

    const unallocatedEl = document.getElementById('displayUnallocatedAmount');
    unallocatedEl.textContent = formatCurrency(remaining);

    if (remaining < 0) { // Trop alloué
        unallocatedEl.classList.remove('text-success');
        unallocatedEl.classList.add('text-danger');
    } else if (Math.abs(remaining) < 0.01) { // Parfait
        unallocatedEl.classList.remove('text-danger');
        unallocatedEl.classList.add('text-success');
    } else { // Reste à allouer
        unallocatedEl.classList.remove('text-danger', 'text-success');
    }
}

// Rendu du tableau modal
function renderModalAllocations() {
    const tbody = document.getElementById('modalAllocationsTable');

    tbody.innerHTML = modalAllocationRows.map(row => {
        // Liste des options : factures disponibles + facture actuelle si elle n'est plus disponible (car payée)
        // Pour simplifier, on affiche les dispos. Si l'ID actuel n'est pas dans les dispos, on ajoute une option "Facture actuelle"
        // pour que l'affichage reste correct (mais on ne peut pas changer pour une autre facture non dispo).

        // Est-ce que la facture allouée est dans la liste des dispos ?
        const isCurrentInAvailable = modalAvailableInvoices.some(inv => inv.id === row.invoice_id);

        let selectHtml = `<select class="form-select form-select-sm" onchange="updateAllocationInModal(${row.id}, 'invoice_id', this.value)">`;
        selectHtml += '<option value="">Sélectionner une facture</option>';

        // Si la facture allouée n'est pas dispo (ex: payée totalement), on l'ajoute en haut
        if (row.invoice_id && !isCurrentInAvailable) {
            selectHtml += `<option value="${row.invoice_id}" selected>${row.numero_facture || 'Facture actuelle'}</option>`;
        }

        selectHtml += modalAvailableInvoices.map(inv =>
            `<option value="${inv.id}" ${inv.id === row.invoice_id ? 'selected' : ''}>
                ${inv.numero_facture} (Reste: ${formatCurrency(inv.montant_restant)})
            </option>`
        ).join('');

        selectHtml += '</select>';

        return `
            <tr>
                <td>${selectHtml}</td>
                <td class="text-end">${formatCurrency(row.montant_ttc)}</td>
                <td class="text-end">${formatCurrency(row.montant_restant)}</td>
                <td>
                    <input type="number" class="form-control form-control-sm text-end" 
                           value="${row.allocated_amount}" 
                           onchange="updateAllocationInModal(${row.id}, 'allocated_amount', this.value)"
                           min="0" step="100">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAllocationRowFromModal(${row.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Sauvegarder les allocations
async function saveAllocationsFromModal() {
    const paymentId = document.getElementById('allocationPaymentId').value;
    const paymentAmount = parseFloat(document.getElementById('allocationPaymentAmount').value);

    // Filtrer les lignes vides ou sans montant
    const validAllocations = modalAllocationRows.filter(r => r.invoice_id && r.allocated_amount > 0);

    // Validation somme
    const totalAllocated = validAllocations.reduce((sum, r) => sum + r.allocated_amount, 0);
    const remaining = paymentAmount - totalAllocated;

    // Avertissement si le total alloué dépasse le paiement
    if (remaining < -0.01) {
        showError(`Le total alloué (${formatCurrency(totalAllocated)}) dépasse le montant du paiement (${formatCurrency(paymentAmount)})`);
        return;
    }

    // Avertissement si le total alloué est inférieur au paiement (juste info)
    if (remaining > 0.01) {
        if (!confirm(`Attention : Le montant total alloué (${formatCurrency(totalAllocated)}) est inférieur au montant du paiement (${formatCurrency(paymentAmount)}). Continuer avec un reste non alloué ?`)) {
            return;
        }
    }

    try {
        const response = await authenticatedFetch(`/api/payments/${paymentId}/allocations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                allocations: validAllocations.map(r => ({
                    invoice_id: r.invoice_id,
                    allocated_amount: r.allocated_amount,
                    notes: ''
                }))
            })
        });

        if (response.ok) {
            showSuccess('Allocations mises à jour avec succès');
            allocationModal.hide();
            loadPayments(); // Recharger la liste pour mettre à jour les comptes
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur sauvegarde allocations:', error);
        showError('Erreur de connexion');
    }
}

// Voir les détails d'un paiement
async function viewPayment(id) {
    try {
        const response = await authenticatedFetch(`/api/payments/${id}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);
        const p = data.data;

        // Informations Générales
        document.getElementById('viewPaymentNumber').textContent = p.payment_number;
        document.getElementById('viewPaymentDate').textContent = formatDate(p.payment_date);
        document.getElementById('viewPaymentMode').innerHTML = `<span class="badge bg-secondary">${p.payment_mode}</span>`;
        document.getElementById('viewPaymentReference').textContent = p.reference || '-';
        document.getElementById('viewPaymentUser').textContent = p.created_by_name || 'Système';

        // Informations Bancaires
        document.getElementById('viewPaymentBank').textContent = p.institution_name;
        document.getElementById('viewPaymentAccountName').textContent = p.account_name;
        document.getElementById('viewPaymentAccountNumber').textContent = p.account_number;
        document.getElementById('viewPaymentBU').textContent = p.business_unit_nom;

        // Totaux
        const amount = parseFloat(p.amount);
        const allocated = p.allocations.reduce((sum, a) => sum + parseFloat(a.allocated_amount), 0);
        const remaining = amount - allocated;

        document.getElementById('viewPaymentAmount').textContent = formatCurrency(amount);
        document.getElementById('viewPaymentAllocated').textContent = formatCurrency(allocated);
        document.getElementById('viewPaymentRemaining').textContent = formatCurrency(remaining);

        // Notes
        const notesContainer = document.getElementById('viewPaymentNotesContainer');
        const notesText = document.getElementById('viewPaymentNotes');
        if (p.notes) {
            notesText.textContent = p.notes;
            notesContainer.style.display = 'block';
        } else {
            notesContainer.style.display = 'none';
        }

        // Allocations Table
        const tbody = document.getElementById('viewPaymentAllocations');
        if (p.allocations && p.allocations.length > 0) {
            tbody.innerHTML = p.allocations.map(a => `
                <tr>
                    <td><strong>${a.invoice_number}</strong></td>
                    <td>${a.client_name}</td>
                    <td>${formatDate(a.invoice_date)}</td>
                    <td class="text-end">${formatCurrency(a.invoice_total)}</td>
                    <td class="text-end fw-bold text-success">${formatCurrency(a.allocated_amount)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune allocation</td></tr>';
        }

        // Bouton d'action
        const btnEdit = document.getElementById('btnEditAllocations');
        btnEdit.onclick = () => {
            viewPaymentModal.hide();
            openAllocationModal(p.id);
        };

        viewPaymentModal.show();

    } catch (error) {
        console.error('Erreur chargement détails:', error);
        showError('Impossible de charger les détails du paiement');
    }
}

// Supprimer un paiement
async function deletePayment(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return;

    try {
        const response = await authenticatedFetch(`/api/payments/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Paiement supprimé');
            loadPayments();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('filterBU').value = '';
    document.getElementById('filterMode').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    loadPayments();
}
