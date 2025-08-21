// Configuration des APIs
const API = new URL('/api/prospecting', window.location.origin).toString();
const API_TEMPLATES = new URL('/api/prospecting/templates', window.location.origin).toString();
const API_COLLABORATEURS = new URL('/api/collaborateurs', window.location.origin).toString();
let selectedTemplate = null;

// Fonctions utilitaires
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Gestion de l'affichage du formulaire
function showCampaignForm() {
    document.getElementById('createCampaignForm').style.display = 'block';
    document.getElementById('createCampaignForm').scrollIntoView({ behavior: 'smooth' });
}

function hideCampaignForm() {
    document.getElementById('createCampaignForm').style.display = 'none';
    resetCampaignForm();
}

// Réinitialisation du formulaire
function resetCampaignForm() {
    document.getElementById('campName').value = '';
    document.getElementById('campTemplate').value = '';
    document.getElementById('campResponsible').value = '';
    document.getElementById('campDate').value = '';
    document.getElementById('campPriority').value = 'NORMAL';
    document.getElementById('campDescription').value = '';
    
    // Réinitialiser l'affichage automatique
    document.getElementById('autoChannel').textContent = '-';
    document.getElementById('autoBU').textContent = '-';
    document.getElementById('autoDivision').textContent = '-';
    
    selectedTemplate = null;
    
    // Remettre le formulaire en mode création
    const createForm = document.getElementById('createCampaignForm');
    if (createForm) {
        createForm.querySelector('h3').innerHTML = '<i class="fas fa-plus-circle me-2"></i>Créer une nouvelle campagne';
        const saveButton = createForm.querySelector('.btn-light');
        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Créer la campagne';
        saveButton.onclick = createCampaign;
    }
}

// Chargement des modèles
async function loadTemplates() {
    try {
        const res = await fetch(API_TEMPLATES, { headers: getAuthHeader() });
        const data = await res.json();
        const templates = data.data || [];
        
        const templateSel = document.getElementById('campTemplate');
        templateSel.innerHTML = '<option value="">Sélectionnez un modèle</option>';
        
        templates.forEach(template => {
            const opt = document.createElement('option');
            opt.value = template.id;
            opt.textContent = `${template.name} (${template.channel})`;
            opt.dataset.template = JSON.stringify(template);
            templateSel.appendChild(opt);
        });
    } catch (error) {
        console.error('Erreur chargement modèles:', error);
    }
}

// Chargement des collaborateurs (responsables)
async function loadCollaborateurs() {
    try {
        const res = await fetch(API_COLLABORATEURS, { headers: getAuthHeader() });
        const data = await res.json();
        const collaborateurs = data.data || [];
        
        const responsibleSel = document.getElementById('campResponsible');
        responsibleSel.innerHTML = '<option value="">Sélectionnez un responsable</option>';
        
        collaborateurs.forEach(collab => {
            const opt = document.createElement('option');
            opt.value = collab.id;
            opt.textContent = `${collab.prenom} ${collab.nom}`;
            responsibleSel.appendChild(opt);
        });
    } catch (error) {
        console.error('Erreur chargement collaborateurs:', error);
    }
}

// Mise à jour de l'affichage automatique lors de la sélection d'un modèle
function updateAutoConfig() {
    const templateSel = document.getElementById('campTemplate');
    const selectedOption = templateSel.options[templateSel.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        selectedTemplate = JSON.parse(selectedOption.dataset.template);
        
        // Mettre à jour l'affichage automatique
        document.getElementById('autoChannel').textContent = selectedTemplate.channel;
        document.getElementById('autoBU').textContent = selectedTemplate.business_unit_name || 'N/A';
        document.getElementById('autoDivision').textContent = selectedTemplate.division_name || 'Non définie';
    } else {
        selectedTemplate = null;
        document.getElementById('autoChannel').textContent = '-';
        document.getElementById('autoBU').textContent = '-';
        document.getElementById('autoDivision').textContent = '-';
    }
}

