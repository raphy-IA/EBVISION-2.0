// Dashboard Équipe - EBVISION
// Gestion des indicateurs de performance collective avec autorisations managériales

const API_BASE_URL = '/api/analytics';

// Variables globales pour les graphiques
let teamPerformanceChart, teamDistributionChart, collabChart;

// Variables pour les filtres
// Variables pour les filtres
let currentFilters = {
    period: 30,
    scopeType: 'GLOBAL', // 'GLOBAL', 'BU', 'DIVISION', 'SUPERVISOR'
    scopeId: null,
    memberId: ''
};

let membersLoaded = false;

// Variables globales pour les équipes gérées
let managedBusinessUnits = [];
let managedDivisions = [];

// Fonction d'authentification
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}` };
}

async function authenticatedFetch(url) {
    return fetch(url, { headers: getAuthHeader() });
}

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Initialisation du Dashboard Équipe...');
    await initializeDashboard();
});

// Fonction principale d'initialisation
// Fonction principale d'initialisation
async function initializeDashboard() {
    try {
        console.log('📊 Démarrage initialisation...');

        // Mise à jour du nom du superviseur
        const supervisorNameElement = document.getElementById('supervisor-name');
        if (supervisorNameElement) {
            // Tenter de récupérer depuis le SessionManager
            const user = window.sessionManager ? (window.sessionManager.user || window.sessionManager.collaborateur) : null;
            if (user) {
                supervisorNameElement.textContent = `${user.prenom} ${user.nom}`;
            } else {
                supervisorNameElement.textContent = 'Superviseur';
            }
        }

        // 1. Configurer les événements des filtres
        setupFilterListeners();

        // 2. Initialiser les graphiques
        initializeCharts();

        // 3. Charger les données (Le backend détermine automatiquement le scope unifié)
        await loadDashboardData();

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showError('Erreur technique', 'Impossible d\'initialiser le dashboard. Veuillez rafraîchir la page.');
    }
}

// Fonction pour afficher une erreur visible
function showError(title, message) {
    console.error(`❌ ${title}:`, message);

    // Supprimer les alertes existantes
    const existingAlerts = document.querySelectorAll('.alert-api-error');
    existingAlerts.forEach(alert => alert.remove());

    // Trouver le conteneur principal
    const mainContent = document.querySelector('.main-content-area');
    if (!mainContent) return;

    // Créer la nouvelle alerte
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show mb-4 alert-api-error';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <div class="d-flex align-items-start">
            <i class="fas fa-exclamation-circle me-3 mt-1" style="font-size: 1.5rem;"></i>
            <div class="flex-grow-1">
                <h5 class="alert-heading mb-2">${title}</h5>
                <p class="mb-2">${message}</p>
                <div class="mt-3">
                    <button type="button" class="btn btn-sm btn-outline-danger me-2" onclick="location.reload()">
                        <i class="fas fa-sync-alt me-1"></i> Rafraîchir la page
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="alert">
                        <i class="fas fa-times me-1"></i> Fermer
                    </button>
                </div>
            </div>
        </div>
    `;

    // Insérer au début du contenu principal
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

    // Auto-scroll vers l'alerte
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Fonction pour afficher un avertissement
function showWarning(title, message) {
    console.warn(`⚠️ ${title}:`, message);

    const mainContent = document.querySelector('.main-content-area');
    if (!mainContent) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show mb-4';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <div class="d-flex align-items-start">
            <i class="fas fa-exclamation-triangle me-3 mt-1" style="font-size: 1.5rem;"></i>
            <div class="flex-grow-1">
                <h5 class="alert-heading mb-2">${title}</h5>
                <p class="mb-0">${message}</p>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    mainContent.insertBefore(alertDiv, mainContent.firstChild);
}

// Peupler le filtre Scope (Equipe)
function populateScopeFilter(bus, divs, supervisedCount) {
    const select = document.getElementById('scope-filter');
    if (!select) return;

    // Garder l'option "Vue d'ensemble"
    select.innerHTML = '<option value="GLOBAL">Vue d\'ensemble (Général)</option>';

    // Ajouter les BUs
    if (bus.length > 0) {
        const groupBU = document.createElement('optgroup');
        groupBU.label = 'Business Units';
        bus.forEach(bu => {
            const option = document.createElement('option');
            option.value = `BU:${bu.id}`;
            option.textContent = bu.nom;
            groupBU.appendChild(option);
        });
        select.appendChild(groupBU);
    }

    // Ajouter les Divisions
    if (divs.length > 0) {
        const groupDiv = document.createElement('optgroup');
        groupDiv.label = 'Divisions';
        divs.forEach(div => {
            const option = document.createElement('option');
            option.value = `DIVISION:${div.id}`;
            option.textContent = div.nom;
            groupDiv.appendChild(option);
        });
        select.appendChild(groupDiv);
    }

    // Ajouter l'option Superviseur si applicable
    if (supervisedCount > 0) {
        const optionSup = document.createElement('option');
        optionSup.value = 'SUPERVISOR:ME';
        optionSup.textContent = 'Mes collaborateurs directs';
        select.appendChild(optionSup);
    }
}

