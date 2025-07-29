// Variables globales
let opportunityId = null;
let opportunity = null;
let stages = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer l'ID de l'opportunité depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    opportunityId = urlParams.get('id');
    
    if (!opportunityId) {
        showAlert('ID de l\'opportunité manquant', 'danger');
        window.history.back();
        return;
    }
    
    loadOpportunityDetails();
    loadStages();
    loadActions();
});

// Chargement des détails de l'opportunité
async function loadOpportunityDetails() {
    try {
        const response = await fetch(`/api/opportunities/${opportunityId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            opportunity = result.data;
            displayOpportunityDetails();
        } else {
            throw new Error('Erreur lors du chargement des détails');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des détails', 'danger');
    }
}

// Affichage des détails de l'opportunité
function displayOpportunityDetails() {
    // Titre de la page
    document.getElementById('opportunityTitle').textContent = opportunity.nom;
    
    // Informations générales
    document.getElementById('opportunityName').textContent = opportunity.nom;
    document.getElementById('opportunityDescription').textContent = opportunity.description || 'Aucune description';
    document.getElementById('opportunityBusinessUnit').textContent = opportunity.business_unit_nom || 'Non assigné';
    document.getElementById('opportunityType').textContent = opportunity.opportunity_type_nom || 'Non défini';
    document.getElementById('opportunityClient').textContent = opportunity.client_nom || 'Non assigné';
    document.getElementById('opportunityCollaborateur').textContent = opportunity.collaborateur_nom || 'Non assigné';
    document.getElementById('opportunityStatus').innerHTML = getStatusBadge(opportunity.statut);
    document.getElementById('opportunitySource').textContent = getSourceLabel(opportunity.source) || 'Non définie';
    
    // Métriques
    document.getElementById('opportunityAmount').textContent = opportunity.montant_estime ? 
        `${formatCurrency(opportunity.montant_estime)} ${opportunity.devise}` : 'Non défini';
    
    const probabilityBar = document.getElementById('probabilityBar');
    const probabilityText = document.getElementById('probabilityText');
    probabilityBar.style.width = `${opportunity.probabilite}%`;
    probabilityText.textContent = `${opportunity.probabilite}%`;
    
    document.getElementById('opportunityStage').textContent = getStageLabel(opportunity.etape_vente);
    document.getElementById('opportunityCloseDate').textContent = opportunity.date_fermeture_prevue ? 
        formatDate(opportunity.date_fermeture_prevue) : 'Non définie';
}

// Chargement des étapes
async function loadStages() {
    try {
        const response = await fetch(`/api/opportunity-stages/opportunity/${opportunityId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            stages = result.data.stages;
            displayStages();
        } else {
            throw new Error('Erreur lors du chargement des étapes');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des étapes', 'danger');
    }
}

// Affichage des étapes
function displayStages() {
    const container = document.getElementById('stagesContainer');
    
    if (stages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-list-check fs-1"></i>
                <p>Aucune étape définie pour cette opportunité</p>
                <button class="btn btn-primary" onclick="addStage()">
                    <i class="bi bi-plus"></i>
                    Ajouter la première étape
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = stages.map(stage => `
        <div class="card stage-card mb-3 ${getStageCardClass(stage)}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-2">
                            ${stage.nom}
                            ${getStageStatusBadge(stage)}
                        </h6>
                        <p class="card-text text-muted mb-2">${stage.description || 'Aucune description'}</p>
                        
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <small class="text-muted">Ordre:</small>
                                <div>${stage.stage_order}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Date limite:</small>
                                <div>${stage.due_date ? formatDate(stage.due_date) : 'Non définie'}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Risque:</small>
                                <div>${getRiskBadge(stage.risk_level)}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Priorité:</small>
                                <div>${getPriorityBadge(stage.priority_level)}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2">
                            ${stage.status === 'PENDING' ? `
                                <button class="btn btn-sm btn-primary" onclick="startStage('${stage.id}')">
                                    <i class="bi bi-play"></i>
                                    Démarrer
                                </button>
                            ` : ''}
                            ${stage.status === 'IN_PROGRESS' ? `
                                <button class="btn btn-sm btn-success" onclick="completeStage('${stage.id}')">
                                    <i class="bi bi-check"></i>
                                    Terminer
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-secondary" onclick="addAction('${stage.id}')">
                                <i class="bi bi-plus"></i>
                                Action
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="viewStageActions('${stage.id}')">
                                <i class="bi bi-clock-history"></i>
                                Actions
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Chargement des actions
async function loadActions() {
    try {
        const response = await fetch(`/api/stage-actions/opportunity/${opportunityId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            displayActions(result.data.actions);
        } else {
            throw new Error('Erreur lors du chargement des actions');
        }
    } catch (error) {
        console.error('Erreur:', error);
        // Ne pas afficher d'alerte car ce n'est pas critique
    }
}

// Affichage des actions
function displayActions(actions) {
    const container = document.getElementById('actionsTimeline');
    
    if (!actions || actions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-clock-history fs-1"></i>
                <p>Aucune action enregistrée</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="action-timeline">
            ${actions.map(action => `
                <div class="action-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${getActionTypeLabel(action.action_type)}</h6>
                            <p class="mb-1">${action.action_title || action.action_description}</p>
                            ${action.action_description && action.action_title ? 
                                `<p class="mb-1 text-muted">${action.action_description}</p>` : ''}
                            <small class="text-muted">
                                <i class="bi bi-person"></i>
                                ${action.created_by_name || 'Utilisateur'}
                                <i class="bi bi-clock ms-2"></i>
                                ${formatDateTime(action.created_at)}
                            </small>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Ajouter une étape
function addStage() {
    const modal = new bootstrap.Modal(document.getElementById('addStageModal'));
    modal.show();
}

// Créer une étape
async function createStage() {
    const form = document.getElementById('addStageForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const stageData = {
        opportunity_id: opportunityId,
        nom: document.getElementById('stageName').value,
        description: document.getElementById('stageDescription').value || null,
        due_date: document.getElementById('stageDueDate').value || null,
        stage_order: parseInt(document.getElementById('stageOrder').value)
    };
    
    try {
        const response = await fetch('/api/opportunity-stages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(stageData)
        });
        
        if (response.ok) {
            showAlert('Étape créée avec succès', 'success');
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStageModal'));
            modal.hide();
            
            // Recharger les étapes
            loadStages();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la création');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Démarrer une étape
async function startStage(stageId) {
    try {
        const response = await fetch(`/api/opportunity-stages/${stageId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('Étape démarrée avec succès', 'success');
            loadStages();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors du démarrage');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Terminer une étape
async function completeStage(stageId) {
    try {
        const response = await fetch(`/api/opportunity-stages/${stageId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('Étape terminée avec succès', 'success');
            loadStages();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la finalisation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Ajouter une action
function addAction(stageId) {
    document.getElementById('actionStageId').value = stageId;
    const modal = new bootstrap.Modal(document.getElementById('addActionModal'));
    modal.show();
}

// Créer une action
async function createAction() {
    const form = document.getElementById('addActionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const actionData = {
        stage_id: document.getElementById('actionStageId').value,
        action_type: document.getElementById('actionType').value,
        action_title: document.getElementById('actionDescription').value,
        action_date: document.getElementById('actionDateTime').value || new Date().toISOString()
    };
    
    try {
        const response = await fetch('/api/stage-actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(actionData)
        });
        
        if (response.ok) {
            showAlert('Action ajoutée avec succès', 'success');
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addActionModal'));
            modal.hide();
            
            // Recharger les actions
            loadActions();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Voir les actions d'une étape
function viewStageActions(stageId) {
    // Pour l'instant, on recharge toutes les actions
    // Plus tard, on pourrait filtrer par étape
    loadActions();
}

// Actualiser les étapes
function refreshStages() {
    loadStages();
}

// Modifier l'opportunité
function editOpportunity() {
    window.location.href = `/opportunity-edit.html?id=${opportunityId}`;
}

// Utilitaires
function getStatusBadge(status) {
    const classes = {
        'NOUVELLE': 'bg-secondary',
        'EN_COURS': 'bg-primary',
        'GAGNEE': 'bg-success',
        'PERDUE': 'bg-danger',
        'ANNULEE': 'bg-warning'
    };
    const labels = {
        'NOUVELLE': 'Nouvelle',
        'EN_COURS': 'En Cours',
        'GAGNEE': 'Gagnée',
        'PERDUE': 'Perdue',
        'ANNULEE': 'Annulée'
    };
    return `<span class="badge ${classes[status] || 'bg-secondary'}">${labels[status] || status}</span>`;
}

function getSourceLabel(source) {
    const labels = {
        'SITE_WEB': 'Site Web',
        'REFERENCE': 'Référence',
        'RESEAU_PROFESSIONNEL': 'Réseau professionnel',
        'SALON': 'Salon',
        'PUBLICITE': 'Publicité'
    };
    return labels[source];
}

function getStageLabel(stage) {
    const labels = {
        'PROSPECTION': 'Prospection',
        'QUALIFICATION': 'Qualification',
        'PROPOSITION': 'Proposition',
        'NEGOCIATION': 'Négociation',
        'FERMETURE': 'Fermeture'
    };
    return labels[stage] || stage;
}

function getStageCardClass(stage) {
    if (stage.status === 'COMPLETED') return 'stage-completed';
    if (stage.status === 'IN_PROGRESS') return 'stage-in-progress';
    if (stage.status === 'PENDING') return 'stage-pending';
    if (stage.status === 'OVERDUE') return 'stage-overdue';
    return '';
}

function getStageStatusBadge(stage) {
    const classes = {
        'PENDING': 'bg-secondary',
        'IN_PROGRESS': 'bg-primary',
        'COMPLETED': 'bg-success',
        'OVERDUE': 'bg-danger'
    };
    const labels = {
        'PENDING': 'En attente',
        'IN_PROGRESS': 'En cours',
        'COMPLETED': 'Terminée',
        'OVERDUE': 'En retard'
    };
    return `<span class="badge ${classes[stage.status] || 'bg-secondary'}">${labels[stage.status] || stage.status}</span>`;
}

function getRiskBadge(riskLevel) {
    if (!riskLevel) return '<span class="text-muted">Non évalué</span>';
    const classes = {
        'LOW': 'risk-low',
        'MEDIUM': 'risk-medium',
        'HIGH': 'risk-high',
        'CRITICAL': 'risk-critical'
    };
    const labels = {
        'LOW': 'Faible',
        'MEDIUM': 'Moyen',
        'HIGH': 'Élevé',
        'CRITICAL': 'Critique'
    };
    return `<span class="badge ${classes[riskLevel]}">${labels[riskLevel]}</span>`;
}

function getPriorityBadge(priorityLevel) {
    if (!priorityLevel) return '<span class="text-muted">Non définie</span>';
    const classes = {
        'NORMAL': 'priority-normal',
        'HIGH': 'priority-high',
        'URGENT': 'priority-urgent'
    };
    const labels = {
        'NORMAL': 'Normale',
        'HIGH': 'Élevée',
        'URGENT': 'Urgente'
    };
    return `<span class="badge ${classes[priorityLevel]}">${labels[priorityLevel]}</span>`;
}

function getActionTypeLabel(actionType) {
    const labels = {
        'CALL': 'Appel téléphonique',
        'EMAIL': 'Email',
        'MEETING': 'Réunion',
        'PROPOSAL': 'Proposition',
        'FOLLOW_UP': 'Suivi',
        'NEGOTIATION': 'Négociation',
        'CLOSURE': 'Fermeture'
    };
    return labels[actionType] || actionType;
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

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('fr-FR');
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