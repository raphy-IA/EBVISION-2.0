// Validation des feuilles de temps
let allTimeSheets = [];
let currentFilter = 'all';
let currentTimeSheet = null;
let currentAction = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page de validation des feuilles de temps');
    initializePage();
});

async function initializePage() {
    try {
        // Vérifier l'authentification
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Charger les données
        await loadTimeSheets();
        
        // Initialiser les événements
        initializeEvents();
        
        console.log('✅ Page de validation des feuilles de temps initialisée');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showAlert('Erreur lors de l\'initialisation de la page', 'danger');
    }
}

async function loadTimeSheets() {
    try {
        console.log('📊 Chargement des feuilles de temps...');
        
        // Par défaut, charger seulement les feuilles soumises (pending)
        const response = await fetch('/api/time-sheet-approvals/pending', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allTimeSheets = data.data || [];
        
        console.log(`✅ ${allTimeSheets.length} feuilles de temps chargées`);
        
        // Charger les entrées de temps pour chaque feuille
        for (let sheet of allTimeSheets) {
            try {
                const entriesResponse = await fetch(`/api/time-entries?time_sheet_id=${sheet.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (entriesResponse.ok) {
                    const entriesData = await entriesResponse.json();
                    sheet.timeEntries = entriesData.data || [];
                    console.log(`📊 ${sheet.timeEntries.length} entrées chargées pour la feuille ${sheet.id}`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors du chargement des entrées pour la feuille ${sheet.id}:`, error);
                sheet.timeEntries = [];
            }
        }
        
        // Charger et afficher le filtre par collaborateur
        await loadCollaborateurFilter();
        
        // Afficher les feuilles de temps
        displayTimeSheets();
        
        // Mettre à jour les statistiques
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des feuilles de temps:', error);
        showAlert('Erreur lors du chargement des feuilles de temps', 'danger');
    }
}

async function loadCollaborateurFilter() {
    try {
        // Extraire la liste unique des collaborateurs
        const collaborateurs = [...new Set(allTimeSheets.map(sheet => sheet.collaborateur_email))];
        
        const filterContainer = document.getElementById('collaborateur-filter-container');
        if (filterContainer) {
            filterContainer.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-4">
                        <label for="collaborateur-filter" class="form-label">
                            <i class="fas fa-filter"></i> Filtrer par collaborateur
                        </label>
                        <select id="collaborateur-filter" class="form-select" onchange="filterByCollaborateur()">
                            <option value="all">Tous les collaborateurs</option>
                            ${collaborateurs.map(email => {
                                const sheet = allTimeSheets.find(s => s.collaborateur_email === email);
                                return `<option value="${email}">${sheet.collaborateur_prenom} ${sheet.collaborateur_nom}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="col-md-8 d-flex align-items-end">
                        <div class="stats-summary">
                            <span class="badge bg-primary me-2">
                                <i class="fas fa-clock"></i> ${allTimeSheets.length} feuilles en attente
                            </span>
                            <span class="badge bg-info me-2">
                                <i class="fas fa-users"></i> ${collaborateurs.length} collaborateurs
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du filtre collaborateur:', error);
    }
}

function filterByCollaborateur() {
    displayTimeSheets();
    updateStats();
}

function displayTimeSheets() {
    const container = document.getElementById('time-sheets-container');
    
    // Filtrer les feuilles selon le filtre actuel
    let filteredSheets = allTimeSheets;
    if (currentFilter !== 'all') {
        filteredSheets = allTimeSheets.filter(sheet => sheet.status === currentFilter);
    }
    
    // Filtrer par collaborateur si un filtre est sélectionné
    const collaborateurFilter = document.getElementById('collaborateur-filter')?.value;
    if (collaborateurFilter && collaborateurFilter !== 'all') {
        filteredSheets = filteredSheets.filter(sheet => 
            sheet.collaborateur_email === collaborateurFilter
        );
    }
    
    if (filteredSheets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h4>Aucune feuille de temps</h4>
                <p class="text-muted">
                    ${currentFilter === 'all' ? 'Aucune feuille de temps à valider' : 
                      currentFilter === 'submitted' ? 'Aucune feuille en attente de validation' :
                      currentFilter === 'approved' ? 'Aucune feuille approuvée' :
                      'Aucune feuille rejetée'}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSheets.map(sheet => {
        const statusClass = `status-${sheet.status}`;
        const statusText = getStatusText(sheet.status);
        
        // Générer l'historique des approbations
        let approvalsHistory = '';
        if (sheet.approvals_history && sheet.approvals_history.length > 0) {
            approvalsHistory = `
                <div class="approval-history mt-2">
                    <h6><i class="fas fa-history"></i> Historique des validations</h6>
                    ${sheet.approvals_history.map(approval => `
                        <div class="approval-entry">
                            <span class="approval-action ${approval.action === 'approve' ? 'text-success' : 'text-danger'}">
                                <i class="fas fa-${approval.action === 'approve' ? 'check' : 'times'}"></i>
                                ${approval.action === 'approve' ? 'Approuvé' : 'Rejeté'} par ${approval.approver_prenom} ${approval.approver_nom}
                            </span>
                            <small class="text-muted">${formatDateTime(approval.created_at)}</small>
                            ${approval.comment ? `<div class="approval-comment"><small>"${approval.comment}"</small></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return `
            <div class="approval-card">
                <div class="approval-header">
                    <div class="collaborateur-info">
                        <h5><i class="fas fa-user"></i> ${sheet.collaborateur_prenom} ${sheet.collaborateur_nom}</h5>
                        <p class="text-muted mb-0">
                            <i class="fas fa-envelope"></i> ${sheet.collaborateur_email}
                        </p>
                    </div>
                    <div class="week-info">
                        <h6>Semaine du ${formatDate(sheet.week_start)} au ${formatDate(sheet.week_end)}</h6>
                        <small class="text-muted">Soumise le ${formatDateTime(sheet.created_at)}</small>
                    </div>
                    <div class="approval-actions">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewTimeSheetDetails('${sheet.id}')">
                            <i class="fas fa-eye"></i> Voir feuille complète
                        </button>
                    </div>
                </div>
                
                <div class="time-entries-summary">
                    <h6><i class="fas fa-clock"></i> Résumé des heures</h6>
                    <div class="entry-row">
                        <span>Heures chargeables</span>
                        <span class="total-hours">${getTotalHours(sheet, 'chargeable')}h</span>
                    </div>
                    <div class="entry-row">
                        <span>Heures non-chargeables</span>
                        <span class="total-hours">${getTotalHours(sheet, 'non-chargeable')}h</span>
                    </div>
                    <div class="entry-row">
                        <strong>Total</strong>
                        <strong class="total-hours">${getTotalHours(sheet, 'all')}h</strong>
                    </div>
                </div>
                
                ${approvalsHistory}
            </div>
        `;
    }).join('');
}

function getStatusText(status) {
    switch (status) {
        case 'submitted': return 'En attente';
        case 'approved': return 'Approuvée';
        case 'rejected': return 'Rejetée';
        default: return 'Brouillon';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTotalHours(sheet, type) {
    // Récupérer les vraies données depuis les entrées de temps
    if (!sheet.timeEntries) {
        return type === 'chargeable' ? '0' : type === 'non-chargeable' ? '0' : '0';
    }
    
    const entries = sheet.timeEntries;
    
    if (type === 'chargeable') {
        return entries
            .filter(entry => entry.type_heures === 'HC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else if (type === 'non-chargeable') {
        return entries
            .filter(entry => entry.type_heures === 'HNC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else {
        return entries
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    }
}

function generateTimeSheetRows(weekStart, weekEnd, timeEntries) {
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    
    let rows = '';
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateString = currentDate.toISOString().split('T')[0];
        const dayName = weekDays[i];
        
        // Trouver les entrées pour ce jour
        const dayEntries = timeEntries.filter(entry => {
            const entryDate = new Date(entry.date_saisie);
            return entryDate.toISOString().split('T')[0] === dateString;
        });
        
        // Calculer les heures pour ce jour
        const chargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'HC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const nonChargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'HNC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const totalDayHours = chargeableHours + nonChargeableHours;
        
        rows += `
            <tr>
                <td><strong>${dayName}</strong><br><small class="text-muted">${formatDate(dateString)}</small></td>
                <td class="text-center">${chargeableHours > 0 ? chargeableHours + 'h' : '-'}</td>
                <td class="text-center">${nonChargeableHours > 0 ? nonChargeableHours + 'h' : '-'}</td>
                <td class="text-center"><strong>${totalDayHours > 0 ? totalDayHours + 'h' : '-'}</strong></td>
            </tr>
        `;
    }
    
    return rows;
}

function calculateTotalHours(timeEntries, type) {
    if (type === 'all') {
        return timeEntries.reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0).toFixed(2);
    } else if (type === 'chargeable') {
        return timeEntries
            .filter(entry => entry.type_heures === 'HC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else if (type === 'non-chargeable') {
        return timeEntries
            .filter(entry => entry.type_heures === 'HNC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    }
    return '0.00';
}

function generateChargeableEntriesTable(timeEntries, weekStart) {
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const startDate = new Date(weekStart);
    
    // Générer les dates pour chaque jour de la semaine avec abréviations
    const weekDates = weekDays.map((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return {
            day: day.substring(0, 3) + '.', // Abréviation: Lun., Mar., etc.
            date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        };
    });
    
    // Grouper les entrées par mission et tâche
    const groupedEntries = {};
    
    console.log('🔍 generateChargeableEntriesTable - Debug:');
    console.log('  - timeEntries.length:', timeEntries.length);
    console.log('  - weekStart:', weekStart);
    console.log('  - startDate:', startDate);
    
    timeEntries
        .filter(entry => entry.type_heures === 'HC')
        .forEach(entry => {
            const key = `${entry.mission_id || 'N/A'}-${entry.task_id || 'N/A'}`;
            if (!groupedEntries[key]) {
                groupedEntries[key] = {
                    mission: entry.mission_nom || 'Mission non spécifiée',
                    tache: entry.task_nom || 'Tâche non spécifiée',
                    days: {}
                };
            }
            
            const entryDate = new Date(entry.date_saisie);
            const dayIndex = Math.floor((entryDate - startDate) / (1000 * 60 * 60 * 24));
            
            console.log(`  - Entry: ${entry.date_saisie} -> dayIndex: ${dayIndex}, dayKey: ${weekDays[dayIndex]}, heures: ${entry.heures}`);
            
            if (dayIndex >= 0 && dayIndex < 7) {
                const dayKey = weekDays[dayIndex];
                if (!groupedEntries[key].days[dayKey]) {
                    groupedEntries[key].days[dayKey] = 0;
                }
                groupedEntries[key].days[dayKey] += parseFloat(entry.heures) || 0;
            }
        });
    
    if (Object.keys(groupedEntries).length === 0) {
        return `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures chargeables pour cette semaine
                </td>
            </tr>
        `;
    }
    
    return Object.values(groupedEntries).map(entry => {
        const total = Object.values(entry.days).reduce((sum, hours) => sum + hours, 0);
        
        return `
            <tr>
                <td><strong>${entry.mission}</strong></td>
                <td>${entry.tache}</td>
                ${weekDates.map((dayInfo, index) => {
                    // Utiliser le nom complet du jour (Lundi, Mardi, etc.) au lieu de l'abréviation
                    const fullDayName = weekDays[index];
                    const hours = entry.days[fullDayName] || 0;
                    return `<td class="text-center">${hours > 0 ? hours.toFixed(1) + 'h' : '-'}</td>`;
                }).join('')}
                <td class="text-center"><strong>${total.toFixed(1)}h</strong></td>
            </tr>
        `;
    }).join('');
}

function generateNonChargeableEntriesTable(timeEntries, weekStart) {
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const startDate = new Date(weekStart);
    
    // Générer les dates pour chaque jour de la semaine avec abréviations
    const weekDates = weekDays.map((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return {
            day: day.substring(0, 3) + '.', // Abréviation: Lun., Mar., etc.
            date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        };
    });
    
    // Grouper les entrées par activité interne
    const groupedEntries = {};
    
    timeEntries
        .filter(entry => entry.type_heures === 'HNC')
        .forEach(entry => {
            const key = entry.internal_activity_id || 'N/A';
            if (!groupedEntries[key]) {
                groupedEntries[key] = {
                    activite: entry.internal_activity_nom || 'Activité non spécifiée',
                    days: {}
                };
            }
            
            const entryDate = new Date(entry.date_saisie);
            const dayIndex = Math.floor((entryDate - startDate) / (1000 * 60 * 60 * 24));
            
            if (dayIndex >= 0 && dayIndex < 7) {
                const dayKey = weekDays[dayIndex];
                if (!groupedEntries[key].days[dayKey]) {
                    groupedEntries[key].days[dayKey] = 0;
                }
                groupedEntries[key].days[dayKey] += parseFloat(entry.heures) || 0;
            }
        });
    
    if (Object.keys(groupedEntries).length === 0) {
        return `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures non-chargeables pour cette semaine
                </td>
            </tr>
        `;
    }
    
    return Object.values(groupedEntries).map(entry => {
        const total = Object.values(entry.days).reduce((sum, hours) => sum + hours, 0);
        
        return `
            <tr>
                <td><strong>${entry.activite}</strong></td>
                ${weekDates.map((dayInfo, index) => {
                    // Utiliser le nom complet du jour (Lundi, Mardi, etc.) au lieu de l'abréviation
                    const fullDayName = weekDays[index];
                    const hours = entry.days[fullDayName] || 0;
                    return `<td class="text-center">${hours > 0 ? hours.toFixed(1) + 'h' : '-'}</td>`;
                }).join('')}
                <td class="text-center"><strong>${total.toFixed(1)}h</strong></td>
            </tr>
        `;
    }).join('');
}

function generateDailySummary(timeEntries, weekStart) {
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const startDate = new Date(weekStart);
    
    // Générer les dates pour chaque jour de la semaine avec abréviations
    const weekDates = weekDays.map((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return {
            day: day.substring(0, 3) + '.', // Abréviation: Lun., Mar., etc.
            date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        };
    });
    
    // Calculer les heures pour chaque jour
    const dailyHours = weekDates.map((dayInfo, index) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Trouver les entrées pour ce jour
        const dayEntries = timeEntries.filter(entry => {
            const entryDate = new Date(entry.date_saisie);
            return entryDate.toISOString().split('T')[0] === dateString;
        });
        
        // Calculer les heures pour ce jour
        const chargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'HC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const nonChargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'HNC')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const totalDayHours = chargeableHours + nonChargeableHours;
        
        return {
            day: dayInfo.day,
            date: dayInfo.date,
            chargeable: chargeableHours,
            nonChargeable: nonChargeableHours,
            total: totalDayHours
        };
    });
    
    // Générer le HTML du récapitulatif
    const summaryRows = dailyHours.map(day => `
        <td class="text-center">
            <div class="fw-bold">${day.total.toFixed(1)}h</div>
            <small class="text-muted">
                HC: ${day.chargeable.toFixed(1)}h - HNC: ${day.nonChargeable.toFixed(1)}h
            </small>
        </td>
    `).join('');
    
    return `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Récapitulatif des heures par jour</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Jour</th>
                                ${weekDates.map(dayInfo => 
                                    `<th class="text-center">${dayInfo.day}<br><small class="text-muted">${dayInfo.date}</small></th>`
                                ).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="table-info">
                                <td><strong>Total (HC + HNC)</strong></td>
                                ${summaryRows}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function filterTimeSheets(filter) {
    currentFilter = filter;
    
    // Mettre à jour les boutons de filtre
    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    try {
        console.log(`📊 Filtrage des feuilles de temps: ${filter}`);
        
        let response;
        
        // Charger les données selon le filtre sélectionné
        switch (filter) {
            case 'pending':
                response = await fetch('/api/time-sheet-approvals/pending', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                break;
            case 'approved':
                response = await fetch('/api/time-sheet-approvals/all', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                break;
            case 'rejected':
                response = await fetch('/api/time-sheet-approvals/all', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                break;
            default:
                response = await fetch('/api/time-sheet-approvals/pending', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let filteredSheets = data.data || [];
        
        // Filtrer selon le statut si on utilise la route "all"
        if (filter === 'approved' || filter === 'rejected') {
            filteredSheets = filteredSheets.filter(sheet => sheet.status === filter);
        }
        
        // Charger les entrées de temps pour chaque feuille filtrée
        for (let sheet of filteredSheets) {
            try {
                const entriesResponse = await fetch(`/api/time-entries?time_sheet_id=${sheet.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (entriesResponse.ok) {
                    const entriesData = await entriesResponse.json();
                    sheet.timeEntries = entriesData.data || [];
                }
            } catch (error) {
                console.error(`❌ Erreur lors du chargement des entrées pour la feuille ${sheet.id}:`, error);
                sheet.timeEntries = [];
            }
        }
        
        // Mettre à jour la liste globale avec les feuilles filtrées
        allTimeSheets = filteredSheets;
        
        // Recharger le filtre par collaborateur
        await loadCollaborateurFilter();
        
        // Afficher les feuilles de temps
        displayTimeSheets();
        
        // Mettre à jour les statistiques
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur lors du filtrage des feuilles de temps:', error);
        showAlert('Erreur lors du filtrage des feuilles de temps', 'danger');
    }
}

function initializeEvents() {
    // Bouton de confirmation d'action
    document.getElementById('confirm-action-btn').addEventListener('click', handleApprovalAction);
}

function openApprovalModal(timeSheetId, action) {
    console.log('🔍 openApprovalModal appelé avec:', { timeSheetId, action });
    
    if (!timeSheetId) {
        console.error('❌ timeSheetId est undefined');
        showAlert('Erreur: ID de feuille de temps manquant', 'error');
        return;
    }
    
    currentTimeSheet = timeSheetId;
    currentAction = action;
    
    // Ouvrir directement le modal de commentaire pour l'approbation/rejet
    openCommentModal();
}

async function loadTimeSheetDetails(timeSheetId) {
    try {
        console.log('🔍 Chargement des détails pour la feuille:', timeSheetId);
        
        // Charger les détails de la feuille de temps
        const statusResponse = await fetch(`/api/time-sheet-approvals/${timeSheetId}/status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();
        const timeSheet = statusData.data;
        
        // Ajouter l'ID de la feuille de temps
        timeSheet.id = timeSheetId;
        
        console.log('✅ Détails de la feuille chargés:', timeSheet);
        
        // Charger les entrées de temps détaillées
        const entriesResponse = await fetch(`/api/time-entries?time_sheet_id=${timeSheetId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!entriesResponse.ok) {
            throw new Error(`HTTP ${entriesResponse.status}: ${entriesResponse.statusText}`);
        }

        const entriesData = await entriesResponse.json();
        const timeEntries = entriesData.data || [];
        
        console.log('✅ Entrées de temps chargées:', timeEntries.length);
        console.log('🔍 Détail des entrées:', timeEntries);
        
        // Afficher les premières entrées pour débogage
        if (timeEntries.length > 0) {
            console.log('📊 Exemple d\'entrée:', timeEntries[0]);
            console.log('📊 Types d\'heures trouvés:', [...new Set(timeEntries.map(e => e.type_heures))]);
            console.log('📊 Dates trouvées:', [...new Set(timeEntries.map(e => e.date_saisie))]);
        }
        
        // Remplir le contenu du modal avec la vue exacte de la feuille de temps
        const modalContent = document.getElementById('approvalModalContent');
        
        console.log('🔍 Génération du HTML pour les détails...');
        console.log('📊 Nombre d\'entrées chargeables:', timeEntries.filter(e => e.type_heures === 'HC').length);
        console.log('📊 Nombre d\'entrées non-chargeables:', timeEntries.filter(e => e.type_heures === 'HNC').length);
        
        // Debug des types d'heures
        console.log('🔍 Types d\'heures trouvés:', [...new Set(timeEntries.map(e => e.type_heures))]);
        console.log('🔍 Exemples d\'entrées avec type_heures:');
        timeEntries.slice(0, 3).forEach((entry, index) => {
            console.log(`   ${index + 1}. type_heures: "${entry.type_heures}", heures: ${entry.heures}, date: ${entry.date_saisie}`);
        });
        
        const chargeableHTML = generateChargeableEntriesTable(timeEntries, timeSheet.week_start);
        const nonChargeableHTML = generateNonChargeableEntriesTable(timeEntries, timeSheet.week_start);
        
        // Générer le récapitulatif des heures par jour
        const dailySummary = generateDailySummary(timeEntries, timeSheet.week_start);
        
        console.log('🔍 HTML généré pour chargeables:', chargeableHTML.substring(0, 200) + '...');
        console.log('🔍 HTML généré pour non-chargeables:', nonChargeableHTML.substring(0, 200) + '...');
        
        // Générer les en-têtes avec dates pour les tableaux
        const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const weekDates = weekDays.map((day, index) => {
            const date = new Date(timeSheet.week_start);
            date.setDate(date.getDate() + index);
            return {
                day: day.substring(0, 3) + '.', // Abréviation: Lun., Mar., etc.
                date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            };
        });
        
        const chargeableHeaders = weekDates.map(dayInfo => 
            `<th>${dayInfo.day}<br><small class="text-muted">${dayInfo.date}</small></th>`
        ).join('');
        
        const nonChargeableHeaders = weekDates.map(dayInfo => 
            `<th>${dayInfo.day}<br><small class="text-muted">${dayInfo.date}</small></th>`
        ).join('');
        
        modalContent.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6><i class="fas fa-user"></i> Collaborateur</h6>
                    <p><strong>${timeSheet.collaborateur_prenom} ${timeSheet.collaborateur_nom}</strong></p>
                    <p class="text-muted">${timeSheet.collaborateur_email}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-calendar"></i> Période</h6>
                    <p><strong>Semaine du ${formatDate(timeSheet.week_start)} au ${formatDate(timeSheet.week_end)}</strong></p>
                </div>
            </div>
            
            <!-- Résumé des totaux en haut -->
            <div class="row mb-3">
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6>Total Heures Chargeables</h6>
                            <h4 class="text-primary">${calculateTotalHours(timeEntries, 'chargeable')}h</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6>Total Heures Non-Chargeables</h6>
                            <h4 class="text-warning">${calculateTotalHours(timeEntries, 'non-chargeable')}h</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h6>Total Général</h6>
                            <h4>${calculateTotalHours(timeEntries, 'all')}h</h4>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Vue exacte de la feuille de temps comme lors de la saisie -->
            <div class="time-sheet-view">
                <h6><i class="fas fa-clock"></i> Feuille de temps détaillée</h6>
                
                <!-- Récapitulatif des heures par jour -->
                ${dailySummary}
                
                <!-- Onglets comme dans l'interface de saisie -->
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="view-chargeable-tab" data-bs-toggle="tab" data-bs-target="#view-chargeable" type="button" role="tab">
                            <i class="fas fa-briefcase me-2"></i>Heures Chargeables
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="view-non-chargeable-tab" data-bs-toggle="tab" data-bs-target="#view-non-chargeable" type="button" role="tab">
                            <i class="fas fa-tasks me-2"></i>Heures Non-Chargeables
                        </button>
                    </li>
                </ul>
                
                <div class="tab-content mt-3">
                    <!-- Heures Chargeables -->
                    <div class="tab-pane fade show active" id="view-chargeable" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Mission</th>
                                        <th>Tâche</th>
                                        ${chargeableHeaders}
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${chargeableHTML}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Heures Non-Chargeables -->
                    <div class="tab-pane fade" id="view-non-chargeable" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Activité Interne</th>
                                        ${nonChargeableHeaders}
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${nonChargeableHTML}
                                </tbody>
                            </table>
                        </div>
                    </div>
                                 </div>
             </div>
             
             <!-- Boutons d'approbation/rejet pour les feuilles soumises -->
             ${timeSheet.status === 'submitted' ? `
                 <div class="row mt-4">
                     <div class="col-12">
                         <div class="d-flex justify-content-center gap-3">
                             <button class="btn btn-success btn-lg" onclick="openApprovalModal('${timeSheet.id}', 'approve')">
                                 <i class="fas fa-check me-2"></i>Approuver la feuille de temps
                             </button>
                             <button class="btn btn-danger btn-lg" onclick="openApprovalModal('${timeSheet.id}', 'reject')">
                                 <i class="fas fa-times me-2"></i>Rejeter la feuille de temps
                             </button>
                         </div>
                     </div>
                 </div>
             ` : ''}
             
             ${timeSheet.approvals && timeSheet.approvals.length > 0 ? `
                 <div class="mt-3">
                     <h6><i class="fas fa-history"></i> Historique des validations</h6>
                     ${timeSheet.approvals.map(approval => `
                         <div class="entry-row">
                             <span>
                                 <strong>${approval.prenom} ${approval.nom}</strong> - 
                                 ${approval.action === 'approve' ? 'Approuvé' : 'Rejeté'}
                             </span>
                             <small class="text-muted">${formatDateTime(approval.created_at)}</small>
                         </div>
                         ${approval.comment ? `<p class="text-muted small ms-3">"${approval.comment}"</p>` : ''}
                     `).join('')}
                 </div>
             ` : ''}
         `;
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des détails:', error);
        showAlert('Erreur lors du chargement des détails', 'danger');
    }
}

function openCommentModal() {
    console.log(`🔍 openCommentModal appelé avec: currentTimeSheet = "${currentTimeSheet}", currentAction = "${currentAction}"`);
    
    // Fermer le modal d'approbation
    const approvalModal = bootstrap.Modal.getInstance(document.getElementById('approvalModal'));
    approvalModal.hide();
    
    // Mettre à jour le titre du modal de commentaire
    const title = currentAction === 'approve' ? 'Approuver la feuille de temps' : 'Rejeter la feuille de temps';
    document.getElementById('commentModalTitle').textContent = title;
    
    // Vider le champ de commentaire
    document.getElementById('comment-text').value = '';
    
    // Afficher le modal de commentaire
    const commentModal = new bootstrap.Modal(document.getElementById('commentModal'));
    commentModal.show();
    
    console.log(`✅ Modal de commentaire ouvert avec titre: "${title}"`);
}

async function handleApprovalAction() {
    try {
        const comment = document.getElementById('comment-text').value;
        
        console.log(`📝 ${currentAction === 'approve' ? 'Approbation' : 'Rejet'} de la feuille de temps...`);
        console.log(`🔍 Variables globales: currentTimeSheet = "${currentTimeSheet}", currentAction = "${currentAction}"`);
        
        if (!currentTimeSheet) {
            throw new Error('ID de feuille de temps manquant');
        }
        
        const response = await fetch(`/api/time-sheet-approvals/${currentTimeSheet}/${currentAction}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                comment: comment || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de l\'action');
        }

        const data = await response.json();
        console.log('✅ Action effectuée:', data);
        
        showAlert(`Feuille de temps ${currentAction === 'approve' ? 'approuvée' : 'rejetée'} avec succès`, 'success');
        
        // Fermer le modal
        const commentModal = bootstrap.Modal.getInstance(document.getElementById('commentModal'));
        commentModal.hide();
        
        // Recharger les données
        await loadTimeSheets();
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'action:', error);
        showAlert(error.message, 'danger');
    }
}

function viewTimeSheetDetails(timeSheetId) {
    // Ouvrir le modal avec la vue complète de la feuille de temps
    currentTimeSheet = timeSheetId;
    currentAction = 'view';
    
    // Charger les détails de la feuille de temps
    loadTimeSheetDetails(timeSheetId);
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('approvalModal'));
    const modalTitle = document.getElementById('approvalModalTitle');
    
    // Changer le titre du modal
    modalTitle.textContent = 'Feuille de temps complète';
    
    modal.show();
}

function updateStats() {
    const pending = allTimeSheets.filter(sheet => sheet.status === 'submitted').length;
    const approved = allTimeSheets.filter(sheet => sheet.status === 'approved').length;
    const rejected = allTimeSheets.filter(sheet => sheet.status === 'rejected').length;
    const total = allTimeSheets.length;
    
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('rejected-count').textContent = rejected;
    document.getElementById('total-count').textContent = total;
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertId = 'alert-' + Date.now();
    
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHtml;
    
    // Auto-dismiss après 5 secondes
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
} 