// Configuration des Types d'Opportunités
const API_BASE_URL = '/api';

// Variables globales
let opportunityTypes = [];
let currentTypeId = null;
let currentStageId = null;
let currentStageName = null; // Nom de l'étape sélectionnée (pour protéger Identification / Décision)
let stagesData = [];
let requiredActionsData = [];
let requiredDocumentsData = [];

// Libellés des actions et documents
const ACTION_LABELS = {
    premier_contact: 'Premier contact prospect',
    qualification_besoin: 'Qualification initiale du besoin',
    rdv_planifie: 'Planification rendez-vous',
    rdv_realise: 'Rendez-vous client effectué',
    analyse_besoin_approfondie: 'Analyse détaillée besoins',
    proposition_envoyee: 'Envoi proposition commerciale',
    negociation_menee: 'Négociation conditions',
    conditions_acceptees: 'Validation conditions finales',
    contrat_prepare: 'Préparation contrat final',
    contrat_signe: 'Signature contrat',
    relance_effectuee: 'Relance prospect/client',
    email_envoye: 'Email de suivi envoyé',
    appel_telephonique: 'Contact téléphonique',
    reunion_interne: 'Point équipe interne',
    presentation_equipe: 'Présentation équipe projet',
    visite_locaux: 'Visite des locaux client',
    audit_express: 'Pré-audit ou diagnostic',
    consultation_partenaire: 'Consultation expert externe',
    validation_juridique: 'Validation aspects juridiques',
    chiffrage_detaille: 'Chiffrage précis de la mission'
};

const DOC_LABELS = {
    fiche_prospect: "Fiche d'information prospect",
    compte_rendu_rdv: 'Compte-rendu de réunion',
    presentation_cabinet: 'Présentation du cabinet',
    references_clients: 'Références et témoignages',
    proposition_commerciale: 'Offre commerciale détaillée',
    elements_techniques: 'Spécifications techniques',
    conditions_generales: 'Conditions générales de vente',
    tarification: 'Grille tarifaire',
    conditions_finales: 'Conditions négociées finales',
    planning_mission: 'Planning détaillé mission',
    contrat_signe: 'Contrat de prestation signé',
    bon_commande: 'Bon de commande client',
    etats_financiers: 'Documents financiers client',
    statuts_societe: 'Statuts et informations légales',
    organigramme: 'Structure organisationnelle',
    proces_verbaux: "PV d'assemblées/conseils"
};

// Référentiels des actions/documents obligatoires par défaut
// utilisés pour protéger uniquement les éléments créés par le modèle standard
const DEFAULT_MANDATORY_ACTIONS = {
    'Identification': ['premier_contact', 'qualification_besoin'],
    'Décision': ['contrat_prepare', 'contrat_signe']
};

const DEFAULT_MANDATORY_DOCUMENTS = {
    'Identification': ['fiche_prospect'],
    'Décision': ['contrat_signe']
};

// Appel API authentifié
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    return fetch(url, { cache: 'no-store', ...options, headers });
}

// Fonctions utilitaires
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.querySelector('.main-content-area');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(show) {
    const loading = document.getElementById('types-loading');
    const content = document.getElementById('types-content');
    
    if (show) {
        loading.style.display = 'flex';
        content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

// Chargement des types d'opportunités
async function loadTypes() {
    showLoading(true);
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types`);
        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();
        
        if (data.success) {
            opportunityTypes = data.data?.opportunityTypes || data.data || [];
            displayTypes();
        } else {
            showAlert('Erreur lors du chargement des types d\'opportunités', 'danger');
        }
    } catch (error) {
        console.error('Erreur fetch:', error);
        showAlert('Erreur de connexion', 'danger');
    } finally {
        showLoading(false);
    }
}

// Affichage des types d'opportunités
function displayTypes() {
    const container = document.getElementById('types-content');
    
    if (opportunityTypes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-tags fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">Aucun type d'opportunité trouvé</h4>
                <p class="text-muted">Commencez par créer votre premier type d'opportunité</p>
            </div>
        `;
        return;
    }

    container.innerHTML = opportunityTypes.map(type => `
        <div class="card stage-card">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge me-3" style="background-color: ${type.couleur || '#6c757d'}; color: white;">
                                ${type.code || type.nom?.substring(0, 3).toUpperCase() || 'N/A'}
                            </span>
                            <h5 class="mb-0">${type.nom || type.name || 'Sans nom'}</h5>
                        </div>
                        <p class="text-muted mb-2">${type.description || 'Aucune description'}</p>
                        <div class="d-flex gap-3">
                            <span class="badge bg-info">Probabilité: ${type.default_probability || 0}%</span>
                            <span class="badge bg-secondary">Durée: ${type.default_duration_days || 0} jours</span>
                            <span class="badge bg-success">${type.nombre_opportunites || 0} opportunités</span>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="configureType('${type.id}')" title="Configurer">
                                <i class="fas fa-cogs"></i> Configurer
                            </button>
                            <button class="btn btn-outline-warning" onclick="editType('${type.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteType('${type.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Ajouter une nouvelle étape (entre Identification et Décision)
async function addStage() {
    if (!currentTypeId) {
        showAlert('Aucun type d\'opportunité sélectionné', 'warning');
        return;
    }

    if (!stagesData || stagesData.length === 0) {
        showAlert('Aucune étape existante pour ce type. Rechargez la page.', 'danger');
        return;
    }

    // Saisir un nom d\'étape minimal (peut être modifié ensuite)
    const stageName = prompt('Nom de la nouvelle étape :', 'Nouvelle étape');
    if (!stageName || !stageName.trim()) {
        return;
    }

    try {
        // Identifier les étapes Identification et Décision existantes
        const identification = stagesData.find(s => s.template.stage_name === 'Identification' || s.template.stage_order === 1);
        // Toujours repérer Décision par son nom
        const decision = stagesData.find(s => s.template.stage_name === 'Décision');

        if (!decision || !decision.template) {
            showAlert('Impossible de trouver l\'étape "Décision" pour ce type.', 'danger');
            return;
        }

        const originalDecisionOrder = decision.template.stage_order || stagesData.length;
        const maxOrder = Math.max(...stagesData.map(s => s.template.stage_order || 0));
        const newDecisionOrder = (isFinite(maxOrder) && maxOrder > 0) ? maxOrder + 1 : (originalDecisionOrder + 1);

        // 1) Décaler Décision tout à la fin
        const moveDecisionResponse = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/${decision.template.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                stage_name: decision.template.stage_name,
                description: decision.template.description || '',
                min_duration_days: decision.template.min_duration_days || 1,
                max_duration_days: decision.template.max_duration_days || 10,
                is_mandatory: decision.template.is_mandatory !== false,
                validation_required: decision.template.validation_required === true,
                stage_order: newDecisionOrder
            })
        });

        if (moveDecisionResponse.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const moveDecisionData = await moveDecisionResponse.json();
        if (!moveDecisionData.success) {
            showAlert(`Erreur lors du déplacement de l\'étape "Décision": ${moveDecisionData.error || 'Erreur inconnue'}`, 'danger');
            return;
        }

        // 2) Créer la nouvelle étape à l'ancien ordre de Décision (juste avant elle)
        const createResponse = await authenticatedFetch(`${API_BASE_URL}/workflow/stages`, {
            method: 'POST',
            body: JSON.stringify({
                opportunity_type_id: currentTypeId,
                stage_name: stageName.trim(),
                stage_order: originalDecisionOrder,
                description: '',
                min_duration_days: 1,
                max_duration_days: 10,
                is_mandatory: true,
                validation_required: true
            })
        });

        if (createResponse.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const createData = await createResponse.json();
        if (!createData.success || !createData.data) {
            showAlert(`Erreur lors de la création de l\'étape: ${createData.error || 'Erreur inconnue'}`, 'danger');
            return;
        }

        // Recharger les étapes pour refléter la nouvelle configuration (Décision dernière, nouvelle étape juste avant)
        await loadStagesForType(currentTypeId);
        showAlert('Nouvelle étape ajoutée avec succès', 'success');
    } catch (error) {
        console.error('Erreur addStage:', error);
        showAlert('Erreur lors de l\'ajout de l\'étape', 'danger');
    }
}

// Créer un nouveau type d'opportunité
async function addType() {
    const form = document.getElementById('addTypeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        nom: document.getElementById('typeName').value.trim(),
        code: document.getElementById('typeCode').value.trim() || null,
        description: document.getElementById('typeDescription').value.trim() || null,
        couleur: document.getElementById('typeColor').value,
        default_probability: parseInt(document.getElementById('typeProbability').value) || 50,
        default_duration_days: parseInt(document.getElementById('typeDuration').value) || 30
    };

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types`, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert('Type d\'opportunité créé avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addTypeModal')).hide();
            form.reset();
            loadTypes();
        } else {
            showAlert(`Erreur: ${data.error || 'Erreur lors de la création'}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la création:', error);
        showAlert('Erreur de connexion lors de la création', 'danger');
    }
}

