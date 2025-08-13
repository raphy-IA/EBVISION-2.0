// Fonctions utilitaires pour la top bar EBVISION 2.0

// Marquer toutes les notifications comme lues
function markAllNotificationsAsRead() {
    console.log('Marquer toutes les notifications comme lues');
    // TODO: Implémenter la logique API
    const notificationCount = document.querySelector('.notification-count');
    if (notificationCount) {
        notificationCount.textContent = '0';
        notificationCount.style.display = 'none';
    }
}

// Voir toutes les tâches
function viewAllTasks() {
    console.log('Voir toutes les tâches');
    // TODO: Rediriger vers la page des tâches
    window.location.href = 'task-templates.html';
}

// Ouvrir le modal de profil utilisateur
function openUserProfileModal() {
    console.log('Ouverture du modal de profil utilisateur');
    
    // Créer le modal de profil
    const modalHTML = `
        <div class="modal fade" id="userProfileModal" tabindex="-1" aria-labelledby="userProfileModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="userProfileModalLabel">
                            <i class="fas fa-user me-2"></i>Mon Profil
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="profileContent">
                            <div class="text-center">
                                <div class="spinner-border" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                                <p class="mt-2">Chargement du profil...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Supprimer le modal existant s'il y en a un
    const existingModal = document.getElementById('userProfileModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ajouter le modal au body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Charger le contenu du profil
    loadProfileContent();
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
    modal.show();
}

// Charger le contenu du profil
async function loadProfileContent() {
    try {
        console.log('🔄 Début du chargement du profil...');
        
        // Utiliser le SessionManager pour récupérer les données utilisateur
        const userData = await loadUserDataFromAPI();
        
        const profileContent = document.getElementById('profileContent');
        if (!profileContent) {
            console.error('❌ Élément profileContent non trouvé');
            return;
        }
        
        if (userData) {
            console.log('✅ Données utilisateur récupérées:', userData);
            
            // Générer le contenu du profil basé sur les données du SessionManager
            const profileHTML = generateProfileHTML(userData);
            profileContent.innerHTML = profileHTML;
            console.log('✅ Contenu du profil affiché avec succès');
        } else {
            console.warn('⚠️ Aucune donnée utilisateur trouvée');
            profileContent.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Impossible de charger les informations du profil
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du profil:', error);
        const profileContent = document.getElementById('profileContent');
        if (profileContent) {
            profileContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erreur lors du chargement du profil : ${error.message}
                </div>
            `;
        }
    }
}