// Configurer les événements des filtres
function setupFilterListeners() {
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function () {
            currentFilters.period = parseInt(this.value);
            // Mettre à jour le label dynamique
            updatePeriodLabel(this.value);
            refreshDashboard();
        });
    }

    const scopeFilter = document.getElementById('scope-filter');
    if (scopeFilter) {
        scopeFilter.addEventListener('change', function () {
            const value = this.value;
            if (value === 'GLOBAL') {
                currentFilters.scopeType = 'GLOBAL';
                currentFilters.scopeId = null;
            } else {
                const parts = value.split(':');
                currentFilters.scopeType = parts[0];
                currentFilters.scopeId = parts[1];
            }
            // Réinitialiser le filtre membre quand on change de scope principal
            currentFilters.memberId = '';
            const memberSelect = document.getElementById('member-filter');
            if (memberSelect) memberSelect.value = '';

            // On force le rechargement de la liste des membres pour ce scope
            membersLoaded = false;

            refreshDashboard();
        });
    }

    const memberFilter = document.getElementById('member-filter');
    if (memberFilter) {
        memberFilter.addEventListener('change', function () {
            currentFilters.memberId = this.value;
            refreshDashboard();
        });
    }
}

// Mettre à jour le label de performance
function updatePeriodLabel(days) {
    const labels = {
        '7': '7 derniers jours',
        '30': '30 derniers jours',
        '90': '3 derniers mois',
        '365': '12 derniers mois'
    };

    const label = document.getElementById('team-performance-label');
    if (label) {
        const text = labels[days] || `${days} derniers jours`;
        label.innerHTML = `<i class="fas fa-chart-line me-2"></i>Performance de l'Équipe (${text})`;
    }
}

// Peupler le filtre Membres (Collaborateurs)
function populateMemberFilter(collaborators) {
    const select = document.getElementById('member-filter');
    if (!select || membersLoaded) return; // Ne charger qu'une fois pour garder la liste complète

    // Vider le select (sauf l'option "Tous")
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Trier par nom
    const sortedCollabs = [...collaborators].sort((a, b) => a.nom.localeCompare(b.nom));

    // Ajouter les options
    sortedCollabs.forEach(collab => {
        const option = document.createElement('option');
        option.value = collab.id;
        option.textContent = `${collab.nom} ${collab.prenom}`;
        select.appendChild(option);
    });

    membersLoaded = true;
}

