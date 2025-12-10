// Variables globales
let currentTimeSheet = null;
let currentWeekStart = null;
let missions = [];
let businessUnits = [];
let internalActivities = [];
let weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
let isNavigating = false; // Protection contre les clics multiples
// currentUser est maintenant géré par le SessionManager

// Configuration API
const API_BASE_URL = '/api';

// Fonction pour obtenir le lundi de la semaine courante (sans timezone)
// Fonction pour obtenir le lundi de la semaine courante (sans timezone)
// Fonction pour obtenir le lundi de la semaine courante (sans timezone)
function getMondayOfWeek(dateInput = new Date()) {
    let d;
    console.log('📅 getMondayOfWeek input:', dateInput);
    // Gestion robuste des entrées chaîne "YYYY-MM-DD" pour éviter les décalages UTC
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        d = new Date(dateInput + 'T12:00:00'); // Midi pour éviter les bords
    } else {
        d = new Date(dateInput);
        d.setHours(12, 0, 0, 0); // Normaliser à midi
    }

    const day = d.getDay(); // 0=Dimanche, 1=Lundi...
    // Si Dimanche (0) => Reculer de 6 jours. Sinon => Reculer de (day - 1)
    const daysToSubtract = day === 0 ? 6 : day - 1;

    console.log('📅 jour:', day, 'jours à soustraire:', daysToSubtract);

    const monday = new Date(d);
    monday.setDate(d.getDate() - daysToSubtract);

    // Retourner le format YYYY-MM-DD
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(monday.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${dayOfMonth}`;
    console.log('📅 result:', result);
    return result;
}

// Fonction pour obtenir le dimanche de la semaine (lundi + 6 jours)
function getSundayOfWeek(mondayDate) {
    const monday = new Date(mondayDate + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // +6 pour aller du lundi au dimanche (7 jours au total)

    // Éviter les problèmes de timezone en formatant manuellement
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(sunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
}

// Fonction pour formater une date pour l'affichage (évite les problèmes de timezone)
function formatDateForDisplay(date, includeYear = false) {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    if (includeYear) {
        return `${day} ${monthNames[month]} ${year}`;
    } else {
        return `${day} ${monthNames[month]}`;
    }
}

// Récupérer le profil de l'utilisateur connecté via SessionManager
async function loadCurrentUserProfile() {
    try {
        console.log('🔍 Chargement du profil utilisateur via SessionManager...');
        await sessionManager.initialize();
        console.log('✅ SessionManager initialisé avec succès');
        console.log('📊 Informations de session:', sessionManager.getSessionInfo());
    } catch (error) {
        console.error('❌ Erreur lors du chargement du profil utilisateur:', error);
    }
}

// Initialisation de la feuille de temps
async function initializeTimeSheet() {
    try {
        // Charger le profil de l'utilisateur connecté
        await loadCurrentUserProfile();

        // Définir la semaine actuelle (lundi de cette semaine)
        currentWeekStart = getMondayOfWeek();
        console.log('📅 Semaine actuelle (lundi):', currentWeekStart);

        // Mettre à jour l'affichage de la semaine immédiatement
        updateWeekDisplay();

        // Charger les données initiales
        await loadInitialData();

        // Charger les données de la semaine
        await loadWeekData();

        // Ajouter les écouteurs d'événements pour la persistance automatique
        setupEventListeners();

    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showAlert('Erreur lors de l\'initialisation de la feuille de temps', 'danger');
    }
}

// Configuration des écouteurs d'événements pour la persistance automatique
function setupEventListeners() {
    console.log('🔧 Configuration des écouteurs d\'événements...');

    // Écouter les changements sur tous les champs de saisie d'heures
    document.addEventListener('input', async function (event) {
        if (event.target.type === 'number' && event.target.classList.contains('hours-input')) {
            const row = event.target.closest('tr');
            if (row && row.dataset.entryId) {
                const entryId = row.dataset.entryId;
                const day = getDayFromInput(event.target);
                const hours = parseFloat(event.target.value) || 0;

                // Mettre à jour l'affichage local seulement (pas de sauvegarde automatique)
                updateRowTotal(entryId);
                updateTotals();
            }
        }
    });

    // Écouter les changements de semaine
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');

    console.log('🔍 Recherche des boutons de navigation:');
    console.log('  - prev-week-btn:', prevWeekBtn);
    console.log('  - next-week-btn:', nextWeekBtn);

    if (prevWeekBtn) {
        console.log('✅ Ajout de l\'écouteur pour le bouton semaine précédente');
        prevWeekBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            console.log('🖱️ Clic sur le bouton semaine précédente');
            await loadPreviousWeek();
        });
    } else {
        console.error('❌ Bouton semaine précédente non trouvé');
    }

    if (nextWeekBtn) {
        console.log('✅ Ajout de l\'écouteur pour le bouton semaine suivante');
        nextWeekBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            console.log('🖱️ Clic sur le bouton semaine suivante');
            await loadNextWeek();
        });
    } else {
        console.error('❌ Bouton semaine suivante non trouvé');
    }


    // Écouter les changements du sélecteur de date
    const weekDatePicker = document.getElementById('week-date-picker');
    if (weekDatePicker) {
        console.log('✅ Ajout de l\'écouteur pour le sélecteur de date');
        weekDatePicker.addEventListener('change', async function (e) {
            const selectedDate = e.target.value;
            if (selectedDate) {
                console.log('📅 Date sélectionnée:', selectedDate);
                // Passer la chaîne directement pour éviter le constructeur new Date(string) qui parse en UTC
                const newWeekStart = getMondayOfWeek(selectedDate);
                if (newWeekStart !== currentWeekStart) {
                    currentWeekStart = newWeekStart;
                    await loadWeekData();
                }
            }
        });
    }
}

// Obtenir le jour de la semaine à partir d'un champ de saisie
function getDayFromInput(input) {
    const cellIndex = input.closest('td').cellIndex;

    // Déterminer si on est dans le tableau HC ou HNC
    const table = input.closest('table');
    const isChargeableTable = table.querySelector('thead th:nth-child(1)').textContent.includes('Mission');

    let dayIndex;
    if (isChargeableTable) {
        // Tableau HC : Mission, Tâche, puis Lundi-Dimanche (colonnes 3-9)
        dayIndex = cellIndex - 3;
    } else {
        // Tableau HNC : Activité Interne, puis Lundi-Dimanche (colonnes 2-8)
        dayIndex = cellIndex - 2;
    }

    return weekDays[dayIndex] || 'monday';
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
        console.error('Erreur lors du chargement des données initiales:', error);
    }
}

// Charger les missions
async function loadMissions() {
    try {
        const response = await authenticatedFetch('/api/missions/planned');
        if (response.ok) {
            const data = await response.json();
            missions = data.data || data;
            populateMissionSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des missions:', error);
    }
}

// Charger les business units
async function loadBusinessUnits() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/business-units`);
        if (response.ok) {
            const data = await response.json();
            businessUnits = data.data || data;
            populateBusinessUnitSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des business units:', error);
    }
}

// Charger les activités internes
async function loadInternalActivities() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/internal-activities`);
        if (response.ok) {
            const data = await response.json();
            internalActivities = data.data || data;
            populateInternalActivitySelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des activités internes:', error);
    }
}

// Peupler le sélecteur de missions
function populateMissionSelect() {
    const select = document.getElementById('mission-select');
    if (!select) return;

    select.innerHTML = '<option value="">Sélectionner une mission</option>';

    missions.forEach(mission => {
        const option = document.createElement('option');
        option.value = mission.id;
        option.textContent = mission.nom;
        select.appendChild(option);
    });
}

// Peupler le sélecteur de business units
function populateBusinessUnitSelect() {
    const select = document.getElementById('business-unit-select');
    if (!select) return;

    select.innerHTML = '<option value="">Sélectionner une business unit</option>';

    businessUnits.forEach(bu => {
        const option = document.createElement('option');
        option.value = bu.id;
        option.textContent = bu.nom;
        select.appendChild(option);
    });
}

// Peupler le sélecteur d'activités internes
function populateInternalActivitySelect() {
    const select = document.getElementById('internal-activity-select');
    if (!select) return;

    select.innerHTML = '<option value="">Sélectionner une activité</option>';

    internalActivities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity.id;
        option.textContent = activity.name || activity.nom;
        select.appendChild(option);
    });
}

// Charger les tâches pour une mission
async function loadTasksForMission(missionId) {
    try {
        console.log('🔍 Chargement des tâches configurées pour la mission:', missionId);

        const response = await authenticatedFetch(`${API_BASE_URL}/missions/${missionId}/tasks`);
        if (response.ok) {
            const data = await response.json();
            const tasks = data.data || data;

            console.log(`✅ ${tasks.length} tâches configurées chargées:`, tasks);

            const select = document.getElementById('task-select');
            if (!select) return;

            select.innerHTML = '<option value="">Sélectionner une tâche</option>';

            if (tasks.length === 0) {
                select.innerHTML = '<option value="">Aucune tâche configurée pour cette mission</option>';
            } else {
                tasks.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.id; // Utilise l'ID de la tâche (pas mission_task_id)
                    option.textContent = `${task.code || 'N/A'} - ${task.task_libelle || task.description || 'Sans nom'}`;
                    select.appendChild(option);
                });
            }
        } else {
            console.error('❌ Erreur lors du chargement des tâches:', response.status, response.statusText);
            const select = document.getElementById('task-select');
            if (select) {
                select.innerHTML = '<option value="">Erreur lors du chargement des tâches</option>';
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des tâches:', error);
        const select = document.getElementById('task-select');
        if (select) {
            select.innerHTML = '<option value="">Erreur de connexion</option>';
        }
    }
}

// Charger les activités internes pour une business unit
async function loadInternalActivitiesForBusinessUnit(businessUnitId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/internal-activities?business_unit_id=${businessUnitId}`);
        if (response.ok) {
            const data = await response.json();
            const activities = data.data || data;

            const select = document.getElementById('internal-activity-select');
            if (!select) return;

            select.innerHTML = '<option value="">Sélectionner une activité</option>';

            activities.forEach(activity => {
                const option = document.createElement('option');
                option.value = activity.id;
                option.textContent = activity.name || activity.nom;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des activités internes:', error);
    }
}

// Charger les données de la semaine
async function loadWeekData() {
    console.log('📅 loadWeekData - currentWeekStart:', currentWeekStart, 'Type:', typeof currentWeekStart);
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheets/current?week_start=${currentWeekStart}`);
        if (response.ok) {
            const data = await response.json();

            // Si pas de feuille en DB, créer un objet virtuel pour affichage "Brouillon"
            if (data.timeSheet === null) {
                console.log('📊 Aucune feuille en DB - Affichage mode brouillon');
                currentTimeSheet = {
                    id: null,
                    status: 'brouillon',
                    week_start: currentWeekStart,
                    week_end: getSundayOfWeek(currentWeekStart)
                };
            } else {
                currentTimeSheet = data.timeSheet;
            }

            console.log('📊 Feuille de temps chargée:', {
                id: currentTimeSheet.id,
                status: currentTimeSheet.status,
                week_start: currentTimeSheet.week_start,
                week_end: currentTimeSheet.week_end
            });

            updateWeekDisplay();
            updateStatusDisplay();
            await loadTimeEntries();
            updateTotals();
            await loadExistingData(); // Charger les données existantes

            // Appliquer le verrouillage après le chargement complet des données
            setTimeout(() => {
                toggleInterfaceLock();
            }, 200);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données de la semaine:', error);
        showAlert('Erreur lors du chargement des données de la semaine', 'danger');
    }
}

// Créer une nouvelle feuille de temps
async function createNewTimeSheet() {
    try {
        // Calculer les dates de début et fin de semaine (lundi à dimanche)
        const weekStartStr = currentWeekStart; // Déjà au format YYYY-MM-DD
        const weekEndStr = getSundayOfWeek(currentWeekStart);

        console.log('📋 Création feuille de temps pour la semaine:', weekStartStr, 'à', weekEndStr);
        console.log('📅 Détails: Lundi', weekStartStr, 'à Dimanche', weekEndStr);

        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: getCurrentUserId(),
                week_start: weekStartStr,
                week_end: weekEndStr,
                status: 'saved'
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentTimeSheet = data.timeSheet || data.data || data;
            console.log('✅ Feuille de temps créée:', currentTimeSheet);
            updateWeekDisplay();
            updateStatusDisplay();
            return currentTimeSheet;
        } else {
            const errorText = await response.text();
            throw new Error(`Erreur lors de la création de la feuille de temps: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error);
        showAlert('Erreur lors de la création de la feuille de temps', 'danger');
        throw error;
    }
}

