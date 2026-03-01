// Dashboard Recouvrement - Scripts
const API_BASE_URL = '/api/analytics';
let agingChart, clientsChart;

// Devise par défaut pour le recouvrement
let financialDefaultCurrency = (typeof CURRENCY_CONFIG !== 'undefined' && CURRENCY_CONFIG.defaultCurrency)
    ? CURRENCY_CONFIG.defaultCurrency
    : 'XAF';

// Fonction d'authentification
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}` };
}

// Charger la configuration financière pour le dashboard recouvrement
async function loadFinancialSettingsForDashboardRecouvrement() {
    try {
        const response = await authenticatedFetch('/api/financial-settings');
        if (!response.ok) return;
        const result = await response.json();
        if (result.success && result.data) {
            financialDefaultCurrency = result.data.defaultCurrency || financialDefaultCurrency;
            if (typeof CURRENCY_CONFIG !== 'undefined') {
                CURRENCY_CONFIG.defaultCurrency = financialDefaultCurrency;
            }
        }
    } catch (error) {
        console.warn('Impossible de charger les paramètres financiers (recouvrement):', error);
    }
}

async function authenticatedFetch(url) {
    return fetch(url, { headers: getAuthHeader() });
}

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Initialisation Dashboard Recouvrement');

    // Event listeners pour les filtres
    const periodSelect = document.getElementById('period-select');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadData);
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }

    // Event listener pour la recherche
    const searchInput = document.getElementById('search-client');
    if (searchInput) {
        searchInput.addEventListener('input', filterClientsTable);
    }

    // Initialiser les graphiques
    initializeCharts();

    // Initialiser le sélecteur d'année fiscale puis charger les données
    const afterLoad = () => {
        if (typeof FiscalYearSelector !== 'undefined' && document.getElementById('fiscalYearFilter')) {
            FiscalYearSelector.init('fiscalYearFilter', () => loadData());
        } else {
            loadData();
        }
    };

    loadFinancialSettingsForDashboardRecouvrement()
        .catch(err => console.warn('Erreur chargement paramètres financiers (recouvrement):', err))
        .finally(afterLoad);
});

// Initialiser les graphiques
function initializeCharts() {
    // Graphique Aging
    const agingCtx = document.getElementById('agingChart');
    if (agingCtx) {
        agingChart = new Chart(agingCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#fd7e14',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.parsed);
                                return label + ': ' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Graphique Top Clients
    const clientsCtx = document.getElementById('clientsChart');
    if (clientsCtx) {
        clientsChart = new Chart(clientsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Montant en retard',
                    data: [],
                    backgroundColor: '#dc3545',
                    borderColor: '#c82333',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return formatCurrency(context.parsed.x);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Charger les données
async function loadData() {
    try {
        const period = document.getElementById('period-select')?.value || 90;
        const fiscalYearId = document.getElementById('fiscalYearFilter')?.value || '';

        // Toujours envoyer les deux : fiscal_year_id (cadre) + period (sous-filtre dans l'année)
        const params = new URLSearchParams();
        if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);
        params.set('period', period);

        const url = `${API_BASE_URL}/collections?${params}`;

        console.log(`📊 Chargement données recouvrement - ${fiscalYearId ? 'FY: ' + fiscalYearId + ' /' : ''} période: ${period}j`);

        const response = await authenticatedFetch(url);

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('✅ Données reçues:', result.data);
                updateKPIs(result.data.kpis);
                updateAgingChart(result.data.aging_analysis);
                updateClientsChart(result.data.top_clients_retard);
                updateClientsTable(result.data.top_clients_retard);
            }
        } else {
            console.error('❌ Erreur API:', response.status);
            showError('Erreur lors du chargement des données');
        }
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        showError('Erreur de connexion au serveur');
    }
}

// Mettre à jour les KPIs
function updateKPIs(kpis) {
    console.log('📈 Mise à jour KPIs:', kpis);

    // Facturé période
    const factureElement = document.getElementById('kpi-facture');
    if (factureElement) {
        factureElement.textContent = formatCurrency(kpis.facture_periode || 0);
    }

    // Encaissé période
    const encaisseElement = document.getElementById('kpi-encaisse');
    if (encaisseElement) {
        encaisseElement.textContent = formatCurrency(kpis.encaisse_periode || 0);
    }

    // DSO
    const dsoElement = document.getElementById('kpi-dso');
    if (dsoElement) {
        dsoElement.textContent = kpis.dso_moyen || 0;
    }

    // Montant en retard
    const retardElement = document.getElementById('kpi-retard');
    if (retardElement) {
        retardElement.textContent = formatCurrency(kpis.montant_retard || 0);
    }
}

// Mettre à jour le graphique aging
function updateAgingChart(aging) {
    console.log('📊 Mise à jour aging chart:', aging);

    if (!agingChart || !aging || aging.length === 0) {
        if (agingChart) {
            agingChart.data.labels = ['Aucune donnée'];
            agingChart.data.datasets[0].data = [1];
            agingChart.update();
        }
        return;
    }

    const labels = aging.map(a => a.tranche);
    const data = aging.map(a => parseFloat(a.montant_total) || 0);

    agingChart.data.labels = labels;
    agingChart.data.datasets[0].data = data;
    agingChart.update();
}

// Mettre à jour le graphique des top clients
function updateClientsChart(clients) {
    console.log('📊 Mise à jour clients chart:', clients);

    if (!clientsChart || !clients || clients.length === 0) {
        if (clientsChart) {
            clientsChart.data.labels = ['Aucune donnée'];
            clientsChart.data.datasets[0].data = [0];
            clientsChart.update();
        }
        return;
    }

    const labels = clients.map(c => c.client_sigle || c.client_nom || 'Non défini');
    const data = clients.map(c => parseFloat(c.montant_retard) || 0);

    clientsChart.data.labels = labels;
    clientsChart.data.datasets[0].data = data;
    clientsChart.update();
}

// Mettre à jour la table des clients
let allClientsData = [];

function updateClientsTable(clients) {
    console.log('📋 Mise à jour table clients:', clients);

    allClientsData = clients || [];
    renderClientsTable(allClientsData);
}

function renderClientsTable(clients) {
    const tbody = document.getElementById('clients-table');
    if (!tbody) return;

    if (!clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Aucun client en retard</td></tr>';
        return;
    }

    const rows = clients.map(client => {
        const retardMoyen = client.retard_moyen || 0;
        const badgeClass = retardMoyen > 90 ? 'danger' : retardMoyen > 60 ? 'warning' : 'info';
        const clientDisplay = client.client_sigle || client.client_nom || 'Non défini';

        return `
            <tr>
                <td><strong>${clientDisplay}</strong></td>
                <td class="text-end"><strong>${formatCurrency(client.montant_retard || 0)}</strong></td>
                <td class="text-end">
                    <span class="badge bg-${badgeClass}">${retardMoyen}j</span>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

function filterClientsTable() {
    const searchInput = document.getElementById('search-client');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
        renderClientsTable(allClientsData);
        return;
    }

    const filtered = allClientsData.filter(client => {
        const clientName = (client.client_nom || '').toLowerCase();
        const clientSigle = (client.client_sigle || '').toLowerCase();
        return clientName.includes(searchTerm) || clientSigle.includes(searchTerm);
    });

    renderClientsTable(filtered);
}

// Fonctions utilitaires
function formatCurrency(value, currencyCode) {
    const numeric = Number(value || 0);
    const code = currencyCode || financialDefaultCurrency || 'XAF';

    if (typeof CURRENCY_CONFIG !== 'undefined' && typeof CURRENCY_CONFIG.format === 'function') {
        return CURRENCY_CONFIG.format(numeric, code);
    }

    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numeric);
    } catch (e) {
        return `${numeric.toLocaleString('fr-FR')} ${code}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function showError(message) {
    console.error('❌', message);
    // TODO: Afficher une notification d'erreur à l'utilisateur
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(loadData, 5 * 60 * 1000);

// Exposer pour le débogage
window.dashboardRecouvrement = {
    loadData,
    updateKPIs,
    formatCurrency
};
