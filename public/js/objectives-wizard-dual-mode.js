// ============================================
// ENHANCEMENT : Support Mode Dual (MÉTRIQUE vs TYPE)
// ============================================
// Ce script améliore le wizard existant pour supporter les deux modes

// Récupérer la devise par défaut configurée
const getDefaultCurrency = () => {
    return (typeof CURRENCY_CONFIG !== 'undefined' && CURRENCY_CONFIG.defaultCurrency)
        ? CURRENCY_CONFIG.defaultCurrency
        : 'XAF';
};

const getCurrencySymbol = () => {
    const currency = getDefaultCurrency();
    if (typeof CURRENCY_CONFIG !== 'undefined' && CURRENCY_CONFIG.currencies && CURRENCY_CONFIG.currencies[currency]) {
        return CURRENCY_CONFIG.currencies[currency].symbol;
    }
    return currency; // Fallback au code si pas de symbole
};

// État global pour le mode dual
const dualModeState = {
    objectiveMode: null, // 'METRIC' ou 'TYPE'
    selectedMetric: null,
    selectedUnit: null,
    impactedMetrics: []
};

// Initialiser le support du mode dual
function initializeDualModeSupport() {
    console.log('🔄 Initialisation du support mode dual...');

    // Intercepter la sélection de niveau pour ajouter l'étape de mode
    const originalSelectLevel = window.selectAutonomousLevel;
    window.selectAutonomousLevel = function (level) {
        wizardState.autonomous.level = level;

        // Si Global, passer directement à la sélection de mode
        if (level === 'GLOBAL') {
            wizardState.autonomous.entityId = null;
            wizardState.autonomous.entityName = 'Entreprise';
            showModeSelectionStep();
        } else {
            // Sinon, passer à l'étape 2 pour sélectionner l'entité
            showAutonomousStep(2);
            loadEntitiesForLevel(level);
        }
    };

    // Intercepter la sélection d'entité pour ajouter l'étape de mode
    const originalSelectEntity = window.selectAutonomousEntity;
    window.selectAutonomousEntity = function (entityId, entityName) {
        wizardState.autonomous.entityId = entityId;
        wizardState.autonomous.entityName = entityName;
        showModeSelectionStep();
    };

    console.log('✅ Support mode dual initialisé');
}

// Afficher l'étape de sélection de mode
function showModeSelectionStep() {
    // Masquer toutes les étapes
    document.querySelectorAll('[id^="autonomousStep"]').forEach(el => {
        el.style.display = 'none';
    });

    // Créer dynamiquement l'étape de sélection de mode
    const modalBody = document.querySelector('#autonomousWizardModal .modal-body');

    // Vérifier si l'étape existe déjà
    let modeStep = document.getElementById('autonomousModeStep');
    if (!modeStep) {
        modeStep = document.createElement('div');
        modeStep.id = 'autonomousModeStep';
        modeStep.style.display = 'none';
        modalBody.appendChild(modeStep);
    }

    // Pour les collaborateurs, seul le mode Opérationnel est disponible
    const isIndividual = wizardState.autonomous.level === 'INDIVIDUAL';

    let htmlContent = `
        <h6 class="mb-3">Étape 2/4 : Quel type d'objectif souhaitez-vous créer ?</h6>`;

    if (isIndividual) {
        // MODE OPÉRATIONNEL UNIQUEMENT pour les collaborateurs
        htmlContent += `
        <div class="alert alert-warning">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Note :</strong> Les objectifs sur Métrique ne peuvent pas être affectés aux collaborateurs. Seuls les objectifs opérationnels sont disponibles.
        </div>`;
    } else {
        // CHOIX ENTRE MÉTRIQUE ET OPÉRATIONNEL
        htmlContent += `
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Objectif sur Métrique :</strong> Pour fixer un objectif global (ex: CA Total, Nb Clients)<br>
            <strong>Objectif Opérationnel :</strong> Pour fixer un objectif opérationnel (ex: 10 Opportunités, 5 Missions)
        </div>`;
    }

    htmlContent += `<div class="list-group">`;

    // Option MÉTRIQUE (uniquement si pas INDIVIDUAL et si rôle autorisé)
    if (!isIndividual) {
        const user = window.sessionManager?.getUser();
        const isAdmin = window.sessionManager?.isAdmin();
        const isSeniorPartner = user?.roles?.includes('SENIOR_PARTNER');
        const isResponsableRH = user?.roles?.includes('RESPONSABLE_RH') || user?.roles?.includes('RESPONSABLE RH');

        const canUseMetric = isAdmin || isSeniorPartner || isResponsableRH;

        if (canUseMetric) {
            htmlContent += `
                <button type="button" class="list-group-item list-group-item-action" onclick="selectObjectiveMode('METRIC')">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <i class="fas fa-chart-line me-2 text-primary"></i>
                            <strong>Objectif sur Métrique</strong>
                            <p class="mb-0 text-muted small">Fixer un objectif basé sur une métrique calculée (CA, Clients, etc.)</p>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </button>`;
        }
    }

    // Option OPÉRATIONNEL (toujours disponible, renommé de TYPE)
    htmlContent += `
            <button type="button" class="list-group-item list-group-item-action" onclick="selectObjectiveMode('TYPE')">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <i class="fas fa-tasks me-2 text-success"></i>
                        <strong>Objectif Opérationnel</strong>
                        <p class="mb-0 text-muted small">Fixer un objectif opérationnel (Opportunités, Missions, etc.)</p>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </button>
        </div>
    `;

    modeStep.innerHTML = htmlContent;
    modeStep.style.display = 'block';

    // Masquer les boutons de navigation
    const submitBtn = document.getElementById('autonomousSubmitBtn');
    const prevBtn = document.getElementById('autonomousPrevBtn');
    if (submitBtn) submitBtn.style.display = 'none';
    if (prevBtn) prevBtn.style.display = 'none';
}

