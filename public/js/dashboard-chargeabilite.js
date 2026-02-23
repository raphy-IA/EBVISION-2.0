// Dashboard Chargeabilité - Scripts
const API_BASE_URL = '/api/analytics';
let stackedChart, rateChart;
let rows = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated || !isAuthenticated()) { window.location.href = 'login.html'; return; }
  document.getElementById('refresh-btn').addEventListener('click', loadAll);
  document.getElementById('period-select').addEventListener('change', loadAll);
  document.getElementById('scope-select').addEventListener('change', loadAll);
  initCharts();

  if (typeof FiscalYearSelector !== 'undefined' && document.getElementById('fiscalYearFilter')) {
    FiscalYearSelector.init('fiscalYearFilter', () => loadAll());
  } else {
    loadAll();
  }
});

async function loadAll() {
  const period = parseInt(document.getElementById('period-select').value);
  const scope = document.getElementById('scope-select').value;
  const fiscalYearId = document.getElementById('fiscalYearFilter')?.value || '';

  let url = `${API_BASE_URL}/utilization?scope=${encodeURIComponent(scope)}`;
  if (fiscalYearId) {
    url += `&fiscal_year_id=${fiscalYearId}`;
  } else {
    url += `&period=${period}`;
  }

  const res = await authenticatedFetch(url);
  const json = await res.json();
  if (!json.success) return;
  rows = json.data || [];
  updateCharts();
  renderTable();
}

function updateCharts() {
  const labels = rows.map(r => r.label);
  const hc = rows.map(r => Number(r.heures_hc || 0));
  const hnc = rows.map(r => Number(r.heures_hnc || 0));
  const rate = rows.map(r => {
    const total = Number(r.heures_hc || 0) + Number(r.heures_hnc || 0);
    return total > 0 ? Math.round((Number(r.heures_hc) / total) * 100) : 0;
  });

  stackedChart.data.labels = labels;
  stackedChart.data.datasets[0].data = hc;
  stackedChart.data.datasets[1].data = hnc;
  stackedChart.update();

  rateChart.data.labels = labels;
  rateChart.data.datasets[0].data = rate;
  rateChart.update();
}

function renderTable() {
  const tbody = document.getElementById('util-table');
  tbody.innerHTML = rows.map(r => {
    const total = Number(r.heures_hc || 0) + Number(r.heures_hnc || 0);
    const taux = total > 0 ? (Number(r.heures_hc) / total) * 100 : 0;
    return `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td class="text-end">${Number(r.heures_hc || 0).toFixed(1)}h</td>
        <td class="text-end">${Number(r.heures_hnc || 0).toFixed(1)}h</td>
        <td class="text-end">${Number(r.capacite_approx || 0).toFixed(0)}h</td>
        <td class="text-end">${taux.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');
}

function initCharts() {
  const sctx = document.getElementById('stackedChart');
  stackedChart = new Chart(sctx, {
    type: 'bar',
    data: {
      labels: [], datasets: [
        { label: 'HC', data: [], backgroundColor: '#0d6efd', stack: 'h' },
        { label: 'HNC', data: [], backgroundColor: '#adb5bd', stack: 'h' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
  });

  const rctx = document.getElementById('rateChart');
  rateChart = new Chart(rctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Taux HC (%)', data: [], backgroundColor: '#20c997' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }



