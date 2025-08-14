// Dashboard Personnel - EBVISION
// Gestion des indicateurs personnels et graphiques

const API_BASE_URL = 'http://localhost:3000/api';

// Variables globales pour les graphiques
let hoursChart, typeChart;

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du Dashboard Personnel...');
    
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Charger les données du dashboard
    loadDashboardData();
    
    // Initialiser les graphiques
    initializeCharts();
    
    // Charger les missions actives
    loadActiveMissions();
    
    // Charger les alertes
    loadAlerts();
    
    // Mettre à jour les informations utilisateur
    updateUserInfo();
});

// Charger les données principales du dashboard
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du dashboard...');
        
        // Récupérer l'ID de l'utilisateur connecté
        const userId = getCurrentUserId();
        if (!userId) {
            console.error('❌ ID utilisateur non trouvé');
            return;
        }
        
        // Charger les statistiques personnelles
        const statsResponse = await authenticatedFetch(`${API_BASE_URL}/time-entries/personal-stats/${userId}`);
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateKPIs(statsData.data);
        }
        
        // Charger les données pour les graphiques
        const chartDataResponse = await authenticatedFetch(`${API_BASE_URL}/time-entries/personal-chart-data/${userId}`);
        if (chartDataResponse.ok) {
            const chartData = await chartDataResponse.json();
            updateCharts(chartData.data);
        }
        
        // Charger les objectifs
        const objectivesResponse = await authenticatedFetch(`${API_BASE_URL}/users/objectives/${userId}`);
        if (objectivesResponse.ok) {
            const objectivesData = await objectivesResponse.json();
            updateObjectives(objectivesData.data);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données du dashboard');
    }
}