// Sélectionner le mode d'objectif
async function selectObjectiveMode(mode) {
    dualModeState.objectiveMode = mode;
    console.log(`📊 Mode sélectionné: ${mode}`);

    // Masquer l'étape de sélection de mode
    const modeStep = document.getElementById('autonomousModeStep');
    if (modeStep) {
        modeStep.style.display = 'none';
    }

    // Afficher l'étape 3 (formulaire)
    const step3 = document.getElementById('autonomousStep3');
    if (step3) {
        step3.style.display = 'block';
    }

    // Charger le formulaire selon le mode
    const { level, entityName } = wizardState.autonomous;

    // Mettre à jour le titre
    const levelLabels = {
        'GLOBAL': 'Global (Entreprise)',
        'BU': `Business Unit - ${entityName}`,
        'DIVISION': `Division - ${entityName}`,
        'GRADE': `Grade - ${entityName}`,
        'INDIVIDUAL': `Collaborateur - ${entityName}`
    };

    const formTitle = document.getElementById('autonomousFormTitle');
    if (formTitle) {
        formTitle.textContent = levelLabels[level];
    }

    if (mode === 'METRIC') {
        await loadMetricModeForm();
    } else {
        await loadTypeModeForm();
    }

    // Afficher les boutons
    const submitBtn = document.getElementById('autonomousSubmitBtn');
    const prevBtn = document.getElementById('autonomousPrevBtn');

    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (prevBtn) prevBtn.style.display = 'inline-block';
}

// Charger le formulaire mode MÉTRIQUE
async function loadMetricModeForm() {
    try {
        // Charger les métriques disponibles
        const response = await fetch('/api/objectives/metrics', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des métriques');
        }

        const metrics = await response.json();
        console.log('📊 Métriques chargées:', metrics);

        // Modifier le formulaire pour le mode MÉTRIQUE
        const form = document.getElementById('autonomousObjectiveForm');
        form.innerHTML = `
            <div class="alert alert-primary">
                <i class="fas fa-chart-line me-2"></i>
                <strong>Mode Métrique</strong> : Vous créez un objectif basé sur une métrique calculée automatiquement
            </div>
            
            <div class="row">
                <div class="col-md-12 mb-3">
                    <label class="form-label">Métrique *</label>
                    <select class="form-select" id="autonomousMetricSelect" required onchange="updateMetricInfo()">
                        <option value="">Sélectionner une métrique...</option>
                        ${metrics.map(m => `
                            <option value="${m.id}" data-unit="${m.unit_symbol}">${m.label}</option>
                        `).join('')}
                    </select>
                    <small class="text-muted" id="metricDescription"></small>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12 mb-3">
                    <label class="form-label">Titre *</label>
                    <input type="text" class="form-control" id="autonomousTitle" required>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12 mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="autonomousDescription" rows="3"></textarea>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Valeur Cible * <span id="targetUnitLabel"></span></label>
                    <input type="number" class="form-control" id="autonomousTarget" step="0.01" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Poids (%)</label>
                    <input type="number" class="form-control" id="autonomousWeight" min="0" max="100" value="100">
                </div>
            </div>
            
            <div id="metricSourcesInfo" class="alert alert-info" style="display: none;">
                <strong>Sources de cette métrique :</strong>
                <ul id="metricSourcesList"></ul>
            </div>
        `;

    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des métriques', 'danger');
    }
}

