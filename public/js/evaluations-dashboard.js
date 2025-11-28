// Tableau de bord des évaluations
let myEvaluations = [];
let toEvaluate = [];
let teamEvaluations = [];

document.addEventListener('DOMContentLoaded', async function () {
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    await Promise.all([
        loadMyEvaluations(),
        loadToEvaluate(),
        loadTeamEvaluations()
    ]);

    updateStats();
});

async function loadMyEvaluations() {
    try {
        const userId = getCurrentUserId();
        const response = await fetch(`/api/evaluations/collaborator/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            myEvaluations = result.data || result;
            renderMyEvaluations();
        }
    } catch (error) {
        console.error('Erreur chargement mes évaluations:', error);
    }
}

async function loadToEvaluate() {
    try {
        // Endpoint pour récupérer les évaluations à faire en tant que manager
        const response = await fetch('/api/evaluations/to-evaluate', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            toEvaluate = result.data || result;
            renderToEvaluate();
        }
    } catch (error) {
        console.error('Erreur chargement à évaluer:', error);
    }
}

async function loadTeamEvaluations() {
    try {
        // Endpoint pour récupérer toutes les évaluations de l'équipe (vue manager)
        const response = await fetch('/api/evaluations/team', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (response.ok) {
            const result = await response.json();
            teamEvaluations = result.data || result;
            renderTeamEvaluations();
        }
    } catch (error) {
        console.error('Erreur chargement équipe:', error);
    }
}

function renderMyEvaluations() {
    const container = document.getElementById('myEvaluationsList');

    if (myEvaluations.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center py-4">Aucune évaluation trouvée.</td></tr>';
        return;
    }

    container.innerHTML = myEvaluations.map(evaluation => `
        <tr>
            <td>${evaluation.campaign_name}</td>
            <td>${new Date(evaluation.start_date).toLocaleDateString()} - ${new Date(evaluation.end_date).toLocaleDateString()}</td>
            <td>${evaluation.updated_at ? new Date(evaluation.updated_at).toLocaleDateString() : '-'}</td>
            <td><span class="badge ${getStatusClass(evaluation.status)}">${getStatusLabel(evaluation.status)}</span></td>
            <td>${evaluation.global_score ? evaluation.global_score + '%' : '-'}</td>
            <td>
                <a href="/evaluation-view.html?id=${evaluation.id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i> Consulter
                </a>
            </td>
        </tr>
    `).join('');
}

function renderToEvaluate() {
    const container = document.getElementById('toEvaluateList');
    const badge = document.getElementById('pendingBadge');

    if (toEvaluate.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center py-4">Aucune évaluation à réaliser.</td></tr>';
        badge.style.display = 'none';
        return;
    }

    badge.textContent = toEvaluate.length;
    badge.style.display = 'inline-block';

    container.innerHTML = toEvaluate.map(evaluation => `
        <tr>
            <td>
                <div class="fw-bold">${evaluation.prenom} ${evaluation.nom}</div>
                <small class="text-muted">${evaluation.grade || ''}</small>
            </td>
            <td>${evaluation.campaign_name}</td>
            <td>${new Date(evaluation.end_date).toLocaleDateString()}</td>
            <td><span class="badge ${getStatusClass(evaluation.status)}">${getStatusLabel(evaluation.status)}</span></td>
            <td>
                <div class="progress" style="height: 5px; width: 100px;">
                    <div class="progress-bar" role="progressbar" style="width: ${evaluation.progress || 0}%"></div>
                </div>
            </td>
            <td>
                <a href="/evaluation-form.html?id=${evaluation.id}" class="btn btn-sm btn-primary">
                    <i class="fas fa-pen"></i> Évaluer
                </a>
            </td>
        </tr>
    `).join('');
}

function renderTeamEvaluations() {
    const container = document.getElementById('teamOverviewList');

    if (teamEvaluations.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center py-4">Aucune donnée d\'équipe disponible.</td></tr>';
        return;
    }

    container.innerHTML = teamEvaluations.map(evaluation => `
        <tr>
            <td>
                <div class="fw-bold">${evaluation.prenom} ${evaluation.nom}</div>
            </td>
            <td>${evaluation.campaign_name}</td>
            <td><span class="badge ${getStatusClass(evaluation.status)}">${getStatusLabel(evaluation.status)}</span></td>
            <td>${evaluation.global_score ? evaluation.global_score + '%' : '-'}</td>
            <td>${evaluation.updated_at ? new Date(evaluation.updated_at).toLocaleDateString() : '-'}</td>
            <td>
                <a href="/evaluation-view.html?id=${evaluation.id}" class="btn btn-sm btn-outline-secondary">
                    <i class="fas fa-eye"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    // Mes évaluations (année en cours)
    const currentYear = new Date().getFullYear();
    const myCount = myEvaluations.filter(e => new Date(e.start_date).getFullYear() === currentYear).length;
    document.getElementById('myEvaluationsCount').textContent = myCount;

    // À réaliser
    document.getElementById('toEvaluateCount').textContent = toEvaluate.length;

    // Moyenne équipe
    const scoredEvaluations = teamEvaluations.filter(e => e.global_score > 0);
    if (scoredEvaluations.length > 0) {
        const totalScore = scoredEvaluations.reduce((acc, curr) => acc + parseFloat(curr.global_score), 0);
        const avg = Math.round(totalScore / scoredEvaluations.length);
        document.getElementById('teamAverage').textContent = `${avg}%`;
    } else {
        document.getElementById('teamAverage').textContent = '-';
    }
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

function getStatusClass(status) {
    const classes = {
        'DRAFT': 'bg-secondary',
        'SUBMITTED': 'bg-primary',
        'VALIDATED': 'bg-success',
        'REJECTED': 'bg-danger',
        'SIGNED': 'bg-info text-dark'
    };
    return classes[status] || 'bg-secondary';
}
