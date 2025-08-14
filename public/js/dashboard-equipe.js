// Dashboard Équipe - EBVISION
// Gestion des indicateurs de performance collective

const API_BASE_URL = 'http://localhost:3000/api';

// Variables globales pour les graphiques
let teamPerformanceChart, teamDistributionChart;

// Variables pour les filtres
let currentFilters = {
    team: '',
    period: 30,
    businessUnit: ''
};

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du Dashboard Équipe...');
    
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Vérifier les permissions de superviseur
    if (!hasSupervisorRole()) {
        showError('Accès réservé aux superviseurs');
        return;
    }
    
    // Initialiser les filtres
    initializeFilters();
    
    // Charger les données du dashboard
    loadDashboardData();
    
    // Initialiser les graphiques
    initializeCharts();
    
    // Charger les membres d'équipe
    loadTeamMembers();
    
    // Charger les alertes équipe
    loadTeamAlerts();
    
    // Charger les missions actives
    loadActiveMissions();
    
    // Mettre à jour les informations superviseur
    updateSupervisorInfo();
});

// Vérifier si l'utilisateur a le rôle superviseur
function hasSupervisorRole() {
    const user = getCurrentUser();
    return user && (user.role === 'SUPERVISOR' || user.role === 'ADMIN');
}

// Initialiser les filtres
function initializeFilters() {
    console.log('🔧 Initialisation des filtres...');
    
    // Charger les équipes
    loadTeams();
    
    // Charger les business units
    loadBusinessUnits();
    
    // Écouter les changements de filtres
    document.getElementById('team-filter').addEventListener('change', function() {
        currentFilters.team = this.value;
        refreshDashboard();
    });
    
    document.getElementById('period-filter').addEventListener('change', function() {
        currentFilters.period = parseInt(this.value);
        refreshDashboard();
    });
    
    document.getElementById('business-unit-filter').addEventListener('change', function() {
        currentFilters.businessUnit = this.value;
        refreshDashboard();
    });
}

// Charger les équipes
async function loadTeams() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/teams`);
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('team-filter');
            
            data.data.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.nom;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des équipes:', error);
    }
}

// Charger les business units
async function loadBusinessUnits() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/business-units`);
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('business-unit-filter');
            
            data.data.forEach(bu => {
                const option = document.createElement('option');
                option.value = bu.id;
                option.textContent = bu.nom;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des business units:', error);
    }
}

// Charger les données principales du dashboard
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du dashboard équipe...');
        
        // Construire les paramètres de requête
        const params = new URLSearchParams({
            period: currentFilters.period,
            team: currentFilters.team,
            business_unit: currentFilters.businessUnit
        });
        
        // Charger les statistiques d'équipe
        const statsResponse = await authenticatedFetch(`${API_BASE_URL}/teams/statistics?${params}`);
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateKPIs(statsData.data);
        }
        
        // Charger les données pour les graphiques
        const chartDataResponse = await authenticatedFetch(`${API_BASE_URL}/teams/chart-data?${params}`);
        if (chartDataResponse.ok) {
            const chartData = await chartDataResponse.json();
            updateCharts(chartData.data);
        }
        
        // Charger les objectifs d'équipe
        const objectivesResponse = await authenticatedFetch(`${API_BASE_URL}/teams/objectives?${params}`);
        if (objectivesResponse.ok) {
            const objectivesData = await objectivesResponse.json();
            updateTeamObjectives(objectivesData.data);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données du dashboard');
    }
}

// Mettre à jour les KPIs
function updateKPIs(data) {
    console.log('📈 Mise à jour des KPIs équipe:', data);
    
    // Heures totales
    const heuresElement = document.getElementById('total-heures');
    const heuresTrendElement = document.getElementById('heures-trend');
    if (heuresElement && data.heures_totales) {
        heuresElement.textContent = `${data.heures_totales}h`;
        
        const tendance = data.tendance_heures || 0;
        updateTrend(heuresTrendElement, tendance);
    }
    
    // Taux de facturation
    const facturationElement = document.getElementById('taux-facturation');
    const facturationTrendElement = document.getElementById('facturation-trend');
    if (facturationElement && data.taux_facturation !== undefined) {
        facturationElement.textContent = `${data.taux_facturation.toFixed(1)}%`;
        
        const tendance = data.tendance_facturation || 0;
        updateTrend(facturationTrendElement, tendance);
    }
    
    // Productivité
    const productiviteElement = document.getElementById('productivite');
    const productiviteTrendElement = document.getElementById('productivite-trend');
    if (productiviteElement && data.productivite !== undefined) {
        productiviteElement.textContent = `${data.productivite.toFixed(1)}%`;
        
        const tendance = data.tendance_productivite || 0;
        updateTrend(productiviteTrendElement, tendance);
    }
    
    // Satisfaction
    const satisfactionElement = document.getElementById('satisfaction');
    const satisfactionTrendElement = document.getElementById('satisfaction-trend');
    if (satisfactionElement && data.satisfaction !== undefined) {
        satisfactionElement.textContent = `${data.satisfaction.toFixed(1)}%`;
        
        const tendance = data.tendance_satisfaction || 0;
        updateTrend(satisfactionTrendElement, tendance);
    }
}