// Charger les données principales du dashboard
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du dashboard équipe...');

        // Construire les paramètres de requête
        let queryParams = `period=${currentFilters.period}`;
        queryParams += `&scopeType=${currentFilters.scopeType}`;
        if (currentFilters.scopeId) queryParams += `&scopeId=${currentFilters.scopeId}`;
        if (currentFilters.memberId) queryParams += `&memberId=${currentFilters.memberId}`;

        // Charger les statistiques d'équipe
        const response = await authenticatedFetch(`${API_BASE_URL}/team-performance?${queryParams}`);

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
                showError('Accès non autorisé', errorData.error || 'Vous n\'avez pas les autorisations nécessaires');
            } else {
                showError('Erreur API', `Erreur HTTP ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
            }
            return;
        }

        const result = await response.json();
        if (result.success) {
            console.log('✅ Données reçues:', result.data);

            // Si c'est le premier chargement (pas de filtre membre actif), on peuple le filtre
            if (!currentFilters.memberId) {
                populateMemberFilter(result.data.collaborateurs);
            }

            updateKPIs(result.data.kpis);
            updateCollaborateursTable(result.data.collaborateurs);
            updateGradesChart(result.data.distribution_grades);
        } else {
            showError('Erreur de données', result.error || 'Impossible de charger les données');
        }

    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur technique', 'Une erreur est survenue lors du chargement des données. Veuillez réessayer.');
    }
}

// Mettre à jour les KPIs
function updateKPIs(data) {
    console.log('📈 Mise à jour des KPIs équipe:', data);

    // Total membres
    const membresElement = document.getElementById('total-membres');
    if (membresElement) {
        membresElement.textContent = data.total_membres || 0;
    }

    // Total heures
    const heuresElement = document.getElementById('total-heures');
    if (heuresElement) {
        heuresElement.textContent = parseFloat(data.total_heures || 0).toFixed(1) + 'h';
    }

    // Taux de chargeabilité
    const chargeabiliteElement = document.getElementById('taux-chargeabilite');
    if (chargeabiliteElement) {
        chargeabiliteElement.textContent = parseFloat(data.taux_chargeabilite || 0).toFixed(1) + '%';
    }

    // Missions actives
    const missionsElement = document.getElementById('missions-actives');
    if (missionsElement) {
        missionsElement.textContent = data.missions_actives || 0;
    }

    // Heures facturables
    const facturablesElement = document.getElementById('heures-facturables');
    if (facturablesElement) {
        facturablesElement.textContent = parseFloat(data.heures_facturables || 0).toFixed(1) + 'h';
    }

    // Heures non facturables
    const nonFacturablesElement = document.getElementById('heures-non-facturables');
    if (nonFacturablesElement) {
        nonFacturablesElement.textContent = parseFloat(data.heures_non_facturables || 0).toFixed(1) + 'h';
    }
}

// Initialiser les graphiques
function initializeCharts() {
    console.log('📊 Initialisation des graphiques équipe...');

    // Graphique de performance par collaborateur
    const collabCtx = document.getElementById('collabPerformanceChart');
    if (collabCtx) {
        collabChart = new Chart(collabCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heures totales',
                    data: [],
                    backgroundColor: '#4facfe',
                    borderColor: '#4facfe',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Graphique de distribution par grade
    const gradeCtx = document.getElementById('gradeDistributionChart');
    if (gradeCtx) {
        teamDistributionChart = new Chart(gradeCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4facfe',
                        '#00f2fe',
                        '#667eea',
                        '#764ba2',
                        '#fa709a',
                        '#fee140'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

// Mettre à jour le tableau des collaborateurs
function updateCollaborateursTable(collaborateurs) {
    console.log('📋 Mise à jour tableau collaborateurs:', collaborateurs);

    const tbody = document.getElementById('collaborateurs-tbody');
    if (!tbody) return;

    if (!collaborateurs || collaborateurs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-users fa-3x mb-3 d-block" style="opacity: 0.3;"></i>Aucun collaborateur trouvé pour cette période</td></tr>';

        // Vider le graphique
        if (collabChart) {
            collabChart.data.labels = [];
            collabChart.data.datasets[0].data = [];
            collabChart.update();
        }
        return;
    }

    // Mettre à jour le graphique des collaborateurs
    if (collabChart) {
        const topCollabs = collaborateurs.slice(0, 10);
        collabChart.data.labels = topCollabs.map(c => `${c.prenom} ${c.nom}`);
        collabChart.data.datasets[0].data = topCollabs.map(c => c.total_heures);
        collabChart.update();
    }

    // Mettre à jour le tableau
    const rows = collaborateurs.map(collab => {
        const chargeabilite = parseFloat(collab.taux_chargeabilite || 0);
        const badgeClass = chargeabilite >= 80 ? 'success' : chargeabilite >= 60 ? 'warning' : 'danger';

        return `
            <tr>
                <td>${collab.prenom} ${collab.nom}</td>
                <td>${collab.grade_nom || '-'}</td>
                <td class="text-end">${parseFloat(collab.total_heures || 0).toFixed(1)}h</td>
                <td class="text-end">${parseFloat(collab.heures_facturables || 0).toFixed(1)}h</td>
                <td class="text-center">
                    <span class="badge bg-${badgeClass}">${chargeabilite.toFixed(1)}%</span>
                </td>
                <td class="text-center">${collab.missions_assignees || 0}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

// Mettre à jour le graphique des grades
function updateGradesChart(grades) {
    console.log('📊 Mise à jour graphique grades:', grades);

    if (!teamDistributionChart) return;

    if (!grades || grades.length === 0) {
        teamDistributionChart.data.labels = [];
        teamDistributionChart.data.datasets[0].data = [];
        teamDistributionChart.update();
        return;
    }

    teamDistributionChart.data.labels = grades.map(g => g.grade_nom || 'Non défini');
    teamDistributionChart.data.datasets[0].data = grades.map(g => g.total_heures || 0);
    teamDistributionChart.update();
}

// Fonction pour rafraîchir le dashboard
function refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard équipe...');
    loadDashboardData();
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Exposer les fonctions globalement pour le débogage
window.dashboardEquipe = {
    refreshDashboard,
    loadDashboardData,
    updateKPIs,
    currentFilters,
    managedBusinessUnits,
    managedDivisions
};
