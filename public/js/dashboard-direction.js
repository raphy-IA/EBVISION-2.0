// Dashboard Direction - EBVISION
// Gestion des indicateurs stratégiques et de rentabilité

const API_BASE_URL = 'http://localhost:3000/api';

// Variables globales pour les graphiques
let financialChart, buDistributionChart;

// Variables pour les filtres
let currentFilters = {
    period: 90,
    businessUnit: '',
    year: 2024
};

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du Dashboard Direction...');
    
    // Vérifier l'authentification
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Vérifier les permissions de direction
    if (!hasDirectorRole()) {
        showError('Accès réservé à la direction');
        return;
    }
    
    // Initialiser les filtres
    initializeFilters();
    
    // Charger les données du dashboard
    loadDashboardData();
    
    // Initialiser les graphiques
    initializeCharts();
    
    // Charger les indicateurs financiers
    loadFinancialIndicators();
    
    // Charger les alertes stratégiques
    loadStrategicAlerts();
    
    // Charger le pipeline commercial
    loadPipelineSummary();
    
    // Mettre à jour les informations direction
    updateDirectorInfo();
});

// Vérifier si l'utilisateur a le rôle direction
function hasDirectorRole() {
    const user = getCurrentUser();
    return user && (user.role === 'DIRECTOR' || user.role === 'ADMIN' || user.role === 'PARTNER');
}

// Initialiser les filtres
function initializeFilters() {
    console.log('🔧 Initialisation des filtres direction...');
    
    // Charger les business units
    loadBusinessUnits();
    
    // Écouter les changements de filtres
    document.getElementById('period-filter').addEventListener('change', function() {
        currentFilters.period = parseInt(this.value);
        refreshDashboard();
    });
    
    document.getElementById('business-unit-filter').addEventListener('change', function() {
        currentFilters.businessUnit = this.value;
        refreshDashboard();
    });
    
    document.getElementById('year-filter').addEventListener('change', function() {
        currentFilters.year = parseInt(this.value);
        refreshDashboard();
    });
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
        console.log('📊 Chargement des données du dashboard direction...');
        
        // Construire les paramètres de requête
        const params = new URLSearchParams({
            period: currentFilters.period,
            business_unit: currentFilters.businessUnit,
            year: currentFilters.year
        });
        
        // Charger les statistiques stratégiques
        const statsResponse = await authenticatedFetch(`${API_BASE_URL}/analytics/strategic-stats?${params}`);
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateKPIs(statsData.data);
        }
        
        // Charger les données pour les graphiques
        const chartDataResponse = await authenticatedFetch(`${API_BASE_URL}/analytics/strategic-chart-data?${params}`);
        if (chartDataResponse.ok) {
            const chartData = await chartDataResponse.json();
            updateCharts(chartData.data);
        }
        
        // Charger les objectifs stratégiques
        const objectivesResponse = await authenticatedFetch(`${API_BASE_URL}/analytics/strategic-objectives?${params}`);
        if (objectivesResponse.ok) {
            const objectivesData = await objectivesResponse.json();
            updateStrategicObjectives(objectivesData.data);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données du dashboard');
    }
}