// Mettre à jour l'affichage de la semaine
function updateWeekDisplay() {
    console.log('📅 Mise à jour de l\'affichage de la semaine...');
    console.log('📅 currentWeekStart:', currentWeekStart);

    // Vérifier que currentWeekStart est valide
    if (!currentWeekStart) {
        console.error('❌ currentWeekStart est null ou undefined');
        return;
    }

    try {
        // Toujours utiliser les dates calculées pour garantir l'ordre lundi-dimanche
        const startDate = new Date(currentWeekStart + 'T12:00:00');
        const endDate = new Date(getSundayOfWeek(currentWeekStart) + 'T12:00:00');

        // Vérifier que les dates sont valides
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('❌ Dates invalides calculées');
            return;
        }

        // Formater les dates en utilisant les composants individuels pour éviter les problèmes de timezone
        const startFormatted = formatDateForDisplay(startDate);
        const endFormatted = formatDateForDisplay(endDate, true);

        const weekDisplay = document.getElementById('week-display');
        if (weekDisplay) {
            weekDisplay.textContent = `Semaine du ${startFormatted} au ${endFormatted}`;
            console.log('✅ Affichage de la semaine mis à jour:', weekDisplay.textContent);
        } else {
            console.warn('⚠️ Élément week-display non trouvé');
        }

        // Mettre à jour les en-têtes des tableaux avec les dates
        console.log('📅 Appel de updateTableHeaders avec startDate:', startDate, 'Type:', typeof startDate);
        updateTableHeaders(startDate);

        // Mettre à jour les en-têtes du récapitulatif quotidien
        updateDailySummaryHeaders();

        console.log('📅 Affichage de la semaine mis à jour avec succès');

        // Mettre à jour la valeur du date picker
        const weekDatePicker = document.getElementById('week-date-picker');
        if (weekDatePicker && currentWeekStart) {
            weekDatePicker.value = currentWeekStart;
        }
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de l\'affichage:', error);
    }
}

// Mettre à jour les en-têtes des tableaux avec les dates
function updateTableHeaders(weekStartDate) {
    console.log('📅 Mise à jour des en-têtes avec la date:', weekStartDate);

    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    // S'assurer que weekStartDate est un objet Date valide
    let startDate;
    if (weekStartDate instanceof Date) {
        startDate = weekStartDate;
    } else if (typeof weekStartDate === 'string') {
        startDate = new Date(weekStartDate + 'T12:00:00'); // Midi pour surêté
    } else {
        console.error('❌ Format de date invalide:', weekStartDate);
        return;
    }

    // Vérifier que la date est valide
    if (isNaN(startDate.getTime())) {
        console.error('❌ Date invalide:', weekStartDate);
        return;
    }

    console.log('📅 Date de début formatée:', startDate);
    console.log('📅 Calcul des dates de la semaine:');

    days.forEach((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);

        // Formater la date manuellement pour éviter les problèmes de timezone
        const dayOfMonth = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateStr = `${dayOfMonth}/${month}`;
        const fullDateStr = date.toISOString().split('T')[0];

        console.log(`📅 ${day}: ${dateStr} (${fullDateStr})`);

        // Mettre à jour les en-têtes du tableau des heures chargeables
        const chargeableHeaders = document.querySelectorAll('#chargeable thead th');
        if (chargeableHeaders[index + 2]) { // +2 car les 2 premières colonnes sont Mission et Tâche
            chargeableHeaders[index + 2].textContent = `${day}\n${dateStr}`;
            chargeableHeaders[index + 2].style.whiteSpace = 'pre-line';
            chargeableHeaders[index + 2].style.textAlign = 'center';
            console.log(`✅ En-tête chargeable mis à jour: ${day} - ${dateStr}`);
        } else {
            console.warn(`⚠️ En-tête chargeable non trouvé pour l'index ${index + 2}`);
        }

        // Mettre à jour les en-têtes du tableau des heures non-chargeables
        const nonChargeableHeaders = document.querySelectorAll('#non-chargeable thead th');
        if (nonChargeableHeaders[index + 1]) { // +1 car la première colonne est Activité Interne
            nonChargeableHeaders[index + 1].textContent = `${day}\n${dateStr}`;
            nonChargeableHeaders[index + 1].style.whiteSpace = 'pre-line';
            nonChargeableHeaders[index + 1].style.textAlign = 'center';
            console.log(`✅ En-tête non-chargeable mis à jour: ${day} - ${dateStr}`);
        } else {
            console.warn(`⚠️ En-tête non-chargeable non trouvé pour l'index ${index + 1}`);
        }
    });

    console.log('📅 Mise à jour des en-têtes terminée');
}

// Mettre à jour l'affichage du statut
function updateStatusDisplay() {
    if (currentTimeSheet) {
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            statusBadge.textContent = getStatusText(currentTimeSheet.status);
            statusBadge.className = `status-badge status-${currentTimeSheet.status}`;
            console.log(`📊 Mise à jour du statut: ${currentTimeSheet.status} -> ${getStatusText(currentTimeSheet.status)}`);
        } else {
            console.warn('⚠️ Élément status-badge non trouvé');
        }

        // Appliquer le verrouillage de l'interface selon le statut
        // Utiliser un délai pour s'assurer que tous les éléments sont chargés
        setTimeout(() => {
            toggleInterfaceLock();
        }, 100);
    } else {
        console.warn('⚠️ currentTimeSheet est null ou undefined');
    }
}

// Fonction pour mettre à jour le statut local et l'affichage
function updateTimeSheetStatus(newStatus) {
    if (currentTimeSheet) {
        currentTimeSheet.status = newStatus;
        updateStatusDisplay();
        console.log(`✅ Statut mis à jour: ${newStatus}`);
    }
}

// Obtenir le texte du statut
function getStatusText(status) {
    const statusMap = {
        'draft': 'Brouillon',
        'saved': 'Sauvegardée',
        'submitted': 'Soumise',
        'approved': 'Approuvée',
        'rejected': 'Rejetée',
        // Valeurs françaises de la DB
        'brouillon': 'Brouillon',
        'sauvegardé': 'Sauvegardée',
        'soumis': 'Soumise',
        'validé': 'Approuvée',
        'rejeté': 'Rejetée'
    };
    const displayText = statusMap[status] || status;
    console.log(`📊 getStatusText: ${status} -> ${displayText}`);
    return displayText;
}

// Fonction pour verrouiller/déverrouiller l'interface selon le statut
function toggleInterfaceLock() {
    // Seules les feuilles soumises ou approuvées sont verrouillées
    // Les feuilles rejetées peuvent être modifiées à nouveau
    const isLocked = currentTimeSheet && ['submitted', 'approved', 'soumis', 'validé'].includes(currentTimeSheet.status);

    console.log(`🔒 Verrouillage de l'interface: ${isLocked ? 'VERROUILLÉ' : 'DÉVERROUILLÉ'} (statut: ${currentTimeSheet?.status})`);
    console.log('🔍 Détails du verrouillage:', {
        currentTimeSheet: currentTimeSheet,
        status: currentTimeSheet?.status,
        isLocked: isLocked
    });

    // Désactiver/activer tous les champs de saisie d'heures
    const hourInputs = document.querySelectorAll('input[type="number"][data-day]');
    console.log(`🔍 Champs d'heures trouvés: ${hourInputs.length}`);
    hourInputs.forEach(input => {
        input.disabled = isLocked;
        input.style.backgroundColor = isLocked ? '#f8f9fa' : '';
        input.style.cursor = isLocked ? 'not-allowed' : '';
        console.log(`  - Champ ${input.name || input.id}: disabled=${input.disabled}`);
    });

    // Désactiver/activer les boutons d'ajout de ligne
    const addButtons = document.querySelectorAll('button[onclick="openAddActivityModal()"]');
    console.log(`🔍 Boutons d'ajout trouvés: ${addButtons.length}`);
    addButtons.forEach(button => {
        button.disabled = isLocked;
        button.style.opacity = isLocked ? '0.5' : '1';
        button.style.cursor = isLocked ? 'not-allowed' : 'pointer';
        console.log(`  - Bouton ${button.textContent.trim()}: disabled=${button.disabled}`);
    });

    // Désactiver/activer les boutons de suppression
    const deleteButtons = document.querySelectorAll('button[onclick*="deleteEntry"]');
    console.log(`🔍 Boutons de suppression trouvés: ${deleteButtons.length}`);
    deleteButtons.forEach(button => {
        button.disabled = isLocked;
        button.style.opacity = isLocked ? '0.5' : '1';
        button.style.cursor = isLocked ? 'not-allowed' : 'pointer';
        console.log(`  - Bouton suppression: disabled=${button.disabled}`);
    });

    // Les boutons de navigation (semaine précédente/suivante) restent toujours fonctionnels
    // Pas de modification pour les boutons de navigation

    // Désactiver/activer les boutons de sauvegarde, soumission et remise à zéro
    const actionButtons = document.querySelectorAll('button[onclick="saveTimeSheet()"], button[onclick="submitTimeSheet()"], button[onclick="resetTimeSheet()"]');
    console.log(`🔍 Boutons d'action trouvés: ${actionButtons.length}`);
    actionButtons.forEach(button => {
        button.disabled = isLocked;
        button.style.opacity = isLocked ? '0.5' : '1';
        button.style.cursor = isLocked ? 'not-allowed' : 'pointer';
        console.log(`  - Bouton ${button.textContent.trim()}: disabled=${button.disabled}`);
    });

    // Désactiver/activer les sélecteurs de mission et activité
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.disabled = isLocked;
        select.style.backgroundColor = isLocked ? '#f8f9fa' : '';
        select.style.cursor = isLocked ? 'not-allowed' : '';
    });

    // Afficher un message d'information si verrouillé
    const statusBadge = document.querySelector('#status-badge');
    if (statusBadge && isLocked) {
        statusBadge.style.cursor = 'help';
        if (currentTimeSheet.status === 'submitted') {
            statusBadge.title = 'Cette feuille de temps est soumise et en attente d\'approbation par le superviseur';
        } else if (currentTimeSheet.status === 'approved') {
            statusBadge.title = 'Cette feuille de temps a été approuvée et ne peut plus être modifiée';
        }
    }

    // Ajouter une classe CSS pour le style verrouillé
    const container = document.querySelector('.time-sheet-container');
    if (container) {
        if (isLocked) {
            container.classList.add('time-sheet-locked');

            // Ajouter un indicateur de verrouillage
            let lockIndicator = document.querySelector('.lock-indicator');
            if (!lockIndicator) {
                lockIndicator = document.createElement('div');
                lockIndicator.className = 'lock-indicator';
                lockIndicator.setAttribute('data-status', currentTimeSheet.status);
                if (currentTimeSheet.status === 'submitted') {
                    lockIndicator.innerHTML = '🔒 Feuille soumise - En attente d\'approbation';
                } else if (currentTimeSheet.status === 'approved') {
                    lockIndicator.innerHTML = '✅ Feuille approuvée - Lecture seule';
                }
                document.body.appendChild(lockIndicator);
            }
        } else {
            container.classList.remove('time-sheet-locked');

            // Supprimer l'indicateur de verrouillage
            const lockIndicator = document.querySelector('.lock-indicator');
            if (lockIndicator) {
                lockIndicator.remove();
            }
        }
    }
}

