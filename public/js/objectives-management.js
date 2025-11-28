// Gestion des objectifs
let currentFiscalYearId = null;
let objectives = [];
let businessUnits = [];
let divisions = [];
let currentObjectiveId = null;

document.addEventListener('DOMContentLoaded', async function () {
    await Promise.all([
        loadFiscalYears(),
        loadBusinessUnits(),
        loadDivisions(),
        loadGrades()
    ]);

    setupEventListeners();
});

function setupEventListeners() {
    // Changement d'année fiscale
    document.getElementById('fiscalYearSelect').addEventListener('change', function (e) {
        currentFiscalYearId = e.target.value;
        if (currentFiscalYearId) {
            loadObjectives();
        } else {
            clearObjectivesDisplay();
        }
    });

    // Gestion des onglets pour recharger les données si nécessaire
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            // On pourrait filtrer ici si on avait toutes les données, 
            // mais loadObjectives charge tout pour l'année courante
            renderObjectives();
        });
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

            const select = document.getElementById('fiscalYearSelect');
            select.innerHTML = '<option value="">Sélectionner un exercice...</option>';

            // Trier par année décroissante
            fiscalYears.sort((a, b) => b.annee - a.annee);

            fiscalYears.forEach(fy => {
                const option = document.createElement('option');
                option.value = fy.id;
                option.textContent = `${fy.libelle || 'FY' + fy.annee} (${fy.annee})`;
                if (fy.statut === 'EN_COURS') {
                    option.selected = true;
                    currentFiscalYearId = fy.id;
                }
                select.appendChild(option);
            });

            if (currentFiscalYearId) {
                loadObjectives();
            }
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
        showAlert('Erreur lors du chargement des exercices fiscaux', 'danger');
    }
}

async function loadBusinessUnits() {
    try {
        const response = await fetch('/api/business-units', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            businessUnits = result.data || result;

            // Remplir le select de filtre BU
            const filterSelect = document.getElementById('buSelect');
            const modalSelect = document.getElementById('objectiveBu');

            businessUnits.forEach(bu => {
                filterSelect.add(new Option(bu.name, bu.id));
                modalSelect.add(new Option(bu.name, bu.id));
            });
        }
    } catch (error) {
        console.error('Erreur chargement BUs:', error);
    }
}

async function loadDivisions() {
    try {
        const response = await fetch('/api/divisions', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            divisions = result.data || result;

            // Remplir le select de filtre Division
            const filterSelect = document.getElementById('divisionSelect');
            const modalSelect = document.getElementById('objectiveDivision');

            divisions.forEach(div => {
                filterSelect.add(new Option(div.name, div.id));
                modalSelect.add(new Option(div.name, div.id));
            });
        }
    } catch (error) {
        console.error('Erreur chargement Divisions:', error);
    }
}

async function loadGrades() {
    try {
        const response = await fetch('/api/grades', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            const grades = result.data || result;

            const modalSelect = document.getElementById('objectiveGrade');
            if (modalSelect) {
                grades.forEach(grade => {
                    modalSelect.add(new Option(grade.name, grade.id));
                });
            }
        }
    } catch (error) {
        console.error('Erreur chargement Grades:', error);
    }
}

