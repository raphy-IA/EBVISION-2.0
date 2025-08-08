// Script pour gérer la zone utilisateur en haut de toutes les pages
class UserHeaderManager {
    constructor() {
        this.init();
    }

    init() {
        this.createUserHeader();
        this.loadUserData();
        this.loadNotifications();
        this.loadAssignedTasks();
        this.setupEventListeners();
    }

    // Créer la zone utilisateur en haut de la page
    createUserHeader() {
        const existingHeader = document.querySelector('.user-header-zone');
        if (existingHeader) {
            return; // Déjà présent
        }

        const headerHTML = `
            <div class="user-header-zone">
                <div class="container-fluid">
                    <div class="row align-items-center">
                        <!-- Logo et titre -->
                        <div class="col-md-3">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-chart-line me-2 text-primary"></i>
                                <span class="fw-bold">TRS Dashboard</span>
                            </div>
                        </div>
                        
                        <!-- Zone centrale : Notifications et Tâches -->
                        <div class="col-md-6">
                            <div class="d-flex justify-content-center">
                                <!-- Notifications -->
                                <div class="user-header-item me-4">
                                    <button class="btn btn-link text-decoration-none position-relative" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-bell"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-count">
                                            0
                                        </span>
                                    </button>
                                    <ul class="dropdown-menu notification-dropdown">
                                        <li><h6 class="dropdown-header">Notifications</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li class="notification-list">
                                            <div class="text-center text-muted py-3">
                                                <i class="fas fa-spinner fa-spin"></i>
                                                <br>Chargement...
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                
                                <!-- Tâches assignées -->
                                <div class="user-header-item">
                                    <button class="btn btn-link text-decoration-none position-relative" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-tasks"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning task-count">
                                            0
                                        </span>
                                    </button>
                                    <ul class="dropdown-menu task-dropdown">
                                        <li><h6 class="dropdown-header">Tâches assignées</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li class="task-list">
                                            <div class="text-center text-muted py-3">
                                                <i class="fas fa-spinner fa-spin"></i>
                                                <br>Chargement...
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Zone utilisateur -->
                        <div class="col-md-3">
                            <div class="d-flex justify-content-end align-items-center">
                                <!-- Profil utilisateur -->
                                <div class="user-profile-dropdown me-3">
                                    <button class="btn btn-link text-decoration-none d-flex align-items-center" 
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
                                    <ul class="dropdown-menu user-dropdown">
                                        <li><h6 class="dropdown-header">Profil utilisateur</h6></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="openUserProfileModal(); return false;">
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
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-danger" href="#" onclick="logout()">
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

        // Insérer la zone utilisateur au début du body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // Ajuster le contenu principal pour la nouvelle zone
        this.adjustMainContent();
    }

    // Ajuster le contenu principal pour la nouvelle zone utilisateur
    adjustMainContent() {
        const mainContent = document.querySelector('.main-content') || document.querySelector('.main-content-area');
        if (mainContent) {
            mainContent.style.marginTop = '80px';
        }
    }

    // Charger les données utilisateur
    loadUserData() {
        const userInfo = this.getUserInfo();
        if (userInfo) {
            this.updateUserDisplay(userInfo);
        } else {
            // Rediriger vers la page de login si pas d'utilisateur
            if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
                window.location.href = '/';
            }
        }
    }

    // Obtenir les informations utilisateur
    getUserInfo() {
        // Utiliser le SessionManager si disponible, sinon fallback sur localStorage
        if (window.sessionManager && window.sessionManager.isLoaded) {
            try {
                return window.sessionManager.getUser();
            } catch (error) {
                console.warn('SessionManager non disponible, utilisation du fallback localStorage');
            }
        }
        
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    // Mettre à jour l'affichage utilisateur
    updateUserDisplay(userInfo) {
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        
        if (userNameElement) {
            userNameElement.textContent = `${userInfo.nom} ${userInfo.prenom}`;
        }
        
        if (userRoleElement) {
            userRoleElement.textContent = userInfo.role || 'Utilisateur';
        }
    }

    // Charger les notifications
    loadNotifications() {
        // Simuler le chargement des notifications
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
        }
    }

    // Obtenir l'icône de notification
    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'warning': 'exclamation-triangle',
            'success': 'check-circle',
            'danger': 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    // Charger les tâches assignées
    loadAssignedTasks() {
        // Simuler le chargement des tâches
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
        }
    }

    // Obtenir la couleur de priorité
    getTaskPriorityColor(priority) {
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
                // Marquer comme lu
                console.log('Notification cliquée');
            }
        });

        // Gérer les clics sur les tâches
        document.addEventListener('click', (e) => {
            if (e.target.closest('.task-dropdown .dropdown-item')) {
                // Ouvrir la tâche
                console.log('Tâche cliquée');
            }
        });
    }
}

// Fonction de déconnexion
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setTimeout(() => {
            window.location.href = '/';
        }, 100);
    }
}

// Initialiser la zone utilisateur quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    window.UserHeaderManager = new UserHeaderManager();
});

// Ajouter les styles CSS pour la zone utilisateur
const userHeaderStyles = `
<style>
.user-header-zone {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1030;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.user-header-item {
    position: relative;
}

.user-header-item .btn {
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    transition: all 0.3s ease;
}

.user-header-item .btn:hover {
    background-color: rgba(255,255,255,0.1);
    color: white;
}

.user-profile-dropdown .btn {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    transition: all 0.3s ease;
}

.user-profile-dropdown .btn:hover {
    background-color: rgba(255,255,255,0.1);
    color: white;
}

.user-info {
    text-align: left;
}

.user-name {
    font-weight: 600;
    font-size: 0.9rem;
}

.user-role {
    font-size: 0.75rem;
}

.notification-dropdown,
.task-dropdown,
.user-dropdown {
    min-width: 300px;
    max-height: 400px;
    overflow-y: auto;
}

.notification-dropdown .dropdown-item,
.task-dropdown .dropdown-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f8f9fa;
}

.notification-dropdown .dropdown-item:last-child,
.task-dropdown .dropdown-item:last-child {
    border-bottom: none;
}

.notification-content,
.task-content {
    flex: 1;
}

.notification-message,
.task-title {
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.notification-icon,
.task-priority {
    width: 20px;
    text-align: center;
}

.badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
}

@media (max-width: 768px) {
    .user-header-zone .col-md-6 {
        display: none;
    }
    
    .user-header-zone .col-md-3 {
        flex: 1;
    }
}
</style>
`;

// Ajouter les styles au head
document.head.insertAdjacentHTML('beforeend', userHeaderStyles); 