// Charger les entrées de temps
async function loadTimeEntries() {
    try {
        // Calculer la fin de semaine (7 jours après le début)
        const weekStartDate = new Date(currentWeekStart);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        const weekEnd = weekEndDate.toISOString().split('T')[0];

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?week_start=${currentWeekStart}&week_end=${weekEnd}`);
        if (response.ok) {
            const data = await response.json();
            const entries = data.data || data;

            displayTimeEntries(entries);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des entrées de temps:', error);
    }
}

// Afficher les entrées de temps
function displayTimeEntries(entries) {
    // Organiser les entrées par type et par mission/activité
    const chargeableEntries = organizeEntriesByWeek(entries.filter(entry => entry.type_heures === 'HC'));
    const nonChargeableEntries = organizeEntriesByWeek(entries.filter(entry => entry.type_heures === 'HNC'));

    displayChargeableEntries(chargeableEntries);
    displayNonChargeableEntries(nonChargeableEntries);
}

// Organiser les entrées par semaine
function organizeEntriesByWeek(entries) {
    const organized = {};

    entries.forEach(entry => {
        // Utiliser les vrais types de la base de données
        const isChargeable = entry.type_heures === 'HC';

        // Créer une clé unique pour chaque combinaison (harmoniser avec addChargeableRow/addNonChargeableRow)
        const key = isChargeable
            ? `chargeable-${entry.mission_id}-${entry.task_id || 'no-task'}`
            : `non-chargeable-${entry.internal_activity_id}`;

        if (!organized[key]) {
            organized[key] = {
                id: key,
                type_heures: entry.type_heures,
                mission_id: entry.mission_id,
                task_id: entry.task_id,
                internal_activity_id: entry.internal_activity_id,
                mission_name: entry.mission_nom || getMissionName(entry.mission_id),
                task_name: entry.task_nom || getTaskName(entry.task_id),
                activity_name: entry.internal_activity_nom || getInternalActivityName(entry.internal_activity_id),
                days: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                },
                total: 0
            };
        }

        const dayOfWeek = getDayOfWeek(entry.date_saisie);
        if (dayOfWeek && organized[key].days[dayOfWeek] !== undefined) {
            organized[key].days[dayOfWeek] += parseFloat(entry.heures) || 0;
            organized[key].total += parseFloat(entry.heures) || 0;
        }
    });

    return Object.values(organized);
}

// Obtenir le jour de la semaine
function getDayOfWeek(dateString) {
    const date = new Date(dateString);
    const day = date.getDay();
    // getDay() retourne: 0=Dimanche, 1=Lundi, 2=Mardi, 3=Mercredi, 4=Jeudi, 5=Vendredi, 6=Samedi
    // On veut retourner dans l'ordre: lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche
    // Mapping: 0(Dimanche)->6, 1(Lundi)->0, 2(Mardi)->1, 3(Mercredi)->2, 4(Jeudi)->3, 5(Vendredi)->4, 6(Samedi)->5
    const dayMapping = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mappedIndex = day === 0 ? 6 : day - 1; // Dimanche (0) devient index 6, Lundi (1) devient index 0, etc.

    return dayMapping[mappedIndex];
}

// Afficher les entrées chargeables
function displayChargeableEntries(entries) {
    const tbody = document.getElementById('chargeable-entries');
    if (!tbody) return;

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures chargeables pour cette semaine
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = entries.map(entry => `
        <tr class="time-entry-row" data-entry-id="${entry.id}">
            <td>${entry.mission_name || '-'}</td>
            <td>${entry.task_name || '-'}</td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.monday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="monday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.tuesday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="tuesday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.wednesday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="wednesday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.thursday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="thursday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.friday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="friday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.saturday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="saturday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.sunday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="sunday"></td>
            <td><strong>${entry.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEntry('${entry.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Ajouter les event listeners pour les modifications d'heures
    tbody.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('change', function () {
            const entryId = this.getAttribute('data-entry-id');
            updateRowTotal(entryId);
            updateTotals();
        });
    });
}

// Afficher les entrées non-chargeables
function displayNonChargeableEntries(entries) {
    const tbody = document.getElementById('non-chargeable-entries');
    if (!tbody) return;

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures non-chargeables pour cette semaine
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = entries.map(entry => `
        <tr class="time-entry-row" data-entry-id="${entry.id}">
            <td>${entry.activity_name || '-'}</td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.monday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="monday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.tuesday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="tuesday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.wednesday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="wednesday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.thursday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="thursday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.friday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="friday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.saturday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="saturday"></td>
            <td><input type="number" class="form-control form-control-sm hours-input" value="${entry.days.sunday}" step="0.25" min="0" max="24" data-entry-id="${entry.id}" data-day="sunday"></td>
            <td><strong>${entry.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEntry('${entry.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Ajouter les event listeners pour les modifications d'heures
    tbody.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('change', function () {
            const entryId = this.getAttribute('data-entry-id');
            updateRowTotal(entryId);
            updateTotals();
        });
    });
}

// Mettre à jour les heures d'une entrée
async function updateEntryHours(entryId, day, hours) {
    try {
        // Mettre à jour le total de la ligne
        updateRowTotal(entryId);

        // Mettre à jour les totaux généraux
        updateTotals();

        // Sauvegarder automatiquement les modifications
        await saveTimeEntry(entryId, day, hours);

        console.log(`Heures mises à jour pour ${entryId}, jour ${day}: ${hours}`);

    } catch (error) {
        console.error('Erreur lors de la mise à jour des heures:', error);
    }
}

// Sauvegarder une entrée de temps
async function saveTimeEntry(entryId, day, hours) {
    try {
        const date = getDateForDay(day);
        const userId = getCurrentUserId();

        console.log('💾 Sauvegarde entrée:', entryId, 'jour:', day, 'heures:', hours, 'date:', date);

        // Vérifier si l'entrée existe déjà
        const existingEntry = await getTimeEntry(entryId, date);

        if (existingEntry) {
            console.log('🔄 Mise à jour de l\'entrée existante:', existingEntry.id);
            // Mettre à jour l'entrée existante
            await updateTimeEntry(existingEntry.id, hours);
        } else {
            console.log('➕ Création d\'une nouvelle entrée');
            // Créer une nouvelle entrée
            await createTimeEntry(entryId, date, hours, userId);
        }

        console.log('✅ Entrée sauvegardée avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde de l\'entrée:', error);
        // Ne pas afficher d'alerte pour éviter de spammer l'utilisateur
    }
}

// Créer une nouvelle entrée de temps
async function createTimeEntry(entryId, date, hours, userId) {
    try {
        console.log('➕ Création nouvelle entrée:', entryId, 'date:', date, 'heures:', hours);

        // S'assurer qu'une feuille de temps existe pour cette semaine
        if (!currentTimeSheet || !currentTimeSheet.id) {
            console.log('📋 Création d\'une nouvelle feuille de temps pour la semaine');
            await createNewTimeSheet();

            if (!currentTimeSheet || !currentTimeSheet.id) {
                throw new Error('Impossible de créer la feuille de temps');
            }
        }

        const entryData = {
            time_sheet_id: currentTimeSheet.id,
            user_id: userId,
            date_saisie: date,
            heures: parseFloat(hours) || 0,
            mission_id: null,
            task_id: null,
            internal_activity_id: null,
            description: 'Saisie automatique',
            type_heures: 'HC'
        };

        // Déterminer le type d'entrée basé sur l'entryId
        if (entryId.startsWith('chargeable-')) {
            // Format: chargeable-{missionId}-{taskId}
            const chargeablePrefix = 'chargeable-';
            const remaining = entryId.substring(chargeablePrefix.length);
            const missionIdLength = 36; // UUID length

            if (remaining.length >= missionIdLength) {
                const missionId = remaining.substring(0, missionIdLength);

                // Vérifier que la mission existe
                const mission = missions.find(m => m.id === missionId);
                if (!mission) {
                    console.error('Mission non trouvée:', missionId);
                    throw new Error('Mission non trouvée');
                }

                entryData.mission_id = missionId;

                if (remaining.length > missionIdLength + 1 && remaining[missionIdLength] === '-') {
                    let taskId = remaining.substring(missionIdLength + 1);
                    // Pour les heures chargeables, une tâche est obligatoire
                    if (taskId && taskId !== 'no-task' && taskId.length === 36) {
                        // Vérifier que la tâche existe pour cette mission
                        let task = mission.tasks && mission.tasks.find(t => t.id === taskId);

                        // Si la tâche n'est pas trouvée dans les tâches chargées, essayer de la charger
                        if (!task) {
                            console.log(`🔍 Tâche ${taskId} non trouvée dans les tâches chargées, tentative de chargement...`);
                            try {
                                const response = await authenticatedFetch(`${API_BASE_URL}/missions/${missionId}/tasks`);
                                if (response.ok) {
                                    const data = await response.json();
                                    const tasks = data.data || data;
                                    console.log(`✅ ${tasks.length} tâches chargées pour la mission ${missionId}:`, tasks);

                                    task = tasks.find(t => t.id === taskId);
                                    if (task) {
                                        console.log(`✅ Tâche ${taskId} trouvée après chargement:`, task);
                                    }
                                }
                            } catch (error) {
                                console.error('❌ Erreur lors du chargement des tâches:', error);
                            }
                        }

                        if (task) {
                            entryData.task_id = taskId;
                        } else {
                            console.error('Tâche non trouvée pour la mission:', taskId);
                            throw new Error('Tâche obligatoire non trouvée pour les heures chargeables');
                        }
                    } else {
                        console.error('Tâche obligatoire manquante pour les heures chargeables');
                        throw new Error('Tâche obligatoire manquante pour les heures chargeables');
                    }
                } else {
                    console.error('Tâche obligatoire manquante pour les heures chargeables');
                    throw new Error('Tâche obligatoire manquante pour les heures chargeables');
                }
                entryData.type_heures = 'HC';
            } else {
                console.error('Malformed chargeable entryId (missionId too short):', entryId);
                throw new Error('Format d\'ID de mission invalide');
            }
        } else if (entryId.startsWith('non-chargeable-')) {
            // Format: non-chargeable-{activityId}
            const nonChargeablePrefix = 'non-chargeable-';
            const activityId = entryId.substring(nonChargeablePrefix.length);

            // Vérifier que l'activityId est valide et que l'activité existe
            if (activityId && activityId.length === 36) {
                const activity = internalActivities.find(a => a.id === activityId);
                if (activity) {
                    entryData.internal_activity_id = activityId;
                } else {
                    console.error('Activité interne non trouvée:', activityId);
                    throw new Error('Activité interne non trouvée');
                }
            } else {
                console.error('Format d\'ID d\'activité invalide:', activityId);
                throw new Error('Format d\'ID d\'activité invalide');
            }
            entryData.type_heures = 'HNC'; // Utiliser HNC au lieu de non-chargeable
        }

        console.log('📝 Données d\'entrée:', entryData);

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur lors de la création de l'entrée: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Entrée de temps créée avec succès:', result.data?.id);

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'entrée:', error);
        throw error;
    }
}

// Mettre à jour une entrée de temps existante
async function updateTimeEntry(entryId, hours) {
    try {
        console.log('🔄 Mise à jour entrée:', entryId, 'heures:', hours);

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                heures: parseFloat(hours) || 0
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur lors de la mise à jour de l'entrée: ${response.status}`);
        }

        console.log('✅ Entrée de temps mise à jour avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de l\'entrée:', error);
        throw error;
    }
}

// Récupérer une entrée de temps existante
async function getTimeEntry(entryId, date) {
    try {
        const userId = getCurrentUserId();
        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?user_id=${userId}&week_start=${date}&week_end=${date}`);

        if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des entrées: ${response.status}`);
        }

        const data = await response.json();
        const entries = data.data || [];

        console.log('🔍 Recherche entrée pour:', entryId, 'date:', date, 'entrées trouvées:', entries.length);

        // Trouver l'entrée correspondante basée sur l'entryId
        const matchingEntry = entries.find(entry => {
            if (entryId.startsWith('chargeable-')) {
                // Format: chargeable-{missionId}-{taskId}
                const chargeablePrefix = 'chargeable-';
                const remaining = entryId.substring(chargeablePrefix.length);
                const missionIdLength = 36;

                let missionId = null;
                let taskId = null;

                if (remaining.length >= missionIdLength) {
                    missionId = remaining.substring(0, missionIdLength);
                    if (remaining.length > missionIdLength + 1 && remaining[missionIdLength] === '-') {
                        let taskPart = remaining.substring(missionIdLength + 1);
                        taskId = (taskPart === 'no-task') ? null : taskPart;
                    }
                }
                return entry.mission_id === missionId && entry.task_id === taskId;
            } else if (entryId.startsWith('non-chargeable-')) {
                // Format: non-chargeable-{activityId}
                const activityId = entryId.substring('non-chargeable-'.length);
                return entry.internal_activity_id === activityId;
            }
            return false;
        });

        if (matchingEntry) {
            console.log('✅ Entrée trouvée:', matchingEntry.id);
        } else {
            console.log('ℹ️ Aucune entrée trouvée pour:', entryId);
        }

        return matchingEntry || null;

    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'entrée:', error);
        return null;
    }
}

