// Dashboard Recouvrement - Scripts
const API_BASE_URL = '/api/analytics';
let agingChart, monthlyChart;

// Fonction d'authentification
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}` };
}

async function authenticatedFetch(url) {
    return fetch(url, { headers: getAuthHeader() });
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Initialiser les graphiques
    initializeCharts();
    
    // Charger les données
    loadData();
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
                    }
                }
            }
        });
    }
    
    // Graphique mensuel
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Facturé',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Encaissé',
                        data: [],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        borderWidth: 2,
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
                        ticks: {
                            callback: function(value) {
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
        
        console.log(`📊 Chargement données recouvrement (période: ${period} jours)`);
        
        const response = await authenticatedFetch(`${API_BASE_URL}/collections?period=${period}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('✅ Données reçues:', result.data);
                updateKPIs(result.data.kpis);
                updateAgingChart(result.data.aging_analysis);
                updateMonthlyChart(result.data.evolution_mensuelle);
                updateInvoicesTable(result.data.factures_retard);
            }
        } else {
            console.error('❌ Erreur API:', response.status);
        }
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
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
    
    if (!agingChart || !aging || aging.length === 0) return;
    
    const labels = aging.map(a => a.tranche);
    const data = aging.map(a => a.montant_total || 0);
    
    agingChart.data.labels = labels;
    agingChart.data.datasets[0].data = data;
    agingChart.update();
}

// Mettre à jour le graphique mensuel
function updateMonthlyChart(monthly) {
    console.log('📊 Mise à jour monthly chart:', monthly);
    
    if (!monthlyChart || !monthly || monthly.length === 0) return;
    
    const labels = monthly.map(m => {
        const date = new Date(m.mois);
        return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    });
    const facture = monthly.map(m => m.facture || 0);
    const encaisse = monthly.map(m => m.encaisse || 0);
    
    monthlyChart.data.labels = labels;
    monthlyChart.data.datasets[0].data = facture;
    monthlyChart.data.datasets[1].data = encaisse;
    monthlyChart.update();
}

// Mettre à jour la table des factures
function updateInvoicesTable(invoices) {
    console.log('📋 Mise à jour table factures:', invoices);
    
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune facture en retard</td></tr>';
        return;
    }
    
    const rows = invoices.map(invoice => {
        const joursRetard = invoice.jours_retard || 0;
        const badgeClass = joursRetard > 90 ? 'danger' : joursRetard > 60 ? 'warning' : 'info';
        
        return `
            <tr>
                <td>${invoice.numero_facture || '-'}</td>
                <td>${invoice.client_nom || 'Non défini'}</td>
                <td class="text-end">${formatCurrency(invoice.montant_total || 0)}</td>
                <td>${formatDate(invoice.date_echeance)}</td>
                <td class="text-center">
                    <span class="badge bg-${badgeClass}">${joursRetard}j</span>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

// Fonctions utilitaires
function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Rafraîchir automatiquement toutes les 5 minutes
setInterval(loadData, 5 * 60 * 1000);

// Exposer pour le débogage
window.dashboardRecouvrement = {
    loadData,
    updateKPIs
};
