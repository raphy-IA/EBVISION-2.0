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
        'GLOBAL': 'objectives.global.distribute',
        'BU': 'objectives.bu.distribute',
        'DIVISION': 'objectives.division.distribute',
        'GRADE': 'objectives.grade.distribute',
        'INDIVIDUAL': 'objectives:create'
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
    } else if (level === 'INDIVIDUAL') {
        // Pour INDIVIDUAL, vérifier les BU access et afficher l'interface de sélection
        checkBUAccessAndShowCollaboratorSelection();
    } else {
        // Sinon, passer à l'étape 2 pour sélectionner l'entité
        showAutonomousStep(2);
        loadEntitiesForLevel(level);
    }
}

async function checkBUAccessAndShowCollaboratorSelection() {
    try {
        const response = await fetch('/api/users/me/bu-access', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            wizardState.autonomous.buAccess = result.data;

            if (result.data.hasAllAccess || result.data.businessUnits.length === 1) {
                // Une seule BU ou accès total → passer direct à sélection collaborateurs
                // Si une seule BU, on la pré-sélectionne
                if (result.data.businessUnits.length === 1) {
                    wizardState.autonomous.selectedBU = result.data.businessUnits[0].id;
                }
                showCollaboratorSelectionInterface();
            } else {
                // Plusieurs BU → afficher dropdown BU
                showBUSelectionStep(result.data.businessUnits);
            }
        } else {
            // Fallback si l'API échoue (ex: ancienne version)
            showCollaboratorSelectionInterface();
        }
    } catch (error) {
        console.error('Erreur BU access:', error);
        // Fallback
        showCollaboratorSelectionInterface();
    }
}

function showBUSelectionStep(businessUnits) {
    const modalBody = document.querySelector('#autonomousWizardModal .modal-body');
    // Masquer les autres étapes
    document.querySelectorAll('[id^="autonomousStep"]').forEach(el => el.style.display = 'none');

    let step = document.getElementById('autonomousBUStep');
    if (!step) {
        step = document.createElement('div');
        step.id = 'autonomousBUStep';
        modalBody.appendChild(step);
    }

    step.innerHTML = `
        <h6 class="mb-3">Sélectionner la Business Unit</h6>
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Veuillez sélectionner la Business Unit pour laquelle vous souhaitez créer des objectifs.
        </div>
        <select class="form-select" id="selectedBUDropdown">
            <option value="">-- Sélectionnez une BU --</option>
            ${businessUnits.map(bu => `<option value="${bu.id}">${bu.nom}</option>`).join('')}
        </select>
        <div class="mt-3 text-end">
            <button class="btn btn-secondary me-2" onclick="showAutonomousStep(1)">Retour</button>
            <button class="btn btn-primary" onclick="selectBU()">Continuer</button>
        </div>
    `;

    step.style.display = 'block';
}

function selectBU() {
    const buId = document.getElementById('selectedBUDropdown').value;
    if (buId) {
        wizardState.autonomous.selectedBU = buId;
        showCollaboratorSelectionInterface();
    } else {
        showAlert('Veuillez sélectionner une Business Unit', 'warning');
    }
}

