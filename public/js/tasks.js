// Gestionnaire des tâches pour le menu de profil
class TasksManager {
    constructor() {
        this.tasks = [];
        this.isInitialized = false;
    }

    // Charger les tâches depuis l'API
    async loadTasks() {
        // Vérifier l'authentification avant de charger
        if (!isTasksAuthenticated()) {
            console.log('🔑 Utilisateur non authentifié, chargement des tâches ignoré');
            return [];
        }
        
        try {
            const response = await fetch('/api/tasks', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.tasks = Array.isArray(result) ? result : (result.data || []);
                console.log('📋 Tâches chargées:', this.tasks.length);
                return this.tasks;
            } else {
                console.error('❌ Erreur API tasks:', response.status);
                return [];
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des tâches:', error);
            return [];
        }
    }

    // Charger les statistiques des tâches
    async loadTaskStats() {
        // Vérifier l'authentification avant de charger
        if (!isTasksAuthenticated()) {
            console.log('🔑 Utilisateur non authentifié, chargement des statistiques des tâches ignoré');
            return { total_tasks: 0, active_tasks: 0 };
        }
        
        try {
            const response = await fetch('/api/tasks/stats/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result || { total_tasks: 0, active_tasks: 0 };
            } else {
                console.error('❌ Erreur API tasks stats:', response.status);
                return { total_tasks: 0, active_tasks: 0 };
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des stats tâches:', error);
            return { total_tasks: 0, active_tasks: 0 };
        }
    }

    // Afficher les tâches dans le modal
    displayTasks() {
        const container = document.getElementById('tasksContainerFull');
        if (!container) {
            console.error('❌ Container tasksContainerFull non trouvé');
            return;
        }

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-tasks fs-1 mb-3"></i>
                    <p class="mb-2">Aucune tâche disponible</p>
                    <small>Les tâches apparaîtront ici une fois créées</small>
                </div>
            `;
            return;
        }

        const tasksHtml = this.tasks.map(task => `
            <div class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-2">${task.code}</h6>
                            <span class="badge ${this.getPriorityBadgeClass(task.priorite)}">
                                ${task.priorite}
                            </span>
                            ${task.actif ? 
                                '<span class="badge bg-success ms-1">Actif</span>' : 
                                '<span class="badge bg-secondary ms-1">Inactif</span>'
                            }
                        </div>
                        <h6 class="mb-1">${task.libelle}</h6>
                        <p class="mb-1 text-muted">${task.description || 'Aucune description'}</p>
                        <div class="d-flex align-items-center">
                            <small class="text-muted me-3">
                                <i class="fas fa-clock me-1"></i>${task.duree_estimee || 0}h
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>Créée le ${this.formatDate(task.created_at)}
                            </small>
                        </div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/task-templates.html" target="_blank">
                                <i class="fas fa-eye me-2"></i>Voir détails
                            </a></li>
                            <li><a class="dropdown-item" href="/task-templates.html" target="_blank">
                                <i class="fas fa-edit me-2"></i>Modifier
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask('${task.id}')">
                                <i class="fas fa-trash me-2"></i>Supprimer
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = tasksHtml;
    }

    // Obtenir la classe CSS pour le badge de priorité
    getPriorityBadgeClass(priority) {
        const classes = {
            'BASSE': 'bg-secondary',
            'MOYENNE': 'bg-primary',
            'HAUTE': 'bg-warning',
            'CRITIQUE': 'bg-danger'
        };
        return classes[priority] || 'bg-secondary';
    }

    // Formater une date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    }

    // Ouvrir le modal des tâches
    async openTasksModal() {
        console.log('📋 Ouverture du modal des tâches');
        
        // Charger les tâches si pas encore fait
        if (this.tasks.length === 0) {
            await this.loadTasks();
        }
        
        // Afficher les tâches
        this.displayTasks();
        
        // Ouvrir le modal
        const modal = new bootstrap.Modal(document.getElementById('tasksModal'));
        modal.show();
    }

    // Mettre à jour les statistiques
    async updateTaskStats() {
        const stats = await this.loadTaskStats();
        const totalTasks = stats.total_tasks || 0;
        const activeTasks = stats.active_tasks || 0;

        // Mettre à jour le compteur de tâches dans le menu profil
        const menuTaskCount = document.getElementById('menuTaskCount');
        if (menuTaskCount) {
            const displayCount = activeTasks || totalTasks;
            menuTaskCount.textContent = displayCount;
        }

        // Contribuer à la gestion de la bulle de la carte profil
        const notificationBubble = document.getElementById('notificationBubble');
        if (notificationBubble) {
            const hasTasks = (activeTasks || totalTasks) > 0;
            if (hasTasks) {
                notificationBubble.style.display = 'flex';
            } else {
                // Ne masquer la bulle que si aucune notification non lue
                const menuNotificationCount = document.getElementById('menuNotificationCount');
                const notificationCount = menuNotificationCount ? parseInt(menuNotificationCount.textContent) || 0 : 0;
                if (notificationCount === 0) {
                    notificationBubble.style.display = 'none';
                }
            }
        }

        return {
            total_tasks: totalTasks,
            active_tasks: activeTasks
        };
    }
}

// Instance globale
let tasksManager = null;

// Fonction d'initialisation
function initTasksManager() {
    if (!tasksManager) {
        console.log('🚀 Création du TasksManager');
        tasksManager = new TasksManager();
    }
}

// Fonction globale pour ouvrir le modal des tâches
window.openTasksModal = function() {
    console.log('🔧 Appel de openTasksModal');
    if (tasksManager) {
        tasksManager.openTasksModal();
    } else {
        console.error('❌ TasksManager non initialisé, création en cours...');
        // Créer le manager si il n'existe pas
        tasksManager = new TasksManager();
        setTimeout(() => {
            if (tasksManager) {
                tasksManager.openTasksModal();
            } else {
                alert('Système de tâches non disponible');
            }
        }, 500);
    }
};

// Fonction pour supprimer une tâche (placeholder)
window.deleteTask = function(taskId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
        console.log('🗑️ Suppression de la tâche:', taskId);
        // TODO: Implémenter la suppression via API
        alert('Fonctionnalité de suppression à implémenter');
    }
};

// Fonction pour vérifier si l'utilisateur est authentifié
function isTasksAuthenticated() {
    const token = localStorage.getItem('authToken');
    return token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
}

// Initialiser automatiquement
console.log('🚀 Initialisation automatique du TasksManager');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (isTasksAuthenticated()) {
            initTasksManager();
        } else {
            console.log('🔑 Utilisateur non authentifié, initialisation du TasksManager ignorée');
        }
    });
} else {
    // Initialiser immédiatement si le DOM est déjà chargé
    if (isTasksAuthenticated()) {
        initTasksManager();
    } else {
        console.log('🔑 Utilisateur non authentifié, initialisation du TasksManager ignorée');
    }
}

// Initialiser aussi après un court délai pour s'assurer que tout est prêt
setTimeout(() => {
    if (isTasksAuthenticated()) {
        initTasksManager();
    } else {
        console.log('🔑 Utilisateur non authentifié, initialisation différée du TasksManager ignorée');
    }
}, 100);
