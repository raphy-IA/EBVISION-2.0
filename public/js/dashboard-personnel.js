// Dashboard Personnel - EBVISION
// Gestion des indicateurs personnels et graphiques

const API_BASE_URL = '/api/analytics';

// Variables globales pour les graphiques
let hoursChart, typeChart;

// Variables pour les filtres
let currentPeriod = 30;

// Fonction d'authentification
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}` };
}

async function authenticatedFetch(url) {
    return fetch(url, { headers: getAuthHeader() });
}

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du Dashboard Personnel...');
    
    // Charger les données du dashboard
    loadDashboardData();
    
    // Initialiser les graphiques
    initializeCharts();
    
    // Écouter les changements de période
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            currentPeriod = parseInt(this.value);
            refreshDashboard();
        });
    }
});

// Charger les données principales du dashboard
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du dashboard personnel...');
        
        // Supprimer les alertes d'erreur existantes
        const existingAlerts = document.querySelectorAll('.alert-danger');
        existingAlerts.forEach(alert => alert.remove());
        
        // Construire les paramètres de requête
        const queryParams = `period=${currentPeriod}`;
        
        // Charger les statistiques personnelles
        const response = await authenticatedFetch(`${API_BASE_URL}/personal-performance?${queryParams}`);
        
        if (!response.ok) {
            console.error('❌ Erreur API:', response.status);
            showError(
                'Erreur de chargement',
                `Impossible de charger vos données personnelles (Erreur ${response.status}). Veuillez réessayer ou contacter le support.`
            );
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ Réponse API sans succès:', result);
            showError(
                'Erreur de données',
                result.error || 'Les données n\'ont pas pu être récupérées correctement.'
            );
            return;
        }
        
        console.log('✅ Données reçues:', result.data);
        updateUserInfo(result.data.profil);
        updateKPIs(result.data.kpis);
        updateMissionsActives(result.data.missions_actives);
        updateTimelineChart(result.data.evolution_temporelle);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError(
            'Erreur technique',
            'Une erreur technique est survenue. Veuillez rafraîchir la page ou contacter le support si le problème persiste.'
        );
    }
}

// Afficher un message d'erreur visible à l'utilisateur
function showError(title, message) {
    const mainContent = document.querySelector('.main-content-area');
    if (!mainContent) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show mb-4';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>${title}</strong><br>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
        <hr class="mt-2 mb-2">
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-danger" onclick="window.location.reload()">
                <i class="fas fa-sync-alt me-1"></i> Rafraîchir la page
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.alert').remove()">
                <i class="fas fa-times me-1"></i> Fermer
            </button>
        </div>
    `;
    
    // Insérer l'alerte en haut du contenu
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Auto-scroll vers l'alerte
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Mettre à jour les informations utilisateur
function updateUserInfo(profil) {
    console.log('👤 Mise à jour profil:', profil);
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${profil.prenom} ${profil.nom}`;
    }
    
    const gradeElement = document.getElementById('user-grade');
    if (gradeElement) {
        gradeElement.textContent = profil.grade || 'Non défini';
    }
    
    const divisionElement = document.getElementById('user-division');
    if (divisionElement) {
        divisionElement.textContent = profil.division || 'Non définie';
    }
    
    const buElement = document.getElementById('user-bu');
    if (buElement) {
        buElement.textContent = profil.business_unit || 'Non définie';
    }
}

// Mettre à jour les KPIs
function updateKPIs(data) {
    console.log('📈 Mise à jour des KPIs:', data);
    
    // Total heures
    const heuresElement = document.getElementById('total-heures');
    if (heuresElement) {
        heuresElement.textContent = (data.total_heures || 0).toFixed(1) + 'h';
    }
    
    // Heures facturables
    const facturablesElement = document.getElementById('heures-facturables');
    if (facturablesElement) {
        facturablesElement.textContent = (data.heures_facturables || 0).toFixed(1) + 'h';
    }
    
    // Taux de chargeabilité
    const chargeabiliteElement = document.getElementById('taux-chargeabilite');
    if (chargeabiliteElement) {
        chargeabiliteElement.textContent = (data.taux_chargeabilite || 0).toFixed(1) + '%';
    }
    
    // Missions travaillées
    const missionsElement = document.getElementById('missions-travaillees');
    if (missionsElement) {
        missionsElement.textContent = data.missions_travaillees || 0;
    }
    
    // Temps validés
    const validesElement = document.getElementById('temps-valides');
    if (validesElement) {
        validesElement.textContent = data.temps_valides || 0;
    }
    
    // Temps en attente
    const attenteElement = document.getElementById('temps-en-attente');
    if (attenteElement) {
        attenteElement.textContent = data.temps_en_attente || 0;
    }
}

// Initialiser les graphiques
function initializeCharts() {
    console.log('📊 Initialisation des graphiques...');
    
    // Graphique d'évolution temporelle
    const timelineCtx = document.getElementById('timelineChart');
    if (timelineCtx) {
        hoursChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Heures Totales',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Heures Facturables',
                        data: [],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        borderWidth: 3,
                        fill: true,
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
    
    // Graphique de répartition
    const typeCtx = document.getElementById('typeChart');
    if (typeCtx) {
        typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Heures Facturables', 'Heures Non Facturables'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        '#27ae60',
                        '#f39c12'
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

// Mettre à jour le graphique de timeline
function updateTimelineChart(evolution) {
    console.log('📊 Mise à jour timeline:', evolution);
    
    // Vérifier si les graphiques existent
    if (!hoursChart) {
        console.warn('⚠️ Graphique timeline non initialisé');
        return;
    }
    
    // Gérer le cas où il n'y a pas de données
    if (!evolution || evolution.length === 0) {
        console.log('📊 Aucune donnée temporelle, affichage du message');
        showEmptyChartMessage('timelineChart', 'Aucune saisie de temps pour la période sélectionnée', 'Commencez à saisir vos heures pour voir vos statistiques');
        showEmptyChartMessage('typeChart', 'Aucune donnée disponible', 'Les heures saisies apparaîtront ici');
        return;
    }
    
    // Masquer les messages vides si présents
    hideEmptyChartMessages();
    
    const labels = evolution.map(e => {
        const date = new Date(e.jour);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
    const totalHeures = evolution.map(e => e.total_heures || 0);
    const heuresFacturables = evolution.map(e => e.heures_facturables || 0);
    
    hoursChart.data.labels = labels;
    hoursChart.data.datasets[0].data = totalHeures;
    hoursChart.data.datasets[1].data = heuresFacturables;
    hoursChart.update();
    
    // Mettre à jour le graphique de type
    if (typeChart && totalHeures.length > 0) {
        const totalFact = heuresFacturables.reduce((a, b) => a + b, 0);
        const totalNonFact = totalHeures.reduce((a, b) => a + b, 0) - totalFact;
        
        typeChart.data.datasets[0].data = [totalFact, totalNonFact];
        typeChart.update();
    }
}

// Afficher un message pour graphique vide
function showEmptyChartMessage(chartId, title, subtitle) {
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;
    
    const chartContainer = chartCanvas.closest('.chart-container');
    if (!chartContainer) return;
    
    // Masquer le canvas
    chartCanvas.style.display = 'none';
    
    // Vérifier si un message existe déjà
    let emptyMessage = chartContainer.querySelector('.empty-chart-message');
    if (emptyMessage) return; // Message déjà affiché
    
    // Créer le message
    emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-chart-message text-center text-muted py-5';
    emptyMessage.innerHTML = `
        <i class="fas fa-chart-line fa-3x mb-3 opacity-50"></i>
        <p class="fw-bold mb-1">${title}</p>
        <small class="text-muted">${subtitle}</small>
    `;
    
    chartContainer.appendChild(emptyMessage);
}

// Masquer les messages de graphiques vides
function hideEmptyChartMessages() {
    const emptyMessages = document.querySelectorAll('.empty-chart-message');
    emptyMessages.forEach(msg => msg.remove());
    
    // Réafficher les canvas
    const chartCanvases = document.querySelectorAll('canvas[id$="Chart"]');
    chartCanvases.forEach(canvas => canvas.style.display = 'block');
}

// Mettre à jour les missions actives
function updateMissionsActives(missions) {
    console.log('📋 Mise à jour missions actives:', missions);
    
    const tbody = document.getElementById('missions-tbody');
    if (!tbody) return;
    
    if (!missions || missions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune mission active</td></tr>';
        return;
    }
    
    const rows = missions.map(mission => {
        const statut = mission.statut || 'EN_COURS';
        const statutBadge = statut === 'EN_COURS' ? 'primary' : 'warning';
        
        return `
            <tr>
                <td>${mission.mission_nom || 'Sans nom'}</td>
                <td>${mission.client_nom || 'Non défini'}</td>
                <td class="text-center">
                    <span class="badge bg-${statutBadge}">${statut}</span>
                </td>
                <td class="text-end">${(mission.heures_passees || 0).toFixed(1)}h</td>
                <td>${formatDate(mission.date_fin)}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

// Fonctions utilitaires
function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Fonction pour rafraîchir les données
function refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard...');
    loadDashboardData();
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Exposer les fonctions globalement pour le débogage
window.dashboardPersonnel = {
    refreshDashboard,
    loadDashboardData,
    updateKPIs,
    currentPeriod
};
