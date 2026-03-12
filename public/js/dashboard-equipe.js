// Dashboard Équipe - Scripts
const API_BASE_URL = '/api/analytics/team';
let currentTeamType = null;
let currentTeamId = null;
let availableTeams = null;
let membersChart, evolutionChart, chargeabiliteChart;

// Fonction d'authentification
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}` };
}

async function authenticatedFetch(url) {
    return fetch(url, { headers: getAuthHeader() });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Initialisation Dashboard Équipe');

    // Event listeners
    const teamTypeSelect = document.getElementById('team-type-select');
    if (teamTypeSelect) {
        teamTypeSelect.addEventListener('change', onTeamTypeChange);
    }

    const teamInstanceSelect = document.getElementById('team-instance-select');
    if (teamInstanceSelect) {
        teamInstanceSelect.addEventListener('change', onTeamInstanceChange);
    }

    const periodSelect = document.getElementById('period-select');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadTeamData);
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTeamData);
    }

    // Initialiser les graphiques
    initializeCharts();

    // Initialiser le sélecteur d'année fiscale
    if (typeof FiscalYearSelector !== 'undefined' && document.getElementById('fiscalYearFilter')) {
        FiscalYearSelector.init('fiscalYearFilter', async (fyId) => {
            console.log('📅 Changement d\'année fiscale:', fyId);
            // Rafraîchir d'abord la liste des équipes disponibles (les missions changent selon l'année)
            await loadAvailableTeams(fyId);
        });
    } else {
        // Charger les équipes disponibles par défaut si pas de sélecteur
        await loadAvailableTeams();
    }
});

// Charger les équipes disponibles
async function loadAvailableTeams(fiscalYearId = null) {
    try {
        if (!fiscalYearId) {
            fiscalYearId = document.getElementById('fiscalYearFilter')?.value || '';
        }

        console.log(`📊 Chargement équipes disponibles (FY: ${fiscalYearId})...`);

        const params = new URLSearchParams();
        if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);

        const response = await authenticatedFetch(`${API_BASE_URL}/available?${params}`);

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des équipes');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erreur inconnue');
        }

        availableTeams = result.data;
        console.log('✅ Équipes disponibles:', availableTeams);

        // Peupler le sélecteur de type d'équipe
        populateTeamTypeSelector();

        // Sélectionner le premier type disponible
        if (availableTeams.available_team_types.length > 0) {
            const firstType = availableTeams.available_team_types[0];
            document.getElementById('team-type-select').value = firstType;
            await onTeamTypeChange();
        } else {
            showNoTeamsMessage();
        }

    } catch (error) {
        console.error('❌ Erreur chargement équipes:', error);
        showError('Impossible de charger les équipes disponibles');
    }
}

// Peupler le sélecteur de type d'équipe
function populateTeamTypeSelector() {
    const select = document.getElementById('team-type-select');
    if (!select) return;

    select.innerHTML = '';

    const types = availableTeams.available_team_types;
    const teams = availableTeams.teams;

    const typeLabels = {
        'mission': 'Équipes Mission',
        'bu': 'Business Unit',
        'division': 'Division',
        'supervision': 'Équipe de Supervision'
    };

    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;

        let count = 0;
        if (type === 'mission' && teams.mission) {
            count = teams.mission.length;
        } else if (type === 'bu' && teams.bu) {
            count = 1;
        } else if (type === 'division' && teams.division) {
            count = 1;
        } else if (type === 'supervision' && teams.supervision) {
            count = 1;
        }

        option.textContent = `${typeLabels[type]} (${count})`;
        select.appendChild(option);
    });
}

// Changement de type d'équipe
async function onTeamTypeChange() {
    const select = document.getElementById('team-type-select');
    const teamType = select.value;

    console.log('🔄 Changement type équipe:', teamType);

    currentTeamType = teamType;

    const instanceSelect = document.getElementById('team-instance-select');
    const instanceContainer = document.getElementById('team-instance-container');

    if (teamType === 'mission') {
        const missions = availableTeams.teams.mission || [];

        if (missions.length >= 1) {
            // Toujours afficher le sélecteur pour voir le nom de la mission
            instanceContainer.style.display = 'block';
            instanceSelect.innerHTML = '';

            missions.forEach(mission => {
                const option = document.createElement('option');
                option.value = mission.id;
                option.textContent = `${mission.nom} (${mission.role})`;
                instanceSelect.appendChild(option);
            });

            currentTeamId = missions[0].id;
        } else {
            instanceContainer.style.display = 'none';
            currentTeamId = null;
        }
    } else {
        // BU, Division, Supervision : pas de sélecteur d'instance
        instanceContainer.style.display = 'none';
        currentTeamId = null;
    }

    // Charger les données
    await loadTeamData();
}

// Changement d'instance d'équipe (pour missions multiples)
async function onTeamInstanceChange() {
    const select = document.getElementById('team-instance-select');
    currentTeamId = select.value;

    console.log('🔄 Changement instance équipe:', currentTeamId);

    await loadTeamData();
}

// Charger les données de l'équipe
async function loadTeamData() {
    try {
        const period = document.getElementById('period-select')?.value || 30;
        const fiscalYearId = document.getElementById('fiscalYearFilter')?.value || '';

        console.log(`📊 Chargement données équipe - Type: ${currentTeamType}, ID: ${currentTeamId}, ${fiscalYearId ? 'FY: ' + fiscalYearId : ''} période: ${period}j`);

        // Toujours envoyer les deux : fiscal_year_id (cadre) + period (sous-filtre dans l'année)
        const params = new URLSearchParams({ team_type: currentTeamType });
        if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);
        params.set('period', period);
        if (currentTeamId) params.set('team_id', currentTeamId);

        let url = `${API_BASE_URL}?${params}`;

        const response = await authenticatedFetch(url);

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des données');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erreur inconnue');
        }

        console.log('✅ Données équipe reçues:', result.data);

        // Mettre à jour l'interface
        updateKPIs(result.data.kpis);
        updateMembersTable(result.data.members);

        // Gestion des graphiques et des titres
        const leftChartTitle = document.querySelector('.chart-container:first-child .chart-title');
        const rightChartTitle = document.querySelectorAll('.chart-container')[1]?.querySelector('.chart-title');
        const evolutionCanvas = document.getElementById('evolutionChart');
        const chargeabiliteCanvas = document.getElementById('chargeabiliteChart');

        if (currentTeamType === 'mission') {
            // Mode Mission : Membres à gauche, Évolution à droite
            if (leftChartTitle) leftChartTitle.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Heures par membre';
            if (rightChartTitle) rightChartTitle.innerHTML = '<i class="fas fa-chart-line me-2"></i>Évolution temporelle';

            if (evolutionCanvas) evolutionCanvas.style.display = 'block';
            if (chargeabiliteCanvas) chargeabiliteCanvas.style.display = 'none';

            updateMembersChart(result.data.members);
            updateEvolutionChart(result.data.evolution || []);
        } else {
            // Mode BU/Division/Supervision : Chargeabilité ou Divisions
            if (evolutionCanvas) evolutionCanvas.style.display = 'none';
            if (chargeabiliteCanvas) chargeabiliteCanvas.style.display = 'block';

            if (currentTeamType === 'bu' && result.data.divisions) {
                if (leftChartTitle) leftChartTitle.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Heures par division';
                updateDivisionsChart(result.data.divisions);
            } else {
                if (leftChartTitle) leftChartTitle.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Heures par membre';
                updateMembersChart(result.data.members);
            }

            if (rightChartTitle) rightChartTitle.innerHTML = '<i class="fas fa-percentage me-2"></i>Taux de chargeabilité';
            updateChargeabiliteChart(result.data.members || []);
        }

    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        showError('Impossible de charger les données de l\'équipe');
    }
}

// Initialiser les graphiques
function initializeCharts() {
    // Graphique heures par membre
    const membersCtx = document.getElementById('membersChart');
    if (membersCtx) {
        membersChart = new Chart(membersCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heures totales',
                    data: [],
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
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

    // Graphique évolution temporelle
    const evolutionCtx = document.getElementById('evolutionChart');
    if (evolutionCtx) {
        evolutionChart = new Chart(evolutionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heures',
                    data: [],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
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

    // Graphique taux de chargeabilité
    const chargeabiliteCtx = document.getElementById('chargeabiliteChart');
    if (chargeabiliteCtx) {
        chargeabiliteChart = new Chart(chargeabiliteCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Taux chargeabilité (%)',
                    data: [],
                    backgroundColor: '#f39c12',
                    borderColor: '#e67e22',
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
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Mettre à jour les KPIs
function updateKPIs(kpis) {
    console.log('📈 Mise à jour KPIs:', kpis);

    const totalHeuresEl = document.getElementById('kpi-total-hours');
    if (totalHeuresEl) {
        totalHeuresEl.textContent = Math.round(kpis.total_heures || 0) + 'h';
    }

    const nbMembresEl = document.getElementById('kpi-members');
    if (nbMembresEl) {
        nbMembresEl.textContent = kpis.nb_membres || 0;
    }

    const missionsActivesEl = document.getElementById('kpi-active-missions');
    if (missionsActivesEl) {
        missionsActivesEl.textContent = kpis.missions_actives || 0;
    }

    // KPI spécifique selon le type d'équipe
    const kpi4El = document.getElementById('kpi-4-value');
    const kpi4LabelEl = document.getElementById('kpi-4-label');

    if (currentTeamType === 'mission') {
        if (kpi4LabelEl) kpi4LabelEl.textContent = 'Taux complétion';
        if (kpi4El) kpi4El.textContent = (kpis.taux_completion || 0) + '%';
    } else {
        if (kpi4LabelEl) kpi4LabelEl.textContent = 'Taux chargeabilité';
        if (kpi4El) kpi4El.textContent = (kpis.taux_chargeabilite || 0) + '%';
    }
}

// Mettre à jour le tableau des membres
function updateMembersTable(members) {
    console.log('📋 Mise à jour tableau membres:', members);

    const tbody = document.getElementById('members-table-body');
    if (!tbody) return;

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucun membre dans cette équipe</td></tr>';
        return;
    }

    const rows = members.map(member => {
        const nom = `${member.nom} ${member.prenom}`;
        const heures = Math.round(parseFloat(member.total_heures) || 0);
        const heuresFact = Math.round(parseFloat(member.heures_facturables) || 0);
        const taux = member.taux_chargeabilite || 0;
        const missions = member.missions_actives || member.nb_missions || 0;
        const taches = member.taches_en_cours || '-';

        const tauxClass = taux >= 80 ? 'success' : taux >= 60 ? 'warning' : 'danger';

        return `
            <tr>
                <td><strong>${nom}</strong></td>
                <td class="text-end">${heures}h</td>
                <td class="text-end">${heuresFact}h</td>
                <td class="text-end">
                    <span class="badge bg-${tauxClass}">${taux}%</span>
                </td>
                <td class="text-center">${missions}</td>
                <td class="text-center">${taches}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewMemberDetails(${member.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

// Mettre à jour le graphique des membres
function updateMembersChart(members) {
    if (!membersChart) return;

    const safeMembers = (members && members.length > 0) ? members : [];
    const labels = safeMembers.map(m => `${m.nom} ${m.prenom}`);
    const data = safeMembers.map(m => Math.round(parseFloat(m.total_heures) || 0));

    membersChart.data.labels = labels;
    membersChart.data.datasets[0].data = data;
    membersChart.data.datasets[0].label = 'Heures totales';
    membersChart.update();
}

// Mettre à jour le graphique d'évolution
function updateEvolutionChart(evolution) {
    if (!evolutionChart) return;

    const safeEvolution = (evolution && evolution.length > 0) ? evolution : [];
    const labels = safeEvolution.map(e => {
        const date = new Date(e.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
    const data = safeEvolution.map(e => parseFloat(e.heures) || 0);

    evolutionChart.data.labels = labels;
    evolutionChart.data.datasets[0].data = data;
    evolutionChart.update();
}

// Mettre à jour le graphique de chargeabilité
function updateChargeabiliteChart(members) {
    if (!chargeabiliteChart) return;

    const safeMembers = (members && members.length > 0) ? members : [];
    const labels = safeMembers.map(m => `${m.nom} ${m.prenom}`);
    const data = safeMembers.map(m => m.taux_chargeabilite || 0);

    chargeabiliteChart.data.labels = labels;
    chargeabiliteChart.data.datasets[0].data = data;
    chargeabiliteChart.update();
}

// Mettre à jour le graphique des divisions
function updateDivisionsChart(divisions) {
    if (!membersChart) return;

    const safeDivisions = (divisions && divisions.length > 0) ? divisions : [];
    const labels = safeDivisions.map(d => d.division_nom);
    const data = safeDivisions.map(d => Math.round(parseFloat(d.total_heures) || 0));

    membersChart.data.labels = labels;
    membersChart.data.datasets[0].data = data;
    membersChart.data.datasets[0].label = 'Heures par division';
    membersChart.update();
}

// Voir les détails d'un membre
function viewMemberDetails(memberId) {
    console.log('👤 Voir détails membre:', memberId);
    // TODO: Implémenter modal de détails
    alert(`Détails du membre ${memberId} - À implémenter`);
}

// Afficher un message si aucune équipe
function showNoTeamsMessage() {
    const container = document.querySelector('.main-content-area');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-info text-center mt-5">
                <i class="fas fa-info-circle fa-3x mb-3"></i>
                <h4>Aucune équipe disponible</h4>
                <p>Vous n'êtes actuellement responsable d'aucune équipe.</p>
            </div>
        `;
    }
}

// Afficher une erreur
function showError(message) {
    console.error('❌', message);
    // TODO: Afficher une notification d'erreur
}

// Exposer pour le débogage
window.dashboardEquipe = {
    loadAvailableTeams,
    loadTeamData,
    viewMemberDetails
};
