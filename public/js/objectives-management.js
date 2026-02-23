// Gestion des objectifs
let currentFiscalYearId = null;
let objectives = [];
let businessUnits = [];
let divisions = [];
let currentObjectiveId = null;
let objectiveTypes = []; // Store objective types

document.addEventListener('DOMContentLoaded', async function () {
    // Initialiser la session avant tout
    try {
        await sessionManager.initialize();
        applyRbacUI();
    } catch (error) {
        console.error('Erreur initialisation session:', error);
    }

    // Initialiser le sélecteur d'année fiscale
    await FiscalYearSelector.init('fiscalYearSelect', (selectedYearId) => {
        currentFiscalYearId = selectedYearId;
        loadObjectives();
    });

    await Promise.all([
        loadBusinessUnits(),
        loadDivisions(),
        loadGrades(),
        loadObjectiveTypes(),
        loadCollaborators() // Load collaborators for individual tab
    ]);

    setupEventListeners();
});

function applyRbacUI() {
    const isSuperAdmin = sessionManager.isAdmin();
    const isSeniorPartner = sessionManager.getUser().roles && sessionManager.getUser().roles.includes('SENIOR_PARTNER');
    const isResponsableRH = sessionManager.getUser().roles && (sessionManager.getUser().roles.includes('RESPONSABLE_RH') || sessionManager.getUser().roles.includes('RESPONSABLE RH'));
    const isPartner = sessionManager.getUser().roles && sessionManager.getUser().roles.includes('PARTNER');

    // Administrative logic: Senior Partners and Admins see everything
    const isAdministrative = isSuperAdmin || isSeniorPartner;

    // Visibility for Library button: SuperAdmin, Senior Partner, Responsable RH
    const canUseLibrary = isAdministrative || isResponsableRH;
    const btnLibrary = document.getElementById('btnLibrary');
    if (btnLibrary) btnLibrary.style.display = canUseLibrary ? 'inline-block' : 'none';

    // Visibilité des onglets basée sur les rôles et permissions
    // Seuls Senior Partners et Admins voient les objectifs globaux par défaut
    const canViewGlobal = sessionManager.hasPermission('objectives.global.view') || isAdministrative;

    // Partners, Senior Partners et Admins voient les autres niveaux
    const canViewBu = sessionManager.hasPermission('objectives.bu.view') || isAdministrative || isPartner;
    const canViewDivision = sessionManager.hasPermission('objectives.division.view') || isAdministrative || isPartner;
    const canViewIndividual = sessionManager.hasPermission('objectives.individual.view') || isAdministrative || isPartner;

    const globalTab = document.getElementById('global-tab');
    const buTab = document.getElementById('bu-tab');
    const divisionTab = document.getElementById('division-tab');
    const individualTab = document.getElementById('individual-tab');

    if (globalTab) globalTab.parentElement.style.display = canViewGlobal ? 'block' : 'none';
    if (buTab) buTab.parentElement.style.display = canViewBu ? 'block' : 'none';
    if (divisionTab) divisionTab.parentElement.style.display = canViewDivision ? 'block' : 'none';
    if (individualTab) individualTab.parentElement.style.display = canViewIndividual ? 'block' : 'none';

    // Redirection si l'onglet actif est interdit
    if (globalTab && globalTab.classList.contains('active') && !canViewGlobal) {
        if (canViewBu && buTab) {
            new bootstrap.Tab(buTab).show();
        } else if (canViewDivision && divisionTab) {
            new bootstrap.Tab(divisionTab).show();
        }
    }
}