// Création d'une campagne
async function createCampaign() {
    // Validation
    const name = document.getElementById('campName').value.trim();
    const template_id = document.getElementById('campTemplate').value;
    const responsible_id = document.getElementById('campResponsible').value;
    const scheduled_date = document.getElementById('campDate').value || null;
    const priority = document.getElementById('campPriority').value;
    const description = document.getElementById('campDescription').value.trim();

    // Validations
    if (!name) {
        alert('Le nom de la campagne est obligatoire');
        return;
    }
    if (!template_id) {
        alert('Veuillez sélectionner un modèle');
        return;
    }
    if (!responsible_id) {
        alert('Veuillez sélectionner un responsable');
        return;
    }

    try {
        const campaignData = {
            name,
            template_id,
            responsible_id,
            scheduled_date,
            priority,
            description,
            // Récupérer automatiquement depuis le modèle
            channel: selectedTemplate.channel,
            business_unit_id: selectedTemplate.business_unit_id,
            division_id: selectedTemplate.division_id
        };

        const res = await fetch(`${API}/campaigns`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(campaignData)
        });

        if (res.ok) {
            alert('Campagne créée avec succès !');
            hideCampaignForm();
            await loadCampaigns();
        } else {
            const error = await res.json().catch(() => ({}));
            alert('Erreur: ' + (error.message || error.error || res.status));
        }
    } catch (error) {
        console.error('Erreur création campagne:', error);
        alert('Erreur lors de la création de la campagne');
    }
}

