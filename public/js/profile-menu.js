// Gestionnaire du menu de profil utilisateur - APPROCHE SIMPLE
class ProfileMenuManager {
    constructor() {
        if (ProfileMenuManager.instance) {
            return ProfileMenuManager.instance;
        }
        ProfileMenuManager.instance = this;
        
        this.init();
    }

    init() {
        console.log('🔧 Initialisation du ProfileMenuManager');
        this.waitForSidebar();
    }

    waitForSidebar() {
        const checkSidebar = () => {
            const userProfileToggle = document.getElementById('userProfileToggle');
            const userProfileMenu = document.getElementById('userProfileMenu');
            
            if (userProfileToggle && userProfileMenu) {
                console.log('✅ Sidebar chargée, configuration des événements');
                this.setupEventListeners();
            } else {
                setTimeout(checkSidebar, 500);
            }
        };
        
        setTimeout(checkSidebar, 1000);
    }

    setupEventListeners() {
        // Toggle du profil
        const userProfileToggle = document.getElementById('userProfileToggle');
        const userProfileMenu = document.getElementById('userProfileMenu');
        
        if (userProfileToggle && userProfileMenu) {
            userProfileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isExpanded = userProfileMenu.style.display === 'block';
                if (isExpanded) {
                    userProfileMenu.style.display = 'none';
                    userProfileToggle.classList.remove('expanded');
                } else {
                    userProfileMenu.style.display = 'block';
                    userProfileToggle.classList.add('expanded');
                }
            });
        }

        // Bouton "Mon profil"
        const profileMenuItem = document.getElementById('profileMenuItem');
        if (profileMenuItem) {
            profileMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('👤 Clic sur "Mon profil"');
                this.openProfileModal();
            });
        }

        // Notifications
        const notificationsMenuItem = document.getElementById('notificationsMenuItem');
        if (notificationsMenuItem) {
            notificationsMenuItem.addEventListener('click', () => {
                console.log('🔔 Clic sur "Notifications"');
                if (typeof window.openNotificationsModal === 'function') {
                    console.log('✅ Fonction openNotificationsModal trouvée');
                    window.openNotificationsModal();
                } else {
                    console.error('❌ Fonction openNotificationsModal non trouvée');
                    // Fallback: essayer d'ouvrir le modal directement
                    const modal = document.getElementById('notificationsModal');
                    if (modal) {
                        console.log('🔄 Tentative d\'ouverture directe du modal');
                        const bootstrapModal = new bootstrap.Modal(modal);
                        bootstrapModal.show();
                        // Charger les notifications
                        if (typeof loadNotifications === 'function') {
                            loadNotifications(50, 0);
                        }
                    } else {
                        console.error('❌ Modal notificationsModal non trouvé');
                        alert('Erreur: Impossible d\'ouvrir les notifications');
                    }
                }
            });
        }

        // Tâches
        const tasksMenuItem = document.getElementById('tasksMenuItem');
        if (tasksMenuItem) {
            tasksMenuItem.addEventListener('click', () => {
                if (typeof window.openTasksModal === 'function') {
                    window.openTasksModal();
                }
            });
        }

        // Déconnexion
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => {
                if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            });
        }

        console.log('✅ ProfileMenuManager initialisé');
    }

    // MÉTHODE SIMPLE POUR OUVRIR LE MODAL - comme les notifications
    openProfileModal() {
        console.log('📋 Ouverture du modal de profil');
        
        // Vérifier Bootstrap
        if (typeof bootstrap === 'undefined') {
            alert('Erreur: Bootstrap non chargé');
            return;
        }
        
        // Vérifier le modal
        const modalElement = document.getElementById('profileModal');
        if (!modalElement) {
            alert('Erreur: Modal de profil non trouvé');
            return;
        }
        
        try {
            // Afficher chargement
            this.showLoading();
            
            // Charger données
            this.loadProfileData();
            
            // Ouvrir modal comme les notifications
            const profileModal = new bootstrap.Modal(modalElement);
            profileModal.show();
            
            // Attacher les événements du modal APRÈS l'ouverture
            setTimeout(() => {
                this.attachProfileModalEvents();
            }, 100);
            
            // Ajouter un écouteur pour nettoyer le backdrop lors de la fermeture
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.cleanupBackdrop();
            });
            
            console.log('✅ Modal ouvert avec succès');
        } catch (error) {
            console.error('❌ Erreur:', error);
            alert('Erreur lors de l\'ouverture du modal');
        }
    }

    // Méthode pour nettoyer le backdrop
    cleanupBackdrop() {
        // Supprimer le backdrop manuellement
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        // Réactiver le scroll de la page
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('🧹 Backdrop nettoyé');
    }

    showLoading() {
        const loading = document.getElementById('profileLoadingState');
        const error = document.getElementById('profileErrorState');
        const content = document.getElementById('profileContent');
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'none';
    }

    showError(message) {
        const loading = document.getElementById('profileLoadingState');
        const error = document.getElementById('profileErrorState');
        const content = document.getElementById('profileContent');
        const errorMsg = document.getElementById('profileErrorMessage');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'block';
        if (content) content.style.display = 'none';
        if (errorMsg) errorMsg.textContent = message;
    }

    showContent() {
        const loading = document.getElementById('profileLoadingState');
        const error = document.getElementById('profileErrorState');
        const content = document.getElementById('profileContent');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    async loadProfileData() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('Token manquant');

            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erreur API');

            const result = await response.json();
            console.log('✅ Données utilisateur:', result);

            // Extraire les données utilisateur
            const userData = result.data ? result.data.user : result;
            console.log('📊 Données utilisateur extraites:', userData);

            // Afficher les informations de base
            this.displayProfileData(userData);

            // Si l'utilisateur a un collaborateur_id, charger les informations collaborateur
            if (userData.collaborateur_id) {
                await this.loadCollaboratorData(userData.collaborateur_id);
            }

            this.showContent();

        } catch (error) {
            console.error('❌ Erreur:', error);
            this.showError(error.message);
        }
    }

    displayProfileData(userData) {
        // Debug: afficher la valeur exacte du statut
        console.log('🔍 Valeur du statut:', userData.statut, 'Type:', typeof userData.statut);
        
        // Informations de base
        const elements = {
            profileName: `${userData.prenom} ${userData.nom}`,
            profileRole: this.getRoleName(userData.role),
            userNom: userData.nom || '-',
            userPrenom: userData.prenom || '-',
            userEmail: userData.email || '-',
            userLogin: userData.login || '-',
            userStatut: userData.statut === 'actif' || userData.statut === 'ACTIF' ? 'Actif' : 'Inactif',
            userLastLogin: userData.last_login ? new Date(userData.last_login).toLocaleString('fr-FR') : '-',
            userCreatedAt: userData.created_at ? new Date(userData.created_at).toLocaleDateString('fr-FR') : '-'
        };

        // Remplir les éléments
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = elements[id];
        });

        // Badge rôle
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.textContent = this.getRoleName(userData.role);
            roleBadge.className = this.getRoleClass(userData.role);
        }

        // Statut
        const status = document.getElementById('profileStatus');
        if (status) {
            const isActive = userData.statut === 'actif' || userData.statut === 'ACTIF';
            status.textContent = isActive ? 'Actif' : 'Inactif';
            status.className = isActive ? 'badge bg-success' : 'badge bg-danger';
        }

        // Photo
        this.displayPhoto(userData);
    }

    displayPhoto(userData) {
        const container = document.getElementById('profilePhotoContainer');
        if (!container) return;

        container.innerHTML = '';

        if (userData.collaborateur_photo_url) {
            const img = document.createElement('img');
            img.src = `/${userData.collaborateur_photo_url}`;
            img.alt = `${userData.prenom} ${userData.nom}`;
            img.className = 'collaborateur-avatar large';
            img.onerror = () => {
                container.innerHTML = `<div class="collaborateur-avatar large">${this.getInitials(userData.nom, userData.prenom)}</div>`;
            };
            container.appendChild(img);
        } else {
            container.innerHTML = `<div class="collaborateur-avatar large">${this.getInitials(userData.nom, userData.prenom)}</div>`;
        }
    }

    getInitials(nom, prenom) {
        const nomInitial = nom ? nom.charAt(0).toUpperCase() : '';
        const prenomInitial = prenom ? prenom.charAt(0).toUpperCase() : '';
        return nomInitial + prenomInitial;
    }

    getRoleName(role) {
        const roles = {
            'admin': 'Administrateur',
            'manager': 'Manager',
            'user': 'Utilisateur'
        };
        return roles[role] || role;
    }

    getRoleClass(role) {
        const classes = {
            'admin': 'badge bg-danger',
            'manager': 'badge bg-warning',
            'user': 'badge bg-primary'
        };
        return classes[role] || 'badge bg-primary';
    }

    async loadCollaboratorData(collaborateurId) {
        try {
            console.log('👤 Chargement des données collaborateur pour ID:', collaborateurId);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/collaborateurs/${collaborateurId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const collaborateurData = await response.json();
                console.log('✅ Données collaborateur chargées:', collaborateurData);
                
                // Debug: afficher la structure complète des données
                console.log('🔍 Structure des données collaborateur:', {
                    data: collaborateurData.data,
                    business_unit_nom: collaborateurData.data?.business_unit_nom,
                    division_nom: collaborateurData.data?.division_nom,
                    grade_nom: collaborateurData.data?.grade_nom,
                    poste_nom: collaborateurData.data?.poste_nom
                });
                
                this.displayCollaboratorData(collaborateurData);
            } else {
                console.warn('⚠️ Impossible de charger les données collaborateur');
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données collaborateur:', error);
        }
    }

    displayCollaboratorData(collaborateurData) {
        // Afficher la section collaborateur
        const collaboratorInfo = document.getElementById('collaboratorInfo');
        if (collaboratorInfo) {
            collaboratorInfo.style.display = 'block';
        }

        // Extraire les données du bon niveau
        const data = collaborateurData.data || collaborateurData;
        
        // Remplir les informations collaborateur
        const elements = {
            collaborateurBusinessUnit: data.business_unit_nom || '-',
            collaborateurDivision: data.division_nom || '-',
            collaborateurGrade: data.grade_nom || '-',
            collaborateurPoste: data.poste_nom || '-'
        };

        // Debug: afficher les valeurs extraites
        console.log('🔍 Valeurs extraites pour l\'affichage:', elements);

        // Remplir les éléments
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
                console.log(`✅ Élément ${id} mis à jour avec: "${elements[id]}"`);
            } else {
                console.warn(`⚠️ Élément ${id} non trouvé dans le DOM`);
            }
        });
    }

    attachProfileModalEvents() {
        // Gestionnaire pour le bouton "Modifier le Profil"
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.onclick = () => {
                console.log('✏️ Ouverture de la modification du profil');
                // Pour l'instant, afficher un message informatif
                alert('Fonctionnalité de modification du profil sera implémentée prochainement.\n\nPour l\'instant, vous pouvez voir toutes vos informations dans ce modal et changer votre mot de passe.');
            };
        } else {
            console.warn('⚠️ Bouton "Modifier le Profil" non trouvé');
        }

        // Gestionnaire pour le bouton "Changer le Mot de Passe"
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.onclick = () => {
                console.log('🔑 Ouverture du changement de mot de passe');
                this.openChangePasswordModal();
            };
        } else {
            console.warn('⚠️ Bouton "Changer le Mot de Passe" non trouvé');
        }
    }

    openChangePasswordModal() {
        // Fermer le modal de profil
        const profileModal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        if (profileModal) {
            profileModal.hide();
        }

        // Nettoyer le backdrop du modal de profil
        setTimeout(() => {
            this.cleanupBackdrop();
        }, 150);

        // Ouvrir le modal de changement de mot de passe
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();

        // Attacher les événements du modal de changement de mot de passe
        this.attachChangePasswordEvents();
    }

    attachChangePasswordEvents() {
        const submitBtn = document.getElementById('submitPasswordChange');
        const form = document.getElementById('changePasswordForm');

        if (submitBtn) {
            submitBtn.onclick = () => this.handlePasswordChange();
        }

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            };
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Debug: afficher les valeurs
        console.log('🔍 Valeurs des champs:', {
            currentPassword: currentPassword ? '***' : 'undefined',
            newPassword: newPassword ? '***' : 'undefined',
            confirmPassword: confirmPassword ? '***' : 'undefined'
        });

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Veuillez remplir tous les champs');
            return;
        }

        // Validation complète du mot de passe
        if (newPassword.length < 8) {
            alert('Le nouveau mot de passe doit contenir au moins 8 caractères');
            return;
        }

        // Vérifier la complexité du mot de passe
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
        if (!passwordPattern.test(newPassword)) {
            alert('Le nouveau mot de passe doit contenir au moins :\n- Une minuscule\n- Une majuscule\n- Un chiffre\n- Un caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>?)');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Mot de passe changé avec succès !');
                
                // Fermer le modal
                const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                if (changePasswordModal) {
                    changePasswordModal.hide();
                }

                // Nettoyer le backdrop
                this.cleanupBackdrop();

                // Vider le formulaire
                document.getElementById('changePasswordForm').reset();
            } else {
                // Afficher les erreurs détaillées du backend
                let errorMessage = result.message || 'Erreur lors du changement de mot de passe';
                if (result.errors && result.errors.length > 0) {
                    errorMessage += '\n\nDétails :\n' + result.errors.join('\n');
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            alert('Erreur lors du changement de mot de passe');
        }
    }
}

// Initialisation
let profileMenuManager = null;

function initProfileMenu() {
    if (!profileMenuManager) {
        profileMenuManager = new ProfileMenuManager();
    }
}

// Fonction globale
window.openProfileModal = function() {
    if (profileMenuManager) {
        profileMenuManager.openProfileModal();
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileMenu);
} else {
    initProfileMenu();
}
