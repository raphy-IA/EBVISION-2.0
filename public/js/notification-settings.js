// Variables globales
let currentSettings = {};
let notificationHistory = [];
let emailReadOnly = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    loadUserInfo();
    loadSettings();
    loadNotificationHistory();
    setupEventListeners();
});

// Vérification de l'authentification
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

// Sauvegarde de la configuration centrale des délais d'alertes automatiques
async function saveAutomaticAlertSettings() {
    try {
        const getInt = (id, fallback = 0) => {
            const el = document.getElementById(id);
            if (!el) return fallback;
            const v = parseInt(el.value, 10);
            return isNaN(v) ? fallback : v;
        };

        const settings = {
            // Opportunités
            opportunity_stage_overdue: {
                userDelayDays: getInt('aa_opportunity_stage_overdue_user', 3),
                managementDelayDays: getInt('aa_opportunity_stage_overdue_management', 7)
            },
            opportunity_inactive: {
                userDelayDays: getInt('aa_opportunity_inactive_user', 14),
                managementDelayDays: getInt('aa_opportunity_inactive_management', 30)
            },

            // Missions
            mission_inactive: {
                userDelayDays: getInt('aa_mission_inactive_user', 7),
                managementDelayDays: getInt('aa_mission_inactive_management', 14)
            },

            // Missions - tâches
            mission_task_end_approaching: {
                userDelayDays: getInt('aa_mission_task_end_approaching_user', 3),
                managementDelayDays: getInt('aa_mission_task_end_approaching_management', 7)
            },
            mission_task_overdue_not_closed: {
                userDelayDays: getInt('aa_mission_task_overdue_not_closed_user', 2),
                managementDelayDays: getInt('aa_mission_task_overdue_not_closed_management', 5)
            },

            // Feuilles de temps
            timesheet_not_submitted: {
                userDelayDays: getInt('aa_timesheet_not_submitted_user', 2),
                managementDelayDays: getInt('aa_timesheet_not_submitted_management', 5)
            },
            timesheet_not_validated_superv: {
                userDelayDays: getInt('aa_timesheet_not_validated_superv_user', 2),
                managementDelayDays: getInt('aa_timesheet_not_validated_superv_management', 5)
            },

            // Facturation missions
            mission_fee_billing_overdue: {
                userDelayDays: getInt('aa_mission_fee_billing_overdue_user', 3),
                managementDelayDays: getInt('aa_mission_fee_billing_overdue_management', 7)
            },
            mission_expense_billing_overdue: {
                userDelayDays: getInt('aa_mission_expense_billing_overdue_user', 3),
                managementDelayDays: getInt('aa_mission_expense_billing_overdue_management', 7)
            },

            // Campagnes de prospection
            campaign_validation_pending: {
                userDelayDays: getInt('aa_campaign_validation_pending_user', 3),
                managementDelayDays: getInt('aa_campaign_validation_pending_management', 7)
            },
            campaign_not_launched: {
                userDelayDays: getInt('aa_campaign_not_launched_user', 5),
                managementDelayDays: getInt('aa_campaign_not_launched_management', 10)
            },

            // Campagnes de prospection - relance entreprises
            campaign_company_followup_due: {
                userDelayDays: getInt('aa_campaign_company_followup_due_user', 7),
                managementDelayDays: getInt('aa_campaign_company_followup_due_management', 14)
            }
        };

        const response = await fetchNotificationApi('/api/notification-settings/automatic-alerts', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (response.success) {
            showAlert('Délais d\'alertes automatiques sauvegardés avec succès', 'success');
            currentSettings.automaticAlerts = settings;
        } else {
            showAlert('Erreur lors de la sauvegarde des délais d\'alertes automatiques', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des délais d\'alertes automatiques:', error);
        showAlert('Erreur lors de la sauvegarde des délais d\'alertes automatiques', 'danger');
    }
}

// Gestion du mode lecture seule pour la configuration email
function setEmailFormReadOnly(readOnly) {
    emailReadOnly = readOnly;

    const fieldIds = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpFrom', 'enableSSL', 'enableDebug'];
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = readOnly;
        }
    });

    const saveBtn = document.getElementById('saveEmailSettingsBtn');
    const resetBtn = document.getElementById('resetEmailSettingsBtn');
    const editBtn = document.getElementById('editEmailSettingsBtn');

    if (saveBtn) saveBtn.style.display = readOnly ? 'none' : '';
    if (resetBtn) resetBtn.style.display = readOnly ? 'none' : '';
    if (editBtn) editBtn.style.display = readOnly ? '' : 'none';
}

// Passer en mode édition manuellement (bouton "Modifier la configuration")
function enterEmailEditMode() {
    setEmailFormReadOnly(false);
}

// Chargement des informations utilisateur
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameElement = document.getElementById('userName');
    if (userNameElement && user.nom) {
        userNameElement.textContent = `${user.nom} ${user.prenom}`;
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Recherche dans l'historique
    const historySearch = document.getElementById('historySearch');
    if (historySearch) {
        historySearch.addEventListener('input', filterHistory);
    }

    // Filtre de l'historique
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', filterHistory);
    }

    // Filtre par utilisateur (admin)
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', filterHistory);
    }

    // Gestion des types de notifications
    document.querySelectorAll('.notification-type').forEach(type => {
        const checkbox = type.querySelector('.form-check-input');
        checkbox.addEventListener('change', function () {
            updateNotificationTypeStatus(type, this.checked);
        });
    });

    // Gestion du champ mot de passe SMTP
    const passwordField = document.getElementById('smtpPassword');
    if (passwordField) {
        // Réinitialiser le style quand l'utilisateur commence à taper
        passwordField.addEventListener('input', function () {
            if (this.getAttribute('data-saved') === 'true') {
                this.removeAttribute('data-saved');
                this.style.color = '';
            }
        });

        // Ajouter un indicateur visuel pour le mot de passe sauvegardé
        passwordField.addEventListener('focus', function () {
            if (this.value === '••••••••' && this.getAttribute('data-saved') === 'true') {
                this.value = '';
                this.removeAttribute('data-saved');
                this.style.color = '';
            }
        });
    }
}

// Chargement des paramètres
async function loadSettings() {
    try {
        const response = await fetchNotificationApi('/api/notification-settings');
        if (response.success) {
            currentSettings = response.data;
            applySettings();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        showAlert('Erreur lors du chargement des paramètres', 'danger');
    }
}

// Application des paramètres à l'interface
function applySettings() {
    // Paramètres généraux
    if (currentSettings.general) {
        document.getElementById('enableNotifications').checked = currentSettings.general.enableNotifications;
        document.getElementById('enableEmailNotifications').checked = currentSettings.general.enableEmailNotifications;
        document.getElementById('enableCronJobs').checked = currentSettings.general.enableCronJobs;
    }

    // Paramètres email
    if (currentSettings.email) {
        document.getElementById('smtpHost').value = currentSettings.email.smtpHost || 'smtp.gmail.com';
        document.getElementById('smtpPort').value = currentSettings.email.smtpPort || '587';
        document.getElementById('smtpUser').value = currentSettings.email.smtpUser || '';
        document.getElementById('smtpFrom').value = currentSettings.email.smtpFrom || '';
        document.getElementById('enableSSL').checked = currentSettings.email.enableSSL !== false;
        document.getElementById('enableDebug').checked = currentSettings.email.enableDebug || false;

        // Gérer l'affichage du mot de passe sauvegardé
        const passwordField = document.getElementById('smtpPassword');
        if (passwordField && currentSettings.email.smtpPassword) {
            passwordField.value = '••••••••';
            passwordField.setAttribute('data-saved', 'true');
            passwordField.style.color = '#28a745';
        }
    }

    // Si une configuration email existe, afficher par défaut en lecture seule
    if (currentSettings.email) {
        setEmailFormReadOnly(true);
    }

    // Paramètres des alertes
    if (currentSettings.alerts) {
        document.getElementById('overdueThreshold').value = currentSettings.alerts.overdueThreshold || 1;
        document.getElementById('inactiveThreshold').value = currentSettings.alerts.inactiveThreshold || 7;
        document.getElementById('notificationRetention').value = currentSettings.alerts.notificationRetention || 30;
        document.getElementById('timezone').value = currentSettings.alerts.timezone || 'Europe/Paris';
    }

    // Configuration centrale des délais d'alertes automatiques (tableau 3 colonnes)
    const automaticAlerts = currentSettings.automaticAlerts || {};

    const aaDefaults = {
        // Opportunités
        opportunity_stage_overdue: { userDelayDays: 3, managementDelayDays: 7 },
        opportunity_inactive: { userDelayDays: 14, managementDelayDays: 30 },

        // Missions (global)
        mission_inactive: { userDelayDays: 7, managementDelayDays: 14 },

        // Missions - tâches
        mission_task_end_approaching: { userDelayDays: 3, managementDelayDays: 7 },
        mission_task_overdue_not_closed: { userDelayDays: 2, managementDelayDays: 5 },

        // Feuilles de temps
        timesheet_not_submitted: { userDelayDays: 2, managementDelayDays: 5 },
        timesheet_not_validated_superv: { userDelayDays: 2, managementDelayDays: 5 },

        // Facturation missions
        mission_fee_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },
        mission_expense_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },

        // Campagnes de prospection (global)
        campaign_validation_pending: { userDelayDays: 3, managementDelayDays: 7 },
        campaign_not_launched: { userDelayDays: 5, managementDelayDays: 10 },

        // Campagnes de prospection - relance entreprises
        campaign_company_followup_due: { userDelayDays: 7, managementDelayDays: 14 }
    };

    function setAaField(key, userId, mgmtId) {
        const cfg = automaticAlerts[key] || aaDefaults[key] || { userDelayDays: 0, managementDelayDays: 0 };
        const userEl = document.getElementById(userId);
        const mgmtEl = document.getElementById(mgmtId);
        if (userEl) userEl.value = typeof cfg.userDelayDays === 'number' ? cfg.userDelayDays : 0;
        if (mgmtEl) mgmtEl.value = typeof cfg.managementDelayDays === 'number' ? cfg.managementDelayDays : 0;
    }

    // Campagnes
    setAaField('campaign_validation_pending', 'aa_campaign_validation_pending_user', 'aa_campaign_validation_pending_management');
    setAaField('campaign_not_launched', 'aa_campaign_not_launched_user', 'aa_campaign_not_launched_management');
    setAaField('campaign_company_followup_due', 'aa_campaign_company_followup_due_user', 'aa_campaign_company_followup_due_management');

    // Opportunités
    setAaField('opportunity_stage_overdue', 'aa_opportunity_stage_overdue_user', 'aa_opportunity_stage_overdue_management');
    setAaField('opportunity_inactive', 'aa_opportunity_inactive_user', 'aa_opportunity_inactive_management');

    // Missions
    setAaField('mission_inactive', 'aa_mission_inactive_user', 'aa_mission_inactive_management');
    setAaField('mission_task_end_approaching', 'aa_mission_task_end_approaching_user', 'aa_mission_task_end_approaching_management');
    setAaField('mission_task_overdue_not_closed', 'aa_mission_task_overdue_not_closed_user', 'aa_mission_task_overdue_not_closed_management');

    // Feuilles de temps
    setAaField('timesheet_not_submitted', 'aa_timesheet_not_submitted_user', 'aa_timesheet_not_submitted_management');
    setAaField('timesheet_not_validated_superv', 'aa_timesheet_not_validated_superv_user', 'aa_timesheet_not_validated_superv_management');

    // Facturation missions
    setAaField('mission_fee_billing_overdue', 'aa_mission_fee_billing_overdue_user', 'aa_mission_fee_billing_overdue_management');
    setAaField('mission_expense_billing_overdue', 'aa_mission_expense_billing_overdue_user', 'aa_mission_expense_billing_overdue_management');

    // Types de notifications
    if (currentSettings.notificationTypes) {
        Object.keys(currentSettings.notificationTypes).forEach(type => {
            const element = document.querySelector(`[data-type="${type}"]`);
            if (element) {
                const checkbox = element.querySelector('.form-check-input');
                checkbox.checked = currentSettings.notificationTypes[type].enabled;
                updateNotificationTypeStatus(element, checkbox.checked);
            }
        });
    }
}