async function showCollaboratorSelectionInterface() {
    const modalBody = document.querySelector('#autonomousWizardModal .modal-body');
    document.querySelectorAll('[id^="autonomousStep"]').forEach(el => el.style.display = 'none');

    // Masquer aussi l'étape BU si elle existe
    const buStep = document.getElementById('autonomousBUStep');
    if (buStep) buStep.style.display = 'none';

    let step = document.getElementById('autonomousCollabSelectionStep');
    if (!step) {
        step = document.createElement('div');
        step.id = 'autonomousCollabSelectionStep';
        modalBody.appendChild(step);
    }

    step.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement des collaborateurs...</div>';
    step.style.display = 'block';

    try {
        // Charger les grades ET les collaborateurs en parallèle
        const [grades, collaborators] = await Promise.all([
            fetchGrades(),
            fetchCollaborators()
        ]);

        step.innerHTML = `
            <h6 class="mb-3">Sélectionner les Collaborateurs</h6>
            
            <div class="row">
                <!-- Filtres par Grades -->
                <div class="col-md-4">
                    <label class="fw-bold mb-2">Filtrer par Grades</label>
                    <div id="gradesCheckboxes" class="border p-2 rounded bg-light" style="max-height: 300px; overflow-y: auto;">
                        ${grades.length > 0 ? grades.map(grade => `
                            <div class="form-check">
                                <input class="form-check-input grade-filter" type="checkbox" 
                                       id="grade_${grade.id}" value="${grade.id}" 
                                       onchange="filterCollaboratorsByGrade()">
                                <label class="form-check-label small" for="grade_${grade.id}">
                                    ${grade.nom}
                                </label>
                            </div>
                        `).join('') : '<div class="text-muted small">Aucun grade disponible</div>'}
                    </div>
                </div>
                
                <!-- Liste des collaborateurs -->
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="fw-bold">Collaborateurs</label>
                        <span class="badge bg-secondary" id="collabCount">${collaborators.length}</span>
                    </div>
                    <div id="collaboratorsCheckboxes" class="border p-2 rounded" style="max-height: 300px; overflow-y: auto;">
                        ${collaborators.length > 0 ? collaborators.map(collab => `
                            <div class="form-check collab-item" data-grade="${collab.grade_actuel_id || ''}">
                                <input class="form-check-input collab-select" type="checkbox" 
                                       id="collab_${collab.id}" value="${collab.id}">
                                <label class="form-check-label" for="collab_${collab.id}">
                                    ${collab.nom} ${collab.prenom}
                                </label>
                            </div>
                        `).join('') : '<div class="alert alert-warning small">Aucun collaborateur trouvé</div>'}
                    </div>
                </div>
            </div>
            
            <div class="mt-4 text-end">
                <button class="btn btn-secondary me-2" onclick="showAutonomousStep(1)">Retour</button>
                <button class="btn btn-primary" onclick="proceedWithSelectedCollaborators()">
                    Continuer
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Erreur chargement interface:', error);
        step.innerHTML = `
            <div class="alert alert-danger">
                Erreur lors du chargement des données. Veuillez réessayer.
                <br><small>${error.message}</small>
            </div>
            <button class="btn btn-secondary" onclick="showAutonomousStep(1)">Retour</button>
        `;
    }
}

async function fetchGrades() {
    try {
        const response = await fetch('/api/grades?filterByUserAccess=true', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            return result.data || result;
        }
        return [];
    } catch (error) {
        console.error('Erreur fetch grades:', error);
        return [];
    }
}

async function fetchCollaborators() {
    try {
        const buParam = wizardState.autonomous.selectedBU ? `&business_unit_id=${wizardState.autonomous.selectedBU}` : '';
        const response = await fetch(`/api/collaborateurs?filterByUserAccess=true${buParam}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            return result.data || result;
        }
        return [];
    } catch (error) {
        console.error('Erreur fetch collaborators:', error);
        return [];
    }
}

function filterCollaboratorsByGrade() {
    const selectedGrades = Array.from(document.querySelectorAll('.grade-filter:checked'))
        .map(cb => cb.value);

    const items = document.querySelectorAll('.collab-item');
    let visibleCount = 0;

    items.forEach(item => {
        const itemGrade = item.dataset.grade;
        // Si aucun grade sélectionné OU grade correspond (attention aux types string/int)
        if (selectedGrades.length === 0 || selectedGrades.includes(itemGrade) || selectedGrades.includes(String(itemGrade))) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
            // Décocher les masqués pour éviter les erreurs
            const checkbox = item.querySelector('.collab-select');
            if (checkbox) checkbox.checked = false;
        }
    });

    document.getElementById('collabCount').textContent = visibleCount;
}

