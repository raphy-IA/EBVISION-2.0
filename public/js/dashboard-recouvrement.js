// Dashboard Recouvrement - Scripts
const API_BASE_URL = '/api/analytics';
let agingChart, clientsChart;
let clientsData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated || !isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('refresh-btn').addEventListener('click', loadAll);
  document.getElementById('period-select').addEventListener('change', loadAll);
  document.getElementById('search-client').addEventListener('input', renderClientsTable);
  initCharts();
  loadAll();
});

async function loadAll() {
  const period = parseInt(document.getElementById('period-select').value);
  await Promise.all([
    loadCollectionsStats(period),
    loadAging(),
    loadClients()
  ]);
}

async function loadCollectionsStats(period) {
  const res = await authenticatedFetch(`${API_BASE_URL}/collections-stats?period=${period}`);
  const json = await res.json();
  if (!json.success) return;
  const data = json.data;
  setText('kpi-facture', formatCurrency(data.total_facture || 0));
  setText('kpi-encaisse', formatCurrency(data.total_encaisse || 0));
  setText('kpi-dso', Math.max(0, Math.round(data.dso_estime || 0)).toString());
}

async function loadAging() {
  const res = await authenticatedFetch(`${API_BASE_URL}/ar-aging`);
  const json = await res.json();
  if (!json.success) return;
  const d = json.data || {};
  const labels = ['Non échu', '0-30', '31-60', '61-90', '>90'];
  const values = [d.amt_not_due, d.amt_0_30, d.amt_31_60, d.amt_61_90, d.amt_90_plus].map(x => Number(x || 0));
  const totalRetard = (Number(d.amt_0_30||0)+Number(d.amt_31_60||0)+Number(d.amt_61_90||0)+Number(d.amt_90_plus||0));
  setText('kpi-retard', formatCurrency(totalRetard));
  updateDoughnut(agingChart, labels, values);
}

async function loadClients() {
  const res = await authenticatedFetch(`${API_BASE_URL}/collections-by-client`);
  const json = await res.json();
  if (!json.success) return;
  clientsData = json.data || [];
  renderClientsTable();
  const labels = clientsData.slice(0, 10).map(c => c.client_nom);
  const values = clientsData.slice(0, 10).map(c => Number(c.montant_restant || 0));
  updateBar(clientsChart, labels, values, 'Montant en retard (€)');
}

function renderClientsTable() {
  const q = (document.getElementById('search-client').value || '').toLowerCase();
  const rows = clientsData
    .filter(c => !q || (c.client_nom||'').toLowerCase().includes(q))
    .map(c => `
      <tr>
        <td>${escapeHtml(c.client_nom)}</td>
        <td class="text-end">${formatCurrency(c.montant_restant || 0)}</td>
        <td class="text-end">${c.max_retard || 0}</td>
      </tr>
    `).join('');
  document.getElementById('clients-table').innerHTML = rows || '<tr><td colspan="3" class="text-center text-muted">Aucun client</td></tr>';
}

function initCharts() {
  const agingCtx = document.getElementById('agingChart');
  agingChart = new Chart(agingCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#6c757d','#ffc107','#fd7e14','#dc3545','#6f42c1'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const clientsCtx = document.getElementById('clientsChart');
  clientsChart = new Chart(clientsCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: '', data: [], backgroundColor: '#0d6efd' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function updateDoughnut(chart, labels, values) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.update();
}

function updateBar(chart, labels, values, label) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.data.datasets[0].label = label;
  chart.update();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function formatCurrency(amount) { return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(amount||0)); }
function escapeHtml(s){return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}



