// ============================================
// WIZARDS DE CRÉATION D'OBJECTIFS
// ============================================

// État global des wizards
const wizardState = {
    autonomous: {
        currentStep: 1,
        level: null,
        entityId: null,
        entityName: null
    },
    distribute: {
        currentStep: 1,
        childLevel: null,
        parentId: null,
        parentData: null,
        selectedChildren: [],
        childrenConfig: {}
    }
};

// ============================================
// WIZARD 1 : OBJECTIF AUTONOME
// ============================================

function openAutonomousObjectiveWizard() {
    // Réinitialiser l'état
    wizardState.autonomous = {
        currentStep: 1,
        level: null,
        entityId: null,
        entityName: null
    };

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('autonomousWizardModal'));
    modal.show();

    // Afficher l'étape 1
    // Afficher l'étape 1
    showAutonomousStep(1);

    // Filtrer les options selon les permissions
    filterAutonomousOptions();
}

function filterAutonomousOptions() {
    const permissions = {
        'GLOBAL': 'OBJECTIVES_GLOBAL_CREATE',
        'BU': 'OBJECTIVES_BU_CREATE',
        'DIVISION': 'OBJECTIVES_DIVISION_CREATE',
        'GRADE': 'OBJECTIVES_GRADE_CREATE',
        'INDIVIDUAL': 'OBJECTIVES_INDIVIDUAL_CREATE'
    };

    // Masquer/Afficher les boutons selon les permissions
    // Note: Les boutons doivent avoir des IDs spécifiques dans le HTML injecté
    // On suppose que les boutons ont des IDs comme 'btn-auto-GLOBAL', 'btn-auto-BU', etc.
    // Si ce n'est pas le cas, il faudra modifier objectives-wizards-inject.js pour ajouter ces IDs.

    // Pour l'instant, on va chercher les boutons par leur onclick
    const buttons = document.querySelectorAll('#autonomousStep1 button[onclick^="selectAutonomousLevel"]');
    let hasVisibleOption = false;

    buttons.forEach(btn => {
        const match = btn.getAttribute('onclick').match(/'(\w+)'/);
        if (match) {
            const level = match[1];
            const permission = permissions[level];

            if (window.sessionManager && window.sessionManager.hasPermission(permission)) {
                btn.parentElement.style.display = 'block'; // On suppose que le bouton est dans une col/div
                hasVisibleOption = true;
            } else {
                btn.parentElement.style.display = 'none';
            }
        }
    });

    if (!hasVisibleOption) {
        document.getElementById('autonomousStep1').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Vous n'avez pas les permissions nécessaires pour créer des objectifs.
            </div>
        `;
    }
}

function showAutonomousStep(step) {
    wizardState.autonomous.currentStep = step;

    // Masquer toutes les étapes
    document.querySelectorAll('[id^="autonomousStep"]').forEach(el => {
        el.style.display = 'none';
    });

    // Afficher l'étape courante
    document.getElementById(`autonomousStep${step}`).style.display = 'block';

    // Mettre à jour les boutons
    updateAutonomousButtons();
}

function selectAutonomousLevel(level) {
    wizardState.autonomous.level = level;

    // Si Global, passer directement à l'étape 3
    if (level === 'GLOBAL') {
        wizardState.autonomous.entityId = null;
        wizardState.autonomous.entityName = 'Entreprise';
        showAutonomousStep(3);
        loadAutonomousForm();
    } else {
        // Sinon, passer à l'étape 2 pour sélectionner l'entité
        showAutonomousStep(2);
        loadEntitiesForLevel(level);
    }
}

async function loadEntitiesForLevel(level) {
    const container = document.getElementById('autonomousEntityList');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';

    try {
        let url = '';
        switch (level) {
            case 'BU':
                url = '/api/business-units';
                break;
            case 'DIVISION':
                url = '/api/divisions';
                break;
            case 'GRADE':
                url = '/api/grades';
                break;
            case 'INDIVIDUAL':
                url = '/api/collaborateurs';
                break;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const entities = await response.json();
            renderEntityList(entities, level);
        } else {
            container.innerHTML = '<div class="alert alert-danger">Erreur de chargement</div>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de connexion</div>';
    }
}

function renderEntityList(entities, level) {
    const container = document.getElementById('autonomousEntityList');

    if (entities.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucune entité disponible</div>';
        return;
    }

    let html = '<div class="list-group">';
    entities.forEach(entity => {
        const name = entity.nom || entity.name || entity.label;
        html += `
            <button type="button" class="list-group-item list-group-item-action" 
                    onclick="selectAutonomousEntity('${entity.id}', '${name}')">
                <i class="fas fa-check-circle text-success me-2"></i>
                ${name}
            </button>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function selectAutonomousEntity(entityId, entityName) {
    wizardState.autonomous.entityId = entityId;
    wizardState.autonomous.entityName = entityName;

    // Passer à l'étape 3
    showAutonomousStep(3);
    loadAutonomousForm();
}

function loadAutonomousForm() {
    const { level, entityName } = wizardState.autonomous;

    // Mettre à jour le titre
    const levelLabels = {
        'GLOBAL': 'Global (Entreprise)',
        'BU': `Business Unit - ${entityName}`,
        'DIVISION': `Division - ${entityName}`,
        'GRADE': `Grade - ${entityName}`,
        'INDIVIDUAL': `Collaborateur - ${entityName}`
    };

    document.getElementById('autonomousFormTitle').textContent = levelLabels[level];

    // Charger les types d'objectifs
    loadObjectiveTypesForAutonomous();
}

async function loadObjectiveTypesForAutonomous() {
    try {
        console.log('🔄 Chargement des types d\'objectifs...');
        const response = await fetch('/api/objectives/types', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        console.log('📡 Réponse API types:', response.status, response.statusText);

        if (response.ok) {
            const types = await response.json();
            console.log('📊 Types reçus:', types);
            console.log('📊 Nombre de types:', types.length);

            const select = document.getElementById('autonomousObjectiveType');
            if (!select) {
                console.error('❌ Element #autonomousObjectiveType non trouvé!');
                return;
            }

            select.innerHTML = '<option value="">Sélectionner un type...</option>';
            types.forEach(type => {
                console.log(`  ➕ Ajout type: ${type.label} (ID: ${type.id})`);
                select.innerHTML += `<option value="${type.id}">${type.label}</option>`;
            });
            console.log('✅ Types d\'objectifs chargés avec succès');
        } else {
            console.error('❌ Erreur API:', response.status);
            const errorText = await response.text();
            console.error('❌ Détails:', errorText);
        }
    } catch (error) {
        console.error('❌ Erreur chargement types:', error);
    }
}

async function submitAutonomousObjective() {
    const { level, entityId } = wizardState.autonomous;

    // Récupérer les données du formulaire
    const data = {
        objective_type_id: parseInt(document.getElementById('autonomousObjectiveType').value),
        title: document.getElementById('autonomousTitle').value,
        description: document.getElementById('autonomousDescription').value,
        target_value: parseFloat(document.getElementById('autonomousTarget').value),
        weight: parseFloat(document.getElementById('autonomousWeight').value) || 0,
        tracking_type: document.getElementById('autonomousTrackingType').value,
        metric_code: document.getElementById('autonomousMetricCode').value || null,
        fiscal_year_id: currentFiscalYearId
    };

    // Validation
    if (!data.objective_type_id || !data.title || !data.target_value) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        let url = '';
        if (level === 'GLOBAL') {
            url = '/api/objectives/global';
        } else if (level === 'BU') {
            url = '/api/objectives/business-unit';
            data.business_unit_id = entityId;
        } else if (level === 'DIVISION') {
            url = '/api/objectives/division';
            data.division_id = entityId;
        } else if (level === 'GRADE') {
            url = '/api/objectives/grade';
            data.grade_id = entityId;
        } else if (level === 'INDIVIDUAL') {
            url = '/api/objectives/individual';
            data.collaborator_id = entityId;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('autonomousWizardModal'));
            modal.hide();
            showAlert('Objectif autonome créé avec succès', 'success');
            loadObjectives();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la création', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function updateAutonomousButtons() {
    const step = wizardState.autonomous.currentStep;
    const prevBtn = document.getElementById('autonomousPrevBtn');
    const submitBtn = document.getElementById('autonomousSubmitBtn');

    if (prevBtn) {
        prevBtn.style.display = step > 1 ? 'inline-block' : 'none';
    }

    if (submitBtn) {
        submitBtn.style.display = step === 3 ? 'inline-block' : 'none';
    }
}

function previousAutonomousStep() {
    const { level } = wizardState.autonomous;
    const currentStep = wizardState.autonomous.currentStep;

    if (currentStep === 3 && level === 'GLOBAL') {
        showAutonomousStep(1);
    } else if (currentStep > 1) {
        showAutonomousStep(currentStep - 1);
    }
}

// ============================================
// WIZARD 2 : DISTRIBUTION AUX ENFANTS
// ============================================

function openDistributeObjectiveWizard() {
    // Réinitialiser l'état
    wizardState.distribute = {
        currentStep: 1,
        childLevel: null,
        parentId: null,
        parentData: null,
        selectedChildren: [],
        childrenConfig: {}
    };

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('distributeWizardModal'));
    modal.show();

    // Afficher l'étape 1
    // Afficher l'étape 1
    showDistributeStep(1);

    // Filtrer les options selon les permissions
    filterDistributeOptions();
}

function filterDistributeOptions() {
    // Mapping: Niveau cible -> Permission requise sur le parent
    // Ex: Pour distribuer vers BU, il faut pouvoir distribuer depuis GLOBAL
    const permissions = {
        'BUSINESS_UNIT': 'OBJECTIVES_GLOBAL_DISTRIBUTE',
        'DIVISION': 'OBJECTIVES_BU_DISTRIBUTE',
        'GRADE': 'OBJECTIVES_DIVISION_DISTRIBUTE',
        'INDIVIDUAL': 'OBJECTIVES_GRADE_DISTRIBUTE'
    };

    const buttons = document.querySelectorAll('#distributeStep1 button[onclick^="selectChildLevel"]');
    let hasVisibleOption = false;

    buttons.forEach(btn => {
        const match = btn.getAttribute('onclick').match(/'(\w+)'/);
        if (match) {
            const level = match[1];
            const permission = permissions[level];

            if (window.sessionManager && window.sessionManager.hasPermission(permission)) {
                btn.parentElement.style.display = 'block';
                hasVisibleOption = true;
            } else {
                btn.parentElement.style.display = 'none';
            }
        }
    });

    if (!hasVisibleOption) {
        document.getElementById('distributeStep1').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Vous n'avez pas les permissions nécessaires pour distribuer des objectifs.
            </div>
        `;
    }
}

function showDistributeStep(step) {
    wizardState.distribute.currentStep = step;

    // Masquer toutes les étapes
    document.querySelectorAll('[id^="distributeStep"]').forEach(el => {
        el.style.display = 'none';
    });

    // Afficher l'étape courante
    document.getElementById(`distributeStep${step}`).style.display = 'block';

    // Mettre à jour les boutons
    updateDistributeButtons();
}

function selectChildLevel(level) {
    wizardState.distribute.childLevel = level;
    showDistributeStep(2);
    loadParentObjectives(level);
}

async function loadParentObjectives(childLevel) {
    const container = document.getElementById('parentObjectivesList');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';

    try {
        // Déterminer le type de parent selon le niveau enfant
        const parentTypeMap = {
            'BUSINESS_UNIT': 'global',
            'DIVISION': 'business-unit',
            'GRADE': 'division',
            'INDIVIDUAL': 'grade'
        };

        const parentType = parentTypeMap[childLevel];
        const url = `/api/objectives/${parentType}/${currentFiscalYearId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const objectives = await response.json();
            renderParentObjectivesList(objectives);
        } else {
            container.innerHTML = '<div class="alert alert-danger">Erreur de chargement</div>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de connexion</div>';
    }
}

function renderParentObjectivesList(objectives) {
    const container = document.getElementById('parentObjectivesList');

    if (objectives.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif parent disponible</div>';
        return;
    }

    let html = '<div class="list-group">';
    objectives.forEach(obj => {
        html += `
            <button type="button" class="list-group-item list-group-item-action" 
                    onclick="selectParentObjective('${obj.id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${obj.description || obj.label}</h6>
                        <small class="text-muted">
                            <i class="fas fa-bullseye me-1"></i> Cible: ${formatCurrency(obj.target_value)}
                            <i class="fas fa-weight-hanging ms-2 me-1"></i> Poids: ${obj.weight}%
                        </small>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </button>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

async function selectParentObjective(parentId) {
    wizardState.distribute.parentId = parentId;

    // Charger le résumé de distribution
    try {
        const response = await fetch(`/api/objectives/${parentId}/distribution-summary`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            wizardState.distribute.parentData = await response.json();
            showDistributeStep(3);
            loadAvailableChildren();
        } else {
            showAlert('Erreur lors du chargement du résumé', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function loadAvailableChildren() {
    const { parentId, childLevel } = wizardState.distribute;
    const container = document.getElementById('availableChildrenList');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';

    try {
        const response = await fetch(`/api/objectives/${parentId}/available-children?childType=${childLevel}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const children = await response.json();
            renderAvailableChildren(children);
        } else {
            container.innerHTML = '<div class="alert alert-danger">Erreur de chargement</div>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de connexion</div>';
    }
}

function renderAvailableChildren(children) {
    const container = document.getElementById('availableChildrenList');

    if (children.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Tous les enfants ont déjà un objectif lié</div>';
        return;
    }

    let html = '<div class="mb-3">';
    html += '<button class="btn btn-sm btn-outline-primary me-2" onclick="selectAllChildren(true)">Tout sélectionner</button>';
    html += '<button class="btn btn-sm btn-outline-secondary" onclick="selectAllChildren(false)">Tout désélectionner</button>';
    html += '</div>';

    html += '<div class="list-group">';
    children.forEach(child => {
        html += `
            <label class="list-group-item">
                <input type="checkbox" class="form-check-input me-2" 
                       id="child_${child.id}" 
                       onchange="toggleChildSelection('${child.id}', '${child.name}', '${child.suggested_title}')">
                ${child.name}
            </label>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function selectAllChildren(select) {
    document.querySelectorAll('[id^="child_"]').forEach(checkbox => {
        checkbox.checked = select;
        if (select) {
            const childId = checkbox.id.replace('child_', '');
            const label = checkbox.parentElement.textContent.trim();
            toggleChildSelection(childId, label, label, true);
        } else {
            wizardState.distribute.selectedChildren = [];
            wizardState.distribute.childrenConfig = {};
        }
    });

    if (select) {
        showDistributeStep(4);
        renderChildrenConfiguration();
    }
}

function toggleChildSelection(childId, childName, suggestedTitle, skipRender = false) {
    const checkbox = document.getElementById(`child_${childId}`);

    if (checkbox.checked) {
        if (!wizardState.distribute.selectedChildren.includes(childId)) {
            wizardState.distribute.selectedChildren.push(childId);
            wizardState.distribute.childrenConfig[childId] = {
                entity_id: childId,
                entity_name: childName,
                title: suggestedTitle,
                description: '',
                target_value: 0,
                weight: 0
            };
        }
    } else {
        wizardState.distribute.selectedChildren = wizardState.distribute.selectedChildren.filter(id => id !== childId);
        delete wizardState.distribute.childrenConfig[childId];
    }

    // Mettre à jour le compteur
    const count = wizardState.distribute.selectedChildren.length;
    document.getElementById('selectedChildrenCount').textContent = `${count} enfant(s) sélectionné(s)`;

    if (!skipRender && count > 0) {
        showDistributeStep(4);
        renderChildrenConfiguration();
    }
}

function renderChildrenConfiguration() {
    const { parentData, childrenConfig } = wizardState.distribute;
    const container = document.getElementById('childrenConfigContainer');

    // Afficher les infos du parent
    document.getElementById('parentInfoDisplay').innerHTML = `
        <div class="alert alert-info">
            <h6>${parentData.parent_title}</h6>
            <div class="row">
                <div class="col-md-3">
                    <small class="text-muted">Cible</small><br>
                    <strong>${formatCurrency(parentData.total_target)}</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Poids</small><br>
                    <strong>${parentData.weight}%</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Distribué</small><br>
                    <strong>${formatCurrency(parentData.distributed)}</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Restant</small><br>
                    <strong class="text-success">${formatCurrency(parentData.remaining)}</strong>
                </div>
            </div>
        </div>
    `;

    // Afficher la configuration pour chaque enfant
    let html = '';
    Object.keys(childrenConfig).forEach(childId => {
        const config = childrenConfig[childId];
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6>${config.entity_name}</h6>
                    <div class="row">
                        <div class="col-md-12 mb-2">
                            <label class="form-label">Titre (auto-généré)</label>
                            <input type="text" class="form-control" value="${config.title}" readonly>
                        </div>
                        <div class="col-md-12 mb-2">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" rows="2" 
                                      onchange="updateChildConfig('${childId}', 'description', this.value)">${config.description}</textarea>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">Montant Cible *</label>
                            <input type="number" class="form-control" value="${config.target_value}" 
                                   onchange="updateChildConfig('${childId}', 'target_value', this.value)">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">Poids (%)</label>
                            <input type="number" class="form-control" value="${config.weight}" 
                                   onchange="updateChildConfig('${childId}', 'weight', this.value)">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Afficher le récapitulatif
    updateDistributionSummary();
}

function updateChildConfig(childId, field, value) {
    wizardState.distribute.childrenConfig[childId][field] = field === 'description' ? value : parseFloat(value) || 0;
    updateDistributionSummary();
}

function updateDistributionSummary() {
    const { parentData, childrenConfig } = wizardState.distribute;

    let totalTarget = 0;
    let totalWeight = 0;

    Object.values(childrenConfig).forEach(config => {
        totalTarget += parseFloat(config.target_value) || 0;
        totalWeight += parseFloat(config.weight) || 0;
    });

    const remaining = parentData.remaining - totalTarget;
    const isValid = totalTarget <= parentData.remaining;

    let statusClass = 'success';
    let statusIcon = 'check-circle';
    let statusText = 'OK';

    if (!isValid) {
        statusClass = 'danger';
        statusIcon = 'exclamation-circle';
        statusText = 'Dépassement !';
    } else if (remaining > 0) {
        statusClass = 'warning';
        statusIcon = 'exclamation-triangle';
        statusText = 'Reste à distribuer';
    }

    document.getElementById('distributionSummary').innerHTML = `
        <div class="alert alert-${statusClass}">
            <h6><i class="fas fa-${statusIcon} me-2"></i>Récapitulatif</h6>
            <div class="row">
                <div class="col-md-3">
                    <small>Total à distribuer</small><br>
                    <strong>${formatCurrency(parentData.remaining)}</strong>
                </div>
                <div class="col-md-3">
                    <small>Total saisi</small><br>
                    <strong>${formatCurrency(totalTarget)}</strong>
                </div>
                <div class="col-md-3">
                    <small>Poids total</small><br>
                    <strong>${totalWeight.toFixed(1)}%</strong>
                </div>
                <div class="col-md-3">
                    <small>Restant après</small><br>
                    <strong>${formatCurrency(remaining)}</strong>
                </div>
            </div>
            <div class="mt-2">
                <i class="fas fa-info-circle me-1"></i> ${statusText}
            </div>
        </div>
    `;

    // Activer/désactiver le bouton de soumission
    document.getElementById('distributeSubmitBtn').disabled = !isValid || totalTarget === 0;
}

async function submitDistribution() {
    const { parentId, childrenConfig } = wizardState.distribute;

    const children = Object.values(childrenConfig);

    if (children.length === 0) {
        showAlert('Aucun enfant sélectionné', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/objectives/distribute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                parent_objective_id: parentId,
                children: children
            })
        });

        if (response.ok) {
            const result = await response.json();
            const modal = bootstrap.Modal.getInstance(document.getElementById('distributeWizardModal'));
            modal.hide();
            showAlert(`${result.created_count} objectif(s) distribué(s) avec succès`, 'success');
            loadObjectives();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la distribution', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function updateDistributeButtons() {
    const step = wizardState.distribute.currentStep;
    const prevBtn = document.getElementById('distributePrevBtn');
    const nextBtn = document.getElementById('distributeNextBtn');
    const submitBtn = document.getElementById('distributeSubmitBtn');

    prevBtn.style.display = step > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = step === 3 && wizardState.distribute.selectedChildren.length > 0 ? 'inline-block' : 'none';
    submitBtn.style.display = step === 4 ? 'inline-block' : 'none';
}

function previousDistributeStep() {
    const currentStep = wizardState.distribute.currentStep;
    if (currentStep > 1) {
        showDistributeStep(currentStep - 1);
    }
}

function nextDistributeStep() {
    const currentStep = wizardState.distribute.currentStep;
    if (currentStep === 3 && wizardState.distribute.selectedChildren.length > 0) {
        showDistributeStep(4);
        renderChildrenConfiguration();
    }
}

// ============================================
// UTILITAIRES
// ============================================

function toggleAutonomousTrackingFields() {
    const type = document.getElementById('autonomousTrackingType').value;
    const container = document.getElementById('autonomousMetricCodeContainer');
    container.style.display = type === 'AUTOMATIC' ? 'block' : 'none';
}
