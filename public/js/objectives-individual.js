// Gestion des objectifs individuels
let currentFiscalYearId = null;
let myObjectives = [];
let currentObjectiveId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // Initialiser les stats à 0 ou - par défaut
    updateStats();

    // Ajouter un bouton de rafraîchissement manuel pour le débogage
    const header = document.querySelector('h3'); // "Mes Objectifs"
    if (header) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-secondary ms-3';
        btn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Rafraîchir';
        btn.onclick = () => {
            console.log('🔄 Rafraîchissement manuel...');
            loadMyObjectives();
        };
        header.appendChild(btn);
    }

    await loadFiscalYears();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('fiscalYearSelect').addEventListener('change', function (e) {
        currentFiscalYearId = e.target.value;
        if (currentFiscalYearId) {
            loadMyObjectives();
        } else {
            document.getElementById('objectivesList').innerHTML = '';
            updateStats();
        }
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
                loadMyObjectives();
            }
        }
    } catch (error) {
        console.error('Erreur chargement exercices:', error);
        showAlert('Erreur lors du chargement des exercices fiscaux', 'danger');
    }
}

async function loadMyObjectives() {
    if (!currentFiscalYearId) return;

    try {
        // Utiliser le SessionManager pour récupérer les données utilisateur
        const sessionManager = window.sessionManager || new SessionManager();
        await sessionManager.initialize();

        const collaboratorId = sessionManager.user?.collaborateur_id;

        if (!collaboratorId) {
            // L'utilisateur n'est pas un collaborateur (ex: SUPER_ADMIN)
            const container = document.getElementById('objectivesList');
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Information :</strong> Votre compte n'est pas associé à un profil collaborateur.
                    Les objectifs individuels sont uniquement disponibles pour les collaborateurs.
                </div>
            `;
            updateStats(); // Mettre les stats à 0
            return;
        }

        const response = await fetch(`/api/objectives/individual/${collaboratorId}/${currentFiscalYearId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            myObjectives = result || [];
            renderObjectives();
            // Utiliser requestAnimationFrame pour garantir que le DOM est rendu
            requestAnimationFrame(() => {
                requestAnimationFrame(() => updateStats());
            });
        } else {
            const errorText = await response.text();
            console.error('Erreur API:', errorText);
            showAlert('Erreur lors du chargement des objectifs', 'danger');
        }
    } catch (error) {
        console.error('Erreur chargement objectifs:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function renderObjectives() {
    const container = document.getElementById('objectivesList');

    if (myObjectives.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Aucun objectif assigné pour cet exercice</h5>
                <p class="text-muted">Vos objectifs apparaîtront ici une fois assignés par votre manager.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myObjectives.map(obj => createObjectiveCard(obj)).join('');
}

function createObjectiveCard(obj) {
    const progress = calculateProgress(obj);
    const isCompleted = progress >= 100;
    const isDelayed = obj.end_date && new Date(obj.end_date) < new Date() && !isCompleted;

    const statusClass = isCompleted ? 'completed' : (isDelayed ? 'delayed' : '');
    const progressBarColor = isCompleted ? 'bg-success' : (isDelayed ? 'bg-danger' : 'bg-primary');

    // Utiliser description comme titre si label est null
    const displayTitle = obj.label || obj.description || 'Objectif';
    const displayDescription = obj.label ? (obj.description || 'Pas de description') : '';

    return `
    <div class="card objective-card ${statusClass}">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="flex-grow-1">
                    <h5 class="card-title mb-1">${displayTitle}</h5>
                    <div class="text-muted small">
                        ${obj.code ? `<span class="badge bg-light text-dark border me-2"><i class="fas fa-tag me-1"></i>${obj.code}</span>` : ''}
                        ${obj.unit ? `<span class="badge bg-info text-white me-2"><i class="fas fa-ruler me-1"></i>${obj.unit}</span>` : ''}
                        ${obj.start_date ? `<i class="far fa-calendar me-1"></i>Début: ${new Date(obj.start_date).toLocaleDateString()} ` : ''}
                        ${obj.end_date ? `<i class="far fa-calendar-alt me-1"></i>Fin: ${new Date(obj.end_date).toLocaleDateString()}` : ''}
                    </div>
                </div>
                ${!obj.is_cascaded ? `<button class="btn btn-outline-primary btn-sm" onclick="openUpdateModal('${obj.id}')">
                    <i class="fas fa-edit me-1"></i>Mettre à jour
                </button>` : ''}
            </div>
            
            ${displayDescription ? `<p class="card-text text-secondary mb-4">${displayDescription}</p>` : ''}
            
            <div class="row align-items-end">
                <div class="col-md-6 mb-3 mb-md-0">
                    <div class="d-flex justify-content-between small text-muted mb-1">
                        <span>Progression actuelle</span>
                        <span class="fw-bold">${formatNumber(obj.current_value)} / ${formatNumber(obj.target_value)} ${obj.unit || ''}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar ${progressBarColor}" role="progressbar" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>
                <div class="col-md-6 text-md-end">
                    <div class="h4 mb-0 ${isCompleted ? 'text-success' : (isDelayed ? 'text-danger' : 'text-primary')}">
                        ${Math.round(progress)}%
                    </div>
                    <small class="text-muted">Complété</small>
                </div>
            </div>
        </div>
    </div>
    `;
}

function calculateProgress(obj) {
    if (obj.achievement_rate !== undefined && obj.achievement_rate !== null) {
        return parseFloat(obj.achievement_rate);
    }

    if (!obj.target_value || obj.target_value == 0) return 0;
    return (parseFloat(obj.current_value || 0) / parseFloat(obj.target_value)) * 100;
}

function updateStats() {
    console.log('🔍 [updateStats] Début - myObjectives:', myObjectives);
    const total = myObjectives.length;

    const totalEl = document.getElementById('totalObjectives');
    const avgEl = document.getElementById('avgProgress');
    const completedEl = document.getElementById('completedObjectives');

    console.log('🔍 [updateStats] Éléments DOM:', {
        totalEl: totalEl,
        avgEl: avgEl,
        completedEl: completedEl,
        totalEl_exists: !!totalEl,
        avgEl_exists: !!avgEl,
        completedEl_exists: !!completedEl
    });

    if (!totalEl || !avgEl || !completedEl) {
        console.error('❌ [updateStats] Éléments manquants!');
        return;
    }

    if (total === 0) {
        totalEl.textContent = '0';
        avgEl.textContent = '0%';
        completedEl.textContent = '0';
        console.log('📊 [updateStats] Aucun objectif, stats à 0');
        return;
    }

    let totalProgress = 0;
    let completed = 0;

    myObjectives.forEach(obj => {
        const p = calculateProgress(obj);
        console.log(`📊 [updateStats] Objectif ${obj.id}: progress = ${p}%`);
        totalProgress += Math.min(p, 100);
        if (p >= 100) completed++;
    });

    const avg = Math.round(totalProgress / total);

    console.log('📊 [updateStats] Calculs:', { total, avg, completed, totalProgress });

    totalEl.textContent = total;
    avgEl.textContent = `${avg}%`;
    completedEl.textContent = `${completed} / ${total}`;

    console.log('✅ [updateStats] Stats mises à jour:', {
        total: totalEl.textContent,
        avg: avgEl.textContent,
        completed: completedEl.textContent
    });
}

function openUpdateModal(id) {
    const obj = myObjectives.find(o => o.id == id);
    if (!obj) return;

    currentObjectiveId = id;
    document.getElementById('updateObjectiveId').value = id;
    document.getElementById('updateObjectiveType').value = 'INDIVIDUAL';
    document.getElementById('updateObjectiveTitle').value = obj.label || obj.code || obj.description;
    document.getElementById('updateValue').value = obj.current_value || 0;
    document.getElementById('updateNotes').value = '';

    const modal = new bootstrap.Modal(document.getElementById('updateProgressModal'));
    modal.show();
}

async function saveProgress() {
    const form = document.getElementById('updateProgressForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        objectiveType: 'INDIVIDUAL',
        objectiveId: currentObjectiveId,
        currentValue: parseFloat(document.getElementById('updateValue').value),
        notes: document.getElementById('updateNotes').value
    };

    try {
        const response = await fetch('/api/objectives/progress', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('updateProgressModal'));
            modal.hide();
            showAlert('Progression mise à jour avec succès', 'success');
            loadMyObjectives(); // Recharger pour voir les changements
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la mise à jour', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('fr-FR').format(num);
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
