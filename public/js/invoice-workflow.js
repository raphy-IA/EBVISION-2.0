/**
 * Invoice Workflow Management
 * Gère le workflow de validation des factures
 */

let currentInvoiceWorkflow = null;

/**
 * Initialiser le workflow UI
 */
function initWorkflowUI(invoice) {
    currentInvoiceWorkflow = invoice;

    // Afficher le statut workflow
    updateWorkflowBadge(invoice.workflow_status);

    // Afficher la timeline
    renderWorkflowTimeline(invoice);

    // Afficher les boutons appropriés
    renderWorkflowActions(invoice);

    // Afficher la raison de rejet si applicable
    if (invoice.rejection_reason) {
        document.getElementById('rejectionAlert').style.display = 'block';
        document.getElementById('rejectionReason').textContent = invoice.rejection_reason;
    }

    // Activer/désactiver l'édition de la date d'échéance
    const editableStatuses = ['BROUILLON', 'SOUMISE_VALIDATION'];
    if (editableStatuses.includes(invoice.workflow_status)) {
        const btnEdit = document.getElementById('btnEditDueDate');
        if (btnEdit) btnEdit.style.display = 'inline-block';
    }
}

/**
 * Mettre à jour le badge de statut
 */
function updateWorkflowBadge(status) {
    const badge = document.getElementById('workflowStatusBadge');
    if (!badge) return;

    const statusConfig = {
        'BROUILLON': { class: 'bg-secondary', text: 'Brouillon' },
        'SOUMISE_VALIDATION': { class: 'bg-warning', text: 'En Validation' },
        'VALIDEE': { class: 'bg-info', text: 'Validée' },
        'SOUMISE_EMISSION': { class: 'bg-primary', text: 'Soumise pour Émission' },
        'VALIDEE_EMISSION': { class: 'bg-info', text: 'Validée pour Émission' },
        'EMISE': { class: 'bg-success', text: 'Émise' },
        'PAYEE_PARTIELLEMENT': { class: 'bg-warning', text: 'Payée Partiellement' },
        'PAYEE': { class: 'bg-success', text: 'Payée' },
        'ANNULEE': { class: 'bg-danger', text: 'Annulée' }
    };

    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    badge.className = `badge ${config.class}`;
    badge.textContent = config.text;
}

/**
 * Afficher la timeline du workflow
 */
function renderWorkflowTimeline(invoice) {
    const timeline = document.getElementById('workflowTimeline');
    if (!timeline) return;

    const steps = [
        {
            status: 'BROUILLON',
            icon: 'fa-file',
            label: 'Brouillon',
            date: invoice.created_at,
            user: invoice.created_by_prenom ? `${invoice.created_by_prenom} ${invoice.created_by_nom}` : null
        },
        {
            status: 'SOUMISE_VALIDATION',
            icon: 'fa-paper-plane',
            label: 'Soumise pour Validation',
            date: invoice.submitted_for_validation_at,
            user: null
        },
        {
            status: 'VALIDEE',
            icon: 'fa-check',
            label: 'Validée',
            date: invoice.validated_at,
            user: invoice.validated_by_prenom ? `${invoice.validated_by_prenom} ${invoice.validated_by_nom}` : null,
            notes: invoice.validation_notes
        },
        {
            status: 'SOUMISE_EMISSION',
            icon: 'fa-share',
            label: 'Soumise pour Émission',
            date: invoice.submitted_for_emission_at,
            user: null
        },
        {
            status: 'VALIDEE_EMISSION',
            icon: 'fa-check-double',
            label: 'Validée pour Émission',
            date: invoice.emission_validated_at,
            user: invoice.emission_validated_by_prenom ? `${invoice.emission_validated_by_prenom} ${invoice.emission_validated_by_nom}` : null,
            notes: invoice.emission_validation_notes
        },
        {
            status: 'EMISE',
            icon: 'fa-envelope',
            label: 'Émise',
            date: invoice.emitted_at,
            user: invoice.emitted_by_prenom ? `${invoice.emitted_by_prenom} ${invoice.emitted_by_nom}` : null
        }
    ];

    let html = '<div class="timeline">';

    steps.forEach((step, index) => {
        const isActive = step.date !== null && step.date !== undefined;
        const isCurrent = invoice.workflow_status === step.status;
        const isPast = index < steps.findIndex(s => s.status === invoice.workflow_status);

        html += `
            <div class="timeline-item ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}">
                <div class="timeline-marker">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h6>${step.label}</h6>
                    ${step.date ? `<small class="text-muted">${formatDate(step.date)}</small>` : ''}
                    ${step.user ? `<br><small>${step.user}</small>` : ''}
                    ${step.notes ? `<p class="mt-1 mb-0"><em>${step.notes}</em></p>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    timeline.innerHTML = html;
}

/**
 * Afficher les boutons d'action appropriés
 */
function renderWorkflowActions(invoice) {
    // Cacher tous les boutons
    ['btnSubmitValidation', 'btnValidate', 'btnValidateEmission', 'btnEmit', 'btnReject', 'btnCancel']
        .forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'none';
        });

    const status = invoice.workflow_status;

    // Afficher les boutons selon le statut
    if (status === 'BROUILLON') {
        showButton('btnSubmitValidation');
    } else if (status === 'SOUMISE_VALIDATION') {
        showButton('btnValidate');
        showButton('btnReject');
    } else if (status === 'SOUMISE_EMISSION') {
        showButton('btnValidateEmission');
        showButton('btnReject');
    } else if (status === 'VALIDEE_EMISSION') {
        showButton('btnEmit');
    }

    // Bouton annuler (toujours disponible sauf si déjà annulée ou payée)
    if (!['ANNULEE', 'PAYEE', 'PAYEE_PARTIELLEMENT'].includes(status)) {
        showButton('btnCancel');
    }
}

