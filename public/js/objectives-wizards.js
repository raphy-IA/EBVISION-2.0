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

/**
 * Raccourci : ouvre directement le wizard sur un objectif global spécifique.
 * Appelé depuis le bouton "Distribuer" sur chaque carte d'objectif global.
 */
async function openDistributeWizard(parentObjectiveId, parentScope) {
    // Mapping scope parent → niveau enfant à créer
    const scopeToChildLevel = {
        'GLOBAL': 'BUSINESS_UNIT',
        'BU': 'DIVISION',
        'DIVISION': 'INDIVIDUAL'
    };

    const scopeToTitle = {
        'GLOBAL': '<i class="fas fa-sitemap me-2"></i>Distribuer aux Business Units',
        'BU': '<i class="fas fa-sitemap me-2"></i>Distribuer aux Divisions',
        'DIVISION': '<i class="fas fa-user-plus me-2"></i>Distribuer aux Individus'
    };

    const childLevel = scopeToChildLevel[parentScope] || 'BUSINESS_UNIT';
    const wizardTitle = scopeToTitle[parentScope] || '<i class="fas fa-sitemap me-2"></i>Distribuer';

    // Réinitialiser l'état
    wizardState.distribute = {
        currentStep: 1,
        childLevel,
        parentScope: parentScope, // Stocker le scope parent
        parentId: parentObjectiveId,
        parentData: null,
        selectedChildren: [],
        childrenConfig: {},
        _allChildren: []
    };

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('distributeWizardModal'));
    modal.show();

    // Mettre à jour le titre du modal
    const titleEl = document.querySelector('#distributeWizardModal .modal-title');
    if (titleEl) titleEl.innerHTML = wizardTitle;

    // Charger le résumé du parent et aller directement à l'étape 3 (distribution en masse)
    // Convertir le scope frontend ('BU') en type backend ('BUSINESS_UNIT')
    const scopeToBackendType = {
        'GLOBAL': 'GLOBAL',
        'BU': 'BUSINESS_UNIT',
        'DIVISION': 'DIVISION'
    };
    const backendParentType = scopeToBackendType[parentScope] || parentScope;

    try {
        const response = await fetch(`/api/objectives/${parentObjectiveId}/distribution-summary?parentType=${backendParentType}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            wizardState.distribute.parentData = await response.json();
            showDistributeStep(3);
            loadAvailableChildren();
        } else {
            // Fallback sur l'étape 1 normale si la route n'est pas disponible
            showDistributeStep(1);
            filterDistributeOptions();
        }
    } catch (error) {
        console.error('Erreur chargement parent:', error);
        showDistributeStep(1);
        filterDistributeOptions();
    }
}


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
        'INDIVIDUAL': 'objectives.division.distribute'
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

    // Charger le résumé de distribution (passer explicitement le scope pour éviter les conflits d'id)
    const parentScope = wizardState.distribute.parentScope;
    try {
        const response = await fetch(`/api/objectives/${parentId}/distribution-summary?parentType=${parentScope}`, {
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
    container.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2 text-muted">Chargement des BUs disponibles...</p></div>';

    try {
        const parentScope = wizardState.distribute.parentScope;
        // Convertir le scope frontend ('BU') en type backend ('BUSINESS_UNIT')
        const scopeToBackendType = { 'GLOBAL': 'GLOBAL', 'BU': 'BUSINESS_UNIT', 'DIVISION': 'DIVISION' };
        const backendParentType = scopeToBackendType[parentScope] || parentScope;

        const response = await fetch(`/api/objectives/${parentId}/available-children?childType=${childLevel}&parentType=${backendParentType}&includeExisting=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const children = await response.json();
            renderMassDistributionTable(children);
        } else {
            const errText = await response.text();
            console.error('Erreur available-children:', errText);
            container.innerHTML = '<div class="alert alert-danger">Erreur de chargement des entités disponibles</div>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de connexion</div>';
    }
}

