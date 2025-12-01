// Gestion de la configuration des objectifs
let metrics = [];
let types = [];
let units = [];
let opportunityTypes = []; // Pour les sources

document.addEventListener('DOMContentLoaded', async function () {
    await Promise.all([
        loadMetrics(),
        loadTypes(),
        loadUnits(),
        loadOpportunityTypes() // Nécessaire pour les sources
    ]);

    // Initialiser les dropdowns de tracking automatique
    initializeTypeModal();
});

// --- Chargement des données ---

async function loadMetrics() {
    try {
        const response = await fetch('/api/objectives/metrics', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            metrics = await response.json();
            renderMetricsTable();
        }
    } catch (error) {
        console.error('Erreur chargement métriques:', error);
    }
}

async function loadTypes() {
    try {
        const response = await fetch('/api/objectives/types', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            types = await response.json();
            renderTypesTable();
        }
    } catch (error) {
        console.error('Erreur chargement types:', error);
    }
}

async function loadUnits() {
    try {
        const response = await fetch('/api/objectives/units', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            units = await response.json();
            renderUnitsTable();
        }
    } catch (error) {
        console.error('Erreur chargement unités:', error);
    }
}

async function loadOpportunityTypes() {
    // TODO: Remplacer par un vrai appel API quand disponible
    // Pour l'instant on simule ou on hardcode si l'API n'existe pas encore
    opportunityTypes = [
        { id: 'LICENCE', label: 'Vente de Licence' },
        { id: 'SERVICE', label: 'Prestation de Service' },
        { id: 'MAINTENANCE', label: 'Contrat de Maintenance' },
        { id: 'FORMATION', label: 'Formation' }
    ];
}

// --- Rendu des tableaux ---

