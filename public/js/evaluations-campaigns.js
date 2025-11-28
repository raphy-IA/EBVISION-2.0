// Gestion des campagnes d'évaluation
let currentFiscalYearId = null;
let campaigns = [];
let templates = [];
let currentCampaignId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    await Promise.all([
        loadFiscalYears(),
        loadTemplates()
    ]);

    // Si une année fiscale est sélectionnée par défaut, charger les campagnes
    if (currentFiscalYearId) {
        loadCampaigns();
    }

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('campaignFiscalYear').addEventListener('change', function (e) {
        // Ce select est dans le modal, pas besoin de recharger la liste principale
    });
}

async function loadFiscalYears() {
    try {
        const response = await fetch('/api/fiscal-years', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const fiscalYears = result.data || result;

            // Remplir le select du modal
            const modalSelect = document.getElementById('campaignFiscalYear');
            modalSelect.innerHTML = '<option value="">Sélectionner un exercice...</option>';

            // Trier par année décroissante
            fiscalYears.sort((a, b) => b.annee - a.annee);

            fiscalYears.forEach(fy => {
                const option = document.createElement('option');
                option.value = fy.id;
                option.textContent = `${fy.libelle || 'FY' + fy.annee} (${fy.annee})`;
                modalSelect.appendChild(option);

                // Définir l'année en cours comme par défaut pour le chargement initial
                if (fy.statut === 'EN_COURS' && !currentFiscalYearId) {
                    currentFiscalYearId = fy.id;
                }
            });
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
    }
}

async function loadTemplates() {
    try {
        const response = await fetch('/api/evaluations/templates', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            templates = result.data || result;
        }
    } catch (error) {
        console.error('Erreur chargement templates:', error);
    }
}

async function loadCampaigns() {
    // On charge toutes les campagnes, ou on pourrait filtrer par année si on avait un select principal
    // Pour l'instant on charge tout via l'endpoint général ou filtré par l'année courante si dispo

    try {
        const url = currentFiscalYearId
            ? `/api/evaluations/campaigns?fiscal_year_id=${currentFiscalYearId}`
            : '/api/evaluations/campaigns';

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            campaigns = result.data || result;
            renderCampaigns();
        } else {
            console.error('Erreur API:', await response.text());
            showAlert('Erreur lors du chargement des campagnes', 'danger');
        }
    } catch (error) {
        console.error('Erreur chargement campagnes:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function renderCampaigns() {
    const container = document.getElementById('campaignsList');

    if (campaigns.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-calendar-times fa-2x text-muted mb-3"></i>
                    <p class="text-muted">Aucune campagne d'évaluation trouvée.</p>
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = campaigns.map(campaign => {
        const progress = campaign.total_evaluations > 0
            ? Math.round((campaign.completed_evaluations / campaign.total_evaluations) * 100)
            : 0;

        return `
        <tr>
            <td>
                <strong>${campaign.name}</strong><br>
                <small class="text-muted">${campaign.template_name || 'Modèle standard'}</small>
            </td>
            <td>
                ${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}
            </td>
            <td>${campaign.fiscal_year_label || '-'}</td>
            <td>
                <span class="badge badge-status ${campaign.status ? campaign.status.toLowerCase() : 'planned'}">
                    ${getStatusLabel(campaign.status)}
                </span>
            </td>
            <td>
                <i class="fas fa-users me-1"></i>${campaign.total_evaluations || 0}
            </td>
            <td style="width: 150px;">
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${progress}%"></div>
                    </div>
                    <span class="small text-muted">${progress}%</span>
                </div>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editCampaign('${campaign.id}')" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteCampaign('${campaign.id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function getStatusLabel(status) {
    const labels = {
        'PLANNED': 'Planifiée',
        'ACTIVE': 'Active',
        'CLOSED': 'Clôturée'
    };
    return labels[status] || status;
}

function openCreateCampaignModal() {
    currentCampaignId = null;
    document.getElementById('campaignForm').reset();
    document.getElementById('campaignModalTitle').textContent = 'Nouvelle Campagne';
    document.getElementById('campaignId').value = '';

    // Pré-sélectionner l'année fiscale courante
    if (currentFiscalYearId) {
        document.getElementById('campaignFiscalYear').value = currentFiscalYearId;
    }

    const modal = new bootstrap.Modal(document.getElementById('campaignModal'));
    modal.show();
}

function editCampaign(id) {
    const campaign = campaigns.find(c => c.id == id);
    if (!campaign) return;

    currentCampaignId = id;
    document.getElementById('campaignModalTitle').textContent = 'Modifier la Campagne';
    document.getElementById('campaignId').value = campaign.id;
    document.getElementById('campaignName').value = campaign.name;
    document.getElementById('campaignFiscalYear').value = campaign.fiscal_year_id;
    document.getElementById('campaignStatus').value = campaign.status;
    document.getElementById('campaignStartDate').value = campaign.start_date.split('T')[0];
    document.getElementById('campaignEndDate').value = campaign.end_date.split('T')[0];
    document.getElementById('campaignDescription').value = campaign.description || '';

    const modal = new bootstrap.Modal(document.getElementById('campaignModal'));
    modal.show();
}

async function saveCampaign() {
    const form = document.getElementById('campaignForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Pour l'instant on utilise le premier template disponible par défaut si pas de sélection
    // Idéalement il faudrait un select pour le template dans le formulaire
    const templateId = templates.length > 0 ? templates[0].id : null;

    const data = {
        name: document.getElementById('campaignName').value,
        fiscal_year_id: document.getElementById('campaignFiscalYear').value,
        status: document.getElementById('campaignStatus').value,
        start_date: document.getElementById('campaignStartDate').value,
        end_date: document.getElementById('campaignEndDate').value,
        description: document.getElementById('campaignDescription').value,
        template_id: templateId,
        target_type: 'ALL', // Par défaut pour l'instant
        target_id: null
    };

    try {
        const url = currentCampaignId
            ? `/api/evaluations/campaigns/${currentCampaignId}`
            : '/api/evaluations/campaigns';

        const method = currentCampaignId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('campaignModal'));
            modal.hide();
            showAlert('Campagne enregistrée avec succès', 'success');
            loadCampaigns();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de l\'enregistrement', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function deleteCampaign(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    try {
        const response = await fetch(`/api/evaluations/campaigns/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            showAlert('Campagne supprimée', 'success');
            loadCampaigns();
        } else {
            showAlert('Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
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
    setTimeout(() => alertDiv.remove(), 5000);
}