function setupEventListeners() {
    // Changement d'année fiscale géré par FiscalYearSelector.init


    // Gestion des onglets pour recharger les données si nécessaire
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            renderObjectives();
        });
    });

    // Filtres BU et Division
    const buSelect = document.getElementById('buSelect');
    if (buSelect) {
        buSelect.addEventListener('change', () => {
            console.log('DEBUG [buSelect] Change detected, new value:', buSelect.value);
            loadBuObjectives();
            loadDivisionObjectives(); // Les divisions dépendent de la BU
        });
    }

    const divisionSelect = document.getElementById('divisionSelect');
    if (divisionSelect) {
        divisionSelect.addEventListener('change', () => {
            console.log('DEBUG [divisionSelect] Change detected, new value:', divisionSelect.value);
            loadDivisionObjectives();
        });
    }

    // Filtres Onglet Individuel
    const indBuSelect = document.getElementById('individualBuSelect');
    if (indBuSelect) {
        indBuSelect.addEventListener('change', () => {
            // Filtrer les divisions selon la BU
            const buId = indBuSelect.value;
            const indDivSelect = document.getElementById('individualDivisionSelect');
            if (indDivSelect) {
                Array.from(indDivSelect.options).forEach(opt => {
                    if (!opt.value) return; // Toujours garder option vide
                    const div = divisions.find(d => d.id == opt.value);
                    opt.style.display = (!buId || (div && div.business_unit_id == buId)) ? 'block' : 'none';
                });
                if (buId) indDivSelect.value = ""; // Reset if filtered
            }
            loadIndividualObjectives();
        });
    }

    const indDivSelect = document.getElementById('individualDivisionSelect');
    if (indDivSelect) {
        indDivSelect.addEventListener('change', () => {
            loadIndividualObjectives();
        });
    }

    const indCollabSelect = document.getElementById('individualCollaboratorSelect');
    if (indCollabSelect) {
        indCollabSelect.addEventListener('change', () => {
            loadIndividualObjectives();
        });
    }
}




