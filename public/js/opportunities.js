// Variables globales
let currentPage = 1;
let totalPages = 1;
let sortOrder = 'desc';
let opportunities = [];
let formData = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadFormData();
    loadOpportunities();
    setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Filtres
    document.getElementById('searchInput').addEventListener('input', debounce(loadOpportunities, 300));
    document.getElementById('statusFilter').addEventListener('change', loadOpportunities);
    document.getElementById('businessUnitFilter').addEventListener('change', loadOpportunities);
    document.getElementById('typeFilter').addEventListener('change', loadOpportunities);
    document.getElementById('collaborateurFilter').addEventListener('change', loadOpportunities);
    
    // Tri
    document.getElementById('sortBy').addEventListener('change', loadOpportunities);
    
    // Formulaire de création
    document.getElementById('opportunityProbability').addEventListener('input', function() {
        document.getElementById('probabilityValue').textContent = this.value + '%';
    });
    
    // Modal de création
    document.getElementById('addOpportunityModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('addOpportunityForm').reset();
        document.getElementById('probabilityValue').textContent = '50%';
    });
}

// Chargement des données pour les formulaires
async function loadFormData() {
    try {
        const response = await fetch('/api/opportunities/form-data', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            formData = result.data;
            
            // Remplir les filtres
            populateFilter('businessUnitFilter', formData.businessUnits, 'nom');
            populateFilter('typeFilter', formData.opportunityTypes, 'nom');
            populateFilter('collaborateurFilter', formData.collaborateurs, 'nom');
            
            // Remplir les formulaires
            populateSelect('opportunityBusinessUnit', formData.businessUnits, 'nom', true);
            populateSelect('opportunityType', formData.opportunityTypes, 'nom');
            populateSelect('opportunityClient', formData.clients, 'nom');
            populateSelect('opportunityCollaborateur', formData.collaborateurs, 'nom');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showAlert('Erreur lors du chargement des données', 'danger');
    }
}

// Remplir un select avec des données
function populateSelect(selectId, data, labelField, required = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Garder l'option par défaut
    const defaultOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item[labelField];
        select.appendChild(option);
    });
    
    if (required) {
        select.required = true;
    }
}

// Remplir un filtre
function populateFilter(filterId, data, labelField) {
    const select = document.getElementById(filterId);
    if (!select) return;
    
    // Garder l'option "Tous"
    const allOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (allOption) select.appendChild(allOption);
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item[labelField];
        select.appendChild(option);
    });
}