async function loadObjectives() {
    if (!currentFiscalYearId) return;

    try {
        // Charger les objectifs globaux
        const response = await fetch(`/api/objectives/global/${currentFiscalYearId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const globalObjs = await response.json();

            // Transformer les données pour correspondre au format attendu
            objectives = (globalObjs || []).map(obj => ({
                id: obj.id,
                title: obj.label || obj.code,
                description: obj.description,
                type: obj.code,
                scope: 'GLOBAL',
                target_amount: obj.target_value,
                weight: obj.weight,
                progress: obj.current_value && obj.target_value ? (obj.current_value / obj.target_value) * 100 : 0,
                deadline: null, // Pas de deadline dans le modèle hiérarchique
                business_unit_id: null,
                division_id: null
            }));

            renderObjectives();
            updateStats();
        }
    } catch (error) {
        console.error('Erreur chargement objectifs:', error);
        showAlert('Erreur lors du chargement des objectifs', 'danger');
    }
}

function renderObjectives() {
    renderGlobalObjectives();
    loadBuObjectives(); // Filtre et affiche
    loadDivisionObjectives(); // Filtre et affiche
}

function renderGlobalObjectives() {
    const container = document.getElementById('globalObjectivesList');
    const globalObjs = objectives.filter(o => o.scope === 'GLOBAL');

    if (globalObjs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif global défini pour cet exercice.</div>';
        return;
    }

    container.innerHTML = globalObjs.map(obj => createObjectiveCard(obj)).join('');
}

function loadBuObjectives() {
    const container = document.getElementById('buObjectivesList');
    const selectedBuId = document.getElementById('buSelect').value;

    let buObjs = objectives.filter(o => o.scope === 'BU');
    if (selectedBuId) {
        buObjs = buObjs.filter(o => o.business_unit_id == selectedBuId);
    }

    if (buObjs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif BU trouvé.</div>';
        return;
    }

    container.innerHTML = buObjs.map(obj => createObjectiveCard(obj)).join('');
}

function loadDivisionObjectives() {
    const container = document.getElementById('divisionObjectivesList');
    const selectedDivId = document.getElementById('divisionSelect').value;

    let divObjs = objectives.filter(o => o.scope === 'DIVISION');
    if (selectedDivId) {
        divObjs = divObjs.filter(o => o.division_id == selectedDivId);
    }

    if (divObjs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif de division trouvé.</div>';
        return;
    }

    container.innerHTML = divObjs.map(obj => createObjectiveCard(obj)).join('');
}

function createObjectiveCard(obj) {
    const progress = obj.progress || 0;
    const isDelayed = new Date(obj.deadline) < new Date() && progress < 100;
    const statusColor = isDelayed ? 'danger' : (progress >= 100 ? 'success' : 'primary');

    let scopeBadge = '';
    if (obj.scope === 'BU') {
        const bu = businessUnits.find(b => b.id == obj.business_unit_id);
        scopeBadge = `<span class="badge bg-info me-2"><i class="fas fa-building me-1"></i>${bu ? bu.name : 'BU Inconnue'}</span>`;
    } else if (obj.scope === 'DIVISION') {
        const div = divisions.find(d => d.id == obj.division_id);
        scopeBadge = `<span class="badge bg-warning text-dark me-2"><i class="fas fa-sitemap me-1"></i>${div ? div.name : 'Division Inconnue'}</span>`;
    }

    return `
    <div class="card objective-card ${obj.scope.toLowerCase()} mb-3">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5 class="card-title mb-1">
                        ${scopeBadge}
                        ${obj.title}
                    </h5>
                    <p class="text-muted small mb-2">
                        <span class="badge bg-secondary me-1">${obj.type}</span>
                        ${obj.deadline ? `<i class="far fa-calendar-alt me-1"></i>${new Date(obj.deadline).toLocaleDateString()}` : ''}
                    </p>
                </div>
                <div class="dropdown">
                    <button class="btn btn-link text-muted p-0" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" onclick="editObjective('${obj.id}')"><i class="fas fa-edit me-2"></i>Modifier</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteObjective('${obj.id}')"><i class="fas fa-trash me-2"></i>Supprimer</a></li>
                    </ul>
                </div>
            </div>
            
            <p class="card-text mb-3">${obj.description || ''}</p>
            
            <div class="row align-items-center">
                <div class="col-md-4">
                    <div class="small text-muted mb-1">Cible</div>
                    <div class="fw-bold">${formatCurrency(obj.target_amount)}</div>
                </div>
                <div class="col-md-4">
                    <div class="small text-muted mb-1">Poids</div>
                    <div class="fw-bold">${obj.weight || 0}%</div>
                </div>
                <div class="col-md-4">
                    <div class="d-flex justify-content-between small mb-1">
                        <span>Progression</span>
                        <span class="text-${statusColor}">${progress}%</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-${statusColor}" role="progressbar" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function updateStats() {
    // Calculs basiques pour l'instant
    const totalObjectives = objectives.length;
    if (totalObjectives === 0) {
        document.getElementById('globalBudget').textContent = '-';
        document.getElementById('achievedObjectives').textContent = '-';
        document.getElementById('globalProgress').textContent = '-';
        document.getElementById('delayedObjectives').textContent = '-';
        return;
    }

    const achieved = objectives.filter(o => (o.progress || 0) >= 100).length;
    const delayed = objectives.filter(o => new Date(o.deadline) < new Date() && (o.progress || 0) < 100).length;

    // Budget global calculé (somme des cibles financières)
    const budget = objectives
        .filter(o => o.type === 'FINANCIER' || o.type === 'CA') // Adapter selon les types réels
        .reduce((sum, o) => sum + (parseFloat(o.target_amount) || 0), 0);

    // Progression moyenne pondérée (si poids dispo) ou simple
    let totalWeight = 0;
    let weightedProgress = 0;

    objectives.forEach(o => {
        const weight = parseFloat(o.weight) || 1; // Poids par défaut 1 si non défini
        totalWeight += weight;
        weightedProgress += (parseFloat(o.progress) || 0) * weight;
    });

    const globalProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

    document.getElementById('globalBudget').textContent = formatCurrency(budget);
    document.getElementById('achievedObjectives').textContent = `${achieved} / ${totalObjectives}`;
    document.getElementById('globalProgress').textContent = `${globalProgress}%`;
    document.getElementById('delayedObjectives').textContent = delayed;
}

// --- CRUD Operations ---

function openCreateObjectiveModal() {
    if (!currentFiscalYearId) {
        showAlert('Veuillez sélectionner un exercice fiscal d\'abord', 'warning');
        return;
    }

    currentObjectiveId = null;
    document.getElementById('objectiveForm').reset();
    document.getElementById('objectiveModalTitle').textContent = 'Nouvel Objectif';
    document.getElementById('objectiveId').value = '';

    // Reset scope visibility
    toggleScopeSelects();

    const modal = new bootstrap.Modal(document.getElementById('objectiveModal'));
    modal.show();
}

function editObjective(id) {
    const obj = objectives.find(o => o.id == id);
    if (!obj) return;

    currentObjectiveId = id;
    document.getElementById('objectiveModalTitle').textContent = 'Modifier l\'Objectif';
    document.getElementById('objectiveId').value = obj.id;
    document.getElementById('objectiveTitle').value = obj.title;
    document.getElementById('objectiveDescription').value = obj.description || '';
    document.getElementById('objectiveType').value = obj.type;
    document.getElementById('objectiveWeight').value = obj.weight || '';
    document.getElementById('objectiveTarget').value = obj.target_amount || '';
    document.getElementById('objectiveDeadline').value = obj.deadline ? obj.deadline.split('T')[0] : '';
    document.getElementById('objectiveScope').value = obj.scope;

    toggleScopeSelects();

    if (obj.scope === 'BU') {
        document.getElementById('objectiveBu').value = obj.business_unit_id;
    } else if (obj.scope === 'DIVISION') {
        document.getElementById('objectiveDivision').value = obj.division_id;
    } else if (obj.scope === 'GRADE') {
        document.getElementById('objectiveGrade').value = obj.target_grade_id; // Assumant que c'est stocké ou récupérable
    }

    document.getElementById('trackingType').value = obj.tracking_type || 'MANUAL';
    document.getElementById('metricCode').value = obj.metric_code || '';
    toggleTrackingFields();

    const modal = new bootstrap.Modal(document.getElementById('objectiveModal'));
    modal.show();
}

async function saveObjective() {
    const form = document.getElementById('objectiveForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const scope = document.getElementById('objectiveScope').value;
    const data = {
        title: document.getElementById('objectiveTitle').value,
        description: document.getElementById('objectiveDescription').value,
        objective_type_id: 1, // TODO: Mapper le type sélectionné vers l'ID du type d'objectif
        weight: parseFloat(document.getElementById('objectiveWeight').value) || 0,
        target_value: parseFloat(document.getElementById('objectiveTarget').value) || 0,
        deadline: document.getElementById('objectiveDeadline').value,
        scope: scope,
        fiscal_year_id: currentFiscalYearId
    };

    if (scope === 'BU') {
        data.business_unit_id = document.getElementById('objectiveBu').value;
        if (!data.business_unit_id) {
            showAlert('Veuillez sélectionner une Business Unit', 'warning');
            return;
        }
    } else if (scope === 'DIVISION') {
        data.division_id = document.getElementById('objectiveDivision').value;
        if (!data.division_id) {
            showAlert('Veuillez sélectionner une Division', 'warning');
            return;
        }
    } else if (scope === 'GRADE') {
        data.grade_id = document.getElementById('objectiveGrade').value;
        if (!data.grade_id) {
            showAlert('Veuillez sélectionner un Grade', 'warning');
            return;
        }
        // Pour les grades, on a besoin de l'ID de l'objectif parent (Division)
        // TODO: Ajouter la sélection de l'objectif parent dans le modal si Scope = GRADE
        // Pour l'instant, on simplifie ou on demande l'ID parent
    }

    // Ajouter les données de cascade
    const nature = document.querySelector('input[name="objectiveNature"]:checked').value;
    if (nature === 'CASCADED') {
        data.is_cascaded = true;
        const parentId = document.getElementById('parentObjective').value;

        if (!parentId) {
            showAlert('Veuillez sélectionner un objectif parent', 'warning');
            return;
        }

        // Mapper le parent_id au bon champ selon la portée
        if (scope === 'BU') {
            data.parent_global_objective_id = parentId;
        } else if (scope === 'DIVISION') {
            data.parent_bu_objective_id = parentId;
        } else if (scope === 'GRADE') {
            data.parent_division_objective_id = parentId;
        }
    } else {
        data.is_cascaded = false;
    }

    // Ajouter les données de suivi
    data.tracking_type = document.getElementById('trackingType').value;
    if (data.tracking_type === 'AUTOMATIC') {
        data.metric_code = document.getElementById('metricCode').value;
        if (!data.metric_code) {
            showAlert('Veuillez sélectionner une métrique pour le suivi automatique', 'warning');
            return;
        }
    }


    try {
        let url = currentObjectiveId
            ? `/api/objectives/${currentObjectiveId}`
            : '/api/objectives';

        // Ajuster l'URL selon le scope pour la création
        if (!currentObjectiveId) {
            if (scope === 'GLOBAL') url = '/api/objectives/global';
            else if (scope === 'BU') url = '/api/objectives/business-unit';
            else if (scope === 'DIVISION') url = '/api/objectives/division';
            else if (scope === 'GRADE') url = '/api/objectives/grade';
        }

        const method = currentObjectiveId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            const modal = bootstrap.Modal.getInstance(document.getElementById('objectiveModal'));
            modal.hide();

            if (scope === 'GRADE') {
                showAlert(result.message || 'Objectifs assignés au grade avec succès', 'success');
            } else {
                showAlert('Objectif enregistré avec succès', 'success');
            }
            loadObjectives();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de l\'enregistrement', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function deleteObjective(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) return;

    try {
        const response = await fetch(`/api/objectives/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            showAlert('Objectif supprimé', 'success');
            loadObjectives();
        } else {
            showAlert('Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}


// --- Utilities ---

function toggleTrackingFields() {
    const type = document.getElementById('trackingType').value;
    const container = document.getElementById('metricCodeContainer');
    container.style.display = type === 'AUTOMATIC' ? 'block' : 'none';
}

function toggleScopeSelects() {
    const scope = document.getElementById('objectiveScope').value;
    const container = document.getElementById('scopeSelects');
    const buContainer = document.getElementById('buSelectContainer');
    const divContainer = document.getElementById('divisionSelectContainer');
    const gradeContainer = document.getElementById('gradeSelectContainer');

    if (scope === 'GLOBAL') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        buContainer.style.display = scope === 'BU' ? 'block' : 'none';
        divContainer.style.display = scope === 'DIVISION' ? 'block' : 'none';
        gradeContainer.style.display = scope === 'GRADE' ? 'block' : 'none';
    }
}

function refreshObjectives() {
    loadObjectives();
}

function clearObjectivesDisplay() {
    document.getElementById('globalObjectivesList').innerHTML = '';
    document.getElementById('buObjectivesList').innerHTML = '';
    document.getElementById('divisionObjectivesList').innerHTML = '';
    updateStats();
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
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

// --- Cascade Functions ---

function toggleParentObjective() {
    const nature = document.querySelector('input[name="objectiveNature"]:checked').value;
    const container = document.getElementById('parentObjectiveContainer');
    container.style.display = nature === 'CASCADED' ? 'block' : 'none';

    if (nature === 'CASCADED') {
        loadAvailableParents();
    }
}

async function loadAvailableParents() {
    const scope = document.getElementById('objectiveScope').value;
    const select = document.getElementById('parentObjective');

    // Déterminer le type de parent basé sur la portée
    const parentTypeMap = {
        'BU': 'BUSINESS_UNIT',
        'DIVISION': 'DIVISION',
        'GRADE': 'INDIVIDUAL'
    };

    const parentType = parentTypeMap[scope];
    if (!parentType) {
        select.innerHTML = '<option value="">Aucun parent disponible pour ce niveau</option>';
        return;
    }

    try {
        // Construire les filtres basés sur la portée
        const filters = {};
        if (scope === 'DIVISION') {
            const buId = document.getElementById('objectiveBu').value;
            if (buId) filters.business_unit_id = buId;
        } else if (scope === 'GRADE') {
            const divisionId = document.getElementById('objectiveDivision').value;
            if (divisionId) filters.division_id = divisionId;
        }

        const queryString = new URLSearchParams(filters).toString();
        const url = `/api/objectives/available-parents/${parentType}${queryString ? '?' + queryString : ''}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
        });

        if (response.ok) {
            const parents = await response.json();
            select.innerHTML = '<option value="">Sélectionner un objectif parent...</option>';

            parents.forEach(parent => {
                const option = document.createElement('option');
                option.value = parent.id;
                option.textContent = `${parent.description} (${formatCurrency(parent.target_value)})`;
                option.dataset.remaining = parent.remaining_amount || parent.target_value;
                select.add(option);
            });
        }
    } catch (error) {
        console.error('Erreur chargement parents:', error);
        select.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

function updateRemainingAmount() {
    const select = document.getElementById('parentObjective');
    const remainingInput = document.getElementById('remainingAmount');

    if (select.value) {
        const selectedOption = select.options[select.selectedIndex];
        const remaining = selectedOption.dataset.remaining || 0;
        remainingInput.value = formatCurrency(remaining);
    } else {
        remainingInput.value = '';
    }
}

