// Module principal pour la top bar EBVISION 2.0
class UserHeaderManager {
    constructor() {
        console.log('[UserHeader] constructor start');
        this.init();
    }

    init() {
        console.log('[UserHeader] init');
        this.loadDependencies();
        this.createUserHeader();
        this.loadUserData();
        this.loadNotifications();
        this.loadAssignedTasks();
        this.setupEventListeners();
    }

    // Charger les dépendances CSS et JS
    loadDependencies() {
        console.log('[UserHeader] loadDependencies');
        this.loadAppTitleCSS();
        this.loadUserHeaderCSS();
    }

    // Charger le CSS pour le titre de l'application
    loadAppTitleCSS() {
        if (!document.querySelector('link[href*="app-title.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/app-title.css';
            document.head.appendChild(link);
        }
    }

    // Charger le CSS pour la top bar
    loadUserHeaderCSS() {
        if (!document.querySelector('link[href*="user-header.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/user-header.css';
            document.head.appendChild(link);
        }
    }

    // Créer la zone utilisateur en haut de la page
    createUserHeader() {
        console.log('[UserHeader] createUserHeader: check existing');
        const existingHeader = document.querySelector('.user-header-zone');
        if (existingHeader) {
            console.log('[UserHeader] header exists, skip create');
            return; // Déjà présent
        }

        const headerHTML = `
            <div class="user-header-zone">
                <div class="container-fluid">
                    <div class="row align-items-center">
                        <!-- Logo et titre -->
                        <div class="col-md-4">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-eye me-2 text-primary"></i>
                                <span class="app-title fw-bold">EBVISION 2.0</span>
                            </div>
                        </div>
                        
                        <!-- Zone centrale : Recherche rapide -->
                        <div class="col-md-4">
                            <div class="d-flex justify-content-center">
                                <div class="search-container">
                                    <div class="input-group">
                                        <span class="input-group-text bg-transparent border-end-0">
                                            <i class="fas fa-search text-muted"></i>
                                        </span>
                                        <input type="text" class="form-control border-start-0" 
                                               placeholder="Recherche rapide..." 
                                               id="quickSearch">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Zone droite : Notifications, Tâches et Profil utilisateur -->
                        <div class="col-md-4">
                            <div class="d-flex justify-content-end align-items-center">
                                <!-- Notifications -->
                                <div class="user-header-item me-3">
                                    <button class="btn btn-link text-decoration-none position-relative notification-btn" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-bell"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-count">
                                            0
                                        </span>
                                    </button>
                                    <ul class="dropdown-menu notification-dropdown dropdown-menu-end">
                                        <li><h6 class="dropdown-header">Notifications</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li class="notification-list">
                                            <div class="text-center text-muted py-3">
                                                <i class="fas fa-spinner fa-spin"></i>
                                                <br>Chargement...
                                            </div>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-center" href="#" onclick="UserHeaderUtils.markAllNotificationsAsRead()">
                                                <i class="fas fa-check-double me-2"></i>Marquer tout comme lu
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                
                                <!-- Tâches assignées -->
                                <div class="user-header-item me-3">
                                    <button class="btn btn-link text-decoration-none position-relative task-btn" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-tasks"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning task-count">
                                            0
                                        </span>
                                    </button>
                                    <ul class="dropdown-menu task-dropdown dropdown-menu-end">
                                        <li><h6 class="dropdown-header">Tâches assignées</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li class="task-list">
                                            <div class="text-center text-muted py-3">
                                                <i class="fas fa-spinner fa-spin"></i>
                                                <br>Chargement...
                                            </div>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-center" href="#" onclick="UserHeaderUtils.viewAllTasks()">
                                                <i class="fas fa-list me-2"></i>Voir toutes les tâches
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                
                                <!-- Séparateur visuel -->
                                <div class="header-separator me-3"></div>
                                
                                <!-- Profil utilisateur -->
                                <div class="user-profile-dropdown">
                                    <button class="btn btn-link text-decoration-none d-flex align-items-center profile-btn" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <div class="user-avatar me-2">
                                            <i class="fas fa-user-circle fa-lg"></i>
                                        </div>
                                        <div class="user-info">
                                            <div class="user-name">Chargement...</div>
                                            <div class="user-role small text-muted">Chargement...</div>
                                        </div>
                                        <i class="fas fa-chevron-down ms-2"></i>
                                    </button>
                                    <ul class="dropdown-menu user-dropdown dropdown-menu-end">
                                        <li><h6 class="dropdown-header">Profil utilisateur</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="UserHeaderUtils.openUserProfileModal(); return false;">
                                                <i class="fas fa-user me-2"></i>
                                                Mon profil
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#passwordModal">
                                                <i class="fas fa-key me-2"></i>
                                                Changer le mot de passe
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="UserHeaderUtils.openSettingsModal(); return false;">
                                                <i class="fas fa-cog me-2"></i>
                                                Paramètres
                                            </a>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-danger" href="#" onclick="UserHeaderUtils.logout()">
                                                <i class="fas fa-sign-out-alt me-2"></i>
                                                Déconnexion
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insérer la top bar au début du body
        console.log('[UserHeader] injecting header into DOM');
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // Ajouter un padding-top au contenu principal pour compenser la top bar
        this.adjustMainContentPadding();
    }

    // Ajuster le padding du contenu principal (calcul dynamique)
    adjustMainContentPadding() {
        console.log('[UserHeader] adjustMainContentPadding start');
        const header = document.querySelector('.user-header-zone');
        const mainContent = document.querySelector('.main-content-area') 
            || document.querySelector('.main-content')
            || document.querySelector('.page-wrapper');

        const applyPadding = () => {
            const before = mainContent ? mainContent.style.paddingTop : document.body.style.paddingTop;
            const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 120;
            const padding = (headerHeight + 16) + 'px';
            if (mainContent) {
                mainContent.style.paddingTop = padding;
            } else {
                document.body.style.paddingTop = padding;
            }
            console.log('[UserHeader] applyPadding', { headerHeight, padding, before });
        };

        applyPadding();
        window.addEventListener('load', applyPadding);
        window.addEventListener('resize', applyPadding);
        if (typeof ResizeObserver !== 'undefined' && header) {
            const ro = new ResizeObserver(() => applyPadding());
            ro.observe(header);
        } else {
            // Fallback: réessayer après rendu/chargements différés
            setTimeout(applyPadding, 300);
            setTimeout(applyPadding, 800);
        }
    }

    // Charger les données utilisateur
    async loadUserData() {
        try {
            // Essayer de charger depuis l'API d'abord
            if (window.UserHeaderUtils && window.UserHeaderUtils.loadUserDataFromAPI) {
                const userData = await window.UserHeaderUtils.loadUserDataFromAPI();
                if (userData) {
                    this.updateUserInfo(userData);
                    return;
                }
            }
        } catch (error) {
            console.log('Utilisation des données par défaut');
        }

        // Fallback avec des données par défaut
        setTimeout(() => {
            const userName = document.querySelector('.user-name');
            const userRole = document.querySelector('.user-role');
            
            if (userName) userName.textContent = 'Admin User';
            if (userRole) userRole.textContent = 'Administrateur';
        }, 500);
    }

    // Mettre à jour les informations utilisateur
    updateUserInfo(userData) {
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        
        // Construire le nom complet avec nom et prénom
        const fullName = `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'Utilisateur';
        
        if (userName) userName.textContent = fullName;
        if (userRole) userRole.textContent = userData.role || 'Utilisateur';
        
        console.log('✅ UserHeader: Informations utilisateur mises à jour:', {
            fullName: fullName,
            role: userData.role,
            hasCollaborateur: userData.hasCollaborateur,
            collaborateur: userData.collaborateur
        });
    }

    // Charger les notifications
    async loadNotifications() {
        try {
            // Essayer de charger depuis l'API d'abord
            if (window.UserHeaderUtils && window.UserHeaderUtils.loadNotificationsFromAPI) {
                const notifications = await window.UserHeaderUtils.loadNotificationsFromAPI();
                if (notifications.length > 0) {
                    this.updateNotifications(notifications);
                    return;
                }
            }
        } catch (error) {
            console.log('Utilisation des notifications par défaut');
        }

        // Fallback avec des notifications par défaut
        setTimeout(() => {
            const notifications = [
                { id: 1, type: 'info', message: 'Nouvelle mission assignée', time: '2 min' },
                { id: 2, type: 'warning', message: 'Validation de temps en attente', time: '15 min' },
                { id: 3, type: 'success', message: 'Rapport mensuel généré', time: '1h' }
            ];
            
            this.updateNotifications(notifications);
        }, 1000);
    }

    // Mettre à jour les notifications
    updateNotifications(notifications) {
        const notificationList = document.querySelector('.notification-list');
        const notificationCount = document.querySelector('.notification-count');
        
        if (notificationList) {
            notificationList.innerHTML = notifications.map(notification => `
                <li>
                    <a class="dropdown-item" href="#">
                        <div class="d-flex align-items-center">
                            <div class="notification-icon me-2">
                                <i class="fas fa-${this.getNotificationIcon(notification.type)} text-${notification.type}"></i>
                            </div>
                            <div class="notification-content">
                                <div class="notification-message">${notification.message}</div>
                                <small class="text-muted">${notification.time}</small>
                            </div>
                        </div>
                    </a>
                </li>
            `).join('');
        }
        
        if (notificationCount) {
            notificationCount.textContent = notifications.length;
            notificationCount.style.display = notifications.length > 0 ? 'block' : 'none';
        }
    }

    // Obtenir l'icône de notification
    getNotificationIcon(type) {
        if (window.UserHeaderUtils && window.UserHeaderUtils.getNotificationIcon) {
            return window.UserHeaderUtils.getNotificationIcon(type);
        }
        
        const icons = {
            'info': 'info-circle',
            'warning': 'exclamation-triangle',
            'success': 'check-circle',
            'danger': 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    // Charger les tâches assignées
    async loadAssignedTasks() {
        try {
            // Essayer de charger depuis l'API d'abord
            if (window.UserHeaderUtils && window.UserHeaderUtils.loadTasksFromAPI) {
                const tasks = await window.UserHeaderUtils.loadTasksFromAPI();
                if (tasks.length > 0) {
                    this.updateTasks(tasks);
                    return;
                }
            }
        } catch (error) {
            console.log('Utilisation des tâches par défaut');
        }

        // Fallback avec des tâches par défaut
        setTimeout(() => {
            const tasks = [
                { id: 1, title: 'Finaliser le rapport client', priority: 'high', due: 'Aujourd\'hui' },
                { id: 2, title: 'Valider les feuilles de temps', priority: 'medium', due: 'Demain' },
                { id: 3, title: 'Préparer la présentation', priority: 'low', due: 'Vendredi' }
            ];
            
            this.updateTasks(tasks);
        }, 1500);
    }

    // Mettre à jour les tâches
    updateTasks(tasks) {
        const taskList = document.querySelector('.task-list');
        const taskCount = document.querySelector('.task-count');
        
        if (taskList) {
            taskList.innerHTML = tasks.map(task => `
                <li>
                    <a class="dropdown-item" href="#">
                        <div class="d-flex align-items-center">
                            <div class="task-priority me-2">
                                <i class="fas fa-circle text-${this.getTaskPriorityColor(task.priority)}"></i>
                            </div>
                            <div class="task-content">
                                <div class="task-title">${task.title}</div>
                                <small class="text-muted">Échéance: ${task.due}</small>
                            </div>
                        </div>
                    </a>
                </li>
            `).join('');
        }
        
        if (taskCount) {
            taskCount.textContent = tasks.length;
            taskCount.style.display = tasks.length > 0 ? 'block' : 'none';
        }
    }

    // Obtenir la couleur de priorité de tâche
    getTaskPriorityColor(priority) {
        if (window.UserHeaderUtils && window.UserHeaderUtils.getTaskPriorityColor) {
            return window.UserHeaderUtils.getTaskPriorityColor(priority);
        }
        
        const colors = {
            'high': 'danger',
            'medium': 'warning',
            'low': 'success'
        };
        return colors[priority] || 'secondary';
    }

    // Configurer les écouteurs d'événements
    setupEventListeners() {
        // Gérer les clics sur les notifications
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-dropdown .dropdown-item')) {
                console.log('Notification cliquée');
            }
        });

        // Gérer les clics sur les tâches
        document.addEventListener('click', (e) => {
            if (e.target.closest('.task-dropdown .dropdown-item')) {
                console.log('Tâche cliquée');
            }
        });

        // Gérer la recherche rapide
        const searchInput = document.getElementById('quickSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (window.UserHeaderUtils && window.UserHeaderUtils.handleQuickSearch) {
                    window.UserHeaderUtils.handleQuickSearch(e.target.value);
                }
            });
        }
    }
}

// Exporter la classe pour utilisation
window.UserHeaderManager = UserHeaderManager;