function renderMetricsTable() {
    const tbody = document.querySelector('#metricsTable tbody');
    if (metrics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Aucune métrique définie</td></tr>';
        return;
    }

    tbody.innerHTML = metrics.map(m => `
        <tr>
            <td><span class="badge bg-primary">${m.code}</span></td>
            <td class="fw-bold">${m.label}</td>
            <td>${m.description || '-'}</td>
            <td>
                ${(m.sources || []).map(s =>
        `<span class="badge bg-light text-dark border me-1" title="${s.opportunity_type} : ${s.value_field}">
                        ${s.opportunity_type}
                    </span>`
    ).join('') || '<span class="text-muted small">Aucune source</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMetric('${m.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderTypesTable() {
    const tbody = document.querySelector('#typesTable tbody');
    if (types.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Aucun type défini</td></tr>';
        return;
    }

    tbody.innerHTML = types.map(t => `
        <tr>
            <td class="fw-bold">${t.label}</td>
            <td>${t.code}</td>
            <td><span class="badge bg-secondary">${t.category}</span></td>
            <td>${t.unit || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editType('${t.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteType('${t.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderUnitsTable() {
    const tbody = document.querySelector('#unitsTable tbody');
    if (units.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Aucune unité définie</td></tr>';
        return;
    }

    tbody.innerHTML = units.map(u => `
        <tr>
            <td>${u.code}</td>
            <td class="fw-bold">${u.label}</td>
            <td>${u.symbol || '-'}</td>
            <td>${u.type}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editUnit('${u.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUnit('${u.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// --- Gestion des Métriques ---

function openMetricModal() {
    document.getElementById('metricForm').reset();
    document.getElementById('metricId').value = '';
    document.getElementById('metricModalTitle').textContent = 'Nouvelle Métrique';
    document.getElementById('metricSourcesContainer').innerHTML = '';

    // Ajouter une ligne de source vide par défaut
    addSourceRow();

    new bootstrap.Modal(document.getElementById('metricModal')).show();
}

function editMetric(id) {
    const metric = metrics.find(m => m.id == id);
    if (!metric) return;

    document.getElementById('metricId').value = metric.id;
    document.getElementById('metricCode').value = metric.code;
    document.getElementById('metricLabel').value = metric.label;
    document.getElementById('metricDescription').value = metric.description || '';
    document.getElementById('metricModalTitle').textContent = 'Modifier la Métrique';

    const container = document.getElementById('metricSourcesContainer');
    container.innerHTML = '';

    if (metric.sources && metric.sources.length > 0) {
        metric.sources.forEach(source => addSourceRow(source));
    } else {
        addSourceRow();
    }

    new bootstrap.Modal(document.getElementById('metricModal')).show();
}

function addSourceRow(data = null) {
    const container = document.getElementById('metricSourcesContainer');
    const rowId = Date.now();

    const div = document.createElement('div');
    div.className = 'source-row d-flex gap-2 align-items-end';
    div.innerHTML = `
        <div class="flex-grow-1">
            <label class="form-label small mb-1">Type d'Opportunité</label>
            <select class="form-select form-select-sm source-type" required>
                <option value="">Choisir...</option>
                ${opportunityTypes.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
            </select>
        </div>
        <div class="flex-grow-1">
            <label class="form-label small mb-1">Champ Valeur</label>
            <select class="form-select form-select-sm source-field" required>
                <option value="amount">Montant (€)</option>
                <option value="count">Nombre (Quantité)</option>
                <option value="margin">Marge</option>
            </select>
        </div>
        <div style="width: 100px;">
            <label class="form-label small mb-1">Filtre Statut</label>
            <select class="form-select form-select-sm source-status">
                <option value="WON">Gagné</option>
                <option value="ALL">Tous</option>
            </select>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm mb-1" onclick="this.closest('.source-row').remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(div);

    if (data) {
        div.querySelector('.source-type').value = data.opportunity_type;
        div.querySelector('.source-field').value = data.value_field;
        // div.querySelector('.source-status').value = data.status_filter || 'WON'; // Si implémenté
    }
}

async function saveMetric() {
    const form = document.getElementById('metricForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('metricId').value;
    const sources = [];

    document.querySelectorAll('.source-row').forEach(row => {
        const type = row.querySelector('.source-type').value;
        const field = row.querySelector('.source-field').value;
        if (type && field) {
            sources.push({
                opportunity_type: type,
                value_field: field,
                metric_id: id // Sera ignoré en création, utile en update
            });
        }
    });

    const data = {
        code: document.getElementById('metricCode').value,
        label: document.getElementById('metricLabel').value,
        description: document.getElementById('metricDescription').value,
        sources: sources
    };

    try {
        const url = id ? `/api/objectives/metrics/${id}` : '/api/objectives/metrics';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('metricModal')).hide();
            loadMetrics();
            alert('Métrique enregistrée avec succès');
        } else {
            const err = await response.json();
            alert('Erreur: ' + (err.message || 'Impossible d\'enregistrer'));
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    }
}

// --- Gestion des Types ---

function openTypeModal() {
    document.getElementById('typeForm').reset();
    document.getElementById('typeId').value = '';
    document.getElementById('typeModalTitle').textContent = 'Nouveau Type d\'Objectif';

    // Reset tracking fields
    if (document.getElementById('typeEntity')) document.getElementById('typeEntity').value = '';
    if (document.getElementById('typeOperation')) {
        document.getElementById('typeOperation').innerHTML = '<option value="">Sélectionner une entité d\'abord</option>';
        document.getElementById('typeOperation').disabled = true;
    }
    if (document.getElementById('typeValueField')) {
        document.getElementById('typeValueField').innerHTML = '<option value="">Sélectionner une unité d\'abord</option>';
        document.getElementById('typeValueField').disabled = true;
    }

    new bootstrap.Modal(document.getElementById('typeModal')).show();
}

function editType(id) {
    const type = types.find(t => t.id == id);
    if (!type) return;

    document.getElementById('typeId').value = type.id;
    document.getElementById('typeCode').value = type.code;
    document.getElementById('typeLabel').value = type.label;
    document.getElementById('typeCategory').value = type.category;

    // Gestion de l'unité: DB stocke le symbole, Dropdown utilise le code
    // On cherche l'unité qui a ce symbole (ou ce code, au cas où)
    let unitCode = '';
    if (type.unit) {
        const unit = units.find(u => u.symbol === type.unit || u.code === type.unit);
        if (unit) unitCode = unit.code;
    }
    document.getElementById('typeUnit').value = unitCode;

    document.getElementById('typeDescription').value = type.description || '';

    // Remplir les champs de tracking automatique si disponibles
    if (document.getElementById('typeEntity')) {
        document.getElementById('typeEntity').value = type.entity_type || '';
    }

    // Important: Il faut d'abord charger les opérations pour pouvoir sélectionner la bonne
    if (type.entity_type) {
        onEntityChange(); // Charge les opérations

        // Petit délai pour laisser le temps au DOM de se mettre à jour (même si synchrone ici, c'est plus sûr)
        if (document.getElementById('typeOperation')) {
            document.getElementById('typeOperation').value = type.operation || '';
        }

        // Idem pour le champ valeur
        if (type.operation && unitCode) {
            onUnitChange(); // Charge le champ valeur auto-détecté
            if (document.getElementById('typeValueField')) {
                document.getElementById('typeValueField').value = type.value_field || '';
            }
        }
    }

    document.getElementById('typeModalTitle').textContent = 'Modifier le Type';

    new bootstrap.Modal(document.getElementById('typeModal')).show();
}

async function saveType() {
    const form = document.getElementById('typeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('typeId').value;

    // Récupérer les valeurs de tracking automatique (ou null si non configurées)
    const entityType = document.getElementById('typeEntity')?.value || null;
    const operation = document.getElementById('typeOperation')?.value || null;
    const valueField = document.getElementById('typeValueField')?.value || null;

    // Dériver is_financial de l'unité (si c'est une devise)
    let isFinancial = false;
    let unitSymbol = null;

    const unitCode = document.getElementById('typeUnit').value;
    if (unitCode) {
        const unit = units.find(u => u.code === unitCode);
        if (unit) {
            isFinancial = unit.type === 'CURRENCY';
            unitSymbol = unit.symbol; // On envoie le symbole au backend
        }
    }

    const data = {
        code: document.getElementById('typeCode').value,
        label: document.getElementById('typeLabel').value,
        category: document.getElementById('typeCategory').value,
        unit: unitSymbol, // Envoi du symbole
        is_financial: isFinancial,
        description: document.getElementById('typeDescription').value,
        entity_type: entityType,
        operation: operation,
        value_field: valueField
    };

    try {
        const url = id ? `/api/objectives/types/${id}` : '/api/objectives/types';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('typeModal')).hide();
            loadTypes();
            alert('Type enregistré avec succès');
        } else {
            const err = await response.json();
            alert('Erreur: ' + (err.message || 'Impossible d\'enregistrer'));
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    }
}

async function deleteType(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type ?')) return;

    try {
        const response = await fetch(`/api/objectives/types/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            loadTypes();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// --- Gestion des Unités ---

function openUnitModal() {
    document.getElementById('unitForm').reset();
    document.getElementById('unitId').value = '';
    document.getElementById('unitModalTitle').textContent = 'Nouvelle Unité';
    new bootstrap.Modal(document.getElementById('unitModal')).show();
}

function editUnit(id) {
    const unit = units.find(u => u.id == id);
    if (!unit) return;

    document.getElementById('unitId').value = unit.id;
    document.getElementById('unitCode').value = unit.code;
    document.getElementById('unitLabel').value = unit.label;
    document.getElementById('unitSymbol').value = unit.symbol || '';
    document.getElementById('unitType').value = unit.type;
    document.getElementById('unitModalTitle').textContent = 'Modifier l\'Unité';

    new bootstrap.Modal(document.getElementById('unitModal')).show();
}

async function saveUnit() {
    const form = document.getElementById('unitForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('unitId').value;
    const data = {
        code: document.getElementById('unitCode').value,
        label: document.getElementById('unitLabel').value,
        symbol: document.getElementById('unitSymbol').value,
        type: document.getElementById('unitType').value
    };

    try {
        const url = id ? `/api/objectives/units/${id}` : '/api/objectives/units';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('unitModal')).hide();
            loadUnits();
            alert('Unité enregistrée avec succès');
        } else {
            const err = await response.json();
            alert('Erreur: ' + (err.message || 'Impossible d\'enregistrer'));
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    }
}

async function deleteUnit(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette unité ?')) return;

    try {
        const response = await fetch(`/api/objectives/units/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            loadUnits();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// === FONCTIONS DE TRACKING AUTOMATIQUE ===

function initializeTypeModal() {
    // Initialiser le dropdown des entités
    const entitySelect = document.getElementById('typeEntity');
    if (entitySelect && typeof EntityOperationsConfig !== 'undefined') {
        entitySelect.innerHTML = '<option value="">Aucune (tracking manuel)</option>';
        const entities = EntityOperationsConfig.getEntities();
        entities.forEach(entity => {
            const option = document.createElement('option');
            option.value = entity.code;
            option.textContent = entity.label;
            entitySelect.appendChild(option);
        });
    }

    // Initialiser le dropdown des unités
    const unitSelect = document.getElementById('typeUnit');
    if (unitSelect && units.length > 0) {
        unitSelect.innerHTML = '<option value="">Sélectionner...</option>';
        units.forEach(u => {
            const option = document.createElement('option');
            option.value = u.code; // On utilise le CODE comme valeur interne
            option.textContent = `${u.label} (${u.symbol || '-'})`;
            unitSelect.appendChild(option);
        });
    }
}

function onEntityChange() {
    const entityCode = document.getElementById('typeEntity').value;
    const operationSelect = document.getElementById('typeOperation');
    const valueFieldSelect = document.getElementById('typeValueField');

    operationSelect.innerHTML = '<option value="">Sélectionner...</option>';
    valueFieldSelect.innerHTML = '<option value="">Sélectionner une unité d\'abord</option>';
    valueFieldSelect.disabled = true;

    if (!entityCode || typeof EntityOperationsConfig === 'undefined') {
        operationSelect.disabled = true;
        return;
    }

    const operations = EntityOperationsConfig.getOperations(entityCode);
    operations.forEach(op => {
        const option = document.createElement('option');
        option.value = op.code;
        option.textContent = op.label;
        operationSelect.appendChild(option);
    });

    operationSelect.disabled = false;
    onUnitChange();
}

function onUnitChange() {
    const entityCode = document.getElementById('typeEntity').value;
    const unitCode = document.getElementById('typeUnit').value;
    const valueFieldSelect = document.getElementById('typeValueField');

    valueFieldSelect.innerHTML = '<option value="">Sélectionner...</option>';

    if (!entityCode || !unitCode || typeof EntityOperationsConfig === 'undefined') {
        valueFieldSelect.disabled = true;
        return;
    }

    const unit = units.find(u => u.code === unitCode);
    if (!unit) {
        valueFieldSelect.disabled = true;
        valueFieldSelect.innerHTML = '<option value="">Unité invalide</option>';
        return;
    }

    const defaultField = EntityOperationsConfig.getDefaultValueField(entityCode, unit.type);

    if (!defaultField) {
        valueFieldSelect.innerHTML = '<option value="">Aucun champ disponible</option>';
        valueFieldSelect.disabled = true;
        return;
    }

    const option = document.createElement('option');
    option.value = defaultField.code;
    option.textContent = `${defaultField.label} (auto-détecté)`;
    option.selected = true;
    valueFieldSelect.appendChild(option);
    valueFieldSelect.disabled = true;
}