// Générer le HTML du profil basé sur les données utilisateur
function generateProfileHTML(userData) {
    const fullName = `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'Utilisateur';
    const role = userData.role || 'Rôle non défini';
    const email = userData.email || 'Non renseigné';
    const login = userData.login || 'Non renseigné';
    const statut = userData.statut || 'ACTIF';
    const businessUnit = userData.business_unit ? userData.business_unit.nom : null;
    const division = userData.division ? userData.division.nom : null;
    const isAdmin = userData.isAdmin || false;
    const hasCollaborateur = userData.hasCollaborateur || false;
    const collaborateur = userData.collaborateur;
    
    // Badge de rôle avec style
    const roleBadgeClass = getRoleBadgeClass(role);
    
    return `
        <div class="row">
            <div class="col-md-4 text-center">
                <div class="mb-3">
                    <div class="user-avatar-large mx-auto mb-3">
                        <i class="fas fa-user-circle fa-4x text-primary"></i>
                    </div>
                    <h5 class="mb-1">${fullName}</h5>
                    <p class="text-muted mb-0">${role}</p>
                    <span class="badge ${roleBadgeClass} mt-1">${role}</span>
                    ${isAdmin ? '<span class="badge bg-danger mt-1 ms-1">Administrateur</span>' : ''}
                </div>
            </div>
            <div class="col-md-8">
                <!-- Informations Personnelles -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-user-circle me-2"></i>Informations Personnelles</h6>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Nom :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${userData.nom || 'Non renseigné'}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Prénom :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${userData.prenom || 'Non renseigné'}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Email :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${email}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Login :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${login}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Informations du Compte -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-shield-alt me-2"></i>Informations du Compte</h6>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Rôle :</strong>
                            </div>
                            <div class="col-sm-8">
                                <span class="badge ${roleBadgeClass}">${role}</span>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Statut :</strong>
                            </div>
                            <div class="col-sm-8">
                                <span class="badge ${statut === 'ACTIF' ? 'bg-success' : 'bg-danger'}">${statut}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${hasCollaborateur && collaborateur ? `
                <!-- Informations Collaborateur -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-users me-2"></i>Informations Collaborateur</h6>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Nom Collaborateur :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${collaborateur.prenom || ''} ${collaborateur.nom || ''}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Email Collaborateur :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${collaborateur.email || 'Non renseigné'}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Grade :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${collaborateur.grade_nom || 'Non renseigné'}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4">
                                <strong>Poste :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${collaborateur.poste_nom || 'Non renseigné'}
                            </div>
                        </div>
                    </div>
                </div>
                ` : `
                <!-- Message Pas de Collaborateur -->
                <div class="card mb-3">
                    <div class="card-body text-center">
                        <i class="fas fa-info-circle fa-2x text-muted mb-3"></i>
                        <h6 class="text-muted">Aucun Collaborateur Associé</h6>
                        <p class="text-muted mb-0">Cet utilisateur n'est pas lié à un profil collaborateur.</p>
                    </div>
                </div>
                `}
                
                ${businessUnit ? `
                <!-- Business Unit -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-building me-2"></i>Business Unit</h6>
                    </div>
                    <div class="card-body" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 8px;">
                        <div class="row mb-2">
                            <div class="col-sm-4">
                                <strong>Business Unit :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${businessUnit}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${division ? `
                <!-- Division -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-sitemap me-2"></i>Division</h6>
                    </div>
                    <div class="card-body" style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 8px;">
                        <div class="row mb-2">
                            <div class="col-sm-4">
                                <strong>Division :</strong>
                            </div>
                            <div class="col-sm-8">
                                ${division}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Fonction pour obtenir la classe CSS du badge de rôle
function getRoleBadgeClass(role) {
    const roleMap = {
        'ADMIN': 'bg-danger',
        'MANAGER': 'bg-warning',
        'USER': 'bg-primary',
        'ASSISTANT': 'bg-info',
        'SENIOR': 'bg-success',
        'DIRECTOR': 'bg-dark',
        'PARTNER': 'bg-secondary'
    };
    return roleMap[role] || 'bg-primary';
}

// Ouvrir le modal des paramètres
function openSettingsModal() {
    console.log('Ouvrir le modal des paramètres');
    // TODO: Implémenter l'ouverture du modal
    alert('Fonctionnalité en cours de développement');
}

// Fonction de déconnexion
function logout() {
    console.log('🚪 Déconnexion...');
    
    // Nettoyer le SessionManager
    if (window.sessionManager) {
        window.sessionManager.clear();
    }
    
    // Nettoyer le localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Rediriger vers la page de déconnexion
    window.location.href = 'logout.html';
}

// Fonction de recherche rapide
function handleQuickSearch(query) {
    if (query.length > 2) {
        console.log('Recherche rapide:', query);
        // TODO: Implémenter la logique de recherche
        // Possibilité de rechercher dans les missions, clients, collaborateurs, etc.
    }
}

// Fonction pour obtenir l'icône de notification
function getNotificationIcon(type) {
    const icons = {
        'info': 'info-circle',
        'warning': 'exclamation-triangle',
        'success': 'check-circle',
        'danger': 'exclamation-circle'
    };
    return icons[type] || 'bell';
}

// Fonction pour obtenir la couleur de priorité de tâche
function getTaskPriorityColor(priority) {
    const colors = {
        'high': 'danger',
        'medium': 'warning',
        'low': 'success'
    };
    return colors[priority] || 'secondary';
}

// Fonction pour charger les données utilisateur depuis le SessionManager
async function loadUserDataFromAPI() {
    try {
        console.log('🔍 loadUserDataFromAPI: Début du chargement...');
        
        // Utiliser le SessionManager au lieu d'appeler directement l'API
        if (!window.sessionManager) {
            console.error('[UserHeaderUtils] SessionManager non disponible, fallback localStorage');
            throw new Error('SessionManager non disponible');
        }

        // Initialiser le SessionManager s'il n'est pas déjà initialisé
        await window.sessionManager.initialize();
        
        // Récupérer les données utilisateur depuis le cache du SessionManager
        const user = window.sessionManager.getUser();
        const collaborateur = window.sessionManager.getCollaborateur();
        
        console.log('🔍 loadUserDataFromAPI: Données brutes récupérées:', {
            user: user,
            collaborateur: collaborateur,
            hasCollaborateur: window.sessionManager.hasCollaborateur(),
            businessUnit: window.sessionManager.getBusinessUnit(),
            division: window.sessionManager.getDivision()
        });
        
        // Combiner les données utilisateur et collaborateur
        const userData = {
            ...user,
            collaborateur: collaborateur,
            business_unit: window.sessionManager.getBusinessUnit(),
            division: window.sessionManager.getDivision(),
            isAdmin: window.sessionManager.isAdmin(),
            hasCollaborateur: window.sessionManager.hasCollaborateur()
        };
        
        console.log('✅ loadUserDataFromAPI: Données utilisateur finales:', userData);
        return userData;
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données utilisateur:', error);
        return null;
    }
}

// Fonction pour charger les notifications depuis l'API
async function loadNotificationsFromAPI() {
    try {
        // Pour l'instant, retourner un tableau vide car l'endpoint n'existe pas
        // TODO: Implémenter quand l'endpoint sera disponible
        console.log('ℹ️ Endpoint notifications non disponible, retour d\'un tableau vide');
        return [];
    } catch (error) {
        console.error('❌ Erreur lors du chargement des notifications:', error);
        return [];
    }
}

// Fonction pour charger les tâches depuis l'API
async function loadTasksFromAPI() {
    try {
        // Pour l'instant, retourner un tableau vide car l'endpoint n'existe pas
        // TODO: Implémenter quand l'endpoint sera disponible
        console.log('ℹ️ Endpoint tasks/assigned non disponible, retour d\'un tableau vide');
        return [];
    } catch (error) {
        console.error('❌ Erreur lors du chargement des tâches:', error);
        return [];
    }
}

// Exporter les fonctions pour utilisation dans d'autres modules
window.UserHeaderUtils = {
    markAllNotificationsAsRead,
    viewAllTasks,
    openUserProfileModal,
    openSettingsModal,
    logout,
    handleQuickSearch,
    getNotificationIcon,
    getTaskPriorityColor,
    loadUserDataFromAPI,
    loadNotificationsFromAPI,
    loadTasksFromAPI
};