// Charger les données existantes pour la semaine courante
async function loadExistingData() {
    try {
        const userId = getCurrentUserId();
        const weekStart = currentWeekStart;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        console.log('🔍 Chargement des données existantes pour la semaine:', weekStart, 'à', weekEndStr);

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?user_id=${userId}&week_start=${weekStart}&week_end=${weekEndStr}`);

        if (!response.ok) {
            console.error('Erreur lors du chargement des données:', response.status, response.statusText);
            throw new Error(`Erreur lors du chargement des données: ${response.status}`);
        }

        const data = await response.json();
        const entries = data.data || [];

        console.log('📊 Données récupérées:', entries.length, 'entrées');

        // Appliquer les données existantes aux champs de saisie
        applyExistingData(entries);

    } catch (error) {
        console.error('Erreur lors du chargement des données existantes:', error);
        // Ne pas afficher d'alerte pour éviter de spammer l'utilisateur
    }
}

// Appliquer les données existantes aux champs de saisie
function applyExistingData(entries) {
    console.log('🔄 Application des données existantes...');

    entries.forEach(entry => {
        const date = new Date(entry.date_saisie);
        const dayIndex = date.getDay();
        // Utiliser la même logique de mapping que getDayOfWeek
        // getDay() retourne: 0=Dimanche, 1=Lundi, 2=Mardi, 3=Mercredi, 4=Jeudi, 5=Vendredi, 6=Samedi
        // weekDays est: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Dimanche (0) devient index 6, Lundi (1) devient index 0, etc.
        const day = weekDays[mappedIndex];

        console.log('📅 Traitement entrée:', entry.id, 'pour le jour:', day, 'date:', entry.date_saisie, 'type:', entry.type_heures);

        // Trouver la ligne correspondante
        // Pour les entrées existantes, utiliser le vrai ID de base de données
        let rowId = entry.id; // Utiliser le vrai ID de base de données

        console.log('🔍 Recherche de la ligne:', rowId);

        if (rowId) {
            const row = document.querySelector(`tr[data-entry-id="${rowId}"]`);
            if (row) {
                console.log('✅ Ligne trouvée, mise à jour des heures');
                const dayIndex = weekDays.indexOf(day);
                const input = row.querySelector(`td:nth-child(${dayIndex + 3}) input`);
                if (input) {
                    input.value = entry.heures || 0;
                    updateRowTotal(rowId);
                    console.log('✅ Heures mises à jour:', entry.heures, 'pour le jour:', day);
                } else {
                    console.warn('⚠️ Champ de saisie non trouvé pour le jour:', day);
                }
            } else {
                console.warn('⚠️ Ligne non trouvée pour l\'entrée:', rowId);
                // NE PAS créer de ligne automatiquement - laisser l'utilisateur ajouter manuellement
                console.log('ℹ️ Ligne non trouvée, pas de création automatique pour éviter les doublons');
            }
        } else {
            console.warn('⚠️ Impossible de déterminer l\'ID de ligne pour l\'entrée:', entry);
        }
    });

    updateTotals();
    console.log('✅ Application des données existantes terminée');
}

// Créer une ligne manquante basée sur une entrée existante
function createMissingRow(entry) {
    console.log('🔧 Création de ligne manquante pour l\'entrée:', entry);

    // NE PAS créer de ligne automatiquement pour éviter les duplications
    console.log('ℹ️ Création automatique désactivée pour éviter les duplications');
}

// Mettre à jour le total d'une ligne
function updateRowTotal(entryId) {
    const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
    if (!row) {
        console.log(`⚠️ Ligne non trouvée pour entryId: ${entryId}`);
        return;
    }

    const inputs = row.querySelectorAll('input[type="number"]');
    let total = 0;

    inputs.forEach((input, index) => {
        const hours = parseFloat(input.value) || 0;
        total += hours;
        console.log(`  Jour ${index + 1}: ${hours}h`);
    });

    // Mettre à jour l'affichage du total
    // Pour les lignes HC: colonne 10, pour les lignes HNC: colonne 9
    const isChargeable = row.closest('#chargeable-entries') !== null;
    const totalColumn = isChargeable ? 10 : 9;
    const totalCell = row.querySelector(`td:nth-child(${totalColumn}) strong`);

    if (totalCell) {
        totalCell.textContent = total.toFixed(2);
        console.log(`✅ Total mis à jour pour ${entryId}: ${total.toFixed(2)}h`);
    } else {
        console.log(`⚠️ Cellule de total non trouvée pour ${entryId}`);
    }
}

// Obtenir la date pour un jour de la semaine
function getDateForDay(day) {
    // Créer une date à partir de currentWeekStart (format YYYY-MM-DD)
    // Éviter les problèmes de timezone en parsant manuellement la date
    const [year, month, dayOfMonth] = currentWeekStart.split('-').map(Number);
    const weekStart = new Date(year, month - 1, dayOfMonth); // month - 1 car les mois sont 0-indexés

    const dayIndex = weekDays.indexOf(day);

    // Calculer la date pour ce jour de la semaine
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);

    // Formater manuellement pour éviter les problèmes de timezone
    const resultYear = date.getFullYear();
    const resultMonth = String(date.getMonth() + 1).padStart(2, '0');
    const resultDay = String(date.getDate()).padStart(2, '0');
    const result = `${resultYear}-${resultMonth}-${resultDay}`;

    console.log(`📅 getDateForDay: ${day} -> ${result} (currentWeekStart: ${currentWeekStart})`);

    return result;
}

// Obtenir le nom d'une mission
function getMissionName(missionId) {
    const mission = missions.find(m => m.id === missionId);
    return mission ? mission.nom : 'Mission inconnue';
}

// Obtenir le nom d'une tâche
// Cache pour les tâches
const taskCache = new Map();

function getTaskName(taskId) {
    if (!taskId) return '-';

    console.log(`🔍 Recherche du nom de la tâche ${taskId}...`);

    // Vérifier d'abord le cache
    if (taskCache.has(taskId)) {
        const cachedName = taskCache.get(taskId);
        console.log(`✅ Tâche ${taskId} trouvée en cache: ${cachedName}`);
        return cachedName;
    }

    // Chercher dans les tâches configurées pour toutes les missions
    console.log(`📋 Recherche dans ${missions.length} missions...`);
    for (const mission of missions) {
        if (mission.tasks && Array.isArray(mission.tasks)) {
            console.log(`   🔍 Mission ${mission.id}: ${mission.tasks.length} tâches`);
            const task = mission.tasks.find(t => t.id === taskId);
            if (task) {
                const taskName = task.nom || task.name || `Tâche ${taskId}`;
                taskCache.set(taskId, taskName);
                console.log(`✅ Tâche ${taskId} trouvée dans la mission ${mission.id}: ${taskName}`);
                return taskName;
            }
        }
    }

    console.log(`⚠️ Tâche ${taskId} non trouvée dans les missions chargées, tentative via API...`);
    // Si pas trouvé, essayer de récupérer via API
    fetchTaskName(taskId);

    return `Tâche ${taskId}`;
}

// Fonction pour récupérer le nom d'une tâche via API
async function fetchTaskName(taskId) {
    try {
        console.log(`🔍 Récupération du nom de la tâche ${taskId} via API...`);
        const response = await authenticatedFetch(`${API_BASE_URL}/tasks/${taskId}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`📋 Données de la tâche ${taskId}:`, data);
            const taskName = data.libelle || data.name || `Tâche ${taskId}`;
            taskCache.set(taskId, taskName);
            console.log(`✅ Nom de la tâche ${taskId} mis en cache: ${taskName}`);
            return taskName;
        } else {
            console.error(`❌ Erreur API pour la tâche ${taskId}:`, response.status, response.statusText);
        }
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération du nom de la tâche ${taskId}:`, error);
    }
    return `Tâche ${taskId}`;
}

// Obtenir le nom d'une activité interne
function getInternalActivityName(activityId) {
    const activity = internalActivities.find(a => a.id === activityId);
    return activity ? (activity.name || activity.nom) : 'Activité inconnue';
}

// Mettre à jour les totaux
function updateTotals() {
    // Utiliser la classe time-entry-row pour identifier les vraies lignes de données
    const chargeableRows = document.querySelectorAll('#chargeable-entries tr.time-entry-row');
    const nonChargeableRows = document.querySelectorAll('#non-chargeable-entries tr.time-entry-row');

    let totalHours = 0;
    let chargeableHours = 0;
    let nonChargeableHours = 0;

    console.log(`📊 Calcul des totaux - Lignes HC: ${chargeableRows.length}, Lignes HNC: ${nonChargeableRows.length}`);

    chargeableRows.forEach((row, index) => {
        const totalCell = row.querySelector('td:nth-child(10) strong');
        if (totalCell) {
            const hours = parseFloat(totalCell.textContent);
            if (!isNaN(hours)) {
                chargeableHours += hours;
                totalHours += hours;
                console.log(`  HC Ligne ${index + 1}: ${hours}h`);
            }
        }
    });

    nonChargeableRows.forEach((row, index) => {
        const totalCell = row.querySelector('td:nth-child(9) strong');
        if (totalCell) {
            const hours = parseFloat(totalCell.textContent);
            if (!isNaN(hours)) {
                nonChargeableHours += hours;
                totalHours += hours;
                console.log(`  HNC Ligne ${index + 1}: ${hours}h`);
            }
        }
    });

    console.log(`📊 Totaux calculés - HC: ${chargeableHours}h, HNC: ${nonChargeableHours}h, Total: ${totalHours}h`);

    const totalHoursElement = document.getElementById('total-hours');
    const chargeableHoursElement = document.getElementById('chargeable-hours');
    const nonChargeableHoursElement = document.getElementById('non-chargeable-hours');

    if (totalHoursElement) totalHoursElement.textContent = totalHours.toFixed(2);
    if (chargeableHoursElement) chargeableHoursElement.textContent = chargeableHours.toFixed(2);
    if (nonChargeableHoursElement) nonChargeableHoursElement.textContent = nonChargeableHours.toFixed(2);

    // Mettre à jour le récapitulatif quotidien
    updateDailySummary();
}

// Mettre à jour le récapitulatif quotidien
function updateDailySummary() {
    const dailySummary = document.getElementById('daily-summary');
    if (!dailySummary) return;

    // Mettre à jour les en-têtes avec les dates
    updateDailySummaryHeaders();

    // Initialiser les totaux par jour
    const dailyTotals = {
        monday: { hc: 0, hnc: 0, total: 0 },
        tuesday: { hc: 0, hnc: 0, total: 0 },
        wednesday: { hc: 0, hnc: 0, total: 0 },
        thursday: { hc: 0, hnc: 0, total: 0 },
        friday: { hc: 0, hnc: 0, total: 0 },
        saturday: { hc: 0, hnc: 0, total: 0 },
        sunday: { hc: 0, hnc: 0, total: 0 }
    };

    // Calculer les totaux des heures chargeables
    const chargeableRows = document.querySelectorAll('#chargeable-entries tr.time-entry-row');
    chargeableRows.forEach(row => {
        for (let i = 3; i <= 9; i++) { // Colonnes 3 à 9 (Lundi à Dimanche)
            const input = row.querySelector(`td:nth-child(${i}) input`);
            if (input) {
                const hours = parseFloat(input.value) || 0;
                const day = weekDays[i - 3]; // weekDays[0] = monday, etc.
                dailyTotals[day].hc += hours;
                dailyTotals[day].total += hours;
            }
        }
    });

    // Calculer les totaux des heures non-chargeables
    const nonChargeableRows = document.querySelectorAll('#non-chargeable-entries tr.time-entry-row');
    nonChargeableRows.forEach(row => {
        for (let i = 2; i <= 8; i++) { // Colonnes 2 à 8 (Lundi à Dimanche)
            const input = row.querySelector(`td:nth-child(${i}) input`);
            if (input) {
                const hours = parseFloat(input.value) || 0;
                const day = weekDays[i - 2]; // weekDays[0] = monday, etc.
                dailyTotals[day].hnc += hours;
                dailyTotals[day].total += hours;
            }
        }
    });

    // Générer le HTML du récapitulatif horizontal
    const summaryCells = weekDays.map(day => {
        const totals = dailyTotals[day];

        // Déterminer la classe CSS selon le total
        let cellClass = '';
        if (totals.total > 8) {
            cellClass = 'table-warning'; // Plus de 8h
        } else if (totals.total === 0) {
            cellClass = 'table-light'; // 0h
        } else {
            cellClass = 'table-success'; // Entre 1h et 8h
        }

        return `
            <td class="text-center ${cellClass}">
                <div class="fw-bold">${totals.total.toFixed(1)}h</div>
                <small class="text-muted">
                    HC: ${totals.hc.toFixed(1)}h - HNC: ${totals.hnc.toFixed(1)}h
                </small>
            </td>
        `;
    }).join('');

    // Calculer le total hebdomadaire
    const weeklyTotal = {
        hc: Object.values(dailyTotals).reduce((sum, day) => sum + day.hc, 0),
        hnc: Object.values(dailyTotals).reduce((sum, day) => sum + day.hnc, 0),
        total: Object.values(dailyTotals).reduce((sum, day) => sum + day.total, 0)
    };

    // Générer le HTML complet
    const summaryHTML = `
        <tr class="table-info">
            <td><strong>Total (HC + HNC)</strong></td>
            ${summaryCells}
        </tr>
        <tr class="table-secondary">
            <td><strong>Total Semaine</strong></td>
            <td colspan="7" class="text-center">
                <strong>${weeklyTotal.total.toFixed(1)}h</strong>
                <small class="text-muted ms-2">
                    (HC: ${weeklyTotal.hc.toFixed(1)}h - HNC: ${weeklyTotal.hnc.toFixed(1)}h)
                </small>
            </td>
        </tr>
    `;

    dailySummary.innerHTML = summaryHTML;
}

// Mettre à jour les en-têtes du récapitulatif quotidien avec les dates
function updateDailySummaryHeaders() {
    const table = document.querySelector('#daily-summary').closest('table');
    if (!table) return;

    const thead = table.querySelector('thead tr');
    if (!thead) return;

    // Générer les dates pour chaque jour de la semaine
    const startDate = new Date(currentWeekStart + 'T12:00:00');
    const weekDates = weekDays.map((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });

    // Mettre à jour les en-têtes
    const dayNames = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
    const headerCells = thead.querySelectorAll('th');

    // Mettre à jour les cellules des jours (à partir de la 2ème cellule)
    for (let i = 1; i < headerCells.length && i - 1 < dayNames.length; i++) {
        headerCells[i].innerHTML = `
            ${dayNames[i - 1]}<br>
            <small class="text-muted">${weekDates[i - 1]}</small>
        `;
    }
}

// Ouvrir le modal d'ajout d'activité
function openAddActivityModal() {
    setupMissionTaskCascade(); // Setup mission-task cascade
    const form = document.getElementById('addActivityForm');
    if (form) form.reset();

    const missionFields = document.getElementById('mission-fields');
    const internalFields = document.getElementById('internal-fields');

    if (missionFields) missionFields.style.display = 'none';
    if (internalFields) internalFields.style.display = 'none';

    // Configurer la business unit selon le rôle de l'utilisateur
    configureBusinessUnitForUser();

    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    modal.show();
}

// Configurer la business unit selon le rôle de l'utilisateur
function configureBusinessUnitForUser() {
    const businessUnitSelect = document.getElementById('business-unit-select');
    if (!businessUnitSelect) {
        console.error('❌ Élément business-unit-select non trouvé');
        return;
    }

    console.log('🔧 Configuration business unit pour utilisateur via SessionManager');

    try {
        const user = sessionManager.getUser();
        const isAdmin = sessionManager.isAdmin();

        console.log('👤 Rôle utilisateur:', user.role, 'Est admin:', isAdmin);

        if (isAdmin) {
            // Pour les administrateurs : business unit libre
            businessUnitSelect.disabled = false;
            businessUnitSelect.style.backgroundColor = '';
            businessUnitSelect.innerHTML = '<option value="">Sélectionner une business unit</option>';

            businessUnits.forEach(bu => {
                const option = document.createElement('option');
                option.value = bu.id;
                option.textContent = bu.nom;
                businessUnitSelect.appendChild(option);
            });

            console.log('👤 Mode administrateur : business unit libre');
        } else {
            // Pour les collaborateurs : business unit fixée
            const businessUnit = sessionManager.getBusinessUnit();
            if (businessUnit) {
                businessUnitSelect.disabled = true;
                businessUnitSelect.style.backgroundColor = '#f8f9fa';
                businessUnitSelect.innerHTML = `<option value="${businessUnit.id}">${businessUnit.nom || 'Business Unit'}</option>`;

                // Charger automatiquement les activités de cette business unit
                loadInternalActivitiesForBusinessUnit(businessUnit.id);

                console.log('👤 Mode collaborateur : business unit fixée sur', businessUnit.nom, 'ID:', businessUnit.id);
            } else {
                // Fallback si pas de business unit
                businessUnitSelect.disabled = false;
                businessUnitSelect.style.backgroundColor = '';
                businessUnitSelect.innerHTML = '<option value="">Sélectionner une business unit</option>';

                businessUnits.forEach(bu => {
                    const option = document.createElement('option');
                    option.value = bu.id;
                    option.textContent = bu.nom;
                    businessUnitSelect.appendChild(option);
                });

                console.log('👤 Mode collaborateur : pas de business unit définie');
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de la configuration business unit:', error);
    }
}

// Basculer les champs selon le type d'activité
function toggleActivityFields() {
    const activityType = document.getElementById('activity-type').value;
    const missionFields = document.getElementById('mission-fields');
    const internalFields = document.getElementById('internal-fields');

    if (activityType === 'mission') {
        if (missionFields) missionFields.style.display = 'block';
        if (internalFields) internalFields.style.display = 'none';
    } else if (activityType === 'internal') {
        if (missionFields) missionFields.style.display = 'none';
        if (internalFields) internalFields.style.display = 'block';

        // Reconfigurer la business unit quand on bascule vers les activités internes
        configureBusinessUnitForUser();
    } else {
        if (missionFields) missionFields.style.display = 'none';
        if (internalFields) internalFields.style.display = 'none';
    }
}

// Ajouter une activité
async function addActivity() {
    const form = document.getElementById('addActivityForm');
    if (!form) return;

    const activityType = document.getElementById('activity-type').value;

    if (activityType === 'mission') {
        const missionId = document.getElementById('mission-select').value;
        const taskId = document.getElementById('task-select').value;

        if (!missionId) {
            showAlert('Veuillez sélectionner une mission', 'warning');
            return;
        }

        // Vérifier si la combinaison existe déjà avant d'ajouter
        if (isChargeableRowExists(missionId, taskId)) {
            const mission = missions.find(m => m.id === missionId);
            const missionName = mission ? mission.nom : 'Mission inconnue';

            // Récupérer le nom de la tâche pour un message plus précis
            let taskName = 'cette tâche';
            if (taskId) {
                const taskSelect = document.getElementById('task-select');
                if (taskSelect) {
                    const selectedOption = taskSelect.querySelector(`option[value="${taskId}"]`);
                    if (selectedOption) {
                        taskName = selectedOption.textContent.trim();
                    }
                }
            }

            showAlert(`La combinaison "${missionName}" / "${taskName}" existe déjà dans la feuille de temps`, 'warning');
            return;
        }

        // Ajouter une ligne dans le tableau des heures chargeables
        addChargeableRow(missionId, taskId);

        // Fermer le modal et réinitialiser le formulaire
        const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
        if (modal) modal.hide();
        if (form) form.reset();

        showAlert('Ligne ajoutée au tableau', 'success');

    } else if (activityType === 'internal') {
        const businessUnitSelect = document.getElementById('business-unit-select');
        const activityId = document.getElementById('internal-activity-select').value;

        // Déterminer la business unit selon le rôle
        let businessUnitId;
        try {
            if (sessionManager.isAdmin()) {
                // Pour les administrateurs : utiliser la sélection
                businessUnitId = businessUnitSelect.value;
                if (!businessUnitId) {
                    showAlert('Veuillez sélectionner une business unit', 'warning');
                    return;
                }
            } else {
                // Pour les collaborateurs : utiliser la business unit fixée
                const businessUnit = sessionManager.getBusinessUnit();
                businessUnitId = businessUnit ? businessUnit.id : businessUnitSelect.value;
                if (!businessUnitId) {
                    showAlert('Aucune business unit définie pour votre compte', 'warning');
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la business unit:', error);
            showAlert('Erreur lors de la récupération de votre profil', 'error');
            return;
        }

        if (!activityId) {
            showAlert('Veuillez sélectionner une activité', 'warning');
            return;
        }

        // Vérifier si l'activité existe déjà avant d'ajouter
        if (isNonChargeableRowExists(activityId)) {
            const activity = internalActivities.find(a => a.id === activityId);
            const activityName = activity ? (activity.description || activity.name || activity.nom) : 'Activité inconnue';
            showAlert(`L'activité "${activityName}" existe déjà dans la feuille de temps`, 'warning');
            return;
        }

        // Ajouter une ligne dans le tableau des heures non-chargeables
        addNonChargeableRow(activityId);

        // Fermer le modal et réinitialiser le formulaire
        const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
        if (modal) modal.hide();
        if (form) form.reset();

        showAlert('Ligne ajoutée au tableau', 'success');
    }
}