async function loadBusinessUnits() {
    try {
        const response = await fetch('/api/business-units', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            const allBUs = result.data || result;

            // Filtrage RBAC pour les BUs
            const user = sessionManager.getUser();
            const isAdmin = sessionManager.isAdmin() || (user.roles && user.roles.includes('SENIOR_PARTNER'));
            const authorizedBuIds = user.authorized_bu_ids || [];

            if (!isAdmin && authorizedBuIds.length > 0) {
                businessUnits = allBUs.filter(bu => authorizedBuIds.includes(bu.id));
            } else {
                businessUnits = allBUs;
            }

            // Remplir le select de filtre BU
            const filterSelect = document.getElementById('buSelect');
            const individualFilterSelect = document.getElementById('individualBuSelect');
            const modalSelect = document.getElementById('objectiveBu');

            // Vider les options existantes sauf la première
            if (filterSelect) {
                while (filterSelect.options.length > 1) {
                    filterSelect.remove(1);
                }
            }
            if (modalSelect) {
                while (modalSelect.options.length > 1) {
                    modalSelect.remove(1);
                }
            }

            if (individualFilterSelect) {
                while (individualFilterSelect.options.length > 1) {
                    individualFilterSelect.remove(1);
                }
            }

            businessUnits.forEach(bu => {
                // Support pour 'name' et 'nom'
                const buName = bu.name || bu.nom;
                if (filterSelect) filterSelect.add(new Option(buName, bu.id));
                if (individualFilterSelect) individualFilterSelect.add(new Option(buName, bu.id));
                if (modalSelect) modalSelect.add(new Option(buName, bu.id));
            });

            // Si une seule BU disponible, la sélectionner par défaut
            if (businessUnits.length === 1 && filterSelect) {
                filterSelect.value = businessUnits[0].id;
                loadDivisionObjectives(); // Recharger les divisions filtrées si besoin
            }
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
            const allDivisions = result.data || result;

            // Filtrage RBAC pour les Divisions (limitées aux BUs autorisées)
            const authorizedBuIds = businessUnits.map(bu => bu.id);
            divisions = allDivisions.filter(div => authorizedBuIds.includes(div.business_unit_id));

            // Remplir le select de filtre Division
            const filterSelect = document.getElementById('divisionSelect');
            const individualFilterSelect = document.getElementById('individualDivisionSelect');
            const modalSelect = document.getElementById('objectiveDivision');

            if (filterSelect) {
                while (filterSelect.options.length > 1) {
                    filterSelect.remove(1);
                }
            }
            if (modalSelect) {
                while (modalSelect.options.length > 1) {
                    modalSelect.remove(1);
                }
            }

            if (individualFilterSelect) {
                while (individualFilterSelect.options.length > 1) {
                    individualFilterSelect.remove(1);
                }
            }

            divisions.forEach(div => {
                const divName = div.name || div.nom;
                if (filterSelect) filterSelect.add(new Option(divName, div.id));
                if (individualFilterSelect) individualFilterSelect.add(new Option(divName, div.id));
                if (modalSelect) modalSelect.add(new Option(divName, div.id));
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

async function loadCollaborators() {
    try {
        const response = await fetch('/api/collaborateurs?filterByUserAccess=true', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const result = await response.json();
            const collaborators = result.data || result;

            const filterSelect = document.getElementById('individualCollaboratorSelect');
            if (filterSelect) {
                // Keep the first option
                while (filterSelect.options.length > 1) {
                    filterSelect.remove(1);
                }
                collaborators.forEach(c => {
                    const name = `${c.nom} ${c.prenom}`;
                    filterSelect.add(new Option(name, c.id));
                });
            }
        }
    } catch (error) {
        console.error('Erreur chargement collaborateurs:', error);
    }
}

async function loadObjectiveTypes() {
    try {
        const response = await fetch('/api/objectives/types', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            objectiveTypes = await response.json();

            // Populate the objective type select
            const typeSelect = document.getElementById('objectiveType');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">Sélectionner un type...</option>';
                objectiveTypes.forEach(type => {
                    if (type.is_active === false) return; // Filter inactive types

                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.label;
                    option.dataset.category = type.category;
                    option.dataset.unit = type.unit;
                    typeSelect.add(option);
                });
            }
        }
    } catch (error) {
        console.error('Erreur chargement types d\'objectifs:', error);
    }
}

let currentGlobalObjectives = [];

async function loadObjectives() {
    if (!currentFiscalYearId) return;

    try {
        console.log('DEBUG [loadObjectives] Fetching for FY:', currentFiscalYearId);
        // Charger TOUS les objectifs (Global, BU, Division)
        const response = await fetch(`/api/objectives/all/${currentFiscalYearId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        console.log('DEBUG [loadObjectives] Response OK:', response.ok, 'Status:', response.status);

        if (response.ok) {
            const allObjs = await response.json();
            console.log('DEBUG [loadObjectives] Data received:', allObjs.length, 'objectives');
            currentGlobalObjectives = allObjs.filter(o => o.scope === 'GLOBAL'); // Store global for compatibility

            // Transformer les données pour correspondre au format attendu
            objectives = (allObjs || []).map(obj => ({
                id: obj.id,
                title: obj.title || obj.type_label || obj.label || obj.code || 'Objectif sans titre',
                label: obj.type_label || obj.label || obj.title || obj.code,
                description: obj.description,
                type: obj.type_code || obj.code,
                scope: obj.scope,
                target_amount: obj.target_value,
                weight: obj.weight,
                objective_mode: obj.objective_mode,
                metric_code: obj.metric_code,
                tracking_type: obj.tracking_type,
                unit_symbol: obj.unit_symbol || obj.unit_code_ref || null,
                progress: obj.current_value && obj.target_value ? (obj.current_value / obj.target_value) * 100 : 0,
                deadline: null,
                business_unit_id: obj.business_unit_id,
                division_id: obj.division_id,
                business_unit_name: obj.business_unit_name,
                division_name: obj.division_name,
                is_financial: obj.is_financial,
                category: obj.type_category || obj.category,
                distributed_value: obj.distributed_value
            }));


            renderObjectives();
            updateStats();
        } else {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error('Erreur chargement objectifs:', errorData);
            displayLoadError('Erreur lors du chargement des objectifs (' + response.status + ')');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des objectifs:', error);
        displayLoadError('Erreur réseau ou serveur lors du chargement des objectifs.');
    }
}

function displayLoadError(message) {
    const containers = ['globalObjectivesList', 'buObjectivesList', 'divisionObjectivesList'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    });
}

function renderObjectives() {
    renderGlobalObjectives();
    loadBuObjectives(); // Filtre et affiche
    loadDivisionObjectives(); // Filtre et affiche
    loadIndividualObjectives(); // Nouveau: Filtre et affiche les individuels
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
    if (!container) return; // Prevent errors if tab not present
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

function loadIndividualObjectives() {
    const container = document.getElementById('individualObjectivesList');
    if (!container) return;

    const buId = document.getElementById('individualBuSelect').value;
    const divId = document.getElementById('individualDivisionSelect').value;
    const collabId = document.getElementById('individualCollaboratorSelect').value;

    let filtered = objectives.filter(o => o.scope === 'INDIVIDUAL');

    if (buId) filtered = filtered.filter(o => o.business_unit_id == buId);
    if (divId) filtered = filtered.filter(o => o.division_id == divId);
    if (collabId) filtered = filtered.filter(o => o.collaborator_id == collabId);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif individuel trouvé avec ces filtres.</div>';
        return;
    }

    container.innerHTML = filtered.map(obj => createObjectiveCard(obj)).join('');
}

function refreshIndividualObjectives() {
    loadObjectives(); // This will fetch all and then call loadIndividualObjectives via renderObjectives
}

function openIndividualWizard() {
    // Ouvrir le nouveau wizard de gestion individuelle (Form -> BU -> Collabs)
    if (typeof openIndividualManagementWizard === 'function') {
        openIndividualManagementWizard();
    } else {
        // Fallback vers le wizard autonome classique si non encore chargé
        if (typeof openAutonomousObjectiveWizard === 'function') {
            openAutonomousObjectiveWizard();
        } else {
            const modal = new bootstrap.Modal(document.getElementById('autonomousWizardModal'));
            modal.show();
        }
    }
}

function createObjectiveCard(obj) {
    const progress = Math.min(Math.round(obj.progress || 0), 100);
    const isDelayed = new Date(obj.deadline) < new Date() && progress < 100;
    const statusColor = isDelayed ? 'danger' : (progress >= 100 ? 'success' : (progress >= 50 ? 'warning' : 'primary'));

    let scopeBadge = '';
    let entityInfo = '';

    if (obj.scope === 'GLOBAL') {
        scopeBadge = '<span class="badge bg-primary-soft text-primary">Global</span>';
    } else if (obj.scope === 'BU') {
        scopeBadge = '<span class="badge bg-info-soft text-info">BU</span>';
        entityInfo = `<div class="small text-muted mt-1"><i class="fas fa-building me-1"></i>${obj.business_unit_name || 'N/A'}</div>`;
    } else if (obj.scope === 'DIVISION') {
        scopeBadge = '<span class="badge bg-success-soft text-success">Division</span>';
        entityInfo = `<div class="small text-muted mt-1"><i class="fas fa-sitemap me-1"></i>${obj.division_name || 'N/A'}</div>`;
    } else if (obj.scope === 'INDIVIDUAL') {
        scopeBadge = '<span class="badge bg-purple-soft text-purple">Individuel</span>';
        const name = obj.collaborateur_nom ? `${obj.collaborateur_prenom} ${obj.collaborateur_nom}` : 'N/A';
        entityInfo = `<div class="small text-muted mt-1"><i class="fas fa-user me-1"></i>${name}</div>`;
    }

    // Badge catégorie
    const categoryColors = {
        COMMERCIAL: { color: 'primary', icon: 'fa-handshake', label: 'Commercial' },
        OPERATIONNEL: { color: 'success', icon: 'fa-cogs', label: 'Opérationnel' },
        RH: { color: 'warning text-dark', icon: 'fa-users', label: 'RH' },
        FINANCIAL: { color: 'info', icon: 'fa-chart-line', label: 'Financier' },
        FINANCIER: { color: 'info', icon: 'fa-chart-line', label: 'Financier' },
        STRATEGIC: { color: 'dark', icon: 'fa-bullseye', label: 'Stratégique' }
    };
    const catKey = (obj.category || '').toUpperCase();
    const catMeta = categoryColors[catKey] || { color: 'secondary', icon: 'fa-bullseye', label: obj.category || '' };
    const categoryBadge = obj.category
        ? `<span class="badge bg-${catMeta.color} me-1"><i class="fas ${catMeta.icon} me-1"></i>${catMeta.label}</span>`
        : '';

    // Badge mode (METRIC / TYPE)
    const modeBadge = obj.objective_mode === 'METRIC'
        ? `<span class="badge bg-primary text-white small"><i class="fas fa-robot me-1"></i>Auto-mesure</span>`
        : `<span class="badge bg-secondary text-white small"><i class="fas fa-tasks me-1"></i>Objectif Type</span>`;


    // Badge tracking
    const trackingBadge = obj.tracking_type === 'AUTOMATIC'
        ? `<span class="badge bg-success bg-opacity-10 text-success small ms-1"><i class="fas fa-sync-alt me-1"></i>Automatique</span>`
        : '';

    // Valeur cible formatée selon l'unité réelle
    const sym = (obj.unit_symbol || '').toUpperCase();
    let targetDisplay;
    if (['XOF', 'FCFA', 'EUR', 'USD', '€', '$'].includes(sym) || obj.is_financial) {
        targetDisplay = formatCurrency(obj.target_amount);
    } else if (['%', 'TAUX', 'POURCENTAGE'].includes(sym)) {
        targetDisplay = `${(parseFloat(obj.target_amount) || 0).toLocaleString('fr-FR')} %`;
    } else {
        // Compteur (nb contrats, nb missions, etc.)
        const unit = sym && sym !== '' ? ` ${sym}` : '';
        targetDisplay = `${(parseFloat(obj.target_amount) || 0).toLocaleString('fr-FR')}${unit}`;
    }


    // Bouton distribuer — selon le scope
    const distributeBtnConfig = {
        'GLOBAL': { icon: 'fa-sitemap', color: 'primary', label: 'Distribuer aux BU' },
        'BU': { icon: 'fa-sitemap', color: 'info', label: 'Distribuer aux Divisions' },
        'DIVISION': { icon: 'fa-user-plus', color: 'success', label: 'Distribuer aux Individus' }
    };
    const distConfig = distributeBtnConfig[obj.scope];
    const distributeBtn = distConfig
        ? `<button class="btn btn-sm btn-outline-${distConfig.color} ms-2"
                   onclick="event.stopPropagation(); openDistributeWizard('${obj.id}', '${obj.scope}')"
                   title="${distConfig.label}">
               <i class="fas ${distConfig.icon} me-1"></i>${distConfig.label}
           </button>`
        : '';

    return `
    <div class="card objective-card ${obj.scope.toLowerCase()} mb-3 border-start border-3 border-${catMeta.color.split(' ')[0]}">
        <div class="card-body py-3">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1 me-3">
                    <div class="mb-1">
                        ${categoryBadge}${scopeBadge}${modeBadge}${trackingBadge}
                    </div>
                    <h6 class="card-title mb-1 mt-2 fw-bold">${obj.title}</h6>
                    ${obj.description && obj.description !== obj.title ? `<p class="text-muted small mb-0">${obj.description}</p>` : ''}
                </div>
                <div class="d-flex align-items-start">
                    ${distributeBtn}
                    <div class="dropdown ms-1">
                        <button class="btn btn-link text-muted p-1" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" onclick="editObjective('${obj.id}')"><i class="fas fa-edit me-2"></i>Modifier</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteObjective('${obj.id}')"><i class="fas fa-trash me-2"></i>Supprimer</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="row align-items-center mt-3 g-2">
                <div class="col-auto">
                    <div class="text-muted small">Cible</div>
                    <div class="fw-bold text-${catMeta.color.split(' ')[0]}">${targetDisplay}</div>
                </div>
                ${parseFloat(obj.distributed_value) > 0 ? `
                <div class="col-auto ms-3">
                    <div class="text-muted small">Distribué</div>
                    <div class="fw-bold text-info">
                        ${['XOF', 'FCFA', 'EUR', 'USD', '€', '$'].includes(sym) || obj.is_financial
                ? formatCurrency(obj.distributed_value)
                : (['%', 'TAUX', 'POURCENTAGE'].includes(sym)
                    ? `${(parseFloat(obj.distributed_value) || 0).toLocaleString('fr-FR')} %`
                    : `${(parseFloat(obj.distributed_value) || 0).toLocaleString('fr-FR')}${sym ? ` ${sym}` : ''}`
                )
            }
                    </div>
                </div>
                ` : ''}
                ${obj.weight ? `<div class="col-auto ms-3">
                    <div class="text-muted small">Poids</div>
                    <div class="fw-bold text-secondary">${obj.weight}%</div>
                </div>` : ''}
                <div class="col ms-2">
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Progression</span>
                        <span class="fw-semibold text-${statusColor}">${progress}%</span>
                    </div>
                    <div class="progress" style="height: 6px; border-radius:3px;">
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
        .filter(o => o.is_financial === true || o.category === 'FINANCIAL' || o.type === 'FINANCIER' || o.type === 'CA')
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

    // Filter objective types based on existing global objectives
    const typeSelect = document.getElementById('objectiveType');
    if (typeSelect && objectiveTypes.length > 0) {
        typeSelect.innerHTML = '<option value="">Sélectionner un type...</option>';
        // Get IDs of types that are already used in global objectives
        const usedTypeIds = currentGlobalObjectives.map(obj => obj.objective_type_id);

        objectiveTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.label;
            option.dataset.category = type.category;
            option.dataset.unit = type.unit;

            // Disable if already used (only for creation, not editing - though editing usually doesn't change type)
            if (usedTypeIds.includes(type.id)) {
                option.disabled = true;
                option.textContent += ' (Déjà défini)';
            }

            typeSelect.add(option);
        });
    }

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

    // Handle type selection with disabled options
    const typeSelect = document.getElementById('objectiveType');
    if (typeSelect && objectiveTypes.length > 0) {
        typeSelect.innerHTML = '<option value="">Sélectionner un type...</option>';

        // Find the raw global objective to get the ID
        const rawObj = currentGlobalObjectives.find(o => o.id == id);
        const currentTypeId = rawObj ? rawObj.objective_type_id : null;
        const usedTypeIds = currentGlobalObjectives.map(o => o.objective_type_id);

        objectiveTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.label;
            option.dataset.category = type.category;
            option.dataset.unit = type.unit;

            // Disable if used AND not the current one
            if (usedTypeIds.includes(type.id) && type.id !== currentTypeId) {
                option.disabled = true;
                option.textContent += ' (Déjà défini)';
            }

            typeSelect.add(option);
        });

        if (currentTypeId) {
            typeSelect.value = currentTypeId;
        }
    }

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
    const objectiveTypeId = document.getElementById('objectiveType').value;

    if (!objectiveTypeId) {
        showAlert('Veuillez sélectionner un type d\'objectif', 'warning');
        return;
    }

    const data = {
        title: document.getElementById('objectiveTitle').value,
        description: document.getElementById('objectiveDescription').value,
        objective_type_id: parseInt(objectiveTypeId),
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
        let baseUrl = '/api/objectives';
        if (scope === 'GLOBAL') baseUrl = '/api/objectives/global';
        else if (scope === 'BU') baseUrl = '/api/objectives/business-unit';
        else if (scope === 'DIVISION') baseUrl = '/api/objectives/division';
        else if (scope === 'GRADE') baseUrl = '/api/objectives/grade';

        const url = currentObjectiveId ? `${baseUrl}/${currentObjectiveId}` : baseUrl;

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

    const obj = objectives.find(o => o.id == id);
    if (!obj) {
        showAlert('Objectif non trouvé', 'danger');
        return;
    }

    let url = '';
    switch (obj.scope) {
        case 'GLOBAL':
            url = `/api/objectives/global/${id}`;
            break;
        case 'BU':
            url = `/api/objectives/business-unit/${id}`;
            break;
        case 'DIVISION':
            url = `/api/objectives/division/${id}`;
            break;
        case 'GRADE':
            url = `/api/objectives/grade/${id}`;
            break;
        case 'INDIVIDUAL':
            url = `/api/objectives/individual/${id}`;
            break;
        default:
            showAlert('Type d\'objectif inconnu', 'danger');
            return;
    }

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            showAlert('Objectif supprimé', 'success');
            loadObjectives();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la suppression', 'danger');
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
    } else {
        // Reset and unlock fields if switching back to Autonomous
        unlockObjectiveFields();
        document.getElementById('parentObjective').value = '';
        document.getElementById('remainingAmount').value = '';
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

                // Store inherited data
                option.dataset.typeId = parent.objective_type_id;
                option.dataset.trackingType = parent.tracking_type;
                option.dataset.metricCode = parent.metric_code;
                option.dataset.description = parent.description;

                select.add(option);
            });
        }
    } catch (error) {
        console.error('Erreur chargement parents:', error);
        select.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

function handleParentSelection() {
    const select = document.getElementById('parentObjective');
    const remainingInput = document.getElementById('remainingAmount');

    if (select.value) {
        const selectedOption = select.options[select.selectedIndex];

        // 1. Update Remaining Amount
        const remaining = selectedOption.dataset.remaining || 0;
        remainingInput.value = formatCurrency(remaining);

        // 2. Inherit and Lock Parameters
        const typeId = selectedOption.dataset.typeId;
        const description = selectedOption.dataset.description;
        const trackingType = selectedOption.dataset.trackingType;
        const metricCode = selectedOption.dataset.metricCode;

        if (typeId) {
            const typeSelect = document.getElementById('objectiveType');
            typeSelect.value = typeId;
            typeSelect.disabled = true;
        }

        if (description) {
            const descInput = document.getElementById('objectiveDescription');
            descInput.value = description;
            descInput.readOnly = true;

            // Also set title as it is required and should match parent
            const titleInput = document.getElementById('objectiveTitle');
            titleInput.value = description; // Use description as title
            titleInput.readOnly = true;
        }

        if (trackingType) {
            const trackingSelect = document.getElementById('trackingType');
            trackingSelect.value = trackingType;
            trackingSelect.disabled = true; // Lock tracking type

            toggleTrackingFields(); // Show/Hide metric code field

            if (trackingType === 'AUTOMATIC' && metricCode) {
                const metricInput = document.getElementById('metricCode');
                metricInput.value = metricCode;
                metricInput.readOnly = true; // Lock metric code
            }
        }

    } else {
        remainingInput.value = '';
        unlockObjectiveFields();
    }
}

function unlockObjectiveFields() {
    document.getElementById('objectiveType').disabled = false;
    document.getElementById('objectiveDescription').readOnly = false;
    document.getElementById('objectiveTitle').readOnly = false;
    document.getElementById('trackingType').disabled = false;
    document.getElementById('metricCode').readOnly = false;
    // Clear values? Maybe not, user might want to keep them as starting point. 
    // But for strict correctness, if we unlocked, we assume user defines them.
}
