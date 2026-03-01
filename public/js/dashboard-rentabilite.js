// Dashboard Rentabilité - Scripts
const API_BASE_URL = '/api/analytics';
let missionsChart, clientsChart;
let financialDefaultCurrency = (typeof CURRENCY_CONFIG !== 'undefined' && CURRENCY_CONFIG.defaultCurrency)
  ? CURRENCY_CONFIG.defaultCurrency
  : 'XAF';
let missionsRows = [], clientsRows = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated || !isAuthenticated()) { window.location.href = 'login.html'; return; }

  document.getElementById('refresh-btn').addEventListener('click', loadAll);
  document.getElementById('period-select')?.addEventListener('change', loadAll);

  initCharts();

  const afterLoad = () => {
    if (typeof FiscalYearSelector !== 'undefined' && document.getElementById('fiscalYearFilter')) {
      // FiscalYearSelector auto-selects EN_COURS year — both fiscal_year_id and period are always sent
      FiscalYearSelector.init('fiscalYearFilter', () => loadAll());
    } else {
      loadAll();
    }
  };

  loadFinancialSettingsForDashboardRentabilite()
    .catch(err => console.warn('Erreur chargement paramètres financiers (rentabilite):', err))
    .finally(afterLoad);
});

async function loadAll() {
  const period = parseInt(document.getElementById('period-select')?.value || 180);
  const fiscalYearId = document.getElementById('fiscalYearFilter')?.value || '';

  // Toujours envoyer fiscal_year_id + period (la période est un sous-filtre dans l'année fiscale)
  const params = new URLSearchParams();
  if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);
  params.set('period', period);

  const [missions, clients] = await Promise.all([
    fetchJson(`${API_BASE_URL}/profitability-missions?${params}`),
    fetchJson(`${API_BASE_URL}/profitability-clients?${params}`)
  ]);
  missionsRows = (missions?.data) || [];
  clientsRows = (clients?.data) || [];
  updateCharts();
  renderTables();
}

function updateCharts() {
  const topMissions = missionsRows.slice(0, 10);
  const mLabels = topMissions.map(x => x.mission_nom);
  const mValues = topMissions.map(x => Number(x.marge || 0));
  updateBar(missionsChart, mLabels, mValues, 'Marge');

  const topClients = clientsRows.slice(0, 10);
  const cLabels = topClients.map(x => x.client_nom);
  const cValues = topClients.map(x => Number(x.marge || 0));
  updateBar(clientsChart, cLabels, cValues, 'Marge');
}

function renderTables() {
  const mBody = document.getElementById('missions-table');
  if (missionsRows.length === 0) {
    mBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><i class="fas fa-inbox me-2"></i>Aucune mission sur la période sélectionnée</td></tr>';
  } else {
    mBody.innerHTML = missionsRows.map(x => `
    <tr>
      <td>${escapeHtml(x.mission_nom)}</td>
      <td>${escapeHtml(x.client_nom || '-')}</td>
      <td class="text-end">${formatCurrency(x.facture || 0)}</td>
      <td class="text-end">${formatCurrency(x.cout_charge || 0)}</td>
      <td class="text-end ${Number(x.marge) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(x.marge || 0)}</td>
    </tr>
  `).join('');
  }

  const cBody = document.getElementById('clients-table');
  if (clientsRows.length === 0) {
    cBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3"><i class="fas fa-inbox me-2"></i>Aucun client avec des missions sur la période sélectionnée</td></tr>';
  } else {
    cBody.innerHTML = clientsRows.map(x => `
    <tr>
      <td>${escapeHtml(x.client_nom)}</td>
      <td class="text-end">${formatCurrency(x.facture || 0)}</td>
      <td class="text-end">${formatCurrency(x.cout_charge || 0)}</td>
      <td class="text-end ${Number(x.marge) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(x.marge || 0)}</td>
    </tr>
  `).join('');
  }
}

function initCharts() {
  const mc = document.getElementById('missionsChart');
  missionsChart = new Chart(mc, {
    type: 'bar', data: { labels: [], datasets: [{ label: '', data: [], backgroundColor: '#20c997' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  const cc = document.getElementById('clientsChart');
  clientsChart = new Chart(cc, {
    type: 'bar', data: { labels: [], datasets: [{ label: '', data: [], backgroundColor: '#6f42c1' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function updateBar(chart, labels, values, label) { chart.data.labels = labels; chart.data.datasets[0].data = values; chart.data.datasets[0].label = label; chart.update(); }
async function fetchJson(url) {
  try {
    const r = await authenticatedFetch(url);
    if (!r.ok) {
      console.error('Erreur API rentabilite:', url, r.status, await r.text());
      return null;
    }
    return r.json();
  } catch (e) {
    console.error('fetchJson erreur:', url, e);
    return null;
  }
}
async function loadFinancialSettingsForDashboardRentabilite() {
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
    console.warn('Impossible de charger les paramètres financiers (rentabilite):', error);
  }
}

function formatCurrency(amount, currencyCode) {
  const numeric = Number(amount || 0);
  const code = currencyCode || financialDefaultCurrency || 'XAF';
  if (typeof CURRENCY_CONFIG !== 'undefined' && typeof CURRENCY_CONFIG.format === 'function') {
    return CURRENCY_CONFIG.format(numeric, code);
  }
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(numeric);
  } catch (e) {
    return `${numeric} ${code}`;
  }
}
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }



