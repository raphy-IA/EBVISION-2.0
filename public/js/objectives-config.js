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
                ${(m.sources || []).map(s => {
        const label = s.objective_type_label || s.opportunity_type || 'Source';
        const title = s.objective_type_label ? `Type: ${label}` : `${s.opportunity_type || ''}: ${s.value_field || ''}`;
        return `<span class="badge bg-light text-dark border me-1" title="${title}">
                        ${label}
                    </span>`;
    }).join('') || '<span class="text-muted small">Aucune source</span>'}
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

    // Initialiser le sélecteur d'unité
    const unitSelect = document.getElementById('metricUnit');
    unitSelect.innerHTML = '<option value="">Sélectionner une unité...</option>';
    units.forEach(u => {
        const option = document.createElement('option');
        option.value = u.code;
        option.textContent = `${u.label} (${u.symbol || '-'})`;
        unitSelect.appendChild(option);
    });

    // Ne pas ajouter de ligne de source par défaut tant que l'unité n'est pas choisie
    // addSourceRow(); 

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

    // Initialiser le sélecteur d'unité
    const unitSelect = document.getElementById('metricUnit');
    unitSelect.innerHTML = '<option value="">Sélectionner une unité...</option>';
    units.forEach(u => {
        const option = document.createElement('option');
        option.value = u.code;
        option.textContent = `${u.label} (${u.symbol || '-'})`;
        unitSelect.appendChild(option);
    });

    // Sélectionner l'unité de la métrique (si elle existe)
    // Note: Le backend doit renvoyer l'unité de la métrique. 
    // Si l'objet metric n'a pas de champ unit_code, on essaie de le déduire des sources ou on laisse vide.
    if (metric.unit_code) {
        unitSelect.value = metric.unit_code;
    } else if (metric.sources && metric.sources.length > 0) {
        // Essayer de trouver l'unité via la première source (si disponible dans les données chargées)
        // C'est un fallback
    }

    const container = document.getElementById('metricSourcesContainer');
    container.innerHTML = '';

    if (metric.sources && metric.sources.length > 0) {
        metric.sources.forEach(source => addSourceRow(source));
    }

    new bootstrap.Modal(document.getElementById('metricModal')).show();
}

function onMetricUnitChange() {
    const container = document.getElementById('metricSourcesContainer');
    if (container.children.length > 0) {
        if (confirm('Changer l\'unité va supprimer les sources existantes. Continuer ?')) {
            container.innerHTML = '';
        } else {
            // Rétablir l'ancienne valeur ? Difficile sans stocker l'état précédent.
            // Pour l'instant on laisse l'utilisateur gérer.
        }
    }
    // On pourrait ajouter une première ligne automatiquement ici
    addSourceRow();
}

function addSourceRow(data = null) {
    const unitCode = document.getElementById('metricUnit').value;
    if (!unitCode) {
        alert('Veuillez d\'abord sélectionner une unité pour la métrique.');
        return;
    }

    // Filtrer les types d'objectifs compatibles avec l'unité sélectionnée
    // On suppose que types[i].unit correspond au symbole ou au code.
    // Il faut faire le lien entre unitCode (ex: 'EUR') et type.unit (ex: '€').
    const selectedUnit = units.find(u => u.code === unitCode);
    const compatibleTypes = types.filter(t => {
        // Si le type n'a pas d'unité définie, on l'exclut ? Ou on l'inclut ?
        // On suppose qu'on veut matcher strictement.
        if (!t.unit) return false;
        return t.unit === selectedUnit.symbol || t.unit === selectedUnit.code;
    });

    if (compatibleTypes.length === 0) {
        alert('Aucun type d\'objectif trouvé pour cette unité.');
        return;
    }

    const container = document.getElementById('metricSourcesContainer');
    const div = document.createElement('div');
    div.className = 'source-row d-flex gap-2 align-items-end';
    div.innerHTML = `
        <div class="flex-grow-1">
            <label class="form-label small mb-1">Type d'Objectif Source</label>
            <select class="form-select form-select-sm source-type" required>
                <option value="">Choisir un type...</option>
                ${compatibleTypes.map(t => `<option value="${t.id}">${t.label} (${t.code})</option>`).join('')}
            </select>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm mb-1" onclick="this.closest('.source-row').remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(div);

    if (data) {
        // data.objective_type_id doit être présent
        if (data.objective_type_id) {
            div.querySelector('.source-type').value = data.objective_type_id;
        } else if (data.opportunity_type) {
            // Fallback pour compatibilité si on édite une vieille métrique (ne devrait pas arriver si on a migré)
            console.warn('Old metric source format detected');
        }
    }
}

async function saveMetric() {
    const form = document.getElementById('metricForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('metricId').value;
    const unitCode = document.getElementById('metricUnit').value;
    const sources = [];

    document.querySelectorAll('.source-row').forEach(row => {
        const typeId = row.querySelector('.source-type').value;
        if (typeId) {
            sources.push({
                objective_type_id: typeId
            });
        }
    });

    if (sources.length === 0) {
        alert('Veuillez ajouter au moins une source.');
        return;
    }

    const data = {
        code: document.getElementById('metricCode').value,
        label: document.getElementById('metricLabel').value,
        description: document.getElementById('metricDescription').value,
        unit_code: unitCode,
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
