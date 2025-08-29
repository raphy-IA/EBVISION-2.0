// Variables globales
let notifications = [];
let notificationStats = {};

// Fonction pour vérifier si l'utilisateur est authentifié
function isNotificationsAuthenticated() {
    const token = localStorage.getItem('authToken');
    return token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔔 Initialisation du système de notifications (DOMContentLoaded)');
    if (isNotificationsAuthenticated()) {
        initializeNotifications();
    } else {
        console.log('🔔 Utilisateur non authentifié, initialisation des notifications ignorée');
    }
});

// Initialisation immédiate si le DOM est déjà chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔔 Initialisation différée du système de notifications');
        if (isNotificationsAuthenticated()) {
            initializeNotifications();
        } else {
            console.log('🔔 Utilisateur non authentifié, initialisation des notifications ignorée');
        }
    });
} else {
    console.log('🔔 Initialisation immédiate du système de notifications');
    if (isNotificationsAuthenticated()) {
        initializeNotifications();
    } else {
        console.log('🔔 Utilisateur non authentifié, initialisation des notifications ignorée');
    }
}

function initializeNotifications() {
    console.log('🔔 Démarrage de l\'initialisation des notifications');
    
    // Charger d'abord les statistiques pour mettre à jour le badge
    loadNotificationStats().then(() => {
        console.log('✅ Statistiques chargées, chargement des notifications...');
        loadNotifications();
    }).catch(error => {
        console.error('❌ Erreur lors du chargement des statistiques:', error);
        // Charger quand même les notifications
        loadNotifications();
    });
    
    setupNotificationPolling();
    
    // S'assurer que la fonction est exposée globalement
    if (typeof window.openNotificationsModal === 'undefined') {
        console.log('📤 Exposition de openNotificationsModal globalement');
        window.openNotificationsModal = openNotificationsModal;
    }
}

// Configuration du polling des notifications
function setupNotificationPolling() {
    // Vérifier les nouvelles notifications toutes les 30 secondes
    setInterval(() => {
        loadNotificationStats();
    }, 30000);
}

