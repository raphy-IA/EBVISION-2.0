// Dashboard Équipe - EBVISION
// Gestion des indicateurs de performance collective avec autorisations managériales

const API_BASE_URL = '/api/analytics';

// Variables globales pour les graphiques
let teamPerformanceChart, teamDistributionChart, collabChart;

// Variables pour les filtres
let currentFilters = {
    period: 90,
    businessUnit: '',
    division: ''
};

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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initialisation du Dashboard Équipe...');
    await initializeDashboard();
});

// Fonction principale d'initialisation
async function initializeDashboard() {
    try {
        console.log('📊 Démarrage initialisation...');
        
        // 1. Charger les équipes gérées
        const response = await authenticatedFetch('/api/analytics/managed-teams');
        const result = await response.json();
        
        if (!result.success) {
            showError('Erreur d\'initialisation', 'Impossible de charger vos équipes');
            return;
        }
        
        const { business_units, divisions, is_manager } = result.data;
        
        console.log('✅ Équipes gérées:', { business_units, divisions, is_manager });
        
        // 2. Vérifier si l'utilisateur est un manager
        if (!is_manager) {
            showWarning(
                'Accès restreint',
                'Vous devez être responsable d\'une Business Unit ou Division pour accéder à ce dashboard.'
            );
            return;
        }
        
        // 3. Stocker les équipes gérées
        managedBusinessUnits = business_units;
        managedDivisions = divisions;
        
        // 4. Initialiser les graphiques
        initializeCharts();
        
        // 5. Peupler les filtres avec UNIQUEMENT les équipes gérées
        populateBusinessUnitFilter(business_units);
        populateDivisionFilter(divisions);
        
        // 6. Configurer les événements des filtres
        setupFilterListeners();
        
        // 7. Charger automatiquement la première équipe
        let initialBusinessUnit = null;
        let initialDivision = null;
        
        if (divisions.length > 0) {
            // Priorité aux divisions
            initialDivision = divisions[0].id;
            currentFilters.division = initialDivision;
            document.getElementById('division-filter').value = initialDivision;
        } else if (business_units.length > 0) {
            // Sinon, BU
            initialBusinessUnit = business_units[0].id;
            currentFilters.businessUnit = initialBusinessUnit;
            document.getElementById('business-unit-filter').value = initialBusinessUnit;
        }
        
        // 8. Charger les données
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

// Peupler le filtre Business Unit
function populateBusinessUnitFilter(businessUnits) {
    const select = document.getElementById('business-unit-filter');
    if (!select) return;
    
    // Vider le select (sauf l'option "Toutes")
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Ajouter les BU gérées
    businessUnits.forEach(bu => {
        const option = document.createElement('option');
        option.value = bu.id;
        option.textContent = bu.nom;
        select.appendChild(option);
    });
}

// Peupler le filtre Division
function populateDivisionFilter(divisions) {
    const select = document.getElementById('division-filter');
    if (!select) return;
    
    // Vider le select (sauf l'option "Toutes")
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Ajouter les divisions gérées
    divisions.forEach(div => {
        const option = document.createElement('option');
        option.value = div.id;
        option.textContent = div.nom;
        select.appendChild(option);
    });
}

// Configurer les événements des filtres
function setupFilterListeners() {
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            currentFilters.period = parseInt(this.value);
            refreshDashboard();
        });
    }
    
    const buFilter = document.getElementById('business-unit-filter');
    if (buFilter) {
        buFilter.addEventListener('change', function() {
            currentFilters.businessUnit = this.value;
            refreshDashboard();
        });
    }
    
    const divFilter = document.getElementById('division-filter');
    if (divFilter) {
        divFilter.addEventListener('change', function() {
            currentFilters.division = this.value;
            refreshDashboard();
        });
    }
}

// Charger les données principales du dashboard
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du dashboard équipe...');
        
        // Construire les paramètres de requête
        let queryParams = `period=${currentFilters.period}`;
        if (currentFilters.businessUnit) queryParams += `&businessUnit=${currentFilters.businessUnit}`;
        if (currentFilters.division) queryParams += `&division=${currentFilters.division}`;
        
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
        heuresElement.textContent = (data.total_heures || 0).toFixed(1) + 'h';
    }
    
    // Taux de chargeabilité
    const chargeabiliteElement = document.getElementById('taux-chargeabilite');
    if (chargeabiliteElement) {
        chargeabiliteElement.textContent = (data.taux_chargeabilite || 0).toFixed(1) + '%';
    }
    
    // Missions actives
    const missionsElement = document.getElementById('missions-actives');
    if (missionsElement) {
        missionsElement.textContent = data.missions_actives || 0;
    }
    
    // Heures facturables
    const facturablesElement = document.getElementById('heures-facturables');
    if (facturablesElement) {
        facturablesElement.textContent = (data.heures_facturables || 0).toFixed(1) + 'h';
    }
    
    // Heures non facturables
    const nonFacturablesElement = document.getElementById('heures-non-facturables');
    if (nonFacturablesElement) {
        nonFacturablesElement.textContent = (data.heures_non_facturables || 0).toFixed(1) + 'h';
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
        const chargeabilite = collab.taux_chargeabilite || 0;
        const badgeClass = chargeabilite >= 80 ? 'success' : chargeabilite >= 60 ? 'warning' : 'danger';
        
        return `
            <tr>
                <td>${collab.prenom} ${collab.nom}</td>
                <td>${collab.grade_nom || '-'}</td>
                <td class="text-end">${(collab.total_heures || 0).toFixed(1)}h</td>
                <td class="text-end">${(collab.heures_facturables || 0).toFixed(1)}h</td>
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