// Vérifier si une combinaison mission/tâche existe déjà
function isChargeableRowExists(missionId, taskId) {
    const tbody = document.getElementById('chargeable-entries');
    if (!tbody) return false;

    const existingRows = tbody.querySelectorAll('tr.time-entry-row');
    for (const row of existingRows) {
        const rowId = row.getAttribute('data-entry-id');
        if (rowId) {
            // Gérer les deux formats possibles :
            // 1. Format généré par le frontend: chargeable-{missionId}-{taskId}
            // 2. Format UUID de base de données (pour les entrées existantes)

            if (rowId.startsWith('chargeable-')) {
                // Format généré par le frontend
                const parts = rowId.split('-');
                if (parts.length >= 3) {
                    const existingMissionId = parts[1];
                    const existingTaskId = parts[2];

                    // Comparer les IDs
                    if (existingMissionId === missionId && existingTaskId === (taskId || 'no-task')) {
                        return true;
                    }
                }
            } else if (rowId.length === 36 && !rowId.includes('-')) {
                // Format UUID de base de données - vérifier via les données de la ligne
                const missionCell = row.querySelector('td:first-child');
                const taskCell = row.querySelector('td:nth-child(2)');

                if (missionCell && taskCell) {
                    const mission = missions.find(m => m.id === missionId);
                    const missionName = mission ? mission.nom : 'Mission inconnue';

                    if (missionCell.textContent.trim() === missionName) {
                        // Vérifier si c'est la même tâche
                        const taskSelect = document.getElementById('task-select');
                        if (taskSelect) {
                            const selectedOption = taskSelect.querySelector(`option[value="${taskId}"]`);
                            if (selectedOption && taskCell.textContent.trim() === selectedOption.textContent.trim()) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

// Vérifier si une activité interne existe déjà
function isNonChargeableRowExists(activityId) {
    const tbody = document.getElementById('non-chargeable-entries');
    if (!tbody) return false;

    const existingRows = tbody.querySelectorAll('tr.time-entry-row');
    for (const row of existingRows) {
        const rowId = row.getAttribute('data-entry-id');
        if (rowId) {
            // Gérer les deux formats possibles :
            // 1. Format généré par le frontend: non-chargeable-{activityId}
            // 2. Format UUID de base de données (pour les entrées existantes)

            if (rowId.startsWith('non-chargeable-')) {
                // Format généré par le frontend
                const parts = rowId.split('-');
                if (parts.length >= 3) {
                    const existingActivityId = parts[2];

                    // Comparer les IDs
                    if (existingActivityId === activityId) {
                        return true;
                    }
                }
            } else if (rowId.length === 36 && !rowId.includes('-')) {
                // Format UUID de base de données - vérifier via les données de la ligne
                const activityCell = row.querySelector('td:first-child');

                if (activityCell) {
                    const activity = internalActivities.find(a => a.id === activityId);
                    const activityName = activity ? (activity.description || activity.name || activity.nom) : 'Activité inconnue';

                    if (activityCell.textContent.trim() === activityName) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Ajouter une ligne dans le tableau des heures chargeables
function addChargeableRow(missionId, taskId, customRowId = null) {
    const tbody = document.getElementById('chargeable-entries');
    if (!tbody) return;

    // Vérifier si la combinaison existe déjà
    if (isChargeableRowExists(missionId, taskId)) {
        const mission = missions.find(m => m.id === missionId);
        const missionName = mission ? mission.nom : 'Mission inconnue';

        // Récupérer le nom de la tâche pour un message plus précis
        let taskName = 'cette tâche';
        if (taskId) {
            const taskSelect = document.getElementById('task-select');
            if (taskSelect) {
                const selectedOption = taskSelect.querySelector(`option[value="${taskId}"]`);
                if (selectedOption) {
                    taskName = selectedOption.textContent.trim();
                }
            }
        }

        showAlert(`La combinaison "${missionName}" / "${taskName}" existe déjà dans la feuille de temps`, 'warning');
        return;
    }

    // Supprimer le message "aucune entrée" s'il existe
    const noDataRow = tbody.querySelector('tr td[colspan="11"]');
    if (noDataRow) {
        noDataRow.parentElement.remove();
    }

    const mission = missions.find(m => m.id === missionId);

    // Récupérer la vraie description de la tâche avec priorité
    let taskDisplayName = '-';
    if (taskId) {
        // Chercher la tâche dans les données chargées
        const taskSelect = document.getElementById('task-select');
        if (taskSelect) {
            const selectedOption = taskSelect.querySelector(`option[value="${taskId}"]`);
            if (selectedOption) {
                // Utiliser le textContent qui contient déjà la priorité correcte
                // (description > libellé > nom) comme défini dans loadTasksForMission
                taskDisplayName = selectedOption.textContent;
            } else {
                // Fallback si l'option n'est pas trouvée
                taskDisplayName = `Tâche ${taskId}`;
            }
        } else {
            taskDisplayName = `Tâche ${taskId}`;
        }
    }

    const rowId = customRowId || `chargeable-${missionId}-${taskId || 'no-task'}`;

    const newRow = document.createElement('tr');
    newRow.className = 'time-entry-row';
    newRow.setAttribute('data-entry-id', rowId);
    newRow.innerHTML = `
        <td>${mission ? mission.nom : 'Mission inconnue'}</td>
        <td>${taskDisplayName}</td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="monday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="tuesday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="wednesday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="thursday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="friday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="saturday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="sunday"></td>
        <td><strong>0.00</strong></td>
        <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteEntry('${rowId}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(newRow);
    updateTotals();
}

// Ajouter une ligne dans le tableau des heures non-chargeables
function addNonChargeableRow(activityId, customRowId = null) {
    const tbody = document.getElementById('non-chargeable-entries');
    if (!tbody) return;

    // Vérifier si l'activité existe déjà
    if (isNonChargeableRowExists(activityId)) {
        const activity = internalActivities.find(a => a.id === activityId);
        const activityName = activity ? (activity.description || activity.name || activity.nom) : 'Activité inconnue';
        showAlert(`L'activité "${activityName}" existe déjà dans la feuille de temps`, 'warning');
        return;
    }

    // Supprimer le message "aucune entrée" s'il existe
    const noDataRow = tbody.querySelector('tr td[colspan="10"]');
    if (noDataRow) {
        noDataRow.parentElement.remove();
    }

    const activity = internalActivities.find(a => a.id === activityId);

    const rowId = customRowId || `non-chargeable-${activityId}`;

    const newRow = document.createElement('tr');
    newRow.className = 'time-entry-row';
    newRow.setAttribute('data-entry-id', rowId);
    newRow.innerHTML = `
        <td>${activity ? (activity.description || activity.name || activity.nom) : 'Activité inconnue'}</td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="monday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="tuesday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="wednesday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="thursday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="friday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="saturday"></td>
        <td><input type="number" class="form-control form-control-sm hours-input" value="0" step="0.25" min="0" max="24" data-entry-id="${rowId}" data-day="sunday"></td>
        <td><strong>0.00</strong></td>
        <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteEntry('${rowId}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(newRow);
    updateTotals();
}

// Sauvegarder la feuille de temps
async function saveTimeSheet() {
    try {
        console.log('💾 Début de la sauvegarde de la feuille de temps...');

        // Récupérer toutes les entrées temporaires de la page
        const timeEntries = [];
        const inputFields = document.querySelectorAll('input[type="number"][data-entry-id]');

        console.log(`📊 Récupération de ${inputFields.length} champs de saisie...`);

        // Grouper par entryId et par date pour éviter les doublons
        const entriesByRowAndDate = {};

        for (const input of inputFields) {
            const entryId = input.getAttribute('data-entry-id');
            const day = input.getAttribute('data-day');
            const hours = parseFloat(input.value) || 0;

            if (hours > 0) {
                const date = getDateForDay(day);
                const key = `${entryId}-${date}`;

                if (!entriesByRowAndDate[key]) {
                    entriesByRowAndDate[key] = {
                        entryId,
                        date,
                        hours,
                        userId: getCurrentUserId()
                    };
                } else {
                    // Si une entrée existe déjà pour cette combinaison, prendre la plus grande valeur
                    entriesByRowAndDate[key].hours = Math.max(entriesByRowAndDate[key].hours, hours);
                }

                console.log(`➕ Entrée à sauvegarder: ${entryId}, date: ${date}, heures: ${hours}`);
            }
        }

        // Convertir en tableau
        timeEntries.push(...Object.values(entriesByRowAndDate));

        // Si aucune entrée, ne rien faire
        if (timeEntries.length === 0) {
            showAlert('Aucune entrée à sauvegarder', 'info');
            return;
        }

        // Si la feuille de temps n'existe pas encore (mode brouillon), la créer
        if (!currentTimeSheet || !currentTimeSheet.id) {
            console.log('📋 Création d\'une nouvelle feuille de temps en DB...');

            const weekEnd = getSundayOfWeek(currentWeekStart);
            const createResponse = await authenticatedFetch(`${API_BASE_URL}/time-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: getCurrentUserId(),
                    week_start: currentWeekStart,
                    week_end: weekEnd,
                    status: 'sauvegardé'
                })
            });

            if (createResponse.ok) {
                const result = await createResponse.json();
                currentTimeSheet = result.data;
                console.log('✅ Feuille de temps créée avec ID:', currentTimeSheet.id);
            } else {
                const error = await createResponse.json();
                showAlert('Erreur lors de la création de la feuille de temps: ' + (error.message || 'Erreur inconnue'), 'danger');
                return;
            }
        }

        // Vérifier le statut actuel de la feuille
        const editableStatuses = ['draft', 'saved', 'rejected', 'sauvegardé', 'rejeté', 'brouillon'];
        if (currentTimeSheet.status && !editableStatuses.includes(currentTimeSheet.status)) {
            return;
        }

        // Nettoyer les entrées existantes pour cette semaine avant de sauvegarder
        console.log('🧹 Nettoyage des entrées existantes pour cette semaine...');
        try {
            const userId = getCurrentUserId();
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = weekEnd.toISOString().split('T')[0];

            const response = await authenticatedFetch(`${API_BASE_URL}/time-entries/delete-week?user_id=${userId}&week_start=${currentWeekStart}&week_end=${weekEndStr}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ ${result.deletedCount || 0} entrées existantes supprimées`);
            } else {
                console.warn('⚠️ Impossible de supprimer les entrées existantes, continuation...');
                const errorText = await response.text();
                console.warn('Détails de l\'erreur:', errorText);
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du nettoyage des entrées existantes:', error);
        }

        // Sauvegarder chaque entrée
        let savedCount = 0;
        const processedEntries = new Set(); // Pour éviter les doublons

        for (const entry of timeEntries) {
            const entryKey = `${entry.entryId}-${entry.date}`;

            if (processedEntries.has(entryKey)) {
                console.log(`⏭️ Entrée déjà traitée: ${entryKey}`);
                continue;
            }

            try {
                // Créer une nouvelle entrée (les anciennes ont été supprimées)
                await createTimeEntry(entry.entryId, entry.date, entry.hours, entry.userId);
                console.log(`➕ Nouvelle entrée créée: ${entry.entryId} pour ${entry.date}`);

                savedCount++;
                processedEntries.add(entryKey);
                console.log(`✅ Entrée sauvegardée: ${entry.entryId} pour ${entry.date}`);
            } catch (error) {
                console.error(`❌ Erreur lors de la sauvegarde de l'entrée ${entry.entryId}:`, error);
            }
        }

        // Mettre à jour le statut de la feuille de temps
        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheets/${currentTimeSheet.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                statut: 'sauvegardé'
            })
        });

        if (response.ok) {
            // Mettre à jour le statut local immédiatement
            updateTimeSheetStatus('sauvegardé');

            // Nettoyer l'affichage actuel avant de recharger
            console.log('🧹 Nettoyage de l\'affichage avant rechargement...');
            const chargeableRows = document.querySelectorAll('#chargeable-entries tr.time-entry-row');
            const nonChargeableRows = document.querySelectorAll('#non-chargeable-entries tr.time-entry-row');

            chargeableRows.forEach(row => row.remove());
            nonChargeableRows.forEach(row => row.remove());

            console.log(`🗑️ ${chargeableRows.length} lignes HC et ${nonChargeableRows.length} lignes HNC supprimées`);

            // Recharger les données pour s'assurer de la cohérence
            await loadWeekData();

            // Recalculer les totaux
            updateTotals();
            updateDailySummary();

            if (savedCount > 0) showAlert(`${savedCount} entrée(s) sauvegardée(s) avec succès`, 'success');
        } else {
            const errorData = await response.json();
            console.error('Erreur serveur:', errorData);
            showAlert('Erreur lors de la sauvegarde: ' + (errorData.error || 'Erreur inconnue'), 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showAlert('Erreur lors de la sauvegarde', 'danger');
    }
}

// Soumettre la feuille de temps
async function submitTimeSheet() {
    try {
        // Vérifier si currentTimeSheet existe
        if (!currentTimeSheet || !currentTimeSheet.id) {
            console.error('Aucune feuille de temps actuelle disponible');
            showAlert('Erreur: Aucune feuille de temps disponible', 'danger');
            return;
        }

        // Vérifier si la feuille est déjà soumise
        if (currentTimeSheet.status === 'soumis') {
            showAlert('Cette feuille de temps a déjà été soumise pour approbation', 'info');
            return;
        }

        // Vérifier si la feuille peut être soumise
        const submittableStatuses = ['draft', 'saved', 'rejected', 'sauvegardé', 'rejeté', 'brouillon'];
        if (currentTimeSheet.status && !submittableStatuses.includes(currentTimeSheet.status)) {
            showAlert('Cette feuille de temps ne peut plus être soumise (statut: ' + getStatusText(currentTimeSheet.status) + ')', 'warning');
            return;
        }

        // Demander confirmation
        const confirmed = confirm('Êtes-vous sûr de vouloir soumettre cette feuille de temps pour approbation ?\n\nCette action ne peut pas être annulée.');
        if (!confirmed) {
            return;
        }

        console.log('📤 Soumission de la feuille de temps...');

        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheet-approvals/${currentTimeSheet.id}/submit`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Feuille de temps soumise:', data);

            showAlert(`Feuille de temps soumise avec succès ! ${data.data.supervisors} superviseur(s) notifié(s).`, 'success');

            // Mettre à jour le statut local immédiatement
            updateTimeSheetStatus('soumis');

            // Appliquer le verrouillage immédiatement
            toggleInterfaceLock();

            // Recharger les données pour mettre à jour le statut
            await loadWeekData();
        } else {
            const errorData = await response.json();
            console.error('Erreur serveur:', errorData);

            // Gérer les erreurs spécifiques
            if (errorData.error && errorData.error.includes('déjà été soumise')) {
                showAlert('Cette feuille de temps a déjà été soumise pour approbation', 'info');
                // Mettre à jour le statut local
                updateTimeSheetStatus('submitted');
            } else {
                showAlert('Erreur lors de la soumission: ' + (errorData.error || 'Erreur inconnue'), 'danger');
            }
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        showAlert('Erreur lors de la soumission', 'danger');
    }
}

// Exporter la feuille de temps
function exportTimeSheet() {
    showAlert('Fonctionnalité d\'export en cours de développement', 'info');
}

// Remettre la feuille de temps à zéro
async function resetTimeSheet() {
    try {
        // Demander confirmation à l'utilisateur
        const confirmed = confirm('Êtes-vous sûr de vouloir remettre à zéro cette feuille de temps ?\n\nCette action supprimera toutes les lignes et remettra tous les compteurs d\'heures à zéro.');

        if (!confirmed) {
            console.log('❌ Remise à zéro annulée par l\'utilisateur');
            return;
        }

        console.log('🔄 Début de la remise à zéro de la feuille de temps...');

        // Vérifier si currentTimeSheet existe
        if (!currentTimeSheet || !currentTimeSheet.id) {
            console.error('Aucune feuille de temps actuelle disponible');
            showAlert('Erreur: Aucune feuille de temps disponible', 'danger');
            return;
        }

        // Vérifier le statut actuel de la feuille
        const editableStatuses = ['draft', 'saved', 'rejected'];
        if (currentTimeSheet.status && !editableStatuses.includes(currentTimeSheet.status)) {
            // showAlert('Cette feuille de temps ne peut plus être modifiée (statut: ' + getStatusText(currentTimeSheet.status) + ')', 'warning');
            return;
        }

        // Supprimer toutes les entrées de la semaine de la base de données
        console.log('🗑️ Suppression de toutes les entrées de la semaine...');

        try {
            // Calculer les dates de début et fin de semaine
            const weekStartStr = currentWeekStart;
            const weekEndStr = getSundayOfWeek(currentWeekStart);
            const userId = getCurrentUserId();

            console.log(`📅 Suppression des entrées pour la semaine: ${weekStartStr} à ${weekEndStr} pour l'utilisateur: ${userId}`);

            // Supprimer toutes les entrées de la semaine pour cet utilisateur
            const response = await authenticatedFetch(`${API_BASE_URL}/time-entries/delete-week?user_id=${userId}&week_start=${weekStartStr}&week_end=${weekEndStr}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ ${result.deletedCount || 0} entrées supprimées de la base de données`);
            } else {
                console.warn(`⚠️ Échec de suppression des entrées: ${response.status}`);
                // Si l'endpoint n'existe pas, essayer de supprimer une par une
                console.log('🔄 Tentative de suppression individuelle des entrées...');
                await deleteIndividualEntries();
            }
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des entrées:', error);
            // En cas d'erreur, essayer de supprimer une par une
            console.log('🔄 Tentative de suppression individuelle des entrées...');
            await deleteIndividualEntries();
        }

        // Fonction de fallback pour supprimer les entrées une par une
        async function deleteIndividualEntries() {
            try {
                // Récupérer toutes les entrées de la semaine depuis la base de données
                const weekStartStr = currentWeekStart;
                const weekEndStr = getSundayOfWeek(currentWeekStart);
                const userId = getCurrentUserId();

                const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?user_id=${userId}&week_start=${weekStartStr}&week_end=${weekEndStr}`);

                if (response.ok) {
                    const data = await response.json();
                    const entries = data.data || [];

                    console.log(`🗑️ Suppression individuelle de ${entries.length} entrées...`);

                    // Supprimer chaque entrée une par une
                    for (const entry of entries) {
                        try {
                            const deleteResponse = await authenticatedFetch(`${API_BASE_URL}/time-entries/${entry.id}`, {
                                method: 'DELETE'
                            });

                            if (deleteResponse.ok) {
                                console.log(`✅ Entrée supprimée: ${entry.id}`);
                            } else {
                                console.warn(`⚠️ Échec de suppression de l'entrée: ${entry.id}`);
                            }
                        } catch (error) {
                            console.error(`❌ Erreur lors de la suppression de l'entrée ${entry.id}:`, error);
                        }
                    }
                } else {
                    console.error('❌ Erreur lors de la récupération des entrées:', response.status);
                }
            } catch (error) {
                console.error('❌ Erreur lors de la suppression individuelle:', error);
            }
        }

        // Vider les tableaux des heures chargeables et non-chargeables
        const chargeableTbody = document.getElementById('chargeable-entries');
        const nonChargeableTbody = document.getElementById('non-chargeable-entries');

        console.log('🗑️ Vidage des tableaux...');

        if (chargeableTbody) {
            console.log('🗑️ Vidage du tableau des heures chargeables');
            // Supprimer explicitement toutes les lignes avec la classe time-entry-row
            const chargeableRows = chargeableTbody.querySelectorAll('tr.time-entry-row');
            chargeableRows.forEach(row => {
                console.log('🗑️ Suppression de ligne chargeable:', row.dataset.entryId);
                row.remove();
            });

            // Vérifier s'il reste des lignes et ajouter le message si nécessaire
            const remainingChargeableRows = chargeableTbody.querySelectorAll('tr');
            if (remainingChargeableRows.length === 0 ||
                (remainingChargeableRows.length === 1 && remainingChargeableRows[0].querySelector('td[colspan]'))) {
                chargeableTbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center text-muted">
                            <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures chargeables pour cette semaine
                        </td>
                    </tr>
                `;
            }
        }

        if (nonChargeableTbody) {
            console.log('🗑️ Vidage du tableau des heures non-chargeables');
            // Supprimer explicitement toutes les lignes avec la classe time-entry-row
            const nonChargeableRows = nonChargeableTbody.querySelectorAll('tr.time-entry-row');
            nonChargeableRows.forEach(row => {
                console.log('🗑️ Suppression de ligne non-chargeable:', row.dataset.entryId);
                row.remove();
            });

            // Vérifier s'il reste des lignes et ajouter le message si nécessaire
            const remainingNonChargeableRows = nonChargeableTbody.querySelectorAll('tr');
            if (remainingNonChargeableRows.length === 0 ||
                (remainingNonChargeableRows.length === 1 && remainingNonChargeableRows[0].querySelector('td[colspan]'))) {
                nonChargeableTbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center text-muted">
                            <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures non-chargeables pour cette semaine
                        </td>
                    </tr>
                `;
            }
        }

        // Remettre à zéro les totaux
        console.log('🔄 Remise à zéro des totaux...');
        updateTotals();
        updateDailySummary();

        // Forcer l'affichage des totaux à zéro
        const totalHoursElement = document.getElementById('total-hours');
        const chargeableHoursElement = document.getElementById('chargeable-hours');
        const nonChargeableHoursElement = document.getElementById('non-chargeable-hours');

        if (totalHoursElement) totalHoursElement.textContent = '0.00';
        if (chargeableHoursElement) chargeableHoursElement.textContent = '0.00';
        if (nonChargeableHoursElement) nonChargeableHoursElement.textContent = '0.00';

        // Mettre à jour le statut de la feuille de temps à 'draft'
        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheets/${currentTimeSheet.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'draft'
            })
        });

        if (response.ok) {
            // Mettre à jour le statut local
            updateTimeSheetStatus('draft');

            showAlert('Feuille de temps remise à zéro avec succès', 'success');
            console.log('✅ Remise à zéro terminée avec succès');
        } else {
            const errorData = await response.json();
            console.error('Erreur serveur:', errorData);
            showAlert('Erreur lors de la mise à jour du statut: ' + (errorData.error || 'Erreur inconnue'), 'danger');
        }

        // Vérification finale que tout est bien remis à zéro
        console.log('🔍 Vérification finale...');
        const remainingRows = document.querySelectorAll('tr.time-entry-row');
        console.log(`📊 Lignes restantes: ${remainingRows.length}`);

        if (remainingRows.length === 0) {
            console.log('✅ Toutes les lignes ont été supprimées avec succès');
        } else {
            console.warn(`⚠️ Il reste ${remainingRows.length} lignes non supprimées`);
        }

    } catch (error) {
        console.error('Erreur lors de la remise à zéro:', error);
        showAlert('Erreur lors de la remise à zéro', 'danger');
    }
}