// Chargement des notifications
async function loadNotifications(limit = 10, offset = 0) {
    // Vérifier l'authentification avant de charger
    if (!isNotificationsAuthenticated()) {
        console.log('🔑 Utilisateur non authentifié, chargement des notifications ignoré');
        return;
    }
    
    try {
        console.log(`📥 Chargement des notifications (limit: ${limit}, offset: ${offset})`);
        
        const token = localStorage.getItem('authToken');
        console.log('🔑 Token présent:', !!token);
        
        const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse API notifications:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('📊 Données reçues:', result);
            
            notifications = result.data || [];
            console.log(`✅ ${notifications.length} notifications chargées`);
            
            if (notifications.length > 0) {
                console.log('📋 Première notification:', notifications[0]);
            }
            
            updateNotificationBadge();
            displayNotifications();
        } else {
            console.error('❌ Erreur API:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Détails erreur:', errorText);
            
            // Afficher un message d'erreur dans le modal
            const container = document.getElementById('notificationsContainerFull');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Erreur lors du chargement des notifications (${response.status})
                        <br><small>${errorText}</small>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des notifications:', error);
        // Afficher un message d'erreur dans le modal
        const container = document.getElementById('notificationsContainerFull');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erreur lors du chargement des notifications: ${error.message}
                </div>
            `;
        }
    }
}

// Chargement des statistiques de notifications
async function loadNotificationStats() {
    // Vérifier l'authentification avant de charger
    if (!isNotificationsAuthenticated()) {
        console.log('🔑 Utilisateur non authentifié, chargement des statistiques ignoré');
        return;
    }
    
    try {
        console.log('📊 Chargement des statistiques de notifications...');
        
        const token = localStorage.getItem('authToken');
        console.log('🔑 Token présent:', !!token);
        
        const response = await fetch('/api/notifications/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Réponse API stats:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('📊 Données reçues:', result);
            
            notificationStats = result.data || {};
            console.log('📊 Stats mises à jour:', notificationStats);
            
            updateNotificationBadge();
        } else {
            console.error('❌ Erreur API stats:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Détails erreur:', errorText);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques:', error);
    }
}

// Mise à jour du badge de notifications
function updateNotificationBadge() {
    console.log('🔔 Mise à jour du badge de notifications');
    console.log('📊 Stats actuelles:', notificationStats);
    
    // Essayer plusieurs sélecteurs pour le badge
    const badges = [
        document.getElementById('notificationBadge'),
        document.getElementById('menuNotificationCount'),
        document.querySelector('.notification-count'),
        document.querySelector('[id*="notification"]')
    ].filter(Boolean);
    
    console.log('🎯 Badges trouvés:', badges.length);
    
    const unreadCount = notificationStats.unread_notifications || notificationStats.unread || 0;
    console.log('📊 Nombre de notifications non lues:', unreadCount);
    
    badges.forEach(badge => {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('d-none');
            badge.style.display = 'inline-block';
            // Forcer la stabilité du positionnement sans modifier les styles
            console.log(`✅ Badge mis à jour: ${unreadCount}`);
        } else {
            badge.classList.add('d-none');
            badge.style.display = 'none';
            console.log('✅ Badge masqué');
        }
    });
}

// Affichage des notifications
function displayNotifications() {
    console.log('📋 Affichage des notifications');
    console.log('📊 Notifications à afficher:', notifications.length);
    
    // Essayer d'abord le container du modal (priorité)
    let container = document.getElementById('notificationsContainerFull');
    console.log('🔍 Container modal trouvé:', !!container);
    
    // Si pas trouvé, essayer le container principal
    if (!container) {
        container = document.getElementById('notificationsContainer');
        console.log('🔄 Container principal trouvé:', !!container);
    }
    
    // Essayer d'autres sélecteurs possibles
    if (!container) {
        container = document.querySelector('.modal-body .list-group');
        console.log('🔄 Container list-group trouvé:', !!container);
    }
    
    if (!container) {
        console.error('❌ Aucun container de notifications trouvé');
        console.log('🔍 Containers disponibles:', {
            notificationsContainer: !!document.getElementById('notificationsContainer'),
            notificationsContainerFull: !!document.getElementById('notificationsContainerFull'),
            listGroup: !!document.querySelector('.modal-body .list-group'),
            modalBody: !!document.querySelector('#notificationsModal .modal-body')
        });
        return;
    }
    
    console.log('✅ Container trouvé, affichage des notifications...');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-bell-slash fa-3x mb-3"></i>
                <h5>Aucune notification</h5>
                <p class="text-muted">Vous n'avez aucune notification pour le moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.read_at ? 'unread' : ''}" data-id="${notification.id}">
            <div class="d-flex align-items-start">
                <div class="notification-icon me-3">
                    ${getNotificationIcon(notification.type)}
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1">${notification.title}</h6>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                ${!notification.read_at ? `
                                    <li><a class="dropdown-item" href="#" onclick="markAsRead('${notification.id}')">
                                        <i class="fas fa-check"></i> Marquer comme lue
                                    </a></li>
                                ` : ''}
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteNotification('${notification.id}')">
                                    <i class="fas fa-trash"></i> Supprimer
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <p class="mb-1">${notification.message}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-clock"></i>
                            ${formatDateTime(notification.created_at)}
                            ${notification.opportunity_name ? ` • ${notification.opportunity_name}` : ''}
                            ${notification.metadata && notification.metadata.campaign_name ? ` • ${notification.metadata.campaign_name}` : ''}
                        </small>
                        <div class="d-flex gap-1">
                            ${getPriorityBadge(notification.priority)}
                            ${!notification.read_at ? '<span class="badge bg-primary">Nouveau</span>' : ''}
                        </div>
                    </div>
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
        console.log('🗑️ Suppression des notifications lues...');
        
        const response = await fetch('/api/notifications/clear-read', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        console.log('📡 Réponse suppression:', response.status, response.statusText);
        
        if (response.ok) {
            console.log('✅ Notifications lues supprimées avec succès');
            
            // Retirer les notifications lues de la liste
            const beforeCount = notifications.length;
            notifications = notifications.filter(n => !n.read_at);
            const afterCount = notifications.length;
            
            console.log(`📊 Notifications: ${beforeCount} → ${afterCount}`);
            
            // Recharger les statistiques et l'affichage
            await loadNotificationStats();
            displayNotifications();
            
            // Afficher un message de confirmation
            const container = document.getElementById('notificationsContainerFull');
            if (container) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success alert-dismissible fade show';
                alertDiv.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    Notifications lues supprimées avec succès !
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                container.insertBefore(alertDiv, container.firstChild);
                
                // Supprimer l'alerte après 3 secondes
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 3000);
            }
        } else {
            console.error('❌ Erreur lors de la suppression:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Détails erreur:', errorText);
            
            alert('Erreur lors de la suppression des notifications lues');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des notifications lues:', error);
        alert('Erreur lors de la suppression des notifications lues');
    }
}

// Ouvrir le modal des notifications
function openNotificationsModal() {
    console.log('🔔 Ouverture du modal des notifications');
    
    // Vérifier que Bootstrap est disponible
    if (typeof bootstrap === 'undefined') {
        console.error('❌ Bootstrap non disponible');
        alert('Erreur: Bootstrap non chargé');
        return;
    }
    
    // Vérifier que le modal existe
    const modalElement = document.getElementById('notificationsModal');
    if (!modalElement) {
        console.error('❌ Modal notificationsModal non trouvé');
        alert('Erreur: Modal des notifications non trouvé');
        return;
    }
    
    try {
        // Afficher un indicateur de chargement
        const container = document.getElementById('notificationsContainerFull');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2 text-muted">Chargement des notifications...</p>
                </div>
            `;
        }
        
        // Ouvrir le modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Charger les notifications après l'ouverture du modal
        setTimeout(() => {
            console.log('🔄 Chargement des notifications après ouverture du modal...');
            loadNotifications(50, 0); // Charger plus de notifications
        }, 100);
        
        console.log('✅ Modal des notifications ouvert avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'ouverture du modal:', error);
        alert('Erreur lors de l\'ouverture des notifications');
    }
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

function getNotificationIcon(type) {
    switch (type) {
        case 'CAMPAIGN_CREATED':
            return '<i class="fas fa-bullhorn text-primary"></i>';
        case 'CAMPAIGN_ASSIGNED':
            return '<i class="fas fa-user-plus text-info"></i>';
        case 'CAMPAIGN_SUBMITTED':
            return '<i class="fas fa-paper-plane text-warning"></i>';
        case 'CAMPAIGN_VALIDATION_REQUIRED':
            return '<i class="fas fa-clipboard-check text-danger"></i>';
        case 'CAMPAIGN_VALIDATION_DECISION':
            return '<i class="fas fa-gavel text-success"></i>';
        case 'CAMPAIGN_STARTED':
            return '<i class="fas fa-play text-success"></i>';
        case 'CAMPAIGN_PROGRESS':
            return '<i class="fas fa-chart-line text-info"></i>';
        case 'CAMPAIGN_CONVERSION':
            return '<i class="fas fa-trophy text-warning"></i>';
        case 'CAMPAIGN_OVERDUE':
            return '<i class="fas fa-clock text-danger"></i>';
        case 'STAGE_OVERDUE':
            return '<i class="fas fa-exclamation-triangle text-danger"></i>';
        case 'OPPORTUNITY_WON':
            return '<i class="fas fa-trophy text-success"></i>';
        case 'OPPORTUNITY_LOST':
            return '<i class="fas fa-times-circle text-danger"></i>';
        default:
            return '<i class="fas fa-bell text-secondary"></i>';
    }
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