function proceedWithSelectedCollaborators() {
    const selectedCollabs = Array.from(document.querySelectorAll('.collab-select:checked'))
        .map(cb => cb.value);

    if (selectedCollabs.length === 0) {
        showAlert('Veuillez sélectionner au moins un collaborateur', 'warning');
        return;
    }

    wizardState.autonomous.selectedCollaborators = selectedCollabs;
    // Pour compatibilité avec le reste du code (titre etc)
    wizardState.autonomous.entityId = selectedCollabs[0];
    wizardState.autonomous.entityName = selectedCollabs.length > 1
        ? `${selectedCollabs.length} collaborateurs`
        : document.querySelector(`label[for="collab_${selectedCollabs[0]}"]`).textContent.trim();

    // Passer à l'étape 3 (Formulaire)
    showAutonomousStep(3);
    loadAutonomousForm();
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
            // INDIVIDUAL est géré à part maintenant, mais on le garde au cas où
            case 'INDIVIDUAL':
                url = '/api/collaborateurs';
                break;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            // FIX: Gérer le format {success: true, data: [...]} ou tableau direct
            const entities = Array.isArray(result) ? result : (result.data || []);
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

    if (!entities || entities.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucune entité disponible</div>';
        return;
    }

    let html = '<div class="list-group">';
    entities.forEach(entity => {
        // Gestion des différents formats de nom
        let displayName = entity.nom || entity.name || entity.label;
        if (entity.prenom) displayName = `${entity.nom} ${entity.prenom}`;

        html += `
            <button type="button" class="list-group-item list-group-item-action" 
                    onclick="selectAutonomousEntity('${entity.id}', '${displayName.replace(/'/g, "\\'")}')">
                <i class="fas fa-check-circle text-success me-2"></i>
                ${displayName}
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

    const titleEl = document.getElementById('autonomousFormTitle');
    if (titleEl) titleEl.textContent = levelLabels[level] || level;

    // Charger les types d'objectifs
    loadObjectiveTypesForAutonomous();
}

async function loadObjectiveTypesForAutonomous() {
    try {
        const response = await fetch('/api/objectives/types', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const types = await response.json();
            const select = document.getElementById('autonomousObjectiveType');
            if (!select) return;

            select.innerHTML = '<option value="">Sélectionner un type...</option>';
            types.forEach(type => {
                select.innerHTML += `<option value="${type.id}">${type.label}</option>`;
            });
        }
    } catch (error) {
        console.error('Erreur chargement types:', error);
    }
}

async function submitAutonomousObjective() {
    const { level, entityId, selectedCollaborators } = wizardState.autonomous;

    // Récupérer les données du formulaire
    const typeSelect = document.getElementById('autonomousObjectiveType');
    const typeId = parseInt(typeSelect.value);

    console.log('🔍 [submitAutonomousObjective] Type sélectionné:', {
        value: typeSelect.value,
        parsed: typeId,
        text: typeSelect.options[typeSelect.selectedIndex]?.text
    });

    const data = {
        objective_type_id: typeId,
        title: document.getElementById('autonomousTitle').value,
        description: document.getElementById('autonomousDescription').value,
        target_value: parseFloat(document.getElementById('autonomousTarget').value),
        weight: parseFloat(document.getElementById('autonomousWeight').value) || 0,
        tracking_type: document.getElementById('autonomousTrackingType').value,
        metric_code: document.getElementById('autonomousMetricCode').value || null,
        fiscal_year_id: currentFiscalYearId
    };

    // Validation stricte
    if (!data.objective_type_id || isNaN(data.objective_type_id)) {
        console.error('❌ [submitAutonomousObjective] Type d\'objectif invalide:', data.objective_type_id);
        showAlert('Veuillez sélectionner un type d\'objectif valide', 'warning');
        return;
    }

    if (!data.title || !data.target_value) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    const submitBtn = document.getElementById('autonomousSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

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
            // Gestion de la création multiple pour INDIVIDUAL
            if (selectedCollaborators && selectedCollaborators.length > 0) {
                let successCount = 0;
                let errorCount = 0;

                for (const collabId of selectedCollaborators) {
                    const collabData = { ...data, collaborator_id: collabId };
                    try {
                        const res = await fetch('/api/objectives/individual', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                            },
                            body: JSON.stringify(collabData)
                        });
                        if (res.ok) successCount++;
                        else errorCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }

                const modal = bootstrap.Modal.getInstance(document.getElementById('autonomousWizardModal'));
                modal.hide();

                if (errorCount === 0) {
                    showAlert(`${successCount} objectif(s) créé(s) avec succès`, 'success');
                } else {
                    showAlert(`${successCount} créé(s), ${errorCount} erreur(s)`, 'warning');
                }
                loadObjectives();
                if (submitBtn) submitBtn.disabled = false;
                return;
            } else {
                // Fallback cas simple (ne devrait pas arriver avec la nouvelle interface)
                url = '/api/objectives/individual';
                data.collaborator_id = entityId;
            }
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
    } finally {
        if (submitBtn) submitBtn.disabled = false;
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
        'BUSINESS_UNIT': 'objectives.global.distribute',
        'DIVISION': 'objectives.bu.distribute',
        'GRADE': 'objectives.division.distribute',
        'INDIVIDUAL': 'objectives.grade.distribute'
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
