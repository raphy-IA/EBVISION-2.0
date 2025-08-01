// Variables globales
let notifications = [];
let notificationStats = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    setupNotificationPolling();
});

// Configuration du polling des notifications
function setupNotificationPolling() {
    // Vérifier les nouvelles notifications toutes les 30 secondes
    setInterval(() => {
        loadNotificationStats();
    }, 30000);
}

// Chargement des notifications
async function loadNotifications(limit = 10, offset = 0) {
    try {
        const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            notifications = result.data.notifications;
            notificationStats = result.data.stats;
            
            updateNotificationBadge();
            displayNotifications();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
    }
}

// Chargement des statistiques de notifications
async function loadNotificationStats() {
    try {
        const response = await fetch('/api/notifications/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            notificationStats = result.data.stats;
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Mise à jour du badge de notifications
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const unreadCount = notificationStats.unread_notifications || 0;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
}

// Affichage des notifications
function displayNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-bell-slash fs-1"></i>
                <p class="mt-2">Aucune notification</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.read_at ? 'unread' : ''}" data-id="${notification.id}">
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1">${notification.title}</h6>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                ${!notification.read_at ? `
                                    <li><a class="dropdown-item" href="#" onclick="markAsRead('${notification.id}')">
                                        <i class="bi bi-check"></i> Marquer comme lue
                                    </a></li>
                                ` : ''}
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteNotification('${notification.id}')">
                                    <i class="bi bi-trash"></i> Supprimer
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <p class="mb-1">${notification.message}</p>
                    <small class="text-muted">
                        <i class="bi bi-clock"></i>
                        ${formatDateTime(notification.created_at)}
                        ${notification.opportunity_name ? ` • ${notification.opportunity_name}` : ''}
                    </small>
                    ${getPriorityBadge(notification.priority)}
                </div>
            </div>
        </div>
    `).join('');
}

// Marquer une notification comme lue
async function markAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Mettre à jour l'affichage
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read_at = new Date().toISOString();
            }
            
            loadNotificationStats();
            displayNotifications();
        }
    } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error);
    }
}

// Supprimer une notification
async function deleteNotification(notificationId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Retirer de la liste
            notifications = notifications.filter(n => n.id !== notificationId);
            
            loadNotificationStats();
            displayNotifications();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la notification:', error);
    }
}

// Marquer toutes les notifications comme lues
async function markAllAsRead() {
    try {
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Marquer toutes les notifications comme lues
            notifications.forEach(n => n.read_at = new Date().toISOString());
            
            loadNotificationStats();
            displayNotifications();
        }
    } catch (error) {
        console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
}

// Supprimer toutes les notifications lues
async function clearReadNotifications() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications lues ?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/notifications/clear-read', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Retirer les notifications lues de la liste
            notifications = notifications.filter(n => !n.read_at);
            
            loadNotificationStats();
            displayNotifications();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des notifications lues:', error);
    }
}

// Ouvrir le modal des notifications
function openNotificationsModal() {
    loadNotifications(50, 0); // Charger plus de notifications
    const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
    modal.show();
}

// Utilitaires
function getPriorityBadge(priority) {
    const classes = {
        'LOW': 'bg-secondary',
        'NORMAL': 'bg-primary',
        'HIGH': 'bg-warning',
        'URGENT': 'bg-danger'
    };
    const labels = {
        'LOW': 'Faible',
        'NORMAL': 'Normale',
        'HIGH': 'Élevée',
        'URGENT': 'Urgente'
    };
    
    if (priority === 'NORMAL') return '';
    
    return `<span class="badge ${classes[priority]} ms-2">${labels[priority]}</span>`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Hier';
    } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    } else {
        return date.toLocaleDateString('fr-FR');
    }
}

// Exposer les fonctions globalement
window.openNotificationsModal = openNotificationsModal;
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
window.markAllAsRead = markAllAsRead;
window.clearReadNotifications = clearReadNotifications; 