// Charger la semaine précédente
async function loadPreviousWeek() {
    // Protection contre les clics multiples
    if (isNavigating) {
        console.log('⚠️ Navigation en cours, clic ignoré');
        return;
    }

    console.log('🔙 Chargement de la semaine précédente');
    isNavigating = true;

    try {
        // Calculer le lundi de la semaine précédente
        const currentMonday = new Date(currentWeekStart + 'T12:00:00');
        const previousMonday = new Date(currentMonday);
        previousMonday.setDate(currentMonday.getDate() - 7);

        // Éviter les problèmes de timezone en formatant manuellement
        const year = previousMonday.getFullYear();
        const month = String(previousMonday.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(previousMonday.getDate()).padStart(2, '0');
        const newWeekStart = `${year}-${month}-${dayOfMonth}`;

        console.log('📅 Semaine actuelle:', currentWeekStart);
        console.log('📅 Nouvelle semaine (lundi):', newWeekStart);

        // Sauvegarder les données actuelles avant de changer de semaine
        await saveCurrentWeekData();

        // Mettre à jour la semaine courante
        currentWeekStart = newWeekStart;

        // Charger les données de la nouvelle semaine
        await loadWeekData();
        updateWeekDisplay();

        // Charger les données existantes pour la nouvelle semaine
        await loadExistingData();

        console.log('✅ Semaine précédente chargée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la semaine précédente:', error);
        showAlert('Erreur lors du chargement de la semaine précédente', 'danger');
    } finally {
        isNavigating = false;
    }
}

// Charger la semaine suivante
async function loadNextWeek() {
    // Protection contre les clics multiples
    if (isNavigating) {
        console.log('⚠️ Navigation en cours, clic ignoré');
        return;
    }

    console.log('➡️ Chargement de la semaine suivante');
    isNavigating = true;

    try {
        // Calculer le lundi de la semaine suivante
        const currentMonday = new Date(currentWeekStart + 'T12:00:00');
        const nextMonday = new Date(currentMonday);
        nextMonday.setDate(currentMonday.getDate() + 7);

        // Éviter les problèmes de timezone en formatant manuellement
        const year = nextMonday.getFullYear();
        const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(nextMonday.getDate()).padStart(2, '0');
        const newWeekStart = `${year}-${month}-${dayOfMonth}`;

        console.log('📅 Semaine actuelle:', currentWeekStart);
        console.log('📅 Nouvelle semaine (lundi):', newWeekStart);

        // Sauvegarder les données actuelles avant de changer de semaine
        await saveCurrentWeekData();

        // Mettre à jour la semaine courante
        currentWeekStart = newWeekStart;

        // Charger les données de la nouvelle semaine
        await loadWeekData();
        updateWeekDisplay();

        // Charger les données existantes pour la nouvelle semaine
        await loadExistingData();

        console.log('✅ Semaine suivante chargée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la semaine suivante:', error);
        showAlert('Erreur lors du chargement de la semaine suivante', 'danger');
    } finally {
        isNavigating = false;
    }
}

// Sauvegarder les données de la semaine actuelle
async function saveCurrentWeekData() {
    console.log('💾 Sauvegarde des données de la semaine actuelle...');

    try {
        // Ne pas sauvegarder si la feuille est en mode brouillon (pas encore créée en DB)
        if (!currentTimeSheet || currentTimeSheet.id === null) {
            console.log('ℹ️ Feuille en mode brouillon, pas de sauvegarde nécessaire');
            return;
        }

        // Utiliser saveTimeSheet() au lieu de saveTimeEntry() pour éviter les doublons
        await saveTimeSheet();
        console.log('✅ Données de la semaine sauvegardées');
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des données:', error);
        // Ne pas bloquer la navigation en cas d'erreur de sauvegarde
    }
}

// Rendre les fonctions accessibles globalement
window.loadPreviousWeek = loadPreviousWeek;
window.loadNextWeek = loadNextWeek;
window.deleteEntry = deleteEntry;
window.debugDeleteEntry = debugDeleteEntry;
window.resetTimeSheet = resetTimeSheet;
window.saveTimeSheet = saveTimeSheet;
window.submitTimeSheet = submitTimeSheet;
window.exportTimeSheet = exportTimeSheet;
window.openAddActivityModal = openAddActivityModal;
window.addActivity = addActivity;
window.toggleActivityFields = toggleActivityFields;
window.configureBusinessUnitForUser = configureBusinessUnitForUser;

// Supprimer une entrée
async function deleteEntry(entryId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
        try {
            console.log(`🗑️ Début de suppression pour entryId: ${entryId}`);

            // Vérifier le statut de la feuille de temps avant d'autoriser la suppression
            const canDelete = await checkTimeSheetStatusForDeletion();

            if (!canDelete) {
                showAlert('Impossible de supprimer : la feuille de temps est soumise ou validée', 'warning');
                return;
            }

            // Supprimer les entrées de temps en base de données AVANT de supprimer la ligne visuelle
            console.log('🗑️ Suppression en base de données...');
            await deleteTimeEntriesForEntry(entryId);

            // Supprimer la ligne du tableau
            const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
            if (row) {
                // Récupérer le tbody avant de supprimer la ligne
                const tbody = row.parentElement;

                // Supprimer la ligne
                row.remove();

                // Vérifier s'il reste des lignes dans le tableau
                if (tbody) {
                    const remainingRows = tbody.querySelectorAll('tr.time-entry-row');

                    if (remainingRows.length === 0) {
                        // Ajouter le message "aucune entrée"
                        if (entryId.includes('chargeable')) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="11" class="text-center text-muted">
                                        <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures chargeables pour cette semaine
                                    </td>
                                </tr>
                            `;
                        } else {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="10" class="text-center text-muted">
                                        <i class="fas fa-info-circle me-2"></i>Aucune entrée d'heures non-chargeables pour cette semaine
                                    </td>
                                </tr>
                            `;
                        }
                    }
                }

                // Mettre à jour les totaux
                updateTotals();

                showAlert('Ligne supprimée avec succès', 'success');
            } else {
                console.warn(`Ligne non trouvée pour l'ID: ${entryId}`);
                showAlert('Ligne non trouvée', 'warning');
            }

            console.log(`✅ Suppression terminée pour: ${entryId}`);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showAlert('Erreur lors de la suppression', 'danger');
        }
    }
}

