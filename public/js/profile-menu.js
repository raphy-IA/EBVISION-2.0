// Gestionnaire du menu de profil utilisateur
class ProfileMenuManager {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        console.log('🔧 Initialisation du ProfileMenuManager');
        
        // Attendre que le DOM soit chargé ET que la sidebar soit chargée
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForSidebar());
        } else {
            this.waitForSidebar();
        }
    }

    waitForSidebar() {
        console.log('⏳ Attente du chargement de la sidebar...');
        
        // Vérifier si les éléments de la sidebar sont présents
        const checkSidebar = () => {
            const userProfileToggle = document.getElementById('userProfileToggle');
            const userProfileMenu = document.getElementById('userProfileMenu');
            
            if (userProfileToggle && userProfileMenu) {
                console.log('✅ Sidebar chargée, configuration des événements');
                this.setupEventListeners();
            } else {
                console.log('⏳ Sidebar pas encore chargée, nouvelle tentative dans 500ms...');
                setTimeout(checkSidebar, 500);
            }
        };
        
        // Première vérification après un délai
        setTimeout(checkSidebar, 1000);
    }

    setupEventListeners() {
        console.log('🔧 Configuration des gestionnaires d\'événements du profil');
        
        // Gestionnaire pour le toggle du profil
        const userProfileToggle = document.getElementById('userProfileToggle');
        const userProfileMenu = document.getElementById('userProfileMenu');
        const profileToggleIcon = document.getElementById('profileToggleIcon');
        
        console.log('📋 Éléments trouvés:', {
            userProfileToggle: !!userProfileToggle,
            userProfileMenu: !!userProfileMenu,
            profileToggleIcon: !!profileToggleIcon
        });
        
        if (userProfileToggle && userProfileMenu) {
            userProfileToggle.addEventListener('click', (e) => this.handleToggleClick(e));
            console.log('✅ Gestionnaire d\'événement attaché au toggle');
        } else {
            console.error('❌ Éléments manquants pour le toggle du profil');
        }

        // Gestionnaire pour "Mon profil"
        const profileMenuItem = document.getElementById('profileMenuItem');
        if (profileMenuItem) {
            profileMenuItem.addEventListener('click', () => this.handleProfileClick());
        }

        // Gestionnaire pour les notifications
        const notificationsMenuItem = document.getElementById('notificationsMenuItem');
        if (notificationsMenuItem) {
            notificationsMenuItem.addEventListener('click', () => this.handleNotificationsClick());
        }

        // Gestionnaire pour les tâches
        const tasksMenuItem = document.getElementById('tasksMenuItem');
        if (tasksMenuItem) {
            tasksMenuItem.addEventListener('click', () => this.handleTasksClick());
        }

        // Gestionnaire pour la déconnexion
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => this.handleLogoutClick());
        }

        this.isInitialized = true;
        console.log('✅ ProfileMenuManager initialisé avec succès');
    }

    handleToggleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ Clic sur le toggle du profil');
        const userProfileToggle = document.getElementById('userProfileToggle');
        const userProfileMenu = document.getElementById('userProfileMenu');
        
        if (!userProfileToggle || !userProfileMenu) {
            console.error('❌ Éléments manquants pour le toggle');
            return;
        }
        
        const isExpanded = userProfileMenu.style.display === 'block';
        
        if (isExpanded) {
            // Fermer le menu
            console.log('📂 Fermeture du menu');
            userProfileMenu.style.display = 'none';
            userProfileToggle.classList.remove('expanded');
        } else {
            // Ouvrir le menu
            console.log('📂 Ouverture du menu');
            userProfileMenu.style.display = 'block';
            userProfileToggle.classList.add('expanded');
        }
    }

    handleProfileClick() {
        console.log('👤 Ouverture du profil utilisateur');
        window.location.href = '/profile.html';
    }

    handleNotificationsClick() {
        console.log('🔔 Ouverture des notifications');
        // TODO: Implémenter l'ouverture du modal des notifications
        alert('Fonctionnalité des notifications à implémenter');
    }

    handleTasksClick() {
        console.log('📋 Ouverture des tâches');
        // TODO: Implémenter l'ouverture du modal des tâches
        alert('Fonctionnalité des tâches à implémenter');
    }

    handleLogoutClick() {
        console.log('🚪 Déconnexion');
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
    }

    // Méthodes publiques pour les tests
    testMenu() {
        console.log('🧪 Test manuel du menu profil');
        const toggle = document.getElementById('userProfileToggle');
        const menu = document.getElementById('userProfileMenu');
        
        if (toggle && menu) {
            console.log('✅ Éléments trouvés, test du clic...');
            toggle.click();
            return true;
        } else {
            console.error('❌ Éléments manquants');
            return false;
        }
    }

    openMenu() {
        const toggle = document.getElementById('userProfileToggle');
        const menu = document.getElementById('userProfileMenu');
        
        if (toggle && menu) {
            menu.style.display = 'block';
            toggle.classList.add('expanded');
            console.log('✅ Menu forcé ouvert');
        }
    }

    closeMenu() {
        const toggle = document.getElementById('userProfileToggle');
        const menu = document.getElementById('userProfileMenu');
        
        if (toggle && menu) {
            menu.style.display = 'none';
            toggle.classList.remove('expanded');
            console.log('✅ Menu forcé fermé');
        }
    }

    updateNotificationBubble() {
        const notificationBubble = document.getElementById('notificationBubble');
        const menuNotificationCount = document.getElementById('menuNotificationCount');
        const menuTaskCount = document.getElementById('menuTaskCount');
        
        // Simuler des notifications (à remplacer par de vraies données)
        const notificationCount = 3;
        const taskCount = 8;
        
        // Mettre à jour les badges du menu
        if (menuNotificationCount) menuNotificationCount.textContent = notificationCount;
        if (menuTaskCount) menuTaskCount.textContent = taskCount;
        
        // Afficher la bulle si il y a des notifications ou tâches
        if (notificationBubble) {
            if (notificationCount > 0 || taskCount > 0) {
                notificationBubble.style.display = 'flex';
            } else {
                notificationBubble.style.display = 'none';
            }
        }
    }
}

// Initialiser le gestionnaire
let profileMenuManager = null;

// Fonction d'initialisation
function initProfileMenu() {
    if (!profileMenuManager) {
        console.log('🚀 Création du ProfileMenuManager');
        profileMenuManager = new ProfileMenuManager();
        
        // Mettre à jour les badges après un délai plus long
        setTimeout(() => {
            if (profileMenuManager && profileMenuManager.isInitialized) {
                profileMenuManager.updateNotificationBubble();
            }
        }, 3000);
    }
}

// Fonctions globales pour les tests
window.testProfileMenu = function() {
    if (profileMenuManager) {
        return profileMenuManager.testMenu();
    } else {
        console.error('❌ ProfileMenuManager non initialisé');
        return false;
    }
};

window.openProfileMenu = function() {
    if (profileMenuManager) {
        profileMenuManager.openMenu();
    } else {
        console.error('❌ ProfileMenuManager non initialisé');
    }
};

window.closeProfileMenu = function() {
    if (profileMenuManager) {
        profileMenuManager.closeMenu();
    } else {
        console.error('❌ ProfileMenuManager non initialisé');
    }
};

// Fonction pour forcer la réinitialisation (utile pour les tests)
window.reinitProfileMenu = function() {
    console.log('🔄 Réinitialisation forcée du ProfileMenuManager');
    profileMenuManager = null;
    initProfileMenu();
};

// Initialiser automatiquement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileMenu);
} else {
    initProfileMenu();
}