// Mettre à jour les KPIs
function updateKPIs(data) {
    console.log('📈 Mise à jour des KPIs direction:', data);
    
    // Chiffre d'affaires
    const caElement = document.getElementById('chiffre-affaires');
    const caTrendElement = document.getElementById('ca-trend');
    if (caElement && data.chiffre_affaires) {
        caElement.textContent = formatCurrency(data.chiffre_affaires);
        
        const tendance = data.tendance_ca || 0;
        updateTrend(caTrendElement, tendance);
    }
    
    // Marge brute
    const margeElement = document.getElementById('marge-brute');
    const margeTrendElement = document.getElementById('marge-trend');
    if (margeElement && data.marge_brute !== undefined) {
        margeElement.textContent = `${data.marge_brute.toFixed(1)}%`;
        
        const tendance = data.tendance_marge || 0;
        updateTrend(margeTrendElement, tendance);
    }
    
    // Taux de conversion
    const conversionElement = document.getElementById('taux-conversion');
    const conversionTrendElement = document.getElementById('conversion-trend');
    if (conversionElement && data.taux_conversion !== undefined) {
        conversionElement.textContent = `${data.taux_conversion.toFixed(1)}%`;
        
        const tendance = data.tendance_conversion || 0;
        updateTrend(conversionTrendElement, tendance);
    }
    
    // Satisfaction client
    const satisfactionElement = document.getElementById('satisfaction-client');
    const satisfactionTrendElement = document.getElementById('satisfaction-trend');
    if (satisfactionElement && data.satisfaction_client !== undefined) {
        satisfactionElement.textContent = `${data.satisfaction_client.toFixed(1)}%`;
        
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
    console.log('📊 Initialisation des graphiques direction...');
    
    // Graphique financier
    const financialCtx = document.getElementById('financialChart');
    if (financialCtx) {
        financialChart = new Chart(financialCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Chiffre d\'Affaires',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Marge Brute (%)',
                    data: [],
                    borderColor: '#51cf66',
                    backgroundColor: 'rgba(81, 207, 102, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
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
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Période'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Chiffre d\'Affaires (€)'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Marge (%)'
                        },
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }
    
    // Graphique de répartition par BU
    const buCtx = document.getElementById('buDistributionChart');
    if (buCtx) {
        buDistributionChart = new Chart(buCtx, {
            type: 'doughnut',
            data: {
                labels: ['BU Consulting', 'BU Audit', 'BU Formation', 'BU Développement'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c'
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
    console.log('📊 Mise à jour des graphiques direction:', data);
    
    // Mettre à jour le graphique financier
    if (financialChart && data.evolution) {
        financialChart.data.labels = data.evolution.map(item => item.mois);
        financialChart.data.datasets[0].data = data.evolution.map(item => item.ca);
        financialChart.data.datasets[1].data = data.evolution.map(item => item.marge);
        financialChart.update();
    }
    
    // Mettre à jour le graphique de répartition BU
    if (buDistributionChart && data.bu_repartition) {
        buDistributionChart.data.labels = data.bu_repartition.map(item => item.bu);
        buDistributionChart.data.datasets[0].data = data.bu_repartition.map(item => item.ca);
        buDistributionChart.update();
    }
}

// Charger les indicateurs financiers
async function loadFinancialIndicators() {
    try {
        const params = new URLSearchParams({
            period: currentFilters.period,
            business_unit: currentFilters.businessUnit,
            year: currentFilters.year
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/analytics/financial-indicators?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayFinancialIndicators(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des indicateurs financiers:', error);
    }
}

// Afficher les indicateurs financiers
function displayFinancialIndicators(indicators) {
    const container = document.getElementById('financial-indicators');
    if (!container) return;
    
    if (!indicators || indicators.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucun indicateur disponible</p>';
        return;
    }
    
    const indicatorsHTML = indicators.map(indicator => {
        const changeClass = indicator.positif ? 'positive' : 'negative';
        const changeIcon = indicator.positif ? 'arrow-up' : 'arrow-down';
        const value = indicator.unite === '€' ? formatCurrency(indicator.valeur) : `${indicator.valeur}${indicator.unite}`;
        
        return `
            <div class="financial-indicator">
                <span class="indicator-label">${indicator.label}</span>
                <div>
                    <span class="indicator-value">${value}</span>
                    <span class="indicator-change ${changeClass}">
                        <i class="fas fa-${changeIcon}"></i> ${Math.abs(indicator.tendance).toFixed(1)}%
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = indicatorsHTML;
}

// Charger les alertes stratégiques
async function loadStrategicAlerts() {
    try {
        const params = new URLSearchParams({
            business_unit: currentFilters.businessUnit,
            year: currentFilters.year
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/analytics/strategic-alerts?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayStrategicAlerts(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des alertes stratégiques:', error);
    }
}

// Afficher les alertes stratégiques
function displayStrategicAlerts(alerts) {
    const container = document.getElementById('strategic-alerts');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucune alerte stratégique</p>';
        return;
    }
    
    const alertsHTML = alerts.map(alert => {
        const alertClass = alert.type === 'danger' ? 'alert-card' : 
                          alert.type === 'success' ? 'success-card' : 'info-card';
        
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

// Charger le résumé du pipeline
async function loadPipelineSummary() {
    try {
        const params = new URLSearchParams({
            business_unit: currentFilters.businessUnit,
            year: currentFilters.year
        });
        
        const response = await authenticatedFetch(`${API_BASE_URL}/analytics/pipeline-summary?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayPipelineSummary(data.data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du pipeline:', error);
    }
}

// Afficher le résumé du pipeline
function displayPipelineSummary(pipeline) {
    const container = document.getElementById('pipeline-summary');
    if (!container) return;
    
    if (!pipeline) {
        container.innerHTML = '<p class="text-muted text-center">Aucune donnée disponible</p>';
        return;
    }
    
    const pipelineHTML = `
        <div class="row">
            <div class="col-6">
                <div class="text-center">
                    <h6>Opportunités</h6>
                    <div class="h4 text-primary">${pipeline.total_opportunites || 0}</div>
                </div>
            </div>
            <div class="col-6">
                <div class="text-center">
                    <h6>Valeur Pipeline</h6>
                    <div class="h4 text-success">${formatCurrency(pipeline.montant_total || 0)}</div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <h6>Répartition par Étape</h6>
            ${pipeline.repartition ? pipeline.repartition.map(etape => `
                <div class="progress progress-custom mb-2">
                    <div class="progress-bar" style="width: ${(etape.montant / pipeline.montant_total * 100).toFixed(1)}%; background-color: ${etape.couleur}"></div>
                </div>
                <small>${etape.etape}: ${etape.nombre} opp. (${formatCurrency(etape.montant)})</small>
            `).join('') : ''}
        </div>
    `;
    
    container.innerHTML = pipelineHTML;
}

// Mettre à jour les objectifs stratégiques
function updateStrategicObjectives(data) {
    console.log('🎯 Mise à jour des objectifs stratégiques:', data);
    
    // Productivité
    if (data.productivite) {
        const progress = (data.productivite.actuelle / data.productivite.cible) * 100;
        const progressElement = document.getElementById('productivite-progress');
        const actuelElement = document.getElementById('productivite-actuel');
        const cibleElement = document.getElementById('productivite-cible');
        
        if (progressElement) progressElement.style.width = `${Math.min(progress, 100)}%`;
        if (actuelElement) actuelElement.textContent = data.productivite.actuelle || 0;
        if (cibleElement) cibleElement.textContent = data.productivite.cible || 0;
    }
    
    // Rétention
    if (data.retention) {
        const progress = (data.retention.actuelle / data.retention.cible) * 100;
        const progressElement = document.getElementById('retention-progress');
        const actuelElement = document.getElementById('retention-actuel');
        const cibleElement = document.getElementById('retention-cible');
        
        if (progressElement) progressElement.style.width = `${Math.min(progress, 100)}%`;
        if (actuelElement) actuelElement.textContent = data.retention.actuelle || 0;
        if (cibleElement) cibleElement.textContent = data.retention.cible || 0;
    }
}

// Mettre à jour les informations direction
function updateDirectorInfo() {
    const directorElement = document.getElementById('director-name');
    if (directorElement) {
        const user = getCurrentUser();
        if (user) {
            directorElement.textContent = `${user.prenom} ${user.nom}`;
        }
    }
}

// Fonctions utilitaires
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function getAlertIcon(type) {
    switch (type) {
        case 'danger': return 'exclamation-triangle';
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'bell';
    }
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
    console.log('🔄 Rafraîchissement du dashboard direction...');
    loadDashboardData();
    loadFinancialIndicators();
    loadStrategicAlerts();
    loadPipelineSummary();
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Exposer les fonctions globalement pour le débogage
window.dashboardDirection = {
    refreshDashboard,
    loadDashboardData,
    updateKPIs,
    updateCharts,
    currentFilters
};