// Configurer un type d'opportunité
async function configureType(typeId) {
    currentTypeId = typeId;
    currentStageId = null; // Réinitialiser l'étape sélectionnée
    const type = opportunityTypes.find(t => t.id === typeId);
    
    if (!type) {
        showAlert('Type d\'opportunité non trouvé', 'danger');
        return;
    }

    document.getElementById('configureTypeName').textContent = type.nom || type.name;
    
    // Réinitialiser la section de configuration d'étape
    document.getElementById('stage-configuration').style.display = 'none';
    document.getElementById('selectedStageName').textContent = '';
    document.getElementById('required-actions-list').innerHTML = '<p class="text-muted small">Aucune action requise</p>';
    document.getElementById('required-documents-list').innerHTML = '<p class="text-muted small">Aucun document requis</p>';
    
    try {
        // Charger les étapes du type
        await loadStagesForType(typeId);
        
        // Afficher le modal
        new bootstrap.Modal(document.getElementById('configureTypeModal')).show();
        
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
        showAlert('Erreur lors du chargement de la configuration', 'danger');
    }
}

// Charger les étapes d'un type d'opportunité
async function loadStagesForType(typeId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages?typeId=${typeId}`);
        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();
        
        if (data.success) {
            stagesData = data.data || [];
            displayStages();
        } else {
            throw new Error(data.error || 'Erreur lors du chargement des étapes');
        }
    } catch (error) {
        console.error('Erreur loadStagesForType:', error);
        // Si pas d'étapes, créer les étapes par défaut
        await createDefaultStages(typeId);
    }
}

// Créer les étapes par défaut pour un type
async function createDefaultStages(typeId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types/${typeId}/create-default-stages`, {
            method: 'POST'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            await loadStagesForType(typeId);
        } else {
            throw new Error(data.error || 'Erreur lors de la création des étapes par défaut');
        }
    } catch (error) {
        console.error('Erreur createDefaultStages:', error);
        showAlert('Erreur lors de la création des étapes par défaut', 'danger');
    }
}