function renderMassDistributionTable(children) {
    const container = document.getElementById('availableChildrenList');
    const { parentData } = wizardState.distribute;

    // Réinitialiser la config
    wizardState.distribute.selectedChildren = [];
    wizardState.distribute.childrenConfig = {};
    // Stocker toutes les BUs disponibles
    wizardState.distribute._allChildren = children;

    const getLevelLabel = (level, plural = false) => {
        const labels = {
            'BUSINESS_UNIT': plural ? 'Business Units' : 'Business Unit',
            'DIVISION': plural ? 'Divisions' : 'Division',
            'INDIVIDUAL': plural ? 'Collaborateurs' : 'Collaborateur'
        };
        return labels[level] || (plural ? 'Entités' : 'Entité');
    };

    const childLabel = getLevelLabel(wizardState.distribute.childLevel);
    const childLabelPlural = getLevelLabel(wizardState.distribute.childLevel, true);

    if (children.length === 0) {
        container.innerHTML = `<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Toutes les ${childLabelPlural} ont déjà un objectif assigné pour ce parent.</div>`;
        document.getElementById('distributeSubmitBtn').disabled = true;
        return;
    }

    // Infos parent en haut
    const remaining = parentData.remaining;
    const getParentLabel = (type) => {
        if (type === 'GLOBAL') return 'Cible Globale';
        if (type === 'BUSINESS_UNIT') return 'Cible BU';
        if (type === 'DIVISION') return 'Cible Division';
        return 'Cible Parent';
    };

    const summaryHtml = `
        <div class="alert alert-info mb-3 py-2">
            <div class="row text-center">
                <div class="col-4">
                    <small class="text-muted d-block">${getParentLabel(parentData.parent_type)}</small>
                    <strong>${formatCurrency(parentData.total_target)}</strong>
                </div>
                <div class="col-4">
                    <small class="text-muted d-block">Déjà distribué</small>
                    <strong>${formatCurrency(parentData.distributed)}</strong>
                </div>
                <div class="col-4">
                    <small class="text-muted d-block">Restant</small>
                    <strong class="text-success">${formatCurrency(remaining)}</strong>
                </div>
            </div>
        </div>
    `;

    // Boutons sélection
    const selBtns = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="massSelectAll()">
                    <i class="fas fa-check-double me-1"></i>Tout sélectionner
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="massClearAll()">
                    <i class="fas fa-times me-1"></i>Tout désélectionner
                </button>
            </div>
            <span id="massSelectionCount" class="badge bg-primary">0 ${childLabel} sélectionnée(s)</span>
        </div>
    `;

    // Tableau inline
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-hover table-bordered align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th style="width:40px">
                            <input type="checkbox" class="form-check-input" id="massCheckAll" onchange="massToggleAll(this.checked)">
                        </th>
                        <th>${childLabel}</th>
                        <th style="width:220px">Valeur Cible *</th>
                        <th>Description (optionnel)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const safeJsString = (str) => (str || '').replace(/'/g, "\\'");

    children.forEach(child => {
        const safeName = safeJsString(child.name);
        const safeTitle = safeJsString(child.suggested_title);
        const isDistributed = !!child.is_distributed;
        const existingTarget = child.existing_target !== null ? child.existing_target : '';

        tableHtml += `
            <tr id="massRow_${child.id}" class="mass-bu-row ${isDistributed ? 'table-info' : ''}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input mass-check" id="massChk_${child.id}"
                           ${isDistributed ? 'checked' : ''}
                           onchange="massToggleRow('${child.id}', '${safeName}', '${safeTitle}', this.checked)">
                </td>
                <td>
                    <div class="fw-semibold"><i class="fas fa-${wizardState.distribute.childLevel === 'INDIVIDUAL' ? 'user' : (wizardState.distribute.childLevel === 'DIVISION' ? 'users' : 'building')} me-2 text-primary"></i>${child.name}</div>
                    ${isDistributed ? '<span class="badge bg-info text-dark x-small">Déjà assigné</span>' : ''}
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" id="massVal_${child.id}"
                           placeholder="ex: 50000000" min="0" step="any" 
                           ${isDistributed ? '' : 'disabled'}
                           value="${existingTarget}"
                           oninput="massUpdateValue('${child.id}', this.value)">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" id="massDesc_${child.id}"
                           placeholder="Description..." 
                           ${isDistributed ? '' : 'disabled'}
                           oninput="massUpdateDesc('${child.id}', this.value)">
                </td>
            </tr>
        `;

        // Si déjà distribué, on l'ajoute à la config initiale pour permettre l'édition immédiate
        if (isDistributed) {
            if (!wizardState.distribute.selectedChildren.includes(child.id)) {
                wizardState.distribute.selectedChildren.push(child.id);
            }
            wizardState.distribute.childrenConfig[child.id] = {
                entity_id: child.id,
                entity_name: child.name,
                target_value: existingTarget,
                description: '',
                is_update: true,
                objective_id: child.objective_id
            };
        }
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
        <div id="massDistSummary" class="mt-3"></div>
    `;

    container.innerHTML = summaryHtml + selBtns + tableHtml;
    updateMassDistSummary();
}

