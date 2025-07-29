// Variables globales
let charts = {};
let analyticsData = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadFormData();
    loadAnalytics();
    setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    document.getElementById('periodFilter').addEventListener('change', loadAnalytics);
    document.getElementById('businessUnitFilter').addEventListener('change', loadAnalytics);
    document.getElementById('opportunityTypeFilter').addEventListener('change', loadAnalytics);
    document.getElementById('collaborateurFilter').addEventListener('change', loadAnalytics);
}

// Chargement des données pour les filtres
async function loadFormData() {
    try {
        const response = await fetch('/api/opportunities/form-data', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const formData = result.data;
            
            // Remplir les filtres
            populateFilter('businessUnitFilter', formData.businessUnits, 'nom');
            populateFilter('opportunityTypeFilter', formData.opportunityTypes, 'nom');
            populateFilter('collaborateurFilter', formData.collaborateurs, 'nom');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Remplir un filtre
function populateFilter(filterId, data, labelField) {
    const select = document.getElementById(filterId);
    if (!select) return;
    
    // Garder l'option "Tous"
    const allOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (allOption) select.appendChild(allOption);
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item[labelField];
        select.appendChild(option);
    });
}

// Chargement des analytics
async function loadAnalytics() {
    try {
        const params = new URLSearchParams({
            period: document.getElementById('periodFilter').value,
            business_unit_id: document.getElementById('businessUnitFilter').value,
            opportunity_type_id: document.getElementById('opportunityTypeFilter').value,
            collaborateur_id: document.getElementById('collaborateurFilter').value
        });
        
        const response = await fetch(`/api/analytics/opportunities?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            analyticsData = result.data;
            
            updateKPIs();
            updateCharts();
            updateDetailedMetrics();
            loadOverdueStages();
            loadRiskyOpportunities();
        } else {
            throw new Error('Erreur lors du chargement des analytics');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des analytics', 'danger');
    }
}

// Mise à jour des KPIs
function updateKPIs() {
    const data = analyticsData.kpis || {};
    
    // Taux de conversion
    document.getElementById('conversionRate').textContent = `${(data.conversion_rate || 0).toFixed(1)}%`;
    updateTrend('conversionTrend', data.conversion_trend || 0);
    
    // CA total
    document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue || 0);
    updateTrend('revenueTrend', data.revenue_trend || 0);
    
    // Durée moyenne
    document.getElementById('avgDuration').textContent = `${Math.round(data.avg_duration || 0)} jours`;
    updateTrend('durationTrend', data.duration_trend || 0);
    
    // Opportunités actives
    document.getElementById('activeOpportunities').textContent = data.active_opportunities || 0;
    updateTrend('activeTrend', data.active_trend || 0);
}

// Mise à jour des tendances
function updateTrend(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const icon = trend > 0 ? 'bi-arrow-up' : trend < 0 ? 'bi-arrow-down' : 'bi-dash';
    const className = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';
    const sign = trend > 0 ? '+' : '';
    
    element.innerHTML = `<i class="bi ${icon}"></i> ${sign}${Math.abs(trend).toFixed(1)}%`;
    element.className = className;
}

// Mise à jour des graphiques
function updateCharts() {
    updateOpportunitiesChart();
    updateStatusChart();
    updateBusinessUnitChart();
    updateCollaborateursChart();
}

// Graphique d'évolution des opportunités
function updateOpportunitiesChart() {
    const data = analyticsData.opportunities_timeline || [];
    
    const ctx = document.getElementById('opportunitiesChart');
    if (!ctx) return;
    
    if (charts.opportunities) {
        charts.opportunities.destroy();
    }
    
    charts.opportunities = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => formatDate(item.date)),
            datasets: [
                {
                    label: 'Nouvelles opportunités',
                    data: data.map(item => item.new_opportunities),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Opportunités gagnées',
                    data: data.map(item => item.won_opportunities),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }
            ]
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
                    beginAtZero: true
                }
            }
        }
    });
}

// Graphique de répartition par statut
function updateStatusChart() {
    const data = analyticsData.status_distribution || [];
    
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    if (charts.status) {
        charts.status.destroy();
    }
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.status),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#dc3545',
                    '#ffc107',
                    '#6c757d'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Graphique de performance par business unit
function updateBusinessUnitChart() {
    const data = analyticsData.business_unit_performance || [];
    
    const ctx = document.getElementById('businessUnitChart');
    if (!ctx) return;
    
    if (charts.businessUnit) {
        charts.businessUnit.destroy();
    }
    
    charts.businessUnit = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.business_unit_name),
            datasets: [{
                label: 'CA (€)',
                data: data.map(item => item.revenue),
                backgroundColor: 'rgba(54, 162, 235, 0.8)'
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
                    beginAtZero: true
                }
            }
        }
    });
}

// Graphique des top collaborateurs
function updateCollaborateursChart() {
    const data = analyticsData.top_collaborateurs || [];
    
    const ctx = document.getElementById('collaborateursChart');
    if (!ctx) return;
    
    if (charts.collaborateurs) {
        charts.collaborateurs.destroy();
    }
    
    charts.collaborateurs = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: data.map(item => item.collaborateur_name),
            datasets: [{
                label: 'Opportunités gagnées',
                data: data.map(item => item.won_opportunities),
                backgroundColor: 'rgba(40, 167, 69, 0.8)'
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
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Mise à jour des métriques détaillées
function updateDetailedMetrics() {
    const data = analyticsData.detailed_metrics || {};
    
    document.getElementById('totalOpportunities').textContent = data.total_opportunities || 0;
    document.getElementById('wonOpportunities').textContent = data.won_opportunities || 0;
    document.getElementById('lostOpportunities').textContent = data.lost_opportunities || 0;
    document.getElementById('avgProbability').textContent = `${(data.avg_probability || 0).toFixed(1)}%`;
}

// Chargement des étapes en retard
async function loadOverdueStages() {
    try {
        const response = await fetch('/api/analytics/overdue-stages', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            displayOverdueStages(result.data.overdue_stages || []);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des étapes en retard:', error);
    }
}

// Affichage des étapes en retard
function displayOverdueStages(stages) {
    const container = document.getElementById('overdueStagesList');
    
    if (stages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-check-circle fs-1"></i>
                <p class="mt-2">Aucune étape en retard</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = stages.map(stage => `
        <div class="d-flex align-items-center mb-2 p-2 border rounded">
            <span class="risk-indicator risk-${stage.risk_level.toLowerCase()}"></span>
            <div class="flex-grow-1">
                <div class="fw-bold">${stage.stage_name}</div>
                <small class="text-muted">
                    ${stage.opportunity_name} • ${stage.days_overdue} jours de retard
                </small>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="viewOpportunity('${stage.opportunity_id}')">
                Voir
            </button>
        </div>
    `).join('');
}

// Chargement des opportunités à risque
async function loadRiskyOpportunities() {
    try {
        const response = await fetch('/api/analytics/risky-opportunities', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            displayRiskyOpportunities(result.data.risky_opportunities || []);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des opportunités à risque:', error);
    }
}

// Affichage des opportunités à risque
function displayRiskyOpportunities(opportunities) {
    const container = document.getElementById('riskyOpportunitiesList');
    
    if (opportunities.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-shield-check fs-1"></i>
                <p class="mt-2">Aucune opportunité à risque</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = opportunities.map(opp => `
        <div class="d-flex align-items-center mb-2 p-2 border rounded">
            <span class="risk-indicator risk-${opp.risk_level.toLowerCase()}"></span>
            <div class="flex-grow-1">
                <div class="fw-bold">${opp.nom}</div>
                <small class="text-muted">
                    ${opp.business_unit_nom} • ${opp.probabilite}% de probabilité
                </small>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="viewOpportunity('${opp.id}')">
                Voir
            </button>
        </div>
    `).join('');
}

// Actualiser les données
function refreshData() {
    loadAnalytics();
}

// Exporter les données
function exportData() {
    // TODO: Implémenter l'export des données
    showAlert('Fonctionnalité d\'export en cours de développement', 'info');
}

// Voir une opportunité
function viewOpportunity(opportunityId) {
    window.location.href = `/opportunity-details.html?id=${opportunityId}`;
}

// Utilitaires
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
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
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Exposer les fonctions globalement
window.refreshData = refreshData;
window.exportData = exportData;
window.viewOpportunity = viewOpportunity; 