function showButton(id) {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = 'inline-block';
}

/**
 * Soumettre pour validation
 */
async function submitForValidation() {
    if (!confirm('Voulez-vous soumettre cette facture pour validation ?')) return;

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/submit-validation`, {
            method: 'PATCH'
        });

        if (response.ok) {
            showSuccess('Facture soumise pour validation');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la soumission');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Valider la facture
 */
async function validateInvoice() {
    const notes = prompt('Notes de validation (optionnel):');
    if (notes === null) return; // Annulé

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/validate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });

        if (response.ok) {
            showSuccess('Facture validée et soumise pour émission');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la validation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Valider pour émission
 */
async function validateEmission() {
    const notes = prompt('Notes de validation pour émission (optionnel):');
    if (notes === null) return;

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/validate-emission`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });

        if (response.ok) {
            showSuccess('Facture validée pour émission');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la validation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Émettre la facture
 */
async function emitInvoice() {
    if (!confirm('Voulez-vous émettre cette facture ? Elle sera envoyée au client.')) return;

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/emit`, {
            method: 'PATCH'
        });

        if (response.ok) {
            showSuccess('Facture émise avec succès');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de l\'émission');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Afficher modal de rejet
 */
function showRejectModal() {
    const reason = prompt('Raison du rejet (obligatoire):');
    if (!reason || reason.trim() === '') {
        showError('La raison du rejet est obligatoire');
        return;
    }

    rejectInvoice(reason);
}

/**
 * Rejeter la facture
 */
async function rejectInvoice(reason) {
    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rejection_reason: reason })
        });

        if (response.ok) {
            showSuccess('Facture rejetée');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors du rejet');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Afficher modal d'annulation
 */
function showCancelModal() {
    const reason = prompt('Raison de l\'annulation (obligatoire):');
    if (!reason || reason.trim() === '') {
        showError('La raison de l\'annulation est obligatoire');
        return;
    }

    cancelInvoice(reason);
}

/**
 * Annuler la facture
 */
async function cancelInvoice(reason) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette facture ? Cette action est irréversible.')) return;

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/workflow/cancel`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancellation_reason: reason })
        });

        if (response.ok) {
            showSuccess('Facture annulée');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de l\'annulation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Éditer la date d'échéance
 */
function editDueDate() {
    const display = document.getElementById('invoiceDueDateDisplay');
    const form = document.getElementById('dueDateEditForm');
    const input = document.getElementById('dueDateInput');

    if (!display || !form || !input) return;

    // Convertir la date affichée en format YYYY-MM-DD
    input.value = currentInvoiceWorkflow.date_echeance;

    display.style.display = 'none';
    document.getElementById('btnEditDueDate').style.display = 'none';
    form.style.display = 'block';
}

/**
 * Sauvegarder la date d'échéance
 */
async function saveDueDate() {
    const input = document.getElementById('dueDateInput');
    const newDate = input.value;

    if (!newDate) {
        showError('Veuillez sélectionner une date');
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/invoices/${currentInvoiceWorkflow.id}/due-date`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date_echeance: newDate })
        });

        if (response.ok) {
            showSuccess('Date d\'échéance mise à jour');
            location.reload();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

/**
 * Annuler l'édition de la date d'échéance
 */
function cancelDueDateEdit() {
    const display = document.getElementById('invoiceDueDateDisplay');
    const form = document.getElementById('dueDateEditForm');

    if (!display || !form) return;

    display.style.display = 'inline';
    document.getElementById('btnEditDueDate').style.display = 'inline-block';
    form.style.display = 'none';
}

/**
 * CSS pour la timeline (à ajouter dans un style tag)
 */
const workflowTimelineCSS = `
<style>
.timeline {
    position: relative;
    padding-left: 30px;
}

.timeline-item {
    position: relative;
    padding-bottom: 20px;
    opacity: 0.5;
}

.timeline-item.active,
.timeline-item.current,
.timeline-item.past {
    opacity: 1;
}

.timeline-item.current .timeline-marker {
    background-color: #0d6efd;
    color: white;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.2);
}

.timeline-item.past .timeline-marker {
    background-color: #198754;
    color: white;
}

.timeline-marker {
    position: absolute;
    left: -30px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #e9ecef;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #dee2e6;
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: -15px;
    top: 30px;
    bottom: -10px;
    width: 2px;
    background-color: #dee2e6;
}

.timeline-item:last-child::before {
    display: none;
}

.timeline-content h6 {
    margin-bottom: 5px;
    font-weight: 600;
}

.workflow-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
</style>
`;
