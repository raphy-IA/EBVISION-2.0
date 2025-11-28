// Consultation d'évaluation
let evaluationId = null;
let evaluationData = null;
let objectivesScores = [];

document.addEventListener('DOMContentLoaded', async function () {
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    evaluationId = urlParams.get('id');

    if (!evaluationId) {
        showAlert('ID d\'évaluation manquant', 'danger');
        return;
    }

    await loadEvaluationData();
});

async function loadEvaluationData() {
    try {
        const response = await fetch(`/api/evaluations/${evaluationId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            evaluationData = result.data || result;

            // Remplir les infos de base
            document.getElementById('collabName').textContent = `${evaluationData.prenom} ${evaluationData.nom}`;
            document.getElementById('collabRole').textContent = evaluationData.grade || 'Non défini';
            document.getElementById('campaignName').textContent = evaluationData.campaign_name;
            document.getElementById('evaluationDate').textContent = new Date(evaluationData.updated_at || evaluationData.created_at).toLocaleDateString();
            document.getElementById('evaluationStatus').textContent = getStatusLabel(evaluationData.status);

            // Remplir le feedback
            document.getElementById('strengthsText').textContent = evaluationData.strengths || 'Aucun point fort renseigné.';
            document.getElementById('improvementText').textContent = evaluationData.improvement_areas || 'Aucun axe d\'amélioration renseigné.';
            document.getElementById('generalCommentText').textContent = evaluationData.general_comment || 'Aucun commentaire global.';

            // Afficher le bouton de signature si pertinent (ex: statut VALIDATED et utilisateur est le collaborateur)
            const currentUser = getCurrentUser();
            if (evaluationData.status === 'VALIDATED' && currentUser && currentUser.id === evaluationData.collaborator_id) {
                document.getElementById('signButton').style.display = 'inline-block';
            }

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
        const response = await fetch(`/api/evaluations/${evaluationId}/scores`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            objectivesScores = result.data || result;
            renderObjectivesTable();
            calculateAndDisplayGlobalScore();
        }
    } catch (error) {
        console.error('Erreur chargement scores:', error);
    }
}

function renderObjectivesTable() {
    const tbody = document.getElementById('objectivesTableBody');

    if (objectivesScores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun objectif évalué.</td></tr>';
        return;
    }

    tbody.innerHTML = objectivesScores.map(score => {
        const achievementRate = calculateAchievementRate(score.achieved_value, score.target_value);
        const achievementClass = getAchievementClass(achievementRate);

        return `
        <tr>
            <td>
                <div class="fw-bold">${score.objective_label}</div>
                <small class="text-muted">${score.objective_description || ''}</small>
            </td>
            <td class="text-center">${score.weight || 1}%</td>
            <td class="text-center">${formatNumber(score.target_value)} ${score.unit || ''}</td>
            <td class="text-center fw-bold">${formatNumber(score.achieved_value)}</td>
            <td class="text-center">
                <span class="badge ${achievementClass}">${Math.round(achievementRate)}%</span>
            </td>
            <td>
                <small class="text-muted fst-italic">${score.comment || '-'}</small>
            </td>
        </tr>
        `;
    }).join('');
}

function calculateAndDisplayGlobalScore() {
    let totalScore = 0;
    let totalWeight = 0;

    objectivesScores.forEach(score => {
        const weight = parseFloat(score.weight || 1);
        const rate = calculateAchievementRate(score.achieved_value, score.target_value);

        // Plafonner le taux à 120% ou 150% selon les règles métier, ici on prend brut mais souvent plafonné
        // On va plafonner à 100% pour l'affichage simple ou laisser tel quel
        const effectiveRate = Math.min(rate, 100); // Exemple de règle

        totalScore += effectiveRate * weight;
        totalWeight += weight;
    });

    const globalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    const badge = document.getElementById('globalScore');
    badge.textContent = `${globalScore}%`;

    if (globalScore >= 100) badge.className = 'score-badge bg-success text-white d-inline-block';
    else if (globalScore >= 80) badge.className = 'score-badge bg-primary text-white d-inline-block';
    else if (globalScore >= 50) badge.className = 'score-badge bg-warning text-dark d-inline-block';
    else badge.className = 'score-badge bg-danger text-white d-inline-block';
}

function calculateAchievementRate(achieved, target) {
    if (!target || target == 0) return 0;
    return (parseFloat(achieved || 0) / parseFloat(target)) * 100;
}

function getAchievementClass(rate) {
    if (rate >= 100) return 'bg-success';
    if (rate >= 80) return 'bg-info text-dark';
    if (rate >= 50) return 'bg-warning text-dark';
    return 'bg-danger';
}

function getStatusLabel(status) {
    const labels = {
        'DRAFT': 'Brouillon',
        'SUBMITTED': 'Soumise',
        'VALIDATED': 'Validée',
        'REJECTED': 'Rejetée',
        'SIGNED': 'Signée'
    };
    return labels[status] || status;
}

async function signEvaluation() {
    if (!confirm('En signant cette évaluation, vous confirmez avoir pris connaissance des résultats. Continuer ?')) return;

    try {
        const response = await fetch(`/api/evaluations/${evaluationId}/sign`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            showAlert('Évaluation signée avec succès', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showAlert('Erreur lors de la signature', 'danger');
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
