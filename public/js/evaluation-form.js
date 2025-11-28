// Gestion du formulaire d'évaluation
let evaluationId = null;
let evaluationData = null;
let objectivesScores = [];

document.addEventListener('DOMContentLoaded', async function () {
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Récupérer l'ID de l'évaluation depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    evaluationId = urlParams.get('id');

    if (!evaluationId) {
        showAlert('ID d\'évaluation manquant', 'danger');
        return;
    }

    await loadEvaluationData();
    setupAutoSave();
});

async function loadEvaluationData() {
    try {
        // Charger les détails de l'évaluation
        const response = await fetch(`/api/evaluations/${evaluationId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            evaluationData = result.data || result;

            // Afficher les infos de base
            document.getElementById('collabName').textContent = `${evaluationData.prenom} ${evaluationData.nom}`;
            document.getElementById('collabGrade').textContent = evaluationData.grade || 'Non défini';
            document.getElementById('campaignName').textContent = evaluationData.campaign_name;
            document.getElementById('evaluationSubtitle').textContent = `${evaluationData.campaign_name} - ${new Date().getFullYear()}`;

            const statusBadge = document.getElementById('evaluationStatus');
            statusBadge.textContent = getStatusLabel(evaluationData.status);
            statusBadge.className = `badge ${getStatusClass(evaluationData.status)}`;

            // Remplir les champs de feedback
            document.getElementById('strengths').value = evaluationData.strengths || '';
            document.getElementById('improvementAreas').value = evaluationData.improvement_areas || '';
            document.getElementById('generalComment').value = evaluationData.general_comment || '';
            document.getElementById('nextPeriodObjectives').value = evaluationData.next_period_objectives || '';

            // Charger les scores des objectifs
            await loadObjectivesScores();
        } else {
            showAlert('Erreur lors du chargement de l\'évaluation', 'danger');
        }
    } catch (error) {
        console.error('Erreur chargement évaluation:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function loadObjectivesScores() {
    try {
        // On suppose qu'il y a un endpoint pour récupérer les scores liés à l'évaluation
        // Si l'endpoint principal renvoyait déjà les scores, on adapterait ici
        const response = await fetch(`/api/evaluations/${evaluationId}/scores`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            objectivesScores = result.data || result;
            renderObjectives();
        }
    } catch (error) {
        console.error('Erreur chargement scores:', error);
    }
}

function renderObjectives() {
    const container = document.getElementById('objectivesContainer');

    if (objectivesScores.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Aucun objectif à évaluer pour ce collaborateur.</div>';
        return;
    }

    container.innerHTML = objectivesScores.map(score => {
        const achievementRate = calculateAchievementRate(score.achieved_value, score.target_value);

        return `
        <div class="card mb-3 objective-score-card" id="card-${score.id}">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">${score.objective_label}</h5>
                        <p class="text-muted small mb-2">${score.objective_description || ''}</p>
                        <div class="d-flex gap-4 mb-3">
                            <div>
                                <small class="text-muted d-block">Cible</small>
                                <span class="fw-bold">${formatNumber(score.target_value)} ${score.unit || ''}</span>
                            </div>
                            <div>
                                <small class="text-muted d-block">Poids</small>
                                <span class="fw-bold">${score.weight || 1}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 border-start">
                        <div class="mb-3">
                            <label class="form-label small text-muted">Réalisé</label>
                            <input type="number" class="form-control score-input" 
                                value="${score.achieved_value || 0}" 
                                onchange="updateScore('${score.id}', this.value)"
                                step="0.01">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small text-muted">Taux d'atteinte</label>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${getProgressBarClass(achievementRate)}" 
                                    role="progressbar" 
                                    style="width: ${Math.min(achievementRate, 100)}%">
                                    ${Math.round(achievementRate)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-12">
                        <label class="form-label small text-muted">Commentaire pour cet objectif</label>
                        <input type="text" class="form-control form-control-sm" 
                            placeholder="Commentaire optionnel..."
                            value="${score.comment || ''}"
                            onchange="updateComment('${score.id}', this.value)">
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function calculateAchievementRate(achieved, target) {
    if (!target || target == 0) return 0;
    return (parseFloat(achieved || 0) / parseFloat(target)) * 100;
}

function getProgressBarClass(rate) {
    if (rate >= 100) return 'bg-success';
    if (rate >= 70) return 'bg-primary';
    return 'bg-warning text-dark';
}

function getStatusLabel(status) {
    const labels = {
        'DRAFT': 'Brouillon',
        'SUBMITTED': 'Soumise',
        'VALIDATED': 'Validée',
        'REJECTED': 'Rejetée'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'DRAFT': 'bg-secondary',
        'SUBMITTED': 'bg-primary',
        'VALIDATED': 'bg-success',
        'REJECTED': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

// --- Updates & Saving ---

async function updateScore(scoreId, value) {
    const score = objectivesScores.find(s => s.id == scoreId);
    if (score) {
        score.achieved_value = parseFloat(value);
        // Mettre à jour l'affichage du taux d'atteinte sans recharger tout
        renderObjectives(); // Pour simplifier, on re-render tout, mais on pourrait optimiser
        markAsUnsaved();
    }
}

async function updateComment(scoreId, value) {
    const score = objectivesScores.find(s => s.id == scoreId);
    if (score) {
        score.comment = value;
        markAsUnsaved();
    }
}

function markAsUnsaved() {
    document.getElementById('lastSaved').textContent = 'Modifications non enregistrées...';
    document.getElementById('lastSaved').classList.add('text-warning');
}

async function saveDraft() {
    const data = {
        strengths: document.getElementById('strengths').value,
        improvement_areas: document.getElementById('improvementAreas').value,
        general_comment: document.getElementById('generalComment').value,
        next_period_objectives: document.getElementById('nextPeriodObjectives').value,
        scores: objectivesScores.map(s => ({
            id: s.id,
            achieved_value: s.achieved_value,
            comment: s.comment
        }))
    };

    try {
        const response = await fetch(`/api/evaluations/${evaluationId}/draft`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const now = new Date();
            document.getElementById('lastSaved').textContent = now.toLocaleTimeString();
            document.getElementById('lastSaved').classList.remove('text-warning');
            showAlert('Brouillon enregistré', 'success');
        } else {
            showAlert('Erreur lors de la sauvegarde', 'danger');
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function submitEvaluation() {
    if (!confirm('Êtes-vous sûr de vouloir soumettre cette évaluation ? Vous ne pourrez plus la modifier.')) return;

    // D'abord sauvegarder le brouillon pour être sûr d'avoir les dernières données
    await saveDraft();

    try {
        const response = await fetch(`/api/evaluations/${evaluationId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            showAlert('Évaluation soumise avec succès', 'success');
            setTimeout(() => {
                window.location.reload(); // Recharger pour voir le nouveau statut
            }, 1500);
        } else {
            showAlert('Erreur lors de la soumission', 'danger');
        }
    } catch (error) {
        console.error('Erreur soumission:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function setupAutoSave() {
    // Auto-save toutes les 60 secondes
    setInterval(() => {
        if (document.getElementById('lastSaved').classList.contains('text-warning')) {
            saveDraft();
        }
    }, 60000);
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