// Fonction de debug pour tester la suppression
async function debugDeleteEntry(entryId) {
    console.log(`🔍 Debug suppression pour: ${entryId}`);

    try {
        const userId = getCurrentUserId();
        const weekStart = currentWeekStart;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        console.log('📅 Période de recherche:', weekStart, 'à', weekEndStr);

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?user_id=${userId}&week_start=${weekStart}&week_end=${weekEndStr}`);

        if (!response.ok) {
            console.error('Erreur lors de la récupération des entrées:', response.status);
            return;
        }

        const data = await response.json();
        const entries = data.data || [];

        console.log(`📊 ${entries.length} entrées trouvées:`, entries);

        // Tester si c'est un UUID direct
        if (entryId.length === 36 && entryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.log('🔍 UUID direct détecté:', entryId);

            // Chercher l'entrée correspondante
            const matchingEntry = entries.find(entry => entry.id === entryId);

            if (matchingEntry) {
                console.log(`🎯 Entrée trouvée:`, matchingEntry);
            } else {
                console.log(`❌ Aucune entrée trouvée pour l'UUID:`, entryId);
            }
        }
        // Tester le parsing de l'entryId
        else if (entryId.startsWith('chargeable-')) {
            const chargeablePrefix = 'chargeable-';
            const remaining = entryId.substring(chargeablePrefix.length);
            const missionIdLength = 36;

            let missionId = null;
            let taskId = null;

            if (remaining.length >= missionIdLength) {
                missionId = remaining.substring(0, missionIdLength);
                if (remaining.length > missionIdLength + 1 && remaining[missionIdLength] === '-') {
                    let taskPart = remaining.substring(missionIdLength + 1);
                    taskId = (taskPart === 'no-task') ? null : taskPart;
                }
            }

            console.log('🔍 Parsing chargeable:', { entryId, missionId, taskId });

            // Chercher les entrées correspondantes
            const matchingEntries = entries.filter(entry =>
                entry.mission_id === missionId && entry.task_id === taskId
            );

            console.log(`🎯 ${matchingEntries.length} entrées correspondantes trouvées:`, matchingEntries);
        }

    } catch (error) {
        console.error('Erreur lors du debug:', error);
    }
}