// Sauvegarde des paramètres généraux
async function saveGeneralSettings() {
    try {
        const settings = {
            enableNotifications: document.getElementById('enableNotifications').checked,
            enableEmailNotifications: document.getElementById('enableEmailNotifications').checked,
            enableCronJobs: document.getElementById('enableCronJobs').checked
        };

        const response = await fetchNotificationApi('/api/notification-settings/general', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (response.success) {
            showAlert('Paramètres généraux sauvegardés avec succès', 'success');
            currentSettings.general = settings;
        } else {
            showAlert('Erreur lors de la sauvegarde des paramètres généraux', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres généraux:', error);
        showAlert('Erreur lors de la sauvegarde des paramètres généraux', 'danger');
    }
}

// Sauvegarde des paramètres email
async function saveEmailSettings() {
    try {
        const passwordField = document.getElementById('smtpPassword');
        const passwordValue = passwordField.value;

        // Ne pas envoyer le mot de passe s'il n'a pas été modifié (affiche encore les astérisques)
        const smtpPassword = (passwordValue === '••••••••' && passwordField.getAttribute('data-saved') === 'true')
            ? undefined
            : passwordValue;

        const settings = {
            smtpHost: document.getElementById('smtpHost').value,
            smtpPort: parseInt(document.getElementById('smtpPort').value),
            smtpUser: document.getElementById('smtpUser').value,
            smtpFrom: document.getElementById('smtpFrom').value,
            enableSSL: document.getElementById('enableSSL').checked,
            enableDebug: document.getElementById('enableDebug').checked
        };

        // Ajouter le mot de passe seulement s'il a été modifié
        if (smtpPassword !== undefined) {
            settings.smtpPassword = smtpPassword;
        }

        const response = await fetchNotificationApi('/api/notification-settings/email', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (response.success) {
            showAlert('Configuration email sauvegardée avec succès', 'success');
            currentSettings.email = settings;
            // Repasser en mode lecture seule après sauvegarde
            setEmailFormReadOnly(true);
        } else {
            showAlert('Erreur lors de la sauvegarde de la configuration email', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration email:', error);
        showAlert('Erreur lors de la sauvegarde de la configuration email', 'danger');
    }
}

// Sauvegarde des types de notifications
async function saveNotificationSettings() {
    try {
        const settings = {};
        document.querySelectorAll('.notification-type').forEach(type => {
            const typeName = type.dataset.type;
            const checkbox = type.querySelector('.form-check-input');
            settings[typeName] = {
                enabled: checkbox.checked,
                email: true, // Par défaut
                notification: true // Par défaut
            };
        });

        const response = await fetchNotificationApi('/api/notification-settings/notification-types', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (response.success) {
            showAlert('Types de notifications sauvegardés avec succès', 'success');
            currentSettings.notificationTypes = settings;
        } else {
            showAlert('Erreur lors de la sauvegarde des types de notifications', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des types de notifications:', error);
        showAlert('Erreur lors de la sauvegarde des types de notifications', 'danger');
    }
}

// Sauvegarde des paramètres d'alertes
async function saveAlertSettings() {
    try {
        const settings = {
            overdueThreshold: parseInt(document.getElementById('overdueThreshold').value),
            inactiveThreshold: parseInt(document.getElementById('inactiveThreshold').value),
            notificationRetention: parseInt(document.getElementById('notificationRetention').value),
            timezone: document.getElementById('timezone').value
        };

        const response = await fetchNotificationApi('/api/notification-settings/alerts', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (response.success) {
            showAlert('Paramètres d\'alertes sauvegardés avec succès', 'success');
            currentSettings.alerts = settings;
        } else {
            showAlert('Erreur lors de la sauvegarde des paramètres d\'alertes', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres d\'alertes:', error);
        showAlert('Erreur lors de la sauvegarde des paramètres d\'alertes', 'danger');
    }
}

// Test de la configuration email
async function testEmailConfiguration() {
    const testEmail = document.getElementById('testEmail').value;
    if (!testEmail) {
        showAlert('Veuillez saisir un email de test', 'warning');
        return;
    }

    try {
        const passwordField = document.getElementById('smtpPassword');
        const passwordValue = passwordField.value;

        // Empêcher l'utilisation de la valeur masquée comme vrai mot de passe
        if (passwordValue === '••••••••' && passwordField.getAttribute('data-saved') === 'true') {
            showAlert('Veuillez ressaisir le mot de passe d\'application avant de tester la configuration.', 'warning');
            return;
        }

        const emailSettings = {
            smtpHost: document.getElementById('smtpHost').value,
            smtpPort: parseInt(document.getElementById('smtpPort').value),
            smtpUser: document.getElementById('smtpUser').value,
            smtpPassword: passwordValue,
            smtpFrom: document.getElementById('smtpFrom').value,
            enableSSL: document.getElementById('enableSSL').checked,
            enableDebug: document.getElementById('enableDebug').checked
        };

        const response = await fetchNotificationApi('/api/notification-settings/test-email', {
            method: 'POST',
            body: JSON.stringify({
                emailSettings: emailSettings,
                testEmail: testEmail
            })
        });

        const resultDiv = document.getElementById('emailTestResult');
        if (response.success) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    Email de test envoyé avec succès à ${testEmail}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle me-2"></i>
                    Erreur lors de l'envoi de l'email de test: ${response.error}
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur lors du test email:', error);
        const resultDiv = document.getElementById('emailTestResult');
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle me-2"></i>
                Erreur lors du test email: ${error.message}
            </div>
        `;
    }
}

// Test des tâches cron
async function testCronJobs() {
    try {
        const response = await fetchNotificationApi('/api/notification-settings/test-cron', {
            method: 'POST'
        });

        if (response.success) {
            showAlert('Test des tâches cron lancé avec succès', 'success');
        } else {
            showAlert('Erreur lors du test des tâches cron', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors du test des tâches cron:', error);
        showAlert('Erreur lors du test des tâches cron', 'danger');
    }
}

// Chargement de l'historique des notifications
async function loadNotificationHistory() {
    try {
        const response = await fetchNotificationApi('/api/notification-settings/history');
        if (response.success) {
            notificationHistory = response.data;
            const isAdmin = response.isAdmin;

            // Mettre à jour l'interface selon le rôle
            // Maintenant, tout le monde voit l'historique global (filtré par le backend)
            // L'interface admin garde juste les contrôles de suppression globale
            updateAdminInterface(isAdmin);

            displayNotificationHistory();

            // On charge les utilisateurs pour le filtre pour tout le monde si on veut permettre le filtrage ?
            // Le prompt demande de "regrouper toutes les notifications". 
            // Laisser le filtre utilisateur accessible à tous permet de naviguer plus facilement.
            await loadUsersForFilter();
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// Mettre à jour l'interface selon le rôle
function updateAdminInterface(isAdmin) {
    const userFilterContainer = document.getElementById('userFilterContainer');
    const adminControls = document.getElementById('adminControls');
    const btnClearHistory = document.getElementById('btnClearHistory');

    // Le filtre utilisateur est maintenant accessible à tous pour naviguer dans l'historique global
    if (userFilterContainer) userFilterContainer.style.display = 'block';

    if (isAdmin) {
        if (adminControls) adminControls.style.display = 'block';
        if (btnClearHistory) btnClearHistory.style.display = 'inline-block';

        // Ajouter un badge admin
        const historyHeader = document.querySelector('#history .config-header h3');
        if (historyHeader && !historyHeader.querySelector('.badge')) {
            historyHeader.innerHTML += ' <span class="badge bg-danger ms-2">Administration</span>';
        }
    } else {
        if (adminControls) adminControls.style.display = 'none';

        // Masquer le bouton de suppression pour les non-admins (demande spécifique)
        if (btnClearHistory) btnClearHistory.style.display = 'none';
    }
}

// Charger la liste des utilisateurs pour le filtre
async function loadUsersForFilter() {
    try {
        // On suppose que l'API /api/users est accessible. 
        // Si elle est restreinte aux admins, cela échouera pour les autres.
        // On va vérifier. Si ça échoue, on cache le filtre.
        const response = await fetchNotificationApi('/api/users');
        if (response.success) {
            const userSelect = document.getElementById('userFilter');
            if (userSelect) {
                userSelect.innerHTML = '<option value="">Tous les utilisateurs</option>';
                response.data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.nom} ${user.prenom} (${user.login})`;
                    userSelect.appendChild(option);
                });
            }
        } else {
            // Si pas d'accès à la liste des users, on cache le filtre
            const userFilterContainer = document.getElementById('userFilterContainer');
            if (userFilterContainer) userFilterContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        const userFilterContainer = document.getElementById('userFilterContainer');
        if (userFilterContainer) userFilterContainer.style.display = 'none';
    }
}

// Affichage de l'historique des notifications
function displayNotificationHistory(filteredHistory = null) {
    const historyContainer = document.getElementById('alertHistory');
    const history = filteredHistory || notificationHistory;

    if (history.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-clock-history fs-1"></i>
                <p class="mt-2">Aucun historique disponible</p>
            </div>
        `;
        return;
    }

    const historyHTML = history.map(item => {
        // Déterminer si on affiche les infos utilisateur (admin)
        const showUserInfo = item.user_nom && item.user_prenom;

        return `
            <div class="alert-item ${getPriorityClass(item.priority)}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <h6 class="mb-0 me-2">${item.title}</h6>
                            ${showUserInfo ?
                `<span class="badge bg-info">${item.user_nom} ${item.user_prenom}</span>` :
                ''
            }
                        </div>
                        <p class="mb-1">${item.message}</p>
                        <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>${formatDateTime(item.created_at)}
                            <i class="bi bi-tag ms-2 me-1"></i>${item.type}
                            ${item.opportunity_name ?
                `<i class="bi bi-briefcase ms-2 me-1"></i>${item.opportunity_name}` :
                ''
            }
                            ${item.campaign_name ?
                `<i class="bi bi-megaphone ms-2 me-1"></i>${item.campaign_name}` :
                ''
            }
                        </small>
                    </div>
                    <div class="ms-2 d-flex flex-column align-items-end">
                        ${item.read_at ?
                '<span class="badge bg-secondary mb-1">Lu</span>' :
                '<span class="badge bg-primary mb-1">Non lu</span>'
            }
                        ${showUserInfo ?
                `<small class="text-muted">${item.user_login}</small>` :
                ''
            }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    historyContainer.innerHTML = historyHTML;
}

// Filtrage de l'historique
function filterHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const filterType = document.getElementById('historyFilter').value;
    const userFilter = document.getElementById('userFilter')?.value;

    let filtered = notificationHistory;

    // Filtre par type
    if (filterType) {
        filtered = filtered.filter(item => item.type === filterType);
    }

    // Filtre par utilisateur (accessible à tous si la liste est chargée)
    if (userFilter) {
        filtered = filtered.filter(item => item.user_id === userFilter);
    }

    // Filtre par recherche
    if (searchTerm) {
        filtered = filtered.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.message.toLowerCase().includes(searchTerm) ||
            item.type.toLowerCase().includes(searchTerm) ||
            (item.user_nom && item.user_nom.toLowerCase().includes(searchTerm)) ||
            (item.user_prenom && item.user_prenom.toLowerCase().includes(searchTerm)) ||
            (item.user_login && item.user_login.toLowerCase().includes(searchTerm))
        );
    }

    displayNotificationHistory(filtered);
}

// Actualisation de l'historique
function refreshHistory() {
    loadNotificationHistory();
}

// Vider l'historique
async function clearHistory() {
    if (!confirm('Êtes-vous sûr de vouloir vider l\'historique des notifications ?')) {
        return;
    }

    try {
        const response = await fetchNotificationApi('/api/notification-settings/clear-history', {
            method: 'DELETE'
        });

        if (response.success) {
            showAlert('Historique vidé avec succès', 'success');
            loadNotificationHistory();
        } else {
            showAlert('Erreur lors du vidage de l\'historique', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors du vidage de l\'historique:', error);
        showAlert('Erreur lors du vidage de l\'historique', 'danger');
    }
}

// Vider l'historique d'un utilisateur spécifique (admin)
async function clearUserHistory() {
    const userFilter = document.getElementById('userFilter');
    const selectedUserId = userFilter?.value;

    if (!selectedUserId) {
        showAlert('Veuillez sélectionner un utilisateur', 'warning');
        return;
    }

    const selectedUserText = userFilter.options[userFilter.selectedIndex].text;

    if (!confirm(`Êtes-vous sûr de vouloir vider l'historique de ${selectedUserText} ?`)) {
        return;
    }

    try {
        const response = await fetchNotificationApi(`/api/notification-settings/clear-history?user_id=${selectedUserId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showAlert(`Historique de ${selectedUserText} vidé avec succès`, 'success');
            loadNotificationHistory();
        } else {
            showAlert('Erreur lors du vidage de l\'historique', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors du vidage de l\'historique:', error);
        showAlert('Erreur lors du vidage de l\'historique', 'danger');
    }
}

// Vider tout l'historique (admin)
async function clearAllHistory() {
    if (!confirm('⚠️ ATTENTION : Êtes-vous ABSOLUMENT sûr de vouloir vider TOUT l\'historique de TOUS les utilisateurs ?\n\nCette action est irréversible !')) {
        return;
    }

    if (!confirm('⚠️ DERNIÈRE CONFIRMATION : Vider tout l\'historique de notifications ?')) {
        return;
    }

    try {
        const response = await fetchNotificationApi('/api/notification-settings/clear-history?confirm_all=true', {
            method: 'DELETE'
        });

        if (response.success) {
            showAlert('Tout l\'historique a été vidé avec succès', 'success');
            loadNotificationHistory();
        } else {
            showAlert('Erreur lors du vidage de l\'historique', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors du vidage de l\'historique:', error);
        showAlert('Erreur lors du vidage de l\'historique', 'danger');
    }
}

// Export de l'historique
function exportHistory() {
    const csvContent = generateCSV(notificationHistory);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historique_notifications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Génération du CSV
function generateCSV(data) {
    const headers = ['Date', 'Type', 'Titre', 'Message', 'Priorité', 'Statut'];
    const rows = data.map(item => [
        formatDateTime(item.created_at),
        item.type,
        item.title,
        item.message,
        item.priority,
        item.read_at ? 'Lu' : 'Non lu'
    ]);

    return [headers, ...rows].map(row =>
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
}

// Fonctions de réinitialisation
function resetGeneralSettings() {
    if (confirm('Voulez-vous réinitialiser les paramètres généraux ?')) {
        document.getElementById('enableNotifications').checked = true;
        document.getElementById('enableEmailNotifications').checked = true;
        document.getElementById('enableCronJobs').checked = true;
    }
}

function resetEmailSettings() {
    if (confirm('Voulez-vous réinitialiser la configuration email ?')) {
        document.getElementById('smtpHost').value = 'smtp.gmail.com';
        document.getElementById('smtpPort').value = '587';
        document.getElementById('smtpUser').value = '';
        document.getElementById('smtpPassword').value = '';
        document.getElementById('smtpPassword').removeAttribute('data-saved');
        document.getElementById('smtpPassword').style.color = '';
        document.getElementById('smtpFrom').value = '';
        document.getElementById('enableSSL').checked = true;
        document.getElementById('enableDebug').checked = false;
    }
}

function resetNotificationSettings() {
    if (confirm('Voulez-vous réinitialiser les types de notifications ?')) {
        document.querySelectorAll('.notification-type .form-check-input').forEach(checkbox => {
            checkbox.checked = true;
            updateNotificationTypeStatus(checkbox.closest('.notification-type'), true);
        });
    }
}

function resetAlertSettings() {
    if (confirm('Voulez-vous réinitialiser les paramètres d\'alertes ?')) {
        document.getElementById('overdueThreshold').value = '1';
        document.getElementById('inactiveThreshold').value = '7';
        document.getElementById('notificationRetention').value = '30';
        document.getElementById('timezone').value = 'Europe/Paris';
    }
}

function resetAutomaticAlertSettings() {
    if (!confirm('Voulez-vous réinitialiser les délais d\'alertes automatiques aux valeurs par défaut ?')) {
        return;
    }

    // Recharger les valeurs à partir des valeurs par défaut définies dans applySettings
    if (!currentSettings.automaticAlerts) {
        currentSettings.automaticAlerts = {};
    }
    applySettings();
}

// Mise à jour du statut d'un type de notification
function updateNotificationTypeStatus(element, enabled) {
    if (enabled) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

// Fonctions utilitaires
function getPriorityClass(priority) {
    switch (priority) {
        case 'HIGH': return 'high';
        case 'MEDIUM': return 'medium';
        case 'LOW': return 'low';
        default: return '';
    }
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Fonction fetch authentifiée
async function fetchNotificationApi(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Token d\'authentification manquant');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
