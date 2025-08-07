// Variables globales
let currentWeekStart = new Date();
let currentTimeSheet = null;
let missions = [];
let tasks = [];
let businessUnits = [];
let internalActivities = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeTimeSheet();
    loadInitialData();
});

// Initialisation de la feuille de temps
function initializeTimeSheet() {
    // Définir la semaine courante (lundi de la semaine actuelle)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Mettre à jour l'interface
    updateWeekDisplay();
    loadWeekData();
}

// Charger les données initiales
async function loadInitialData() {
    try {
        await Promise.all([
            loadMissions(),
            loadBusinessUnits(),
            loadInternalActivities()
        ]);
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showAlert('Erreur lors du chargement des données', 'danger');
    }
}

// Charger les missions
async function loadMissions() {
    try {
        const response = await fetch('/api/missions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            missions = data.data || data; // Gérer les deux formats possibles
            populateMissionSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des missions:', error);
    }
}

// Charger les business units
async function loadBusinessUnits() {
    try {
        const response = await fetch('/api/business-units', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            businessUnits = data.data || data; // Gérer les deux formats possibles
            populateBusinessUnitSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des business units:', error);
    }
}

// Charger les activités internes
async function loadInternalActivities() {
    try {
        const response = await fetch('/api/internal-activities', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            internalActivities = data.data || data; // Gérer les deux formats possibles
        }
    } catch (error) {
        console.error('Erreur lors du chargement des activités internes:', error);
    }
}

// Remplir le sélecteur de missions
function populateMissionSelect() {
    const select = document.getElementById('missionSelect');
    select.innerHTML = '<option value="">Choisir une mission...</option>';
    
    missions.forEach(mission => {
        const option = document.createElement('option');
        option.value = mission.id;
        option.textContent = mission.nom;
        select.appendChild(option);
    });
}

// Remplir le sélecteur de business units
function populateBusinessUnitSelect() {
    const select = document.getElementById('businessUnitSelect');
    select.innerHTML = '<option value="">Choisir une business unit...</option>';
    
    businessUnits.forEach(bu => {
        const option = document.createElement('option');
        option.value = bu.id;
        option.textContent = bu.nom;
        select.appendChild(option);
    });
}

// Charger les tâches pour une mission
async function loadTasksForMission(missionId) {
    try {
        const response = await fetch(`/api/missions/${missionId}/tasks`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            tasks = data.data || data; // Gérer les deux formats possibles
            populateTaskSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des tâches:', error);
    }
}

// Remplir le sélecteur de tâches
function populateTaskSelect() {
    const select = document.getElementById('taskSelect');
    select.innerHTML = '<option value="">Choisir une tâche...</option>';
    
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.nom;
        select.appendChild(option);
    });
}

// Charger les activités internes pour une business unit
function loadInternalActivitiesForBU(businessUnitId) {
    const select = document.getElementById('internalActivitySelect');
    select.innerHTML = '<option value="">Choisir une activité...</option>';
    
    const filteredActivities = internalActivities.filter(activity => 
        !businessUnitId || activity.business_unit_id === businessUnitId
    );
    
    filteredActivities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity.id;
        option.textContent = activity.nom;
        select.appendChild(option);
    });
}

// Mettre à jour l'affichage de la semaine
function updateWeekDisplay() {
    const weekStartInput = document.getElementById('weekStartDate');
    const weekDisplay = document.getElementById('weekDisplay');
    
    const formattedDate = currentWeekStart.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    weekStartInput.value = currentWeekStart.toISOString().split('T')[0];
    weekDisplay.textContent = formattedDate;
}