// Mettre à jour les KPIs
function updateKPIs(data) {
    console.log('📈 Mise à jour des KPIs:', data);
    
    // Heures saisies
    const heuresElement = document.getElementById('heures-saisies');
    const heuresTrendElement = document.getElementById('heures-trend');
    if (heuresElement && data.heures_mois) {
        heuresElement.textContent = `${data.heures_mois}h`;
        
        // Calculer la tendance
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
    
    // Missions actives
    const missionsElement = document.getElementById('missions-actives');
    const missionsTrendElement = document.getElementById('missions-trend');
    if (missionsElement && data.missions_actives !== undefined) {
        missionsElement.textContent = data.missions_actives;
        
        const tendance = data.tendance_missions || 0;
        updateTrend(missionsTrendElement, tendance);
    }
    
    // Objectif mensuel
    const objectifElement = document.getElementById('objectif-atteint');
    const objectifTrendElement = document.getElementById('objectif-trend');
    if (objectifElement && data.objectif_atteint !== undefined) {
        objectifElement.textContent = `${data.objectif_atteint.toFixed(1)}%`;
        
        const tendance = data.tendance_objectif || 0;
        updateTrend(objectifTrendElement, tendance);
    }
}

// Mettre à jour les tendances
function updateTrend(element, tendance) {
    if (!element) return;
    
    const icon = element.querySelector('i');
    const text = element.textContent.split(' ').slice(1).join(' ');
    
    if (tendance > 0) {
        element.className = 'kpi-trend positive';
        icon.className = 'fas fa-arrow-up';
        element.innerHTML = `<i class="fas fa-arrow-up"></i> +${tendance.toFixed(1)}%`;
    } else if (tendance < 0) {
        element.className = 'kpi-trend negative';
        icon.className = 'fas fa-arrow-down';
        element.innerHTML = `<i class="fas fa-arrow-down"></i> ${tendance.toFixed(1)}%`;
    } else {
        element.className = 'kpi-trend info';
        icon.className = 'fas fa-minus';
        element.innerHTML = `<i class="fas fa-minus"></i> Stable`;
    }
}

// Initialiser les graphiques
function initializeCharts() {
    console.log('📊 Initialisation des graphiques...');
    
    // Graphique des heures
    const hoursCtx = document.getElementById('hoursChart');
    if (hoursCtx) {
        hoursChart = new Chart(hoursCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heures Saisies',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                        display: false
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
    
    // Graphique des types
    const typeCtx = document.getElementById('typeChart');
    if (typeCtx) {
        typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Missions', 'Formation', 'Administration', 'Autres'],
                datasets: [{
                    data: [65, 15, 12, 8],
                    backgroundColor: [
                        '#667eea',
                        '#51cf66',
                        '#ffc107',
                        '#6c757d'
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
    console.log('📊 Mise à jour des graphiques:', data);
    
    // Mettre à jour le graphique des heures
    if (hoursChart && data.evolution && Array.isArray(data.evolution) && data.evolution.length > 0) {
        const labels = data.evolution.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        });
        const values = data.evolution.map(item => item.heures);
        
        hoursChart.data.labels = labels;
        hoursChart.data.datasets[0].data = values;
        hoursChart.update();
    } else if (hoursChart) {
        // Si pas de données, afficher un message
        hoursChart.data.labels = ['Aucune donnée'];
        hoursChart.data.datasets[0].data = [0];
        hoursChart.update();
    }
    
    // Mettre à jour le graphique des types
    if (typeChart && data.repartition && Array.isArray(data.repartition) && data.repartition.length > 0) {
        const labels = data.repartition.map(item => {
            switch(item.type) {
                case 'HC': return 'Heures Client';
                case 'HNC': return 'Heures Non Client';
                case 'FORMATION': return 'Formation';
                case 'ADMIN': return 'Administration';
                default: return item.type;
            }
        });
        const values = data.repartition.map(item => item.heures);
        
        // Mettre à jour les couleurs en fonction du nombre de types
        const colors = [
            '#667eea', // Bleu pour HC
            '#51cf66', // Vert pour HNC
            '#ffc107', // Jaune pour Formation
            '#6c757d', // Gris pour Administration
            '#dc3545', // Rouge pour autres
            '#fd7e14', // Orange
            '#6f42c1', // Violet
            '#20c997'  // Teal
        ];
        
        typeChart.data.labels = labels;
        typeChart.data.datasets[0].data = values;
        typeChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
        typeChart.update();
    } else if (typeChart) {
        // Si pas de données, afficher un message
        typeChart.data.labels = ['Aucune donnée'];
        typeChart.data.datasets[0].data = [1];
        typeChart.data.datasets[0].backgroundColor = ['#6c757d'];
        typeChart.update();
    }
}

// Charger les missions actives
async function loadActiveMissions() {
    try {
        const userId = getCurrentUserId();
        const response = await authenticatedFetch(`${API_BASE_URL}/missions/active/${userId}`);
        
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
    const container = document.getElementById('missions-list');
    if (!container) return;
    
    if (!missions || missions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucune mission active</p>';
        return;
    }
    
    const missionsHTML = missions.map(mission => {
        const progress = (mission.progression || 0);
        const priorityClass = mission.priorite === 'URGENTE' ? 'urgent' : 
                            mission.priorite === 'HAUTE' ? 'warning' : '';
        
        return `
            <div class="mission-card ${priorityClass}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${mission.titre}</h6>
                    <span class="badge bg-${getPriorityColor(mission.priorite)}">${mission.priorite}</span>
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

// Charger les alertes
async function loadAlerts() {
    try {
        const userId = getCurrentUserId();
        const response = await authenticatedFetch(`${API_BASE_URL}/users/alerts/${userId}`);
        
        if (response.ok) {
            const data = await response.json();
            displayAlerts(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des alertes:', error);
    }
}

// Afficher les alertes
function displayAlerts(alerts) {
    const container = document.getElementById('alerts-list');
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

// Mettre à jour les objectifs
function updateObjectives(data) {
    console.log('🎯 Mise à jour des objectifs:', data);
    
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
    
    // Objectif qualité
    if (data.objectif_qualite) {
        const progress = (data.qualite_actuelle / data.objectif_qualite.cible) * 100;
        const progressElement = document.getElementById('objectif-qualite-progress');
        const actuelElement = document.getElementById('objectif-qualite-actuel');
        const cibleElement = document.getElementById('objectif-qualite-cible');
        
        if (progressElement) progressElement.style.width = `${Math.min(progress, 100)}%`;
        if (actuelElement) actuelElement.textContent = data.qualite_actuelle || 0;
        if (cibleElement) cibleElement.textContent = data.objectif_qualite.cible || 0;
    }
}

// Mettre à jour les informations utilisateur
function updateUserInfo() {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        const user = getCurrentUser();
        if (user) {
            userNameElement.textContent = `${user.prenom} ${user.nom}`;
        }
    }
}

// Fonctions utilitaires
function getPriorityColor(priority) {
    switch (priority) {
        case 'URGENTE': return 'danger';
        case 'HAUTE': return 'warning';
        case 'NORMALE': return 'primary';
        case 'BASSE': return 'secondary';
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
    // Créer une alerte d'erreur
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insérer au début du contenu principal
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
}

// Fonction pour rafraîchir les données
function refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard...');
    loadDashboardData();
    loadActiveMissions();
    loadAlerts();
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Exposer les fonctions globalement pour le débogage
window.dashboardPersonnel = {
    refreshDashboard,
    loadDashboardData,
    updateKPIs,
    updateCharts
};