// Vérifier le statut de la feuille de temps pour autoriser la suppression
async function checkTimeSheetStatusForDeletion() {
    try {
        // Récupérer la feuille de temps pour la semaine courante
        const userId = getCurrentUserId();
        const weekStart = currentWeekStart;

        const response = await authenticatedFetch(`${API_BASE_URL}/time-sheets/current?week_start=${weekStart}`);

        if (!response.ok) {
            console.error('Erreur lors de la récupération du statut de la feuille de temps');
            return false;
        }

        const data = await response.json();
        const timeSheet = data.data;

        if (!timeSheet) {
            console.log('Aucune feuille de temps trouvée, autorisation de suppression');
            return true; // Pas de feuille = autorisé
        }

        const status = timeSheet.status;
        console.log('📋 Statut de la feuille de temps:', status);

        // Autoriser la suppression seulement pour les statuts modifiables
        const editableStatuses = ['draft', 'saved', 'rejected'];
        const canDelete = editableStatuses.includes(status);

        if (!canDelete) {
            console.log('❌ Suppression non autorisée pour le statut:', status);
            console.log('✅ Statuts autorisés:', editableStatuses);
        } else {
            console.log('✅ Suppression autorisée pour le statut:', status);
        }

        return canDelete;

    } catch (error) {
        console.error('❌ Erreur lors de la vérification du statut:', error);
        return false; // En cas d'erreur, ne pas autoriser la suppression
    }
}

// Supprimer toutes les entrées de temps pour une ligne donnée
async function deleteTimeEntriesForEntry(entryId) {
    try {
        console.log('🗑️ Suppression des entrées de temps pour:', entryId);

        // Récupérer toutes les entrées de temps pour cette ligne sur la semaine courante
        const userId = getCurrentUserId();
        const weekStart = currentWeekStart;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        const response = await authenticatedFetch(`${API_BASE_URL}/time-entries?user_id=${userId}&week_start=${weekStart}&week_end=${weekEndStr}`);

        if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des entrées: ${response.status}`);
        }

        const data = await response.json();
        const entries = data.data || [];

        console.log(`📊 ${entries.length} entrées récupérées pour la semaine:`, entries.map(e => ({
            id: e.id,
            mission_id: e.mission_id,
            task_id: e.task_id,
            internal_activity_id: e.internal_activity_id,
            date_saisie: e.date_saisie,
            heures: e.heures
        })));

        // Filtrer les entrées correspondant à cette ligne
        const entriesToDelete = entries.filter(entry => {
            // Si l'entryId est un UUID direct (36 caractères), supprimer directement cette entrée
            if (entryId.length === 36 && entryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                console.log(`🔍 Suppression directe par UUID:`, {
                    entryId,
                    entryIdInDB: entry.id,
                    match: entry.id === entryId
                });
                return entry.id === entryId;
            }

            if (entryId.startsWith('chargeable-')) {
                // Format: chargeable-{missionId}-{taskId}
                const chargeablePrefix = 'chargeable-';
                const remaining = entryId.substring(chargeablePrefix.length);
                const missionIdLength = 36;

                let missionId = null;
                let taskId = null;

                if (remaining.length >= missionIdLength) {
                    missionId = remaining.substring(0, missionIdLength);
                    if (remaining.length > missionIdLength + 1 && remaining[missionIdLength] === '-') {
                        let taskPart = remaining.substring(missionIdLength + 1);
                        taskId = (taskPart === 'no-task') ? null : taskPart;
                    }
                }

                console.log(`🔍 Comparaison pour suppression:`, {
                    entryId,
                    parsedMissionId: missionId,
                    parsedTaskId: taskId,
                    entryMissionId: entry.mission_id,
                    entryTaskId: entry.task_id,
                    missionMatch: entry.mission_id === missionId,
                    taskMatch: entry.task_id === taskId
                });

                return entry.mission_id === missionId && entry.task_id === taskId;
            } else if (entryId.startsWith('non-chargeable-')) {
                // Format: non-chargeable-{activityId}
                const activityId = entryId.substring('non-chargeable-'.length);

                console.log(`🔍 Comparaison pour suppression HNC:`, {
                    entryId,
                    parsedActivityId: activityId,
                    entryActivityId: entry.internal_activity_id,
                    match: entry.internal_activity_id === activityId
                });

                return entry.internal_activity_id === activityId;
            }
            return false;
        });

        console.log(`🗑️ ${entriesToDelete.length} entrées à supprimer`);
        console.log('📋 Entrées à supprimer:', entriesToDelete.map(e => ({
            id: e.id,
            mission_id: e.mission_id,
            task_id: e.task_id,
            internal_activity_id: e.internal_activity_id,
            date_saisie: e.date_saisie,
            heures: e.heures
        })));

        // Supprimer chaque entrée
        for (const entry of entriesToDelete) {
            console.log(`🗑️ Suppression de l'entrée:`, entry.id);
            const deleteResponse = await authenticatedFetch(`${API_BASE_URL}/time-entries/${entry.id}`, {
                method: 'DELETE'
            });

            if (!deleteResponse.ok) {
                console.error(`❌ Erreur lors de la suppression de l'entrée ${entry.id}:`, deleteResponse.status);
                const errorText = await deleteResponse.text();
                console.error('Détails de l\'erreur:', errorText);
            } else {
                console.log(`✅ Entrée supprimée: ${entry.id}`);
            }
        }

        console.log('✅ Suppression des entrées terminée');

    } catch (error) {
        console.error('❌ Erreur lors de la suppression des entrées:', error);
        throw error;
    }
}

// Obtenir l'ID de l'utilisateur actuel
function getCurrentUserId() {
    // Utiliser le SessionManager si disponible
    if (window.sessionManager && window.sessionManager.isLoaded) {
        try {
            const user = window.sessionManager.getUser();
            return user.id;
        } catch (error) {
            console.warn('SessionManager non disponible, utilisation du fallback localStorage');
        }
    }

    // Fallback sur localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            return user.id || user.userId;
        } catch (error) {
            console.error('Erreur lors du parsing des données utilisateur:', error);
        }
    }

    // Fallback vers l'ID hardcodé si pas de données utilisateur
    console.warn('Aucune donnée utilisateur trouvée, utilisation de l\'ID par défaut');
    return '8eb54916-a0b3-4f9e-acd1-75830271feab';
}

// Obtenir le numéro de semaine
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Afficher une alerte
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.main-content-area');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Fonction pour faire des requêtes authentifiées
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');

    if (!options.headers) {
        options.headers = {};
    }

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, options);
}

// Écouter les changements de mission pour charger les tâches
document.addEventListener('DOMContentLoaded', function () {
    const missionSelect = document.getElementById('mission-select');
    if (missionSelect) {
        missionSelect.addEventListener('change', function () {
            if (this.value) {
                loadTasksForMission(this.value);
            } else {
                const taskSelect = document.getElementById('task-select');
                if (taskSelect) {
                    taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
                }
            }
        });
    }

    // Écouter les changements de business unit pour charger les activités internes
    const businessUnitSelect = document.getElementById('business-unit-select');
    if (businessUnitSelect) {
        businessUnitSelect.addEventListener('change', function () {
            if (this.value) {
                loadInternalActivitiesForBusinessUnit(this.value);
            } else {
                const activitySelect = document.getElementById('internal-activity-select');
                if (activitySelect) {
                    activitySelect.innerHTML = '<option value="">Sélectionner une activité</option>';
                }
            }
        });
    }
});
// Load tasks planned for a specific mission
async function loadPlannedTasks(missionId) {
    try {
        const response = await authenticatedFetch(`/api/missions/${missionId}/planned-tasks`);
        if (!response.ok) throw new Error('Erreur lors du chargement des tâches');

        const data = await response.json();
        const taskSelect = document.getElementById('taskSelect');

        if (!taskSelect) return;

        taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';

        if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.code ? `${task.code} - ${task.nom}` : task.nom;
                taskSelect.appendChild(option);
            });
            taskSelect.disabled = false;
        } else {
            taskSelect.disabled = true;
        }
    } catch (error) {
        console.error('Erreur chargement tâches planifiées:', error);
        showAlert('Erreur lors du chargement des tâches', 'danger');
    }
}

// Setup mission-task cascade in the modal
function setupMissionTaskCascade() {
    const missionSelect = document.getElementById('missionSelect');
    if (missionSelect && !missionSelect.dataset.cascadeSetup) {
        missionSelect.addEventListener('change', function () {
            const taskSelect = document.getElementById('taskSelect');
            if (this.value) {
                loadPlannedTasks(this.value);
            } else {
                if (taskSelect) {
                    taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
                    taskSelect.disabled = true;
                }
            }
        });
        missionSelect.dataset.cascadeSetup = 'true';
    }
}