// Charger le formulaire mode TYPE
async function loadTypeModeForm() {
    try {
        // Charger les types d'objectifs et les unités
        const [typesResponse, unitsResponse] = await Promise.all([
            fetch('/api/objectives/types', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            }),
            fetch('/api/objectives/units', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            })
        ]);

        if (!typesResponse.ok || !unitsResponse.ok) {
            throw new Error('Erreur lors du chargement des données');
        }

        const types = await typesResponse.json();
        const units = await unitsResponse.json();

        console.log('📊 Types chargés:', types);
        console.log('📊 Unités chargées:', units);

        // Modifier le formulaire pour le mode TYPE
        const form = document.getElementById('autonomousObjectiveForm');
        form.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-tasks me-2"></i>
                <strong>Mode Type</strong> : Vous créez un objectif opérationnel qui alimentera les métriques
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Type d'Objectif *</label>
                    <select class="form-select" id="autonomousObjectiveType" required onchange="updateImpactedMetrics()">
                        <option value="">Sélectionner un type...</option>
                        ${types.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Unité de Mesure *</label>
                    <select class="form-select" id="autonomousUnitSelect" required onchange="updateImpactedMetrics()">
                        <option value="">Sélectionner une unité...</option>
                        ${units.map(u => `<option value="${u.id}" data-symbol="${u.symbol}">${u.label}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12 mb-3">
                    <label class="form-label">Titre *</label>
                    <input type="text" class="form-control" id="autonomousTitle" required>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12 mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="autonomousDescription" rows="3"></textarea>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Valeur Cible * <span id="targetUnitLabel"></span></label>
                    <input type="number" class="form-control" id="autonomousTarget" step="0.01" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Poids (%)</label>
                    <input type="number" class="form-control" id="autonomousWeight" min="0" max="100" value="100">
                </div>
            </div>
            
            <div id="impactedMetricsInfo" class="alert alert-warning" style="display: none;">
                <strong>Métriques impactées :</strong>
                <ul id="impactedMetricsList"></ul>
            </div>
        `;

    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des données', 'danger');
    }
}

// Mettre à jour les informations de la métrique sélectionnée
async function updateMetricInfo() {
    const select = document.getElementById('autonomousMetricSelect');
    const metricId = select.value;

    if (!metricId) {
        document.getElementById('metricSourcesInfo').style.display = 'none';
        return;
    }

    dualModeState.selectedMetric = metricId;

    // Mettre à jour l'unité dans le label
    const selectedOption = select.options[select.selectedIndex];
    let unitSymbol = selectedOption.getAttribute('data-unit');

    // Si le symbole est vide et que c'est une métrique monétaire, utiliser la devise configurée
    if (!unitSymbol || unitSymbol === '') {
        const metricLabel = selectedOption.textContent.toLowerCase();
        if (metricLabel.includes('affaires') || metricLabel.includes('ca') || metricLabel.includes('marge') || metricLabel.includes('montant')) {
            unitSymbol = getCurrencySymbol();
        }
    }

    document.getElementById('targetUnitLabel').textContent = unitSymbol ? `(${unitSymbol})` : '';

    // Charger les sources de la métrique (optionnel, ne pas bloquer si erreur)
    try {
        const response = await fetch(`/api/objectives/metrics/${metricId}/sources`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const sources = await response.json();
            if (sources && sources.length > 0) {
                const sourcesList = document.getElementById('metricSourcesList');
                sourcesList.innerHTML = sources.map(s =>
                    `<li>${s.type_label} (${s.unit_label}) - Table: ${s.data_source_table}</li>`
                ).join('');
                document.getElementById('metricSourcesInfo').style.display = 'block';
            } else {
                // Pas de sources configurées, ne rien afficher
                document.getElementById('metricSourcesInfo').style.display = 'none';
            }
        }
    } catch (error) {
        console.warn('Sources de métrique non disponibles:', error);
        // Ne pas afficher d'erreur, c'est optionnel
        document.getElementById('metricSourcesInfo').style.display = 'none';
    }
}

// Mettre à jour les métriques impactées par le type sélectionné
async function updateImpactedMetrics() {
    const typeId = document.getElementById('autonomousObjectiveType').value;
    const unitId = document.getElementById('autonomousUnitSelect').value;

    if (!typeId || !unitId) {
        document.getElementById('impactedMetricsInfo').style.display = 'none';
        return;
    }

    dualModeState.selectedUnit = unitId;

    // Mettre à jour l'unité dans le label
    const unitSelect = document.getElementById('autonomousUnitSelect');
    const selectedUnit = unitSelect.options[unitSelect.selectedIndex];
    const unitSymbol = selectedUnit.getAttribute('data-symbol');

    // Si c'est une unité de type currency, utiliser le symbole de la devise configurée
    const displaySymbol = unitSymbol || (selectedUnit.textContent.includes('Montant') ? getCurrencySymbol() : '');
    document.getElementById('targetUnitLabel').textContent = displaySymbol ? `(${displaySymbol})` : '';

    // Charger les métriques impactées
    try {
        const response = await fetch(`/api/objectives/types/${typeId}/impacted-metrics?unitId=${unitId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const metrics = await response.json();
            dualModeState.impactedMetrics = metrics;

            if (metrics.length > 0) {
                const metricsList = document.getElementById('impactedMetricsList');
                metricsList.innerHTML = metrics.map(m =>
                    `<li>${m.label} (${m.unit_symbol})</li>`
                ).join('');
                document.getElementById('impactedMetricsInfo').style.display = 'block';
            } else {
                document.getElementById('impactedMetricsInfo').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur chargement métriques impactées:', error);
    }
}

const originalSubmit = window.submitAutonomousObjective;
window.submitAutonomousObjective = async function () {
    const { level, entityId, mode: wizardMode } = wizardState.autonomous;
    const mode = dualModeState.objectiveMode;

    // Si on est dans le nouveau mode de gestion individuelle/affectation,
    // on bypass la logique du mode dual (Métriques/Types) et on utilise la fonction originale
    if (wizardMode === 'MANAGEMENT_INDIVIDUAL') {
        console.log('🚀 Bypass dual-mode check for MANAGEMENT_INDIVIDUAL');
        return originalSubmit();
    }

    if (!mode) {
        showAlert('Erreur: Mode d\'objectif non sélectionné', 'danger');
        return;
    }

    // Récupérer les données du formulaire
    const data = {
        title: document.getElementById('autonomousTitle').value,
        description: document.getElementById('autonomousDescription').value,
        target_value: parseFloat(document.getElementById('autonomousTarget').value),
        weight: parseFloat(document.getElementById('autonomousWeight').value) || 100,
        fiscal_year_id: currentFiscalYearId,
        objective_mode: mode
    };

    // Ajouter les champs spécifiques au mode
    if (mode === 'METRIC') {
        data.metric_id = dualModeState.selectedMetric;
        data.tracking_type = 'AUTOMATIC';
    } else {
        data.objective_type_id = parseInt(document.getElementById('autonomousObjectiveType').value);
        data.unit_id = dualModeState.selectedUnit;
        data.tracking_type = 'MANUAL';
    }

    // Validation
    if (!data.title || !data.target_value) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    if (mode === 'METRIC' && !data.metric_id) {
        showAlert('Veuillez sélectionner une métrique', 'warning');
        return;
    }

    if (mode === 'TYPE' && (!data.objective_type_id || !data.unit_id)) {
        showAlert('Veuillez sélectionner un type et une unité', 'warning');
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
            showAlert(`Objectif ${mode === 'METRIC' ? 'sur métrique' : 'sur type'} créé avec succès`, 'success');

            // Recharger les objectifs selon le niveau
            if (typeof loadGlobalObjectives === 'function') {
                loadGlobalObjectives();
            } else if (typeof window.loadObjectives === 'function') {
                window.loadObjectives();
            }
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la création', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
};

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', function () {
    // Attendre que le wizard soit chargé
    setTimeout(() => {
        if (document.getElementById('autonomousWizardModal')) {
            initializeDualModeSupport();
        }
    }, 1000);
});