// Chargement des campagnes
async function loadCampaigns() {
    try {
        const res = await fetch(`${API}/campaigns`, { headers: getAuthHeader() });
        const data = await res.json();
        const campaigns = data.data || [];
        
        const container = document.getElementById('campaignsList');
        
        if (campaigns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Aucune campagne créée pour le moment</p>
                    <button class="btn btn-primary" onclick="showCampaignForm()">
                        <i class="fas fa-plus me-2"></i>Créer la première campagne
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        campaigns.forEach(campaign => {
            const statusClass = getStatusClass(campaign.status);
            const priorityClass = getPriorityClass(campaign.priority);
            
            html += `
                <div class="campaign-item">
                    <div class="campaign-header">
                        <div class="campaign-name">${campaign.name}</div>
                        <div class="campaign-status">
                            <span class="status-badge ${statusClass}">${campaign.status}</span>
                            <span class="priority-badge ${priorityClass}">${campaign.priority}</span>
                        </div>
                    </div>
                    <div class="campaign-details">
                        <div><strong>Canal:</strong> ${campaign.channel}</div>
                        <div><strong>Responsable:</strong> ${campaign.responsible_name || 'N/A'}</div>
                        <div><strong>Entreprises:</strong> ${campaign.companies_count || 0}</div>
                        ${campaign.scheduled_date ? `<div><strong>Planifiée:</strong> ${formatDate(campaign.scheduled_date)}</div>` : ''}
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="assignCompanies('${campaign.id}')">
                            <i class="fas fa-users me-1"></i>Affecter
                        </button>
                        <a class="btn btn-sm btn-outline-info" href="prospecting-campaign-summary.html?id=${campaign.id}" title="Voir récapitulatif">
                            <i class="fas fa-eye"></i> Récap
                        </a>
                        <button class="btn btn-sm btn-outline-warning" onclick="editCampaign('${campaign.id}')">
                            <i class="fas fa-edit me-1"></i>Modifier
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCampaign('${campaign.id}')">
                            <i class="fas fa-trash me-1"></i>Supprimer
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement campagnes:', error);
        document.getElementById('campaignsList').innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur lors du chargement des campagnes
            </div>
        `;
    }
}

// Fonctions utilitaires pour l'affichage
function getStatusClass(status) {
    switch (status) {
        case 'DRAFT': return 'status-draft';
        case 'READY': return 'status-ready';
        case 'SENT': return 'status-sent';
        default: return 'status-default';
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'HIGH': return 'priority-high';
        case 'URGENT': return 'priority-urgent';
        default: return 'priority-normal';
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
}

// Fonctions d'action
function assignCompanies(campaignId) {
    // Créer et afficher le modal d'affectation d'entreprises
    createAssignModal(campaignId);
}

// Créer le modal d'affectation d'entreprises
function createAssignModal(campaignId) {
    // Supprimer le modal existant s'il y en a un
    const existingModal = document.getElementById('assignCompaniesModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Créer le modal HTML
    const modalHTML = `
        <div class="modal fade" id="assignCompaniesModal" tabindex="-1" aria-labelledby="assignCompaniesModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="assignCompaniesModalLabel">
                            <i class="fas fa-users me-2"></i>Affecter des entreprises à la campagne
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="assignModalContent">
                            <!-- Étape 1: Sélection de la source -->
                            <div id="sourceSelection">
                                <h6 class="mb-3">1. Sélectionnez une source d'entreprises :</h6>
                                <div class="row" id="sourcesList">
                                    <div class="col-12 text-center py-4">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Chargement...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Étape 2: Sélection des entreprises -->
                            <div id="companySelection" style="display: none;">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="mb-0">2. Sélectionnez les entreprises :</h6>
                                    <button class="btn btn-outline-secondary btn-sm" onclick="backToSourceSelection()">
                                        <i class="fas fa-arrow-left me-1"></i>Retour aux sources
                                    </button>
                                </div>
                                
                                <div class="mb-3">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <input type="text" id="companySearch" class="form-control" placeholder="Rechercher une entreprise...">
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="selectAllCompanies">
                                                <label class="form-check-label" for="selectAllCompanies">
                                                    Sélectionner tout
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style="max-height: 400px; overflow-y: auto;">
                                    <div id="companiesList">
                                        <!-- Liste des entreprises sera affichée ici -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" id="confirmAssignBtn" onclick="confirmAssignCompanies()" style="display: none;">
                            <i class="fas fa-check me-2"></i>Affecter les entreprises sélectionnées (<span id="selectedCompaniesCount">0</span>)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ajouter le modal au body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Variables pour le modal
    window.currentCampaignIdForAssign = campaignId;
    window.selectedCompaniesForAssign = new Set();

    // Charger les sources et afficher le modal
    loadSourcesForModal().then(() => {
        const modal = new bootstrap.Modal(document.getElementById('assignCompaniesModal'));
        modal.show();
    });
}

// Édition d'une campagne
async function editCampaign(id) {
    try {
        // Récupérer les données de la campagne
        const res = await fetch(`${API}/campaigns/${id}`, { headers: getAuthHeader() });
        if (!res.ok) {
            throw new Error('Erreur lors de la récupération de la campagne');
        }
        const data = await res.json();
        const campaign = data.data;

        // Pré-remplir le formulaire
        document.getElementById('campName').value = campaign.name || '';
        document.getElementById('campTemplate').value = campaign.template_id || '';
        document.getElementById('campResponsible').value = campaign.responsible_id || '';
        document.getElementById('campDate').value = campaign.scheduled_date ? campaign.scheduled_date.split('T')[0] : '';
        document.getElementById('campPriority').value = campaign.priority || 'NORMAL';
        document.getElementById('campDescription').value = campaign.description || '';

        // Mettre à jour l'affichage automatique
        if (campaign.template_id) {
            // Charger les détails du modèle pour l'affichage automatique
            const templateRes = await fetch(`${API_TEMPLATES}/${campaign.template_id}`, { headers: getAuthHeader() });
            if (templateRes.ok) {
                const templateData = await templateRes.json();
                selectedTemplate = templateData.data;
                
                document.getElementById('autoChannel').textContent = selectedTemplate.channel;
                document.getElementById('autoBU').textContent = selectedTemplate.business_unit_name || 'N/A';
                document.getElementById('autoDivision').textContent = selectedTemplate.division_name || 'Non définie';
            }
        }

        // Modifier le formulaire pour l'édition
        const createForm = document.getElementById('createCampaignForm');
        createForm.querySelector('h3').innerHTML = '<i class="fas fa-edit me-2"></i>Modifier la campagne';
        createForm.querySelector('.btn-light').innerHTML = '<i class="fas fa-save me-2"></i>Mettre à jour la campagne';
        createForm.querySelector('.btn-light').onclick = () => updateCampaign(id);

        // Afficher le formulaire
        showCampaignForm();
    } catch (error) {
        console.error('Erreur chargement campagne:', error);
        alert('Erreur lors du chargement de la campagne');
    }
}

// Mise à jour d'une campagne
async function updateCampaign(id) {
    // Validation
    const name = document.getElementById('campName').value.trim();
    const template_id = document.getElementById('campTemplate').value;
    const responsible_id = document.getElementById('campResponsible').value;
    const scheduled_date = document.getElementById('campDate').value || null;
    const priority = document.getElementById('campPriority').value;
    const description = document.getElementById('campDescription').value.trim();

    // Validations
    if (!name) {
        alert('Le nom de la campagne est obligatoire');
        return;
    }
    if (!template_id) {
        alert('Veuillez sélectionner un modèle');
        return;
    }
    if (!responsible_id) {
        alert('Veuillez sélectionner un responsable');
        return;
    }

    try {
        const campaignData = {
            name,
            template_id,
            responsible_id,
            scheduled_date,
            priority,
            description
        };

        const res = await fetch(`${API}/campaigns/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(campaignData)
        });

        if (res.ok) {
            alert('Campagne mise à jour avec succès !');
            hideCampaignForm();
            await loadCampaigns();
        } else {
            const error = await res.json().catch(() => ({}));
            alert('Erreur: ' + (error.message || error.error || res.status));
        }
    } catch (error) {
        console.error('Erreur mise à jour campagne:', error);
        alert('Erreur lors de la mise à jour de la campagne');
    }
}

// Suppression d'une campagne
async function deleteCampaign(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.')) {
        return;
    }

    try {
        const res = await fetch(`${API}/campaigns/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        if (res.ok) {
            alert('Campagne supprimée avec succès !');
            await loadCampaigns();
        } else {
            const error = await res.json().catch(() => ({}));
            alert('Erreur: ' + (error.message || error.error || res.status));
        }
    } catch (error) {
        console.error('Erreur suppression campagne:', error);
        alert('Erreur lors de la suppression de la campagne');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadTemplates();
    await loadCollaborateurs();
    await loadCampaigns();
    
    // Event listeners
    document.getElementById('campTemplate').addEventListener('change', updateAutoConfig);
});

// ===== FONCTIONS DU MODAL D'AFFECTATION =====

// Charger les sources pour le modal
async function loadSourcesForModal() {
    try {
        const res = await fetch(`${API}/sources`, { 
            headers: getAuthHeader() 
        });
        const data = await res.json();
        const sources = data.data || [];

        const container = document.getElementById('sourcesList');
        if (sources.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <i class="fas fa-database fa-2x text-muted mb-3"></i>
                    <p class="text-muted">Aucune source d'entreprises disponible</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sources.map(source => `
            <div class="col-md-6 mb-3">
                <div class="card h-100" style="cursor: pointer;" onclick="selectSource('${source.id}', '${source.name.replace(/'/g, "&apos;")}')">
                    <div class="card-body text-center">
                        <i class="fas fa-database fa-2x text-primary mb-3"></i>
                        <h6 class="card-title">${source.name}</h6>
                        <p class="card-text text-muted">${source.description || 'Cliquez pour sélectionner cette source'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur chargement sources:', error);
        document.getElementById('sourcesList').innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-exclamation-triangle fa-2x text-danger mb-3"></i>
                <p class="text-danger">Erreur lors du chargement des sources</p>
            </div>
        `;
    }
}

// Sélectionner une source
async function selectSource(sourceId, sourceName) {
    // Masquer la sélection de source et afficher la sélection d'entreprises
    document.getElementById('sourceSelection').style.display = 'none';
    document.getElementById('companySelection').style.display = 'block';
    
    // Charger les entreprises de cette source
    await loadCompaniesForModal(sourceId, sourceName);
}

// Charger les entreprises pour le modal
async function loadCompaniesForModal(sourceId, sourceName) {
    try {
        document.getElementById('companiesList').innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des entreprises de "${sourceName}"...</p>
            </div>
        `;

        const res = await fetch(`${API}/sources/${sourceId}/companies`, { 
            headers: getAuthHeader() 
        });
        const data = await res.json();
        const companies = data.data || [];

        if (companies.length === 0) {
            document.getElementById('companiesList').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-building fa-2x text-muted mb-3"></i>
                    <p class="text-muted">Aucune entreprise dans cette source</p>
                </div>
            `;
            return;
        }

        renderCompaniesForModal(companies);
    } catch (error) {
        console.error('Erreur chargement entreprises:', error);
        document.getElementById('companiesList').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-2x text-danger mb-3"></i>
                <p class="text-danger">Erreur lors du chargement des entreprises</p>
            </div>
        `;
    }
}

// Afficher les entreprises dans le modal
function renderCompaniesForModal(companies) {
    const container = document.getElementById('companiesList');
    container.innerHTML = companies.map(company => `
        <div class="card mb-2 company-card" data-company-id="${company.id}">
            <div class="card-body py-2">
                <div class="d-flex align-items-center">
                    <div class="form-check me-3">
                        <input class="form-check-input company-checkbox" type="checkbox" 
                               value="${company.id}" id="company_${company.id}"
                               onchange="toggleCompanySelection('${company.id}')">
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${company.name}</h6>
                        <small class="text-muted">
                            ${company.industry || 'N/A'} • ${company.city || 'N/A'}
                            ${company.email ? ` • ${company.email}` : ''}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Gérer la recherche
    const searchInput = document.getElementById('companySearch');
    searchInput.oninput = function() {
        const searchTerm = this.value.toLowerCase();
        const companyCards = document.querySelectorAll('.company-card');
        companyCards.forEach(card => {
            const companyName = card.querySelector('h6').textContent.toLowerCase();
            card.style.display = companyName.includes(searchTerm) ? 'block' : 'none';
        });
    };

    // Gérer "Sélectionner tout"
    const selectAllCheckbox = document.getElementById('selectAllCompanies');
    selectAllCheckbox.onchange = function() {
        const checkboxes = document.querySelectorAll('.company-checkbox:not([style*="display: none"])');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            toggleCompanySelection(checkbox.value);
        });
    };
}

// Basculer la sélection d'une entreprise
function toggleCompanySelection(companyId) {
    if (window.selectedCompaniesForAssign.has(companyId)) {
        window.selectedCompaniesForAssign.delete(companyId);
    } else {
        window.selectedCompaniesForAssign.add(companyId);
    }
    
    updateAssignButtonState();
}

// Mettre à jour l'état du bouton d'affectation
function updateAssignButtonState() {
    const count = window.selectedCompaniesForAssign.size;
    const button = document.getElementById('confirmAssignBtn');
    const countSpan = document.getElementById('selectedCompaniesCount');
    
    countSpan.textContent = count;
    button.style.display = count > 0 ? 'block' : 'none';
}

// Retour à la sélection de source
function backToSourceSelection() {
    window.selectedCompaniesForAssign.clear();
    document.getElementById('sourceSelection').style.display = 'block';
    document.getElementById('companySelection').style.display = 'none';
    document.getElementById('confirmAssignBtn').style.display = 'none';
}

// Confirmer l'affectation des entreprises
async function confirmAssignCompanies() {
    if (window.selectedCompaniesForAssign.size === 0) {
        alert('Veuillez sélectionner au moins une entreprise');
        return;
    }

    try {
        const companyIds = Array.from(window.selectedCompaniesForAssign);
        const res = await fetch(`${API}/campaigns/${window.currentCampaignIdForAssign}/companies`, {
            method: 'POST',
            headers: { 
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ company_ids: companyIds })
        });

        if (res.ok) {
            alert(`${companyIds.length} entreprise(s) affectée(s) avec succès à la campagne !`);
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('assignCompaniesModal'));
            modal.hide();
            
            // Recharger la liste des campagnes pour mettre à jour le nombre d'entreprises
            await loadCampaigns();
        } else {
            const error = await res.json();
            alert('Erreur lors de l\'affectation : ' + (error.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur affectation entreprises:', error);
        alert('Erreur lors de l\'affectation des entreprises');
    }
}