// Charger les données de la semaine
async function loadWeekData() {
    try {
        const weekStart = currentWeekStart.toISOString().split('T')[0];
        
        // Charger la feuille de temps existante
        const response = await fetch(`/api/time-sheets/current?week_start=${weekStart}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTimeSheet = data.data || data;
            updateTimeSheetDisplay();
        } else if (response.status === 404) {
            // Créer une nouvelle feuille de temps
            await createNewTimeSheet();
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la semaine:', error);
        showAlert('Erreur lors du chargement de la semaine', 'danger');
    }
}

// Créer une nouvelle feuille de temps
async function createNewTimeSheet() {
    try {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        
        const timeSheetData = {
            date_debut_semaine: currentWeekStart.toISOString().split('T')[0],
            date_fin_semaine: weekEnd.toISOString().split('T')[0],
            annee: currentWeekStart.getFullYear(),
            semaine: getWeekNumber(currentWeekStart),
            statut: 'draft'
        };
        
        const response = await fetch('/api/time-sheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(timeSheetData)
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTimeSheet = data.data || data;
            updateTimeSheetDisplay();
        }
    } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error);
        showAlert('Erreur lors de la création de la feuille de temps', 'danger');
    }
}

// Obtenir le numéro de semaine
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Mettre à jour l'affichage de la feuille de temps
function updateTimeSheetDisplay() {
    if (!currentTimeSheet) return;
    
    // Mettre à jour le statut
    updateStatusDisplay();
    
    // Générer le contenu de la feuille de temps
    generateTimeSheetContent();
    
    // Mettre à jour les totaux
    updateTotals();
}

// Mettre à jour l'affichage du statut
function updateStatusDisplay() {
    const statusElement = document.getElementById('timeSheetStatus');
    const status = currentTimeSheet.statut || 'draft';
    
    statusElement.className = `status-badge status-${status}`;
    
    switch (status) {
        case 'draft':
            statusElement.textContent = 'Brouillon';
            break;
        case 'submitted':
            statusElement.textContent = 'Soumise';
            break;
        case 'approved':
            statusElement.textContent = 'Approuvée';
            break;
        case 'rejected':
            statusElement.textContent = 'Rejetée';
            break;
        default:
            statusElement.textContent = 'Brouillon';
    }
}

// Générer le contenu de la feuille de temps
function generateTimeSheetContent() {
    const container = document.getElementById('timeSheetContent');
    container.innerHTML = '';
    
    // Générer les jours de la semaine
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);
        
        const dayElement = createDayElement(currentDate, i);
        container.appendChild(dayElement);
    }
    
    // Ajouter le bouton pour ajouter une activité
    const addButton = document.createElement('div');
    addButton.className = 'text-center mt-3';
    addButton.innerHTML = `
        <button class="btn btn-primary btn-action" onclick="openActivityModal()">
            <i class="fas fa-plus me-2"></i>Ajouter une activité
        </button>
    `;
    container.appendChild(addButton);
}

// Créer un élément pour un jour
function createDayElement(date, dayIndex) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day-row';
    
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    const dayNumber = date.getDate();
    const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
    
    dayElement.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-2">
                <h6 class="mb-0">
                    <i class="fas fa-calendar-day me-2"></i>
                    ${dayName} ${dayNumber} ${monthName}
                </h6>
            </div>
            <div class="col-md-8">
                <div id="activities-${dayIndex}" class="activities-container">
                    <!-- Les activités seront ajoutées ici -->
                </div>
            </div>
            <div class="col-md-2 text-end">
                <span class="badge bg-primary" id="day-total-${dayIndex}">0h</span>
            </div>
        </div>
    `;
    
    return dayElement;
}

// Ouvrir le modal d'ajout d'activité
function openActivityModal() {
    // Réinitialiser le modal
    document.getElementById('activityType').checked = true;
    document.getElementById('missionSelection').style.display = 'block';
    document.getElementById('internalSelection').style.display = 'none';
    
    // Réinitialiser les champs
    document.getElementById('missionSelect').value = '';
    document.getElementById('taskSelect').value = '';
    document.getElementById('businessUnitSelect').value = '';
    document.getElementById('internalActivitySelect').value = '';
    document.getElementById('activityHours').value = '';
    document.getElementById('activityDescription').value = '';
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('activityModal'));
    modal.show();
}

// Gérer le changement de type d'activité
document.addEventListener('change', function(e) {
    if (e.target.name === 'activityType') {
        const missionSelection = document.getElementById('missionSelection');
        const internalSelection = document.getElementById('internalSelection');
        
        if (e.target.value === 'mission') {
            missionSelection.style.display = 'block';
            internalSelection.style.display = 'none';
        } else {
            missionSelection.style.display = 'none';
            internalSelection.style.display = 'block';
        }
    }
});

// Gérer le changement de mission
document.addEventListener('change', function(e) {
    if (e.target.id === 'missionSelect') {
        if (e.target.value) {
            loadTasksForMission(e.target.value);
        } else {
            populateTaskSelect();
        }
    }
});

// Gérer le changement de business unit
document.addEventListener('change', function(e) {
    if (e.target.id === 'businessUnitSelect') {
        loadInternalActivitiesForBU(e.target.value);
    }
});

// Ajouter une activité (sans sauvegarder automatiquement)
async function addActivity() {
    const activityType = document.querySelector('input[name="activityType"]:checked').value;
    const hours = parseFloat(document.getElementById('activityHours').value);
    const description = document.getElementById('activityDescription').value;
    
    if (!hours || hours <= 0 || hours > 24) {
        showAlert('Veuillez saisir un nombre d\'heures valide (0-24)', 'warning');
        return;
    }
    
    // Créer l'objet activité pour l'affichage (sans sauvegarde)
    let activityData = {
        id: 'temp-' + Date.now(), // ID temporaire
        date_saisie: currentWeekStart.toISOString().split('T')[0],
        heures: hours,
        description: description,
        type_heures: activityType === 'mission' ? 'chargeable' : 'non-chargeable',
        isTemporary: true // Marquer comme temporaire
    };
    
    if (activityType === 'mission') {
        const missionId = document.getElementById('missionSelect').value;
        const taskId = document.getElementById('taskSelect').value;
        
        if (!missionId) {
            showAlert('Veuillez sélectionner une mission', 'warning');
            return;
        }
        
        activityData.mission_id = missionId;
        activityData.task_id = taskId;
        activityData.project_name = document.getElementById('missionSelect').options[document.getElementById('missionSelect').selectedIndex].text;
        activityData.task_name = taskId ? document.getElementById('taskSelect').options[document.getElementById('taskSelect').selectedIndex].text : '';
    } else {
        const businessUnitId = document.getElementById('businessUnitSelect').value;
        const activityId = document.getElementById('internalActivitySelect').value;
        
        if (!businessUnitId || !activityId) {
            showAlert('Veuillez sélectionner une business unit et une activité', 'warning');
            return;
        }
        
        activityData.business_unit_id = businessUnitId;
        activityData.internal_activity_id = activityId;
        activityData.internal_activity_name = document.getElementById('internalActivitySelect').options[document.getElementById('internalActivitySelect').selectedIndex].text;
    }
    
    // Ajouter à l'affichage sans sauvegarder
    addActivityToDisplay(activityData);
    updateTotals();
    
    // Fermer le modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('activityModal'));
    modal.hide();
    
    showAlert('Activité ajoutée (cliquez sur Sauvegarder pour enregistrer)', 'info');
}

// Ajouter une activité à l'affichage
function addActivityToDisplay(activity) {
    const dayIndex = new Date(activity.date_saisie).getDay() - 1;
    if (dayIndex < 0 || dayIndex > 6) return;
    
    const container = document.getElementById(`activities-${dayIndex}`);
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item mb-2 p-2 border rounded';
    activityElement.style.backgroundColor = activity.type_heures === 'chargeable' ? '#e3f2fd' : '#f3e5f5';
    
    const activityName = activity.type_heures === 'chargeable' 
        ? `${activity.project_name || 'Mission'} - ${activity.task_name || 'Tâche'}`
        : activity.internal_activity_name || 'Activité interne';
    
    activityElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>${activityName}</strong>
                ${activity.description ? `<br><small>${activity.description}</small>` : ''}
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-primary">${activity.heures}h</span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteActivity('${activity.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(activityElement);
    updateDayTotal(dayIndex);
}

// Supprimer une activité
async function deleteActivity(activityId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) return;
    
    // Si c'est une activité temporaire, la supprimer directement de l'affichage
    if (activityId.startsWith('temp-')) {
        const activityElement = document.querySelector(`[onclick*="${activityId}"]`).closest('.activity-item');
        if (activityElement) {
            const dayIndex = activityElement.closest('.activities-container').id.replace('activities-', '');
            activityElement.remove();
            updateDayTotal(parseInt(dayIndex));
            updateTotals();
        }
        showAlert('Activité supprimée', 'success');
        return;
    }
    
    // Sinon, supprimer de la base de données
    try {
        const response = await fetch(`/api/time-entries/${activityId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // Recharger les données
            loadWeekData();
            showAlert('Activité supprimée avec succès', 'success');
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la suppression', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showAlert('Erreur lors de la suppression', 'danger');
    }
}

// Mettre à jour le total d'un jour
function updateDayTotal(dayIndex) {
    const container = document.getElementById(`activities-${dayIndex}`);
    const totalElement = document.getElementById(`day-total-${dayIndex}`);
    
    let total = 0;
    const activityElements = container.querySelectorAll('.activity-item');
    
    activityElements.forEach(element => {
        const hoursText = element.querySelector('.badge').textContent;
        const hours = parseFloat(hoursText.replace('h', ''));
        total += hours;
    });
    
    totalElement.textContent = `${total}h`;
}

// Mettre à jour les totaux
function updateTotals() {
    // Cette fonction sera implémentée pour calculer les totaux de la semaine
    // en fonction des activités existantes
}

// Sauvegarder la feuille de temps
async function saveTimeSheet() {
    try {
        // S'assurer qu'une feuille de temps existe
        if (!currentTimeSheet || !currentTimeSheet.id) {
            console.log('📋 Création d\'une nouvelle feuille de temps pour la semaine');
            await createNewTimeSheet();
            if (!currentTimeSheet || !currentTimeSheet.id) {
                throw new Error('Impossible de créer la feuille de temps');
            }
        }
        
        // Récupérer toutes les activités temporaires
        const temporaryActivities = [];
        const activityContainers = document.querySelectorAll('.activities-container');
        
        activityContainers.forEach((container, dayIndex) => {
            const activities = container.querySelectorAll('.activity-item');
            activities.forEach(activityElement => {
                const activityId = activityElement.querySelector('button').getAttribute('onclick').match(/'([^']+)'/)[1];
                if (activityId.startsWith('temp-')) {
                    // C'est une activité temporaire, la sauvegarder
                    const hoursElement = activityElement.querySelector('.badge');
                    const hours = parseFloat(hoursElement.textContent.replace('h', ''));
                    const descriptionElement = activityElement.querySelector('small');
                    const description = descriptionElement ? descriptionElement.textContent : '';
                    
                    // Déterminer le type d'activité
                    const isChargeable = activityElement.style.backgroundColor === 'rgb(227, 242, 253)';
                    
                    const activityData = {
                        time_sheet_id: currentTimeSheet.id,
                        date_saisie: new Date(currentWeekStart.getTime() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        heures: hours,
                        description: description,
                        type_heures: isChargeable ? 'chargeable' : 'non-chargeable'
                    };
                    
                    temporaryActivities.push(activityData);
                }
            });
        });
        
        // Sauvegarder toutes les activités temporaires
        const savedActivities = [];
        for (const activityData of temporaryActivities) {
            try {
                const response = await fetch('/api/time-entries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(activityData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    savedActivities.push(data.data || data);
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Erreur lors de la sauvegarde d\'une activité');
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde d\'une activité:', error);
                throw error;
            }
        }
        
        // Mettre à jour l'affichage avec les vraies données
        if (savedActivities.length > 0) {
            // Recharger les données pour avoir les vrais IDs
            await loadWeekData();
            showAlert(`${savedActivities.length} activité(s) sauvegardée(s) avec succès`, 'success');
        } else {
            showAlert('Aucune activité à sauvegarder', 'info');
        }
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showAlert('Erreur lors de la sauvegarde: ' + error.message, 'danger');
    }
}

// Soumettre la feuille de temps
async function submitTimeSheet() {
    if (!confirm('Êtes-vous sûr de vouloir soumettre cette feuille de temps ?')) return;
    
    try {
        const response = await fetch(`/api/time-sheets/${currentTimeSheet.id}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('Feuille de temps soumise avec succès', 'success');
            loadWeekData();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la soumission', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        showAlert('Erreur lors de la soumission', 'danger');
    }
}

// Charger la semaine précédente
function loadPreviousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekDisplay();
    loadWeekData();
}

// Charger la semaine suivante
function loadNextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekDisplay();
    loadWeekData();
}

// Afficher une alerte
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-supprimer après 5 secondes
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
} 