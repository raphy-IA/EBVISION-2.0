// Dashboard Rentabilité - Scripts
const API_BASE_URL = '/api/analytics';
let missionsChart, clientsChart;
let missionsRows = [], clientsRows = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated || !isAuthenticated()) { window.location.href = 'login.html'; return; }
  document.getElementById('refresh-btn').addEventListener('click', loadAll);
  document.getElementById('period-select').addEventListener('change', loadAll);
  initCharts();
  loadAll();
});

async function loadAll(){
  const period = parseInt(document.getElementById('period-select').value);
  const [missions, clients] = await Promise.all([
    fetchJson(`${API_BASE_URL}/profitability-missions?period=${period}`),
    fetchJson(`${API_BASE_URL}/profitability-clients?period=${period}`)
  ]);
  missionsRows = (missions?.data)||[];
  clientsRows = (clients?.data)||[];
  updateCharts();
  renderTables();
}

function updateCharts(){
  const topMissions = missionsRows.slice(0,10);
  const mLabels = topMissions.map(x => x.mission_nom);
  const mValues = topMissions.map(x => Number(x.marge||0));
  updateBar(missionsChart, mLabels, mValues, 'Marge (€)');

  const topClients = clientsRows.slice(0,10);
  const cLabels = topClients.map(x => x.client_nom);
  const cValues = topClients.map(x => Number(x.marge||0));
  updateBar(clientsChart, cLabels, cValues, 'Marge (€)');
}

function renderTables(){
  const mBody = document.getElementById('missions-table');
  mBody.innerHTML = missionsRows.map(x => `
    <tr>
      <td>${escapeHtml(x.mission_nom)}</td>
      <td>${escapeHtml(x.client_nom||'-')}</td>
      <td class="text-end">${formatCurrency(x.facture||0)}</td>
      <td class="text-end">${formatCurrency(x.cout_charge||0)}</td>
      <td class="text-end">${formatCurrency(x.marge||0)}</td>
    </tr>
  `).join('');

  const cBody = document.getElementById('clients-table');
  cBody.innerHTML = clientsRows.map(x => `
    <tr>
      <td>${escapeHtml(x.client_nom)}</td>
      <td class="text-end">${formatCurrency(x.facture||0)}</td>
      <td class="text-end">${formatCurrency(x.cout_charge||0)}</td>
      <td class="text-end">${formatCurrency(x.marge||0)}</td>
    </tr>
  `).join('');
}

function initCharts(){
  const mc = document.getElementById('missionsChart');
  missionsChart = new Chart(mc, {
    type: 'bar', data: {labels:[], datasets:[{label:'', data:[], backgroundColor:'#20c997'}]},
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
  const cc = document.getElementById('clientsChart');
  clientsChart = new Chart(cc, {
    type: 'bar', data: {labels:[], datasets:[{label:'', data:[], backgroundColor:'#6f42c1'}]},
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
}

function updateBar(chart, labels, values, label){ chart.data.labels=labels; chart.data.datasets[0].data=values; chart.data.datasets[0].label=label; chart.update(); }
async function fetchJson(url){ const r = await authenticatedFetch(url); return r.ok ? r.json() : null; }
function formatCurrency(amount){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(amount||0)); }
function escapeHtml(s){return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}