function massToggleRow(childId, childName, suggestedTitle, checked) {
    const row = document.getElementById(`massRow_${childId}`);
    const valInput = document.getElementById(`massVal_${childId}`);
    const descInput = document.getElementById(`massDesc_${childId}`);

    if (checked) {
        row.classList.add('table-primary');
        valInput.disabled = false;
        descInput.disabled = false;
        valInput.focus();

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
        row.classList.remove('table-primary');
        valInput.disabled = true;
        descInput.disabled = true;
        valInput.value = '';
        descInput.value = '';

        wizardState.distribute.selectedChildren = wizardState.distribute.selectedChildren.filter(id => id !== childId);
        delete wizardState.distribute.childrenConfig[childId];
    }

    updateMassSelectionCount();
    updateMassDistSummary();
}

function massToggleAll(checked) {
    const children = wizardState.distribute._allChildren || [];
    children.forEach(child => {
        const chk = document.getElementById(`massChk_${child.id}`);
        if (chk && chk.checked !== checked) {
            chk.checked = checked;
            massToggleRow(child.id, child.name, child.suggested_title, checked);
        }
    });
}

function massSelectAll() {
    document.getElementById('massCheckAll').checked = true;
    massToggleAll(true);
}

function massClearAll() {
    document.getElementById('massCheckAll').checked = false;
    massToggleAll(false);
}

function massUpdateValue(childId, value) {
    if (wizardState.distribute.childrenConfig[childId]) {
        wizardState.distribute.childrenConfig[childId].target_value = parseFloat(value) || 0;
        updateMassDistSummary();
    }
}

function massUpdateDesc(childId, value) {
    if (wizardState.distribute.childrenConfig[childId]) {
        wizardState.distribute.childrenConfig[childId].description = value;
    }
}

function updateMassSelectionCount() {
    const count = wizardState.distribute.selectedChildren.length;
    const el = document.getElementById('massSelectionCount');
    if (el) {
        const labels = {
            'BUSINESS_UNIT': 'BU',
            'DIVISION': 'Division',
            'INDIVIDUAL': 'Collaborateur'
        };
        const label = labels[wizardState.distribute.childLevel] || 'Élément';
        el.textContent = `${count} ${label}${count > 1 ? (wizardState.distribute.childLevel === 'BUSINESS_UNIT' ? 's' : 's') : ''} sélectionnée(s)`;
    }
}

function updateMassDistSummary() {
    const { parentData, childrenConfig } = wizardState.distribute;
    const el = document.getElementById('massDistSummary');
    if (!el || !parentData) return;

    let total = 0;
    Object.values(childrenConfig).forEach(c => { total += parseFloat(c.target_value) || 0; });

    const remaining = parentData.total_target - total;
    const isValid = total <= parentData.total_target && total > 0;
    const isOver = total > parentData.total_target;

    const statusClass = isOver ? 'danger' : (remaining === 0 ? 'success' : 'warning');
    const statusText = isOver
        ? `⛔ Dépassement de ${formatCurrency(Math.abs(remaining))}`
        : (remaining === 0 ? '✅ Parfait — 100% distribué'
            : (total === 0 ? 'Renseignez les valeurs ci-dessus'
                : `⚠️ Reste ${formatCurrency(remaining)} à distribuer`));

    const labels = {
        'BUSINESS_UNIT': 'BUs',
        'DIVISION': 'Divisions',
        'INDIVIDUAL': 'Collabs'
    };
    const label = labels[wizardState.distribute.childLevel] || 'Éléments';

    el.innerHTML = `
        <div class="alert alert-${statusClass} py-2 mb-0">
            <div class="row text-center">
                <div class="col-4">
                    <small class="text-muted d-block">${label} sélectionnés</small>
                    <strong>${Object.keys(childrenConfig).length}</strong>
                </div>
                <div class="col-4">
                    <small class="text-muted d-block">Total distribué</small>
                    <strong>${formatCurrency(total)}</strong>
                </div>
                <div class="col-4">
                    <small class="text-muted d-block">Restant</small>
                    <strong>${formatCurrency(remaining)}</strong>
                </div>
            </div>
            <div class="text-center mt-2 small">${statusText}</div>
        </div>
    `;

    // Activer/désactiver le bouton submit
    const submitBtn = document.getElementById('distributeSubmitBtn');
    if (submitBtn) submitBtn.disabled = !isValid || isOver;
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
                <div class="card-header py-2 bg-light">
                    <h6 class="mb-0"><i class="fas fa-building me-2 text-primary"></i>${config.entity_name}</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-12 mb-2">
                            <label class="form-label fw-semibold">Titre</label>
                            <input type="text" class="form-control" value="${config.title}"
                                   onchange="updateChildConfig('${childId}', 'title', this.value)">
                        </div>
                        <div class="col-md-12 mb-2">
                            <label class="form-label fw-semibold">Description</label>
                            <textarea class="form-control" rows="2" 
                                      onchange="updateChildConfig('${childId}', 'description', this.value)">${config.description}</textarea>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label fw-semibold">Valeur Cible *</label>
                            <input type="number" class="form-control" value="${config.target_value}" 
                                   placeholder="Saisir le montant ou la quantité cible..."
                                   onchange="updateChildConfig('${childId}', 'target_value', this.value)">
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
    const nbBUs = Object.keys(childrenConfig).length;

    Object.values(childrenConfig).forEach(config => {
        totalTarget += parseFloat(config.target_value) || 0;
    });

    const remaining = parentData.total_target - totalTarget;
    const isValid = totalTarget <= parentData.total_target;

    let statusClass = remaining === 0 ? 'success' : (isValid ? 'warning' : 'danger');
    let statusIcon = remaining === 0 ? 'check-circle' : (isValid ? 'exclamation-triangle' : 'exclamation-circle');
    let statusText = remaining === 0
        ? 'Parfait — 100% distribué'
        : (isValid ? `Il reste ${formatCurrency(remaining)} non distribué` : 'Dépassement de la cible globale !');

    document.getElementById('distributionSummary').innerHTML = `
        <div class="alert alert-${statusClass}">
            <h6><i class="fas fa-${statusIcon} me-2"></i>Récapitulatif de distribution</h6>
            <div class="row">
                <div class="col-md-3">
                    <small class="text-muted">Cible globale</small><br>
                    <strong>${formatCurrency(parentData.total_target)}</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Total distribué</small><br>
                    <strong>${formatCurrency(totalTarget)}</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Nb BUs</small><br>
                    <strong>${nbBUs} BU${nbBUs > 1 ? 's' : ''}</strong>
                </div>
                <div class="col-md-3">
                    <small class="text-muted">Restant</small><br>
                    <strong class="text-${remaining > 0 ? 'warning' : (remaining < 0 ? 'danger' : 'success')}">${formatCurrency(remaining)}</strong>
                </div>
            </div>
            <div class="mt-2 small">
                <i class="fas fa-info-circle me-1"></i> ${statusText}
            </div>
        </div>
    `;

    // Activer/désactiver le bouton de soumission — autoriser même si partiel (restant > 0)
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
        const scopeToBackendType = {
            'GLOBAL': 'GLOBAL',
            'BU': 'BUSINESS_UNIT',
            'DIVISION': 'DIVISION'
        };
        const parentType = scopeToBackendType[wizardState.distribute.parentScope] || wizardState.distribute.parentScope;

        const response = await fetch('/api/objectives/distribute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                parent_objective_id: parentId,
                parent_type: parentType,
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

    // Précédent : visible si step > 1 (sauf si on vient d'un objectif global direct = commencé à step 3)
    prevBtn.style.display = (step > 1 && step !== 3) ? 'inline-block' : 'none';

    // Suivant : plus nécessaire — la table de distribution est directement sur step 3
    nextBtn.style.display = 'none';

    // Confirmer : visible sur step 3 (distribution en masse) et step 4
    submitBtn.style.display = (step === 3 || step === 4) ? 'inline-block' : 'none';
    if (step === 3) {
        // Désactivé jusqu'à ce que des BUs soient sélectionnées avec des valeurs
        const hasSelection = wizardState.distribute.selectedChildren.length > 0;
        const hasValues = Object.values(wizardState.distribute.childrenConfig).some(c => parseFloat(c.target_value) > 0);
        submitBtn.disabled = !(hasSelection && hasValues);
    }
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