// Mettre à jour les tendances
function updateTrend(element, tendance) {
    if (!element) return;
    
    if (tendance > 0) {
        element.className = 'kpi-trend positive';
        element.innerHTML = `<i class="fas fa-arrow-up"></i> +${tendance.toFixed(1)}%`;
    } else if (tendance < 0) {
        element.className = 'kpi-trend negative';
        element.innerHTML = `<i class="fas fa-arrow-down"></i> ${tendance.toFixed(1)}%`;
    } else {
        element.className = 'kpi-trend info';
        element.innerHTML = `<i class="fas fa-minus"></i> Stable`;
    }
}

// Initialiser les graphiques
function initializeCharts() {
    console.log('📊 Initialisation des graphiques équipe...');
    
    // Graphique de performance d'équipe
    const performanceCtx = document.getElementById('teamPerformanceChart');
    if (performanceCtx) {
        teamPerformanceChart = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heures Facturables',
                    data: [],
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Heures Non Facturables',
                    data: [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Graphique de répartition par équipe
    const distributionCtx = document.getElementById('teamDistributionChart');
    if (distributionCtx) {
        teamDistributionChart = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Équipe A', 'Équipe B', 'Équipe C', 'Équipe D'],
                datasets: [{
                    data: [30, 25, 25, 20],
                    backgroundColor: [
                        '#4facfe',
                        '#00f2fe',
                        '#667eea',
                        '#764ba2'
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
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

// Mettre à jour les graphiques avec les données
function updateCharts(data) {
    console.log('📊 Mise à jour des graphiques équipe:', data);
    
    // Mettre à jour le graphique de performance
    if (teamPerformanceChart && data.performance_equipe) {
        teamPerformanceChart.data.labels = data.performance_equipe.labels;
        teamPerformanceChart.data.datasets[0].data = data.performance_equipe.facturables;
        teamPerformanceChart.data.datasets[1].data = data.performance_equipe.non_facturables;
        teamPerformanceChart.update();
    }
    
    // Mettre à jour le graphique de répartition
    if (teamDistributionChart && data.repartition_equipes) {
        teamDistributionChart.data.labels = data.repartition_equipes.labels;
        teamDistributionChart.data.datasets[0].data = data.repartition_equipes.data;
        teamDistributionChart.update();
    }
}

// Charger les membres d'équipe
async function loadTeamMembers() {
    try {
        const params = new URLSearchParams({
            team: currentFilters.team,
            business_unit: currentFilters.businessUnit
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/teams/members?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayTeamMembers(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des membres d\'équipe:', error);
    }
}

// Afficher les membres d'équipe
function displayTeamMembers(members) {
    const container = document.getElementById('team-members-list');
    if (!container) return;
    
    if (!members || members.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucun membre d\'équipe trouvé</p>';
        return;
    }
    
    const membersHTML = members.map(member => {
        const performanceClass = getPerformanceClass(member.performance);
        const performanceIndicator = getPerformanceIndicator(member.performance);
        
        return `
            <div class="team-member-card ${performanceClass}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center">
                        <span class="performance-indicator ${performanceIndicator}"></span>
                        <h6 class="mb-0">${member.prenom} ${member.nom}</h6>
                    </div>
                    <span class="badge bg-${getGradeColor(member.grade)}">${member.grade}</span>
                </div>
                <p class="text-muted small mb-2">${member.poste || 'Poste non défini'}</p>
                <div class="row">
                    <div class="col-6">
                        <small class="text-muted">Heures: ${member.heures_mois}h</small>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">Facturation: ${member.taux_facturation}%</small>
                    </div>
                </div>
                <div class="progress progress-custom mt-2">
                    <div class="progress-bar bg-success" style="width: ${member.objectif_atteint}%"></div>
                </div>
                <small class="text-muted">Objectif: ${member.objectif_atteint}%</small>
            </div>
        `;
    }).join('');
    
    container.innerHTML = membersHTML;
}

// Charger les alertes équipe
async function loadTeamAlerts() {
    try {
        const params = new URLSearchParams({
            team: currentFilters.team,
            business_unit: currentFilters.businessUnit
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/teams/alerts?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayTeamAlerts(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des alertes équipe:', error);
    }
}

// Afficher les alertes équipe
function displayTeamAlerts(alerts) {
    const container = document.getElementById('team-alerts-list');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucune alerte</p>';
        return;
    }
    
    const alertsHTML = alerts.map(alert => {
        const alertClass = alert.type === 'URGENT' ? 'alert-card' : 
                          alert.type === 'SUCCESS' ? 'success-card' : 'info-card';
        
        return `
            <div class="${alertClass}">
                <div class="d-flex align-items-center">
                    <i class="fas fa-${getAlertIcon(alert.type)} me-3"></i>
                    <div>
                        <strong>${alert.titre}</strong>
                        <p class="mb-0 small">${alert.message}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertsHTML;
}

// Charger les missions actives
async function loadActiveMissions() {
    try {
        const params = new URLSearchParams({
            team: currentFilters.team,
            business_unit: currentFilters.businessUnit
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/teams/active-missions?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayActiveMissions(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des missions actives:', error);
    }
}

// Afficher les missions actives
function displayActiveMissions(missions) {
    const container = document.getElementById('active-missions-list');
    if (!container) return;
    
    if (!missions || missions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucune mission active</p>';
        return;
    }
    
    const missionsHTML = missions.map(mission => {
        const progress = (mission.progression || 0);
        const priorityClass = mission.priorite === 'URGENTE' ? 'danger' : 
                            mission.priorite === 'HAUTE' ? 'warning' : 'primary';
        
        return `
            <div class="team-member-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${mission.titre}</h6>
                    <span class="badge bg-${priorityClass}">${mission.priorite}</span>
                </div>
                <p class="text-muted small mb-2">${mission.client_nom || 'Client non défini'}</p>
                <div class="progress progress-custom mb-2">
                    <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Progression: ${progress}%</small>
                    <small class="text-muted">Fin: ${formatDate(mission.date_fin_prevue)}</small>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = missionsHTML;
}

// Mettre à jour les objectifs d'équipe
function updateTeamObjectives(data) {
    console.log('🎯 Mise à jour des objectifs équipe:', data);
    
    // Objectif heures
    if (data.objectif_heures) {
        const progress = (data.heures_actuelles / data.objectif_heures.cible) * 100;
        const progressElement = document.getElementById('objectif-heures-progress');
        const actuelElement = document.getElementById('objectif-heures-actuel');
        const cibleElement = document.getElementById('objectif-heures-cible');
        
        if (progressElement) progressElement.style.width = `${Math.min(progress, 100)}%`;
        if (actuelElement) actuelElement.textContent = data.heures_actuelles || 0;
        if (cibleElement) cibleElement.textContent = data.objectif_heures.cible || 0;
    }
    
    // Objectif facturation
    if (data.objectif_facturation) {
        const progress = (data.facturation_actuelle / data.objectif_facturation.cible) * 100;
        const progressElement = document.getElementById('objectif-facturation-progress');
        const actuelElement = document.getElementById('objectif-facturation-actuel');
        const cibleElement = document.getElementById('objectif-facturation-cible');
        
        if (progressElement) progressElement.style.width = `${Math.min(progress, 100)}%`;
        if (actuelElement) actuelElement.textContent = data.facturation_actuelle || 0;
        if (cibleElement) cibleElement.textContent = data.objectif_facturation.cible || 0;
    }
}

// Mettre à jour les informations superviseur
function updateSupervisorInfo() {
    const supervisorElement = document.getElementById('supervisor-name');
    if (supervisorElement) {
        const user = getCurrentUser();
        if (user) {
            supervisorElement.textContent = `${user.prenom} ${user.nom}`;
        }
    }
}

// Fonctions utilitaires
function getPerformanceClass(performance) {
    if (performance >= 90) return '';
    if (performance >= 75) return 'warning';
    return 'danger';
}

function getPerformanceIndicator(performance) {
    if (performance >= 90) return 'performance-excellent';
    if (performance >= 75) return 'performance-good';
    if (performance >= 60) return 'performance-average';
    return 'performance-poor';
}

function getGradeColor(grade) {
    switch (grade) {
        case 'PARTNER': return 'danger';
        case 'DIRECTOR': return 'warning';
        case 'MANAGER': return 'info';
        case 'SENIOR': return 'primary';
        case 'ASSISTANT': return 'secondary';
        default: return 'secondary';
    }
}

function getAlertIcon(type) {
    switch (type) {
        case 'URGENT': return 'exclamation-triangle';
        case 'SUCCESS': return 'check-circle';
        case 'INFO': return 'info-circle';
        default: return 'bell';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
}

// Fonction pour rafraîchir le dashboard
function refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard équipe...');
    loadDashboardData();
    loadTeamMembers();
    loadTeamAlerts();
    loadActiveMissions();
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Exposer les fonctions globalement pour le débogage
window.dashboardEquipe = {
    refreshDashboard,
    loadDashboardData,
    updateKPIs,
    updateCharts,
    currentFilters
};