// Chargement des opportunités
async function loadOpportunities() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const opportunitiesList = document.getElementById('opportunitiesList');
    
    try {
        loadingSpinner.classList.remove('d-none');
        opportunitiesList.innerHTML = '';
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 12,
            sortBy: document.getElementById('sortBy').value,
            sortOrder: sortOrder,
            search: document.getElementById('searchInput').value,
            status: document.getElementById('statusFilter').value,
            business_unit_id: document.getElementById('businessUnitFilter').value,
            opportunity_type_id: document.getElementById('typeFilter').value,
            collaborateur_id: document.getElementById('collaborateurFilter').value
        });
        
        const response = await fetch(`/api/opportunities?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            opportunities = result.data.opportunities;
            totalPages = Math.ceil(result.data.total / 12);
            
            displayOpportunities();
            updateStats(result.data.stats);
            generatePagination();
        } else {
            throw new Error('Erreur lors du chargement des opportunités');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des opportunités', 'danger');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

// Affichage des opportunités
function displayOpportunities() {
    const container = document.getElementById('opportunitiesList');
    
    if (opportunities.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <i class="bi bi-inbox fs-1 text-muted"></i>
                <p class="text-muted mt-2">Aucune opportunité trouvée</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = opportunities.map(opportunity => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card opportunity-card h-100">
                <div class="card-header d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1">${opportunity.nom}</h6>
                        <div class="d-flex gap-1 mb-1">
                            ${opportunity.business_unit_nom ? 
                                `<span class="badge business-unit-badge">${opportunity.business_unit_nom}</span>` : ''}
                            ${opportunity.opportunity_type_nom ? 
                                `<span class="badge opportunity-type-badge">${opportunity.opportunity_type_nom}</span>` : ''}
                        </div>
                        <span class="badge status-badge ${getStatusClass(opportunity.statut)}">
                            ${getStatusLabel(opportunity.statut)}
                        </span>
                        ${opportunity.risk_level ? `
                            <span class="badge risk-badge ${getRiskClass(opportunity.risk_level)}">
                                <i class="bi bi-exclamation-triangle"></i> ${opportunity.risk_level}
                            </span>
                        ` : ''}
                        ${opportunity.priority_level ? `
                            <span class="badge priority-badge ${getPriorityClass(opportunity.priority_level)}">
                                <i class="bi bi-flag"></i> ${opportunity.priority_level}
                            </span>
                        ` : ''}
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="viewOpportunity('${opportunity.id}')">
                                <i class="bi bi-eye"></i> Voir
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="editOpportunity('${opportunity.id}')">
                                <i class="bi bi-pencil"></i> Modifier
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="viewStages('${opportunity.id}')">
                                <i class="bi bi-list-check"></i> Étapes
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteOpportunity('${opportunity.id}')">
                                <i class="bi bi-trash"></i> Supprimer
                            </a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <small class="text-muted">Client:</small>
                        <div>${opportunity.client_nom || 'Non assigné'}</div>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Responsable:</small>
                        <div>${opportunity.collaborateur_nom || 'Non assigné'}</div>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Montant:</small>
                        <div class="amount-highlight">
                            ${opportunity.montant_estime ? 
                                `${formatCurrency(opportunity.montant_estime)} ${opportunity.devise}` : 
                                'Non défini'}
                        </div>
                    </div>
                    <div class="mb-3">
                        <small class="text-muted">Probabilité:</small>
                        <div class="progress probability-bar">
                            <div class="progress-bar" style="width: ${opportunity.probabilite}%"></div>
                        </div>
                        <small>${opportunity.probabilite}%</small>
                    </div>
                    ${opportunity.description ? `
                        <div class="mb-2">
                            <small class="text-muted">Description:</small>
                            <div class="text-truncate">${opportunity.description}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    <small class="text-muted">
                        <i class="bi bi-calendar"></i>
                        Créée le ${formatDate(opportunity.created_at)}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

// Mise à jour des statistiques
function updateStats(stats) {
    document.getElementById('totalOpportunities').textContent = stats.total || 0;
    document.getElementById('wonOpportunities').textContent = stats.gagnees || 0;
    document.getElementById('inProgressOpportunities').textContent = stats.en_cours || 0;
    document.getElementById('totalAmount').textContent = formatCurrency(stats.montant_total || 0) + ' €';
}

// Génération de la pagination
function generatePagination() {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Bouton précédent
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Précédent</a>
        </li>
    `;
    
    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Bouton suivant
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Suivant</a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Changement de page
function changePage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        loadOpportunities();
    }
}

// Basculer l'ordre de tri
function toggleSortOrder() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    loadOpportunities();
}

// Effacer les filtres
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('businessUnitFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('collaborateurFilter').value = '';
    currentPage = 1;
    loadOpportunities();
}

// Création d'une opportunité
async function createOpportunity() {
    const form = document.getElementById('addOpportunityForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const opportunityData = {
        nom: document.getElementById('opportunityName').value,
        business_unit_id: document.getElementById('opportunityBusinessUnit').value,
        opportunity_type_id: document.getElementById('opportunityType').value || null,
        client_id: document.getElementById('opportunityClient').value || null,
        collaborateur_id: document.getElementById('opportunityCollaborateur').value || null,
        statut: document.getElementById('opportunityStatus').value,
        type: document.getElementById('opportunityTypeOld').value || null,
        source: document.getElementById('opportunitySource').value || null,
        montant_estime: parseFloat(document.getElementById('opportunityAmount').value) || null,
        devise: document.getElementById('opportunityCurrency').value,
        probabilite: parseInt(document.getElementById('opportunityProbability').value),
        etape_vente: document.getElementById('opportunityStage').value,
        date_fermeture_prevue: document.getElementById('opportunityCloseDate').value || null,
        date_fermeture_reelle: document.getElementById('opportunityCloseDateReal').value || null,
        description: document.getElementById('opportunityDescription').value || null,
        notes: document.getElementById('opportunityNotes').value || null
    };
    
    try {
        const response = await fetch('/api/opportunities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(opportunityData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert('Opportunité créée avec succès', 'success');
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addOpportunityModal'));
            modal.hide();
            
            // Recharger les opportunités
            loadOpportunities();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la création');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Voir une opportunité
function viewOpportunity(id) {
    window.location.href = `/opportunity-details.html?id=${id}`;
}

// Modifier une opportunité
function editOpportunity(id) {
    window.location.href = `/opportunity-edit.html?id=${id}`;
}

// Voir les étapes d'une opportunité
function viewStages(id) {
    window.location.href = `/opportunity-stages.html?opportunity_id=${id}`;
}

// Supprimer une opportunité
async function deleteOpportunity(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opportunité ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/opportunities/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('Opportunité supprimée avec succès', 'success');
            loadOpportunities();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Utilitaires
function getStatusClass(status) {
    const classes = {
        'NOUVELLE': 'bg-secondary',
        'EN_COURS': 'bg-primary',
        'GAGNEE': 'bg-success',
        'PERDUE': 'bg-danger',
        'ANNULEE': 'bg-warning'
    };
    return classes[status] || 'bg-secondary';
}

function getStatusLabel(status) {
    const labels = {
        'NOUVELLE': 'Nouvelle',
        'EN_COURS': 'En Cours',
        'GAGNEE': 'Gagnée',
        'PERDUE': 'Perdue',
        'ANNULEE': 'Annulée'
    };
    return labels[status] || status;
}

function getRiskClass(riskLevel) {
    const classes = {
        'LOW': 'bg-success',
        'MEDIUM': 'bg-warning',
        'HIGH': 'bg-danger',
        'CRITICAL': 'bg-dark'
    };
    return classes[riskLevel] || 'bg-secondary';
}

function getPriorityClass(priorityLevel) {
    const classes = {
        'LOW': 'bg-info',
        'MEDIUM': 'bg-warning',
        'HIGH': 'bg-danger',
        'URGENT': 'bg-dark'
    };
    return classes[priorityLevel] || 'bg-secondary';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 