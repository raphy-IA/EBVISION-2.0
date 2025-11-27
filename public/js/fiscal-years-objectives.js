// ============================================
// STRATEGIC OBJECTIVES MANAGEMENT
// ============================================

let currentFiscalYearId = null;
let currentObjectives = [];
let businessUnits = [];

// Charger les Business Units au démarrage
async function loadBusinessUnits() {
    try {
        const response = await fetch('/api/business-units', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (response.ok) {
            const result = await response.json();
            businessUnits = result.data || result || [];
            populateBusinessUnitsSelect();
        }
    } catch (error) {
        console.error('Erreur chargement BU:', error);
    }
}

// Remplir le sélecteur de Business Units
function populateBusinessUnitsSelect() {
    const select = document.getElementById('objectiveBusinessUnit');
    if (!select) return;

    select.innerHTML = '<option value="">Global (toutes les BU)</option>';
    businessUnits.forEach(bu => {
        select.innerHTML += `<option value="${bu.id}">${bu.nom} (${bu.code})</option>`;
    });
}

// Charger les objectifs d'une année fiscale
async function loadObjectivesForYear(fiscalYearId) {
    currentFiscalYearId = fiscalYearId;

    try {
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}/objectives`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            currentObjectives = result.data || [];
            displayObjectives(currentObjectives);
        } else {
            showAlert('Erreur lors du chargement des objectifs', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Afficher les objectifs dans le tableau
function displayObjectives(objectives) {
    const tbody = document.getElementById('objectivesTableBody');
    if (!tbody) return;

    if (objectives.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i><br>
                    Aucun objectif configuré
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = objectives.map(obj => `
        <tr>
            <td>
                <i class="fas ${getObjectiveIcon(obj.type)} me-2"></i>
                ${getObjectiveLabel(obj.type)}
            </td>
            <td>${obj.business_unit_nom || '<span class="badge bg-secondary">Global</span>'}</td>
            <td><strong>${formatNumber(obj.target_value)}</strong></td>
            <td>${obj.unit}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editObjective('${obj.id}')" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteObjective('${obj.id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Ouvrir le modal de création d'objectif
function openCreateObjectiveModal() {
    if (!currentFiscalYearId) {
        showAlert('Erreur: Année fiscale non sélectionnée', 'danger');
        return;
    }

    document.getElementById('objectiveForm').reset();
    document.getElementById('objectiveId').value = '';
    document.getElementById('objectiveFiscalYearId').value = currentFiscalYearId;
    document.getElementById('objectiveModalTitle').textContent = 'Nouvel Objectif';

    const modal = new bootstrap.Modal(document.getElementById('objectiveModal'));
    modal.show();
}

// Éditer un objectif
async function editObjective(objectiveId) {
    const objective = currentObjectives.find(o => o.id == objectiveId);
    if (!objective) return;

    document.getElementById('objectiveId').value = objective.id;
    document.getElementById('objectiveFiscalYearId').value = currentFiscalYearId;
    document.getElementById('objectiveType').value = objective.type;
    document.getElementById('objectiveBusinessUnit').value = objective.business_unit_id || '';
    document.getElementById('objectiveTargetValue').value = objective.target_value;
    document.getElementById('objectiveModalTitle').textContent = 'Modifier l\'Objectif';

    updateObjectiveUnit();

    const modal = new bootstrap.Modal(document.getElementById('objectiveModal'));
    modal.show();
}

// Sauvegarder un objectif (créer ou modifier)
async function saveObjective() {
    const form = document.getElementById('objectiveForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const objectiveId = document.getElementById('objectiveId').value;
    const fiscalYearId = document.getElementById('objectiveFiscalYearId').value;
    const isEdit = !!objectiveId;

    const data = {
        type: document.getElementById('objectiveType').value,
        target_value: parseFloat(document.getElementById('objectiveTargetValue').value),
        business_unit_id: document.getElementById('objectiveBusinessUnit').value || null
    };

    try {
        let response;
        if (isEdit) {
            response = await fetch(`/api/objectives/${objectiveId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ target_value: data.target_value })
            });
        } else {
            response = await fetch(`/api/fiscal-years/${fiscalYearId}/objectives`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('objectiveModal'));
            modal.hide();
            showAlert(`Objectif ${isEdit ? 'modifié' : 'créé'} avec succès`, 'success');
            loadObjectivesForYear(fiscalYearId);
        } else {
            const error = await response.json();
            showAlert('Erreur: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Supprimer un objectif
async function deleteObjective(objectiveId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
        return;
    }

    try {
        const response = await fetch(`/api/objectives/${objectiveId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            showAlert('Objectif supprimé avec succès', 'success');
            loadObjectivesForYear(currentFiscalYearId);
        } else {
            const error = await response.json();
            showAlert('Erreur: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Mettre à jour l'unité selon le type d'objectif
function updateObjectiveUnit() {
    const type = document.getElementById('objectiveType').value;
    const unitSpan = document.getElementById('objectiveUnit');

    const units = {
        'CA': '€',
        'MARGE': '%',
        'SATISFACTION': '%',
        'CONVERSION': '%'
    };

    unitSpan.textContent = units[type] || '';
}

// Obtenir le libellé d'un type d'objectif
function getObjectiveLabel(type) {
    const labels = {
        'CA': 'Croissance CA',
        'MARGE': 'Marge Brute',
        'SATISFACTION': 'Satisfaction Client',
        'CONVERSION': 'Taux de Conversion'
    };
    return labels[type] || type;
}

// Obtenir l'icône d'un type d'objectif
function getObjectiveIcon(type) {
    const icons = {
        'CA': 'fa-euro-sign',
        'MARGE': 'fa-percentage',
        'SATISFACTION': 'fa-smile',
        'CONVERSION': 'fa-chart-line'
    };
    return icons[type] || 'fa-bullseye';
}

// Formater un nombre
function formatNumber(value) {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}

// Événement de changement de type d'objectif
document.addEventListener('DOMContentLoaded', function () {
    const typeSelect = document.getElementById('objectiveType');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateObjectiveUnit);
    }

    // Charger les BU au démarrage
    loadBusinessUnits();
});