// Afficher les étapes
function displayStages() {
    const container = document.getElementById('stages-list');
    
    if (stagesData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-3">
                <p class="text-muted">Aucune étape configurée</p>
            </div>
        `;
        return;
    }

    // Ajouter un bouton pour configurer la première étape
    const firstStageButton = stagesData.length > 0 ? `
        <div class="text-center mb-3">
            <button class="btn btn-outline-success btn-sm" onclick="selectStage('${stagesData[0].template.id}')" title="Configurer la première étape">
                <i class="fas fa-play me-1"></i>Configurer la première étape
            </button>
        </div>
    ` : '';

    container.innerHTML = firstStageButton + stagesData.map((stage, index) => `
        <div class="stage-item card mb-2" data-stage-id="${stage.template.id}">
            <div class="card-body p-2">
                <div class="d-flex align-items-center">
                    <div class="drag-handle me-2">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="stage-order-badge">${stage.template.stage_order}</div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${stage.template.stage_name}</h6>
                        <small class="text-muted">${stage.template.description || 'Aucune description'}</small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="selectStage('${stage.template.id}')" title="Configurer">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Sélectionner une étape pour configuration
function selectStage(stageId) {
    currentStageId = stageId;
    const stage = stagesData.find(s => s.template.id === stageId);
    
    if (!stage) {
        showAlert('Étape non trouvée', 'danger');
        return;
    }

    // Remplir le formulaire de configuration
    currentStageName = stage.template.stage_name;
    document.getElementById('selectedStageName').textContent = stage.template.stage_name;
    document.getElementById('stageNameInput').value = stage.template.stage_name;
    document.getElementById('stageDescriptionInput').value = stage.template.description || '';
    document.getElementById('stageMinDuration').value = stage.template.min_duration_days || 1;
    document.getElementById('stageMaxDuration').value = stage.template.max_duration_days || 10;
    document.getElementById('stageMandatory').checked = stage.template.is_mandatory !== false;
    document.getElementById('stageValidationRequired').checked = stage.template.validation_required === true;

    // Afficher la configuration
    const stageConfigContainer = document.getElementById('stage-configuration');
    stageConfigContainer.style.display = 'block';

    // Protéger les étapes Identification et Décision : pas de modification des métadonnées ni suppression
    const isProtectedStageMeta = currentStageName === 'Identification' || currentStageName === 'Décision';

    const saveStageBtn = stageConfigContainer.querySelector('button[onclick="saveStageConfig()"]');
    const deleteStageBtn = stageConfigContainer.querySelector('button[onclick="deleteStage()"]');
    const nameInput = document.getElementById('stageNameInput');
    const descInput = document.getElementById('stageDescriptionInput');
    const minInput = document.getElementById('stageMinDuration');
    const maxInput = document.getElementById('stageMaxDuration');
    const mandatoryCheckbox = document.getElementById('stageMandatory');
    const validationCheckbox = document.getElementById('stageValidationRequired');

    if (isProtectedStageMeta) {
        // Rendre les champs de métadonnées en lecture seule / désactivés
        if (nameInput) nameInput.readOnly = true;
        if (descInput) descInput.readOnly = true;
        if (minInput) minInput.readOnly = true;
        if (maxInput) maxInput.readOnly = true;
        if (mandatoryCheckbox) mandatoryCheckbox.disabled = true;
        if (validationCheckbox) validationCheckbox.disabled = true;

        // Masquer les boutons de sauvegarde et suppression d'étape
        if (saveStageBtn) saveStageBtn.style.display = 'none';
        if (deleteStageBtn) deleteStageBtn.style.display = 'none';
    } else {
        // Étapes normales : champs éditables et boutons visibles
        if (nameInput) nameInput.readOnly = false;
        if (descInput) descInput.readOnly = false;
        if (minInput) minInput.readOnly = false;
        if (maxInput) maxInput.readOnly = false;
        if (mandatoryCheckbox) mandatoryCheckbox.disabled = false;
        if (validationCheckbox) validationCheckbox.disabled = false;

        if (saveStageBtn) saveStageBtn.style.display = '';
        if (deleteStageBtn) deleteStageBtn.style.display = '';
    }
    
    // Charger les actions et documents requis pour cette étape
    displayRequiredActions(stage.requiredActions || []);
    displayRequiredDocuments(stage.requiredDocuments || []);
}

// Afficher les actions requises
function displayRequiredActions(actions) {
    const container = document.getElementById('required-actions-list');
    
    if (actions.length === 0) {
        container.innerHTML = `
            <p class="text-muted small">Aucune action requise</p>
        `;
        return;
    }

    const isProtectedStage = currentStageName === 'Identification' || currentStageName === 'Décision';

    // Construire un compteur pour les actions obligatoires par défaut à protéger
    const defaultList = isProtectedStage ? (DEFAULT_MANDATORY_ACTIONS[currentStageName] || []) : [];
    const defaultQuota = {};
    defaultList.forEach(type => {
        defaultQuota[type] = (defaultQuota[type] || 0) + 1;
    });

    container.innerHTML = actions.map(action => {
        let protect = false;
        if (isProtectedStage && action.is_mandatory && defaultQuota[action.action_type] > 0) {
            // Protéger uniquement jusqu'à concurrence du nombre d'actions obligatoires par défaut
            protect = true;
            defaultQuota[action.action_type] -= 1;
        }
        const canDelete = !protect;
        return `
        <div class="action-item ${action.is_mandatory ? 'mandatory' : 'optional'}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${ACTION_LABELS[action.action_type] || action.action_type}</strong>
                    <span class="badge ${action.is_mandatory ? 'bg-warning' : 'bg-info'} ms-2">
                        ${action.is_mandatory ? 'Obligatoire' : 'Optionnel'}
                    </span>
                    ${action.validation_order ? `<span class="badge bg-secondary ms-1">Ordre: ${action.validation_order}</span>` : ''}
                </div>
                ${canDelete ? `
                <button class="btn btn-outline-danger btn-sm" onclick="removeRequiredAction('${action.id}')">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Afficher les documents requis
function displayRequiredDocuments(documents) {
    const container = document.getElementById('required-documents-list');
    
    if (documents.length === 0) {
        container.innerHTML = `
            <p class="text-muted small">Aucun document requis</p>
        `;
        return;
    }

    const isProtectedStage = currentStageName === 'Identification' || currentStageName === 'Décision';

    // Construire un compteur pour les documents obligatoires par défaut à protéger
    const defaultList = isProtectedStage ? (DEFAULT_MANDATORY_DOCUMENTS[currentStageName] || []) : [];
    const defaultQuota = {};
    defaultList.forEach(type => {
        defaultQuota[type] = (defaultQuota[type] || 0) + 1;
    });

    container.innerHTML = documents.map(doc => {
        let protect = false;
        if (isProtectedStage && doc.is_mandatory && defaultQuota[doc.document_type] > 0) {
            // Protéger uniquement jusqu'à concurrence du nombre de documents obligatoires par défaut
            protect = true;
            defaultQuota[doc.document_type] -= 1;
        }
        const canDelete = !protect;
        return `
        <div class="document-item ${doc.is_mandatory ? 'mandatory' : 'optional'}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${DOC_LABELS[doc.document_type] || doc.document_type}</strong>
                    <span class="badge ${doc.is_mandatory ? 'bg-warning' : 'bg-info'} ms-2">
                        ${doc.is_mandatory ? 'Obligatoire' : 'Optionnel'}
                    </span>
                </div>
                ${canDelete ? `
                <button class="btn btn-outline-danger btn-sm" onclick="removeRequiredDocument('${doc.id}')">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Sauvegarder la configuration d'une étape
async function saveStageConfig() {
    if (!currentStageId) {
        showAlert('Aucune étape sélectionnée', 'danger');
        return;
    }

    const formData = {
        stage_name: document.getElementById('stageNameInput').value.trim(),
        description: document.getElementById('stageDescriptionInput').value.trim(),
        min_duration_days: parseInt(document.getElementById('stageMinDuration').value) || 1,
        max_duration_days: parseInt(document.getElementById('stageMaxDuration').value) || 10,
        is_mandatory: document.getElementById('stageMandatory').checked,
        validation_required: document.getElementById('stageValidationRequired').checked
    };

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/${currentStageId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            await loadStagesForType(currentTypeId);
            showAlert('Configuration sauvegardée', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur saveStageConfig:', error);
        showAlert('Erreur lors de la sauvegarde', 'danger');
    }
}

// Supprimer une étape
async function deleteStage() {
    if (!currentStageId) {
        showAlert('Aucune étape sélectionnée', 'danger');
        return;
    }

    // Protection côté UI : empêcher la suppression d'Identification et Décision
    if (currentStageName === 'Identification' || currentStageName === 'Décision') {
        showAlert('Les étapes "Identification" et "Décision" ne peuvent pas être supprimées.', 'warning');
        return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/${currentStageId}`, {
            method: 'DELETE'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            await loadStagesForType(currentTypeId);
            document.getElementById('stage-configuration').style.display = 'none';
            showAlert('Étape supprimée', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur deleteStage:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
}

// Ajouter une action requise
function addRequiredAction() {
    if (!currentStageId) {
        showAlert('Veuillez d\'abord sélectionner une étape', 'warning');
        return;
    }

    // Remplir le select avec les types d'actions disponibles
    const actionSelect = document.getElementById('actionType');
    actionSelect.innerHTML = '<option value="">Sélectionner un type d\'action</option>';
    
    Object.entries(ACTION_LABELS).forEach(([key, label]) => {
        actionSelect.innerHTML += `<option value="${key}">${label}</option>`;
    });

    new bootstrap.Modal(document.getElementById('addActionModal')).show();
}

// Confirmer l'ajout d'une action
async function confirmAddAction() {
    const actionType = document.getElementById('actionType').value;
    const isMandatory = document.getElementById('actionMandatory').checked;
    const order = parseInt(document.getElementById('actionOrder').value) || 1;

    if (!actionType) {
        showAlert('Veuillez sélectionner un type d\'action', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/${currentStageId}/actions`, {
            method: 'POST',
            body: JSON.stringify({
                action_type: actionType,
                is_mandatory: isMandatory,
                validation_order: order
            })
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('addActionModal')).hide();
            await loadStagesForType(currentTypeId);
            selectStage(currentStageId); // Recharger la configuration
            showAlert('Action ajoutée', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur confirmAddAction:', error);
        showAlert('Erreur lors de l\'ajout de l\'action', 'danger');
    }
}

// Supprimer une action requise
async function removeRequiredAction(actionId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette action ?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/actions/${actionId}`, {
            method: 'DELETE'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            await loadStagesForType(currentTypeId);
            selectStage(currentStageId); // Recharger la configuration
            showAlert('Action supprimée', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur removeRequiredAction:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
}

// Ajouter un document requis
function addRequiredDocument() {
    if (!currentStageId) {
        showAlert('Veuillez d\'abord sélectionner une étape', 'warning');
        return;
    }

    // Remplir le select avec les types de documents disponibles
    const documentSelect = document.getElementById('documentType');
    documentSelect.innerHTML = '<option value="">Sélectionner un type de document</option>';
    
    Object.entries(DOC_LABELS).forEach(([key, label]) => {
        documentSelect.innerHTML += `<option value="${key}">${label}</option>`;
    });

    new bootstrap.Modal(document.getElementById('addDocumentModal')).show();
}

// Confirmer l'ajout d'un document
async function confirmAddDocument() {
    const documentType = document.getElementById('documentType').value;
    const isMandatory = document.getElementById('documentMandatory').checked;

    if (!documentType) {
        showAlert('Veuillez sélectionner un type de document', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/${currentStageId}/documents`, {
            method: 'POST',
            body: JSON.stringify({
                document_type: documentType,
                is_mandatory: isMandatory
            })
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('addDocumentModal')).hide();
            await loadStagesForType(currentTypeId);
            selectStage(currentStageId); // Recharger la configuration
            showAlert('Document ajouté', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur confirmAddDocument:', error);
        showAlert('Erreur lors de l\'ajout du document', 'danger');
    }
}

// Supprimer un document requis
async function removeRequiredDocument(documentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/workflow/stages/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            await loadStagesForType(currentTypeId);
            selectStage(currentStageId); // Recharger la configuration
            showAlert('Document supprimé', 'success');
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur removeRequiredDocument:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
}

// Sauvegarder la configuration complète du type
async function saveTypeConfiguration() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types/${currentTypeId}/save-configuration`, {
            method: 'POST'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            showAlert('Configuration sauvegardée avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('configureTypeModal')).hide();
        } else {
            showAlert(`Erreur: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur saveTypeConfiguration:', error);
        showAlert('Erreur lors de la sauvegarde', 'danger');
    }
}

// Modifier un type d'opportunité
async function editType(typeId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types/${typeId}`);
        const data = await response.json();
        
        if (data.success) {
            const type = data.data?.type || data.data;
            
            // Remplir le formulaire d'édition (à implémenter si nécessaire)
            showAlert('Fonctionnalité d\'édition à implémenter', 'info');
        } else {
            showAlert(`Erreur: ${data.error || 'Type d\'opportunité non trouvé'}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        showAlert('Erreur de connexion lors de la récupération', 'danger');
    }
}

// Supprimer un type d'opportunité
async function deleteType(typeId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type d\'opportunité ? Cette action est irréversible.')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/opportunity-types/${typeId}`, {
            method: 'DELETE'
        });

        if (response.status === 401) {
            showAlert('Votre session a expiré. Merci de vous reconnecter.', 'warning');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert('Type d\'opportunité supprimé avec succès', 'success');
            loadTypes();
        } else {
            showAlert(`Erreur: ${data.error || 'Erreur lors de la suppression'}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showAlert('Erreur de connexion lors de la suppression', 'danger');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadTypes();
});
