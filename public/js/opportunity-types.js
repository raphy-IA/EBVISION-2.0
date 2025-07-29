// Variables globales
let opportunityTypes = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadOpportunityTypes();
    setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Modal de création
    document.getElementById('addTypeModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('addTypeForm').reset();
        document.getElementById('templateStages').innerHTML = '';
    });
    
    // Modal de modification
    document.getElementById('editTypeModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('editTypeForm').reset();
        document.getElementById('editTemplateStages').innerHTML = '';
    });
}

// Chargement des types d'opportunités
async function loadOpportunityTypes() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const typesList = document.getElementById('typesList');
    
    try {
        loadingSpinner.classList.remove('d-none');
        typesList.innerHTML = '';
        
        const response = await fetch('/api/opportunity-types', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            opportunityTypes = result.data.opportunityTypes;
            displayOpportunityTypes();
        } else {
            throw new Error('Erreur lors du chargement des types');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des types d\'opportunités', 'danger');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

// Affichage des types d'opportunités
function displayOpportunityTypes() {
    const container = document.getElementById('typesList');
    
    if (opportunityTypes.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <i class="bi bi-tags fs-1 text-muted"></i>
                <p class="text-muted mt-2">Aucun type d'opportunité défini</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTypeModal">
                    <i class="bi bi-plus-circle"></i>
                    Créer le premier type
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = opportunityTypes.map(type => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card type-card h-100">
                <div class="card-header d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1">
                            <span class="badge" style="background-color: ${type.couleur || '#007bff'}">
                                ${type.nom}
                            </span>
                        </h6>
                        ${type.code ? `<small class="text-muted">${type.code}</small>` : ''}
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editType('${type.id}')">
                                <i class="bi bi-pencil"></i> Modifier
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="viewTemplates('${type.id}')">
                                <i class="bi bi-list-check"></i> Templates
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteType('${type.id}')">
                                <i class="bi bi-trash"></i> Supprimer
                            </a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <p class="card-text">${type.description || 'Aucune description'}</p>
                    
                    <div class="mb-3">
                        <small class="text-muted">Template d'étapes:</small>
                        <div id="templatePreview-${type.id}">
                            <!-- Aperçu des étapes sera chargé ici -->
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="bi bi-calendar"></i>
                            Créé le ${formatDate(type.created_at)}
                        </small>
                        <span class="badge bg-secondary">${type.nombre_opportunites || 0} opportunités</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Charger les aperçus des templates
    opportunityTypes.forEach(type => {
        loadTemplatePreview(type.id);
    });
}

// Charger l'aperçu des templates
async function loadTemplatePreview(typeId) {
    try {
        const response = await fetch(`/api/opportunity-types/${typeId}/templates`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const templates = result.data.templates;
            
            const container = document.getElementById(`templatePreview-${typeId}`);
            if (container) {
                if (templates.length === 0) {
                    container.innerHTML = '<small class="text-muted">Aucune étape définie</small>';
                } else {
                    container.innerHTML = templates.slice(0, 3).map(template => `
                        <div class="template-stage">
                            <small>${template.nom}</small>
                        </div>
                    `).join('') + (templates.length > 3 ? 
                        `<small class="text-muted">+${templates.length - 3} autres...</small>` : '');
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'aperçu:', error);
    }
}

// Ajouter une étape au template (création)
function addTemplateStage() {
    const container = document.getElementById('templateStages');
    const stageId = Date.now();
    
    const stageHtml = `
        <div class="template-stage mb-2" id="stage-${stageId}">
            <div class="row">
                <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm" 
                           placeholder="Nom de l'étape" name="stage_name_${stageId}" required>
                </div>
                <div class="col-md-4">
                    <input type="number" class="form-control form-control-sm" 
                           placeholder="Ordre" name="stage_order_${stageId}" min="1" value="1">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control form-control-sm" 
                           placeholder="Durée (jours)" name="stage_duration_${stageId}" min="1">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-sm btn-outline-danger" 
                            onclick="removeTemplateStage(${stageId})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row mt-1">
                <div class="col-12">
                    <textarea class="form-control form-control-sm" 
                              placeholder="Description (optionnel)" 
                              name="stage_description_${stageId}" rows="2"></textarea>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', stageHtml);
}

// Supprimer une étape du template (création)
function removeTemplateStage(stageId) {
    const stageElement = document.getElementById(`stage-${stageId}`);
    if (stageElement) {
        stageElement.remove();
    }
}

// Ajouter une étape au template (modification)
function addEditTemplateStage() {
    const container = document.getElementById('editTemplateStages');
    const stageId = Date.now();
    
    const stageHtml = `
        <div class="template-stage mb-2" id="edit-stage-${stageId}">
            <div class="row">
                <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm" 
                           placeholder="Nom de l'étape" name="edit_stage_name_${stageId}" required>
                </div>
                <div class="col-md-4">
                    <input type="number" class="form-control form-control-sm" 
                           placeholder="Ordre" name="edit_stage_order_${stageId}" min="1" value="1">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control form-control-sm" 
                           placeholder="Durée (jours)" name="edit_stage_duration_${stageId}" min="1">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-sm btn-outline-danger" 
                            onclick="removeEditTemplateStage(${stageId})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row mt-1">
                <div class="col-12">
                    <textarea class="form-control form-control-sm" 
                              placeholder="Description (optionnel)" 
                              name="edit_stage_description_${stageId}" rows="2"></textarea>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', stageHtml);
}

// Supprimer une étape du template (modification)
function removeEditTemplateStage(stageId) {
    const stageElement = document.getElementById(`edit-stage-${stageId}`);
    if (stageElement) {
        stageElement.remove();
    }
}

// Créer un type d'opportunité
async function createType() {
    const form = document.getElementById('addTypeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collecter les étapes du template
    const stages = [];
    const stageElements = document.querySelectorAll('#templateStages .template-stage');
    
    stageElements.forEach((element, index) => {
        const stageId = element.id.replace('stage-', '');
        const name = document.querySelector(`[name="stage_name_${stageId}"]`).value;
        const order = parseInt(document.querySelector(`[name="stage_order_${stageId}"]`).value) || index + 1;
        const duration = parseInt(document.querySelector(`[name="stage_duration_${stageId}"]`).value) || null;
        const description = document.querySelector(`[name="stage_description_${stageId}"]`).value || null;
        
        if (name) {
            stages.push({
                nom: name,
                stage_order: order,
                duree_jours: duration,
                description: description
            });
        }
    });
    
    const typeData = {
        nom: document.getElementById('typeName').value,
        code: document.getElementById('typeCode').value || null,
        description: document.getElementById('typeDescription').value || null,
        couleur: document.getElementById('typeColor').value,
        templates: stages
    };
    
    try {
        const response = await fetch('/api/opportunity-types', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(typeData)
        });
        
        if (response.ok) {
            showAlert('Type d\'opportunité créé avec succès', 'success');
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTypeModal'));
            modal.hide();
            
            // Recharger les types
            loadOpportunityTypes();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la création');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Modifier un type d'opportunité
function editType(typeId) {
    const type = opportunityTypes.find(t => t.id === typeId);
    if (!type) return;
    
    // Remplir le formulaire
    document.getElementById('editTypeId').value = type.id;
    document.getElementById('editTypeName').value = type.nom;
    document.getElementById('editTypeCode').value = type.code || '';
    document.getElementById('editTypeDescription').value = type.description || '';
    document.getElementById('editTypeColor').value = type.couleur || '#007bff';
    
    // Charger les templates existants
    loadEditTemplates(typeId);
    
    // Ouvrir le modal
    const modal = new bootstrap.Modal(document.getElementById('editTypeModal'));
    modal.show();
}

// Charger les templates pour l'édition
async function loadEditTemplates(typeId) {
    try {
        const response = await fetch(`/api/opportunity-types/${typeId}/templates`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const templates = result.data.templates;
            
            const container = document.getElementById('editTemplateStages');
            container.innerHTML = '';
            
            templates.forEach((template, index) => {
                const stageId = Date.now() + index;
                const stageHtml = `
                    <div class="template-stage mb-2" id="edit-stage-${stageId}">
                        <input type="hidden" name="edit_stage_id_${stageId}" value="${template.id}">
                        <div class="row">
                            <div class="col-md-4">
                                <input type="text" class="form-control form-control-sm" 
                                       placeholder="Nom de l'étape" name="edit_stage_name_${stageId}" 
                                       value="${template.nom}" required>
                            </div>
                            <div class="col-md-4">
                                <input type="number" class="form-control form-control-sm" 
                                       placeholder="Ordre" name="edit_stage_order_${stageId}" 
                                       value="${template.stage_order}" min="1">
                            </div>
                            <div class="col-md-3">
                                <input type="number" class="form-control form-control-sm" 
                                       placeholder="Durée (jours)" name="edit_stage_duration_${stageId}" 
                                       value="${template.duree_jours || ''}" min="1">
                            </div>
                            <div class="col-md-1">
                                <button type="button" class="btn btn-sm btn-outline-danger" 
                                        onclick="removeEditTemplateStage(${stageId})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-12">
                                <textarea class="form-control form-control-sm" 
                                          placeholder="Description (optionnel)" 
                                          name="edit_stage_description_${stageId}" 
                                          rows="2">${template.description || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', stageHtml);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des templates:', error);
        showAlert('Erreur lors du chargement des templates', 'danger');
    }
}

// Mettre à jour un type d'opportunité
async function updateType() {
    const form = document.getElementById('editTypeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const typeId = document.getElementById('editTypeId').value;
    
    // Collecter les étapes du template
    const stages = [];
    const stageElements = document.querySelectorAll('#editTemplateStages .template-stage');
    
    stageElements.forEach((element, index) => {
        const stageId = element.id.replace('edit-stage-', '');
        const existingId = document.querySelector(`[name="edit_stage_id_${stageId}"]`)?.value;
        const name = document.querySelector(`[name="edit_stage_name_${stageId}"]`).value;
        const order = parseInt(document.querySelector(`[name="edit_stage_order_${stageId}"]`).value) || index + 1;
        const duration = parseInt(document.querySelector(`[name="edit_stage_duration_${stageId}"]`).value) || null;
        const description = document.querySelector(`[name="edit_stage_description_${stageId}"]`).value || null;
        
        if (name) {
            stages.push({
                id: existingId,
                nom: name,
                stage_order: order,
                duree_jours: duration,
                description: description
            });
        }
    });
    
    const typeData = {
        nom: document.getElementById('editTypeName').value,
        code: document.getElementById('editTypeCode').value || null,
        description: document.getElementById('editTypeDescription').value || null,
        couleur: document.getElementById('editTypeColor').value,
        templates: stages
    };
    
    try {
        const response = await fetch(`/api/opportunity-types/${typeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(typeData)
        });
        
        if (response.ok) {
            showAlert('Type d\'opportunité mis à jour avec succès', 'success');
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTypeModal'));
            modal.hide();
            
            // Recharger les types
            loadOpportunityTypes();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Supprimer un type d'opportunité
async function deleteType(typeId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type d\'opportunité ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/opportunity-types/${typeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('Type d\'opportunité supprimé avec succès', 'success');
            loadOpportunityTypes();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert(error.message, 'danger');
    }
}

// Voir les templates d'un type
function viewTemplates(typeId) {
    // Pour l'instant, on ouvre le modal d'édition
    editType(typeId);
}

// Utilitaires
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