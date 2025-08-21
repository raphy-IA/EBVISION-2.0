// =====================================================
// GESTION DES VALIDATIONS DE CAMPAGNES
// =====================================================

let validationsData = {
    campaigns: [],
    businessUnits: [],
    filters: {
        status: '',
        priority: '',
        businessUnit: '',
        date: ''
    }
};

// Initialisation de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page de validation des campagnes...');
    loadValidationsData();
    setupEventListeners();
});

// Configuration des événements
function setupEventListeners() {
    // Filtres
    document.getElementById('statusFilter').addEventListener('change', filterValidations);
    document.getElementById('priorityFilter').addEventListener('change', filterValidations);
    document.getElementById('businessUnitFilter').addEventListener('change', filterValidations);
    document.getElementById('dateFilter').addEventListener('change', filterValidations);
}

// Charger les données de validation
async function loadValidationsData() {
    try {
        showLoading(true);
        console.log('🔄 Chargement des données de validation...');
        
        // Charger les campagnes à valider
        const validationsRes = await fetch('/api/prospecting/validations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const validationsData = await validationsRes.json();
        
        if (validationsData.success) {
            validationsData.campaigns = validationsData.data || [];
            console.log(`✅ ${validationsData.campaigns.length} campagnes chargées`);
        } else {
            console.error('❌ Erreur chargement validations:', validationsData.error);
            showAlert('Erreur lors du chargement des validations', 'danger');
        }
        
        // Charger les Business Units pour les filtres
        const buRes = await fetch('/api/business-units', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const buData = await buRes.json();
        validationsData.businessUnits = buData.success ? buData.data : [];
        
        // Afficher les données
        displayValidations();
        updateStatistics();
        populateFilters();
        
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        showAlert('Erreur lors du chargement des données', 'danger');
    } finally {
        showLoading(false);
    }
}

// Afficher les validations
function displayValidations() {
    const container = document.getElementById('validations-content');
    
    if (validationsData.campaigns.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                <p class="text-muted">Aucune campagne en attente de validation</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    validationsData.campaigns.forEach(campaign => {
        const statusClass = getStatusClass(campaign.validation_status);
        const priorityClass = getPriorityClass(campaign.priority);
        
        html += `
            <div class="campaign-card ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-3">
                                <i class="fas fa-bullhorn text-primary me-2"></i>
                                ${campaign.name}
                            </h6>
                            <span class="status-badge status-${statusClass}">
                                ${getStatusText(campaign.validation_status)}
                            </span>
                            <span class="priority-badge priority-${priorityClass} ms-2">
                                ${getPriorityText(campaign.priority)}
                            </span>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <p class="text-muted mb-1">
                                    <i class="fas fa-building me-1"></i>
                                    <strong>Business Unit:</strong> ${campaign.business_unit_name || 'N/A'}
                                </p>
                                <p class="text-muted mb-1">
                                    <i class="fas fa-sitemap me-1"></i>
                                    <strong>Division:</strong> ${campaign.division_name || 'N/A'}
                                </p>
                                <p class="text-muted mb-1">
                                    <i class="fas fa-user me-1"></i>
                                    <strong>Responsable:</strong> ${campaign.responsible_name || 'N/A'}
                                </p>
                            </div>
                            <div class="col-md-6">
                                <p class="text-muted mb-1">
                                    <i class="fas fa-calendar me-1"></i>
                                    <strong>Date de soumission:</strong> ${formatDate(campaign.submitted_at)}
                                </p>
                                <p class="text-muted mb-1">
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    <strong>Date prévue:</strong> ${formatDate(campaign.scheduled_date)}
                                </p>
                                <p class="text-muted mb-1">
                                    <i class="fas fa-building me-1"></i>
                                    <strong>Entreprises:</strong> ${campaign.companies_count || 0} ciblées
                                </p>
                            </div>
                        </div>
                        
                        ${campaign.description ? `
                            <div class="mb-3">
                                <p class="text-muted mb-1"><strong>Description:</strong></p>
                                <p class="small">${campaign.description}</p>
                            </div>
                        ` : ''}
                        
                        ${campaign.validation_note ? `
                            <div class="validation-note ${statusClass}">
                                <p class="mb-1"><strong>Note de validation:</strong></p>
                                <p class="small mb-0">${campaign.validation_note}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="validation-actions">
                        ${campaign.validation_status === 'PENDING' ? `
                            <button class="btn btn-sm btn-success" onclick="validateCampaign('${campaign.id}', 'APPROVED')">
                                <i class="fas fa-check me-1"></i>Valider
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="validateCampaign('${campaign.id}', 'REJECTED')">
                                <i class="fas fa-times me-1"></i>Rejeter
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-primary" onclick="viewCampaignDetails('${campaign.id}')">
                                <i class="fas fa-eye me-1"></i>Voir détails
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Mettre à jour les statistiques
function updateStatistics() {
    const pending = validationsData.campaigns.filter(c => c.validation_status === 'PENDING').length;
    const approved = validationsData.campaigns.filter(c => c.validation_status === 'APPROVED').length;
    const rejected = validationsData.campaigns.filter(c => c.validation_status === 'REJECTED').length;
    const total = validationsData.campaigns.length;
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = total;
}

// Peupler les filtres
function populateFilters() {
    const buSelect = document.getElementById('businessUnitFilter');
    buSelect.innerHTML = '<option value="">Toutes les BU</option>';
    
    validationsData.businessUnits.forEach(bu => {
        const option = document.createElement('option');
        option.value = bu.id;
        option.textContent = bu.nom;
        buSelect.appendChild(option);
    });
}

// Filtrer les validations
function filterValidations() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const businessUnitFilter = document.getElementById('businessUnitFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    // Mettre à jour les filtres
    validationsData.filters = {
        status: statusFilter,
        priority: priorityFilter,
        businessUnit: businessUnitFilter,
        date: dateFilter
    };
    
    // Appliquer les filtres
    let filteredCampaigns = validationsData.campaigns;
    
    if (statusFilter) {
        filteredCampaigns = filteredCampaigns.filter(c => c.validation_status === statusFilter);
    }
    
    if (priorityFilter) {
        filteredCampaigns = filteredCampaigns.filter(c => c.priority === priorityFilter);
    }
    
    if (businessUnitFilter) {
        filteredCampaigns = filteredCampaigns.filter(c => c.business_unit_id === businessUnitFilter);
    }
    
    if (dateFilter) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        switch (dateFilter) {
            case 'today':
                filteredCampaigns = filteredCampaigns.filter(c => {
                    const submittedDate = new Date(c.submitted_at);
                    return submittedDate >= startOfDay;
                });
                break;
            case 'week':
                const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
                filteredCampaigns = filteredCampaigns.filter(c => {
                    const submittedDate = new Date(c.submitted_at);
                    return submittedDate >= startOfWeek;
                });
                break;
            case 'month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                filteredCampaigns = filteredCampaigns.filter(c => {
                    const submittedDate = new Date(c.submitted_at);
                    return submittedDate >= startOfMonth;
                });
                break;
        }
    }
    
    // Afficher les résultats filtrés
    displayFilteredValidations(filteredCampaigns);
}

// Afficher les validations filtrées
function displayFilteredValidations(campaigns) {
    const container = document.getElementById('validations-content');
    
    if (campaigns.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-filter fa-3x text-muted mb-3"></i>
                <p class="text-muted">Aucune campagne ne correspond aux critères de filtrage</p>
            </div>
        `;
        return;
    }
    
    // Réutiliser la logique d'affichage
    displayValidations();
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('businessUnitFilter').value = '';
    document.getElementById('dateFilter').value = '';
    
    validationsData.filters = {
        status: '',
        priority: '',
        businessUnit: '',
        date: ''
    };
    
    displayValidations();
}

// Actualiser les validations
function refreshValidations() {
    loadValidationsData();
}

// Exporter les validations
function exportValidations() {
    // TODO: Implémenter l'export
    showAlert('Fonctionnalité d\'export à implémenter', 'info');
}

// Fonctions utilitaires
function getStatusClass(status) {
    switch (status) {
        case 'EN_ATTENTE': return 'pending';
        case 'APPROUVEE': return 'approved';
        case 'REJETEE': return 'rejected';
        case 'PENDING': return 'pending';
        case 'APPROVED': return 'approved';
        case 'REJECTED': return 'rejected';
        default: return 'pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'EN_ATTENTE': return 'En attente';
        case 'APPROUVEE': return 'Validée';
        case 'REJETEE': return 'Rejetée';
        case 'PENDING': return 'En attente';
        case 'APPROVED': return 'Validée';
        case 'REJECTED': return 'Rejetée';
        default: return 'Inconnu';
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'normal': return 'normal';
        case 'high': return 'high';
        case 'urgent': return 'urgent';
        default: return 'normal';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 'normal': return 'Normale';
        case 'high': return 'Élevée';
        case 'urgent': return 'Urgente';
        default: return 'Normale';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function showLoading(show) {
    const loading = document.getElementById('validations-loading');
    const content = document.getElementById('validations-content');
    
    if (show) {
        loading.style.display = 'flex';
        content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function showAlert(message, type) {
    // Utiliser la fonction d'alerte existante ou créer une simple
    alert(message);
}

// =====================================================
// FONCTIONS DE VALIDATION DÉTAILLÉE
// =====================================================

let currentValidationCampaign = null;
let validationModal = null;

// Ouvrir le modal de validation détaillée
async function viewCampaignDetails(campaignId) {
    try {
        // Initialiser le modal si nécessaire
        if (!validationModal) {
            validationModal = new bootstrap.Modal(document.getElementById('validationModal'));
        }
        
        // Afficher le modal avec loading
        validationModal.show();
        showValidationModalLoading(true);
        
        // Charger les détails de la campagne
        const response = await fetch(`/api/prospecting/campaigns/${campaignId}/validation-details`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentValidationCampaign = result.data;
            displayValidationModalContent(result.data);
        } else {
            throw new Error(result.error || 'Erreur lors du chargement des détails');
        }
        
    } catch (error) {
        console.error('Erreur ouverture modal validation:', error);
        showAlert('Erreur lors du chargement des détails : ' + error.message, 'danger');
        validationModal.hide();
    }
}

// Afficher le contenu du modal de validation
function displayValidationModalContent(data) {
    const { campaign, companies, validation } = data;
    
    // Mettre à jour le titre
    document.getElementById('validationCampaignName').textContent = campaign.name;
    
    // Informations de la campagne
    document.getElementById('modalCampaignName').textContent = campaign.name;
    document.getElementById('modalCampaignChannel').textContent = campaign.channel || 'Non défini';
    document.getElementById('modalCampaignPriority').innerHTML = `<span class="priority-badge priority-${getPriorityClass(campaign.priority)}">${getPriorityText(campaign.priority)}</span>`;
    document.getElementById('modalCampaignResponsible').textContent = campaign.responsible_name || 'Non défini';
    document.getElementById('modalCampaignBU').textContent = campaign.business_unit_name || 'Non définie';
    document.getElementById('modalCampaignDivision').textContent = campaign.division_name || 'Non définie';
    document.getElementById('modalCampaignDate').textContent = formatDate(campaign.scheduled_date);
    document.getElementById('modalCampaignCompaniesCount').textContent = companies.length;
    
    // Description
    const descriptionDiv = document.getElementById('modalCampaignDescription');
    const descriptionText = document.getElementById('modalCampaignDescriptionText');
    if (campaign.description && campaign.description.trim()) {
        descriptionText.textContent = campaign.description;
        descriptionDiv.style.display = 'block';
    } else {
        descriptionDiv.style.display = 'none';
    }
    
    // Afficher les entreprises
    displayModalCompanies(companies);
    
    // Afficher la note existante si elle existe
    if (validation && validation.note) {
        document.getElementById('validationNote').value = validation.note;
    }
    
    // Masquer le loading et afficher le contenu
    showValidationModalLoading(false);
}

// Afficher les entreprises dans le modal
function displayModalCompanies(companies) {
    const container = document.getElementById('modalCompaniesList');
    
    if (companies.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-building fa-2x text-muted mb-3"></i>
                <p class="text-muted">Aucune entreprise associée à cette campagne</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    companies.forEach(company => {
        const statusClass = company.validation_status === 'APPROVED' ? 'approved' : 
                           company.validation_status === 'REJECTED' ? 'rejected' : '';
        
        html += `
            <div class="company-item ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${company.nom}</h6>
                        <p class="text-muted mb-1">${company.email || 'Aucun email'}</p>
                        <p class="text-muted small mb-0">${company.telephone || 'Aucun téléphone'}</p>
                        ${company.validation_note ? `
                            <div class="validation-note ${statusClass} mt-2">
                                <small><strong>Note :</strong> ${company.validation_note}</small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="ms-3">
                        <div class="btn-group btn-group-sm" role="group">
                            <input type="radio" class="btn-check" name="company_${company.id}" id="approve_${company.id}" value="APPROVED" 
                                   ${company.validation_status === 'APPROVED' ? 'checked' : ''}>
                            <label class="btn btn-outline-success" for="approve_${company.id}">
                                <i class="fas fa-check"></i>
                            </label>
                            
                            <input type="radio" class="btn-check" name="company_${company.id}" id="reject_${company.id}" value="REJECTED"
                                   ${company.validation_status === 'REJECTED' ? 'checked' : ''}>
                            <label class="btn btn-outline-danger" for="reject_${company.id}">
                                <i class="fas fa-times"></i>
                            </label>
                        </div>
                        <div class="mt-1">
                            <input type="text" class="form-control form-control-sm" 
                                   placeholder="Note (optionnel)" 
                                   id="company_note_${company.id}"
                                   value="${company.validation_note || ''}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Approuver la campagne
async function approveCampaign() {
    await validateCampaignAction('APPROVED');
}

// Rejeter la campagne
async function rejectCampaign() {
    await validateCampaignAction('REJECTED');
}

// Action de validation (approuver ou rejeter)
async function validateCampaignAction(action) {
    if (!currentValidationCampaign) {
        showAlert('Aucune campagne sélectionnée', 'warning');
        return;
    }
    
    try {
        const note = document.getElementById('validationNote').value.trim();
        const companyValidations = collectCompanyValidations();
        
        // Validation
        if (action === 'REJECTED' && !note) {
            showAlert('Veuillez ajouter une note de rejet', 'warning');
            return;
        }
        
        // Désactiver les boutons
        const approveBtn = document.querySelector('#validationModal .btn-success');
        const rejectBtn = document.querySelector('#validationModal .btn-danger');
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        
        // Envoyer la validation
        const response = await fetch(`/api/prospecting/campaigns/${currentValidationCampaign.campaign.id}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                action,
                note,
                company_validations: companyValidations
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Campagne ${action === 'APPROVED' ? 'approuvée' : 'rejetée'} avec succès !`, 'success');
            validationModal.hide();
            
            // Recharger les données
            setTimeout(() => {
                loadValidationsData();
            }, 1000);
        } else {
            throw new Error(result.error || 'Erreur lors de la validation');
        }
        
    } catch (error) {
        console.error('Erreur validation:', error);
        showAlert('Erreur lors de la validation : ' + error.message, 'danger');
    } finally {
        // Réactiver les boutons
        const approveBtn = document.querySelector('#validationModal .btn-success');
        const rejectBtn = document.querySelector('#validationModal .btn-danger');
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
    }
}

// Collecter les validations d'entreprises
function collectCompanyValidations() {
    const validations = [];
    
    if (currentValidationCampaign && currentValidationCampaign.companies) {
        currentValidationCampaign.companies.forEach(company => {
            const status = document.querySelector(`input[name="company_${company.id}"]:checked`);
            const note = document.getElementById(`company_note_${company.id}`).value.trim();
            
            if (status) {
                validations.push({
                    company_id: company.id,
                    status: status.value,
                    note: note || null
                });
            }
        });
    }
    
    return validations;
}

// Afficher/masquer le loading du modal
function showValidationModalLoading(show) {
    const loading = document.getElementById('validationModalLoading');
    const content = document.getElementById('validationModalContent');
    
    if (show) {
        loading.style.display = 'block';
        content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

// Valider une campagne (fonction simple)
async function validateCampaign(campaignId, action) {
    try {
        const note = prompt(action === 'REJECTED' ? 'Raison du rejet :' : 'Note de validation (optionnel) :');
        
        if (action === 'REJECTED' && !note) {
            showAlert('Une note est requise pour rejeter une campagne', 'warning');
            return;
        }
        
        const response = await fetch(`/api/prospecting/campaigns/${campaignId}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                action,
                note: note || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Campagne ${action === 'APPROVED' ? 'approuvée' : 'rejetée'} avec succès !`, 'success');
            loadValidationsData();
        } else {
            throw new Error(result.error || 'Erreur lors de la validation');
        }
        
    } catch (error) {
        console.error('Erreur validation:', error);
        showAlert('Erreur lors de la validation : ' + error.message, 'danger');
    }
}
