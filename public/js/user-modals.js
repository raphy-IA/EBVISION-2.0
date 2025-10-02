// Gestionnaire des modales utilisateur
class UserModalsManager {
    constructor() {
        this.init();
    }

    init() {
        this.createModals();
        this.setupEventListeners();
    }

    createModals() {
        // Créer les modales si elles n'existent pas déjà
        if (!document.getElementById('profileModal')) {
            this.createProfileModal();
        }
        if (!document.getElementById('passwordModal')) {
            this.createPasswordModal();
        }
        if (!document.getElementById('userProfileModal')) {
            this.createUserProfileModal();
        }
    }

    createProfileModal() {
        const modalHTML = `
            <div class="modal fade" id="profileModal" tabindex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="profileModalLabel">Modifier le Profil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="profileForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editNom" class="form-label">Nom</label>
                                            <input type="text" class="form-control" id="editNom" name="nom" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editPrenom" class="form-label">Prénom</label>
                                            <input type="text" class="form-control" id="editPrenom" name="prenom" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="editEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="editEmail" name="email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editLogin" class="form-label">Login</label>
                                    <input type="text" class="form-control" id="editLogin" name="login" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" onclick="saveProfile()">Enregistrer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    createPasswordModal() {
        const modalHTML = `
            <div class="modal fade" id="passwordModal" tabindex="-1" aria-labelledby="passwordModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="passwordModalLabel">Changer le Mot de Passe</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="passwordForm">
                                <div class="mb-3">
                                    <label for="currentPassword" class="form-label">Mot de passe actuel</label>
                                    <input type="password" class="form-control" id="currentPassword" name="currentPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label for="newPassword" class="form-label">Nouveau mot de passe</label>
                                    <input type="password" class="form-control" id="newPassword" name="newPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label for="confirmPassword" class="form-label">Confirmer le nouveau mot de passe</label>
                                    <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" onclick="changePassword()">Changer le mot de passe</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    createUserProfileModal() {
        const modalHTML = `
            <div class="modal fade" id="userProfileModal" tabindex="-1" aria-labelledby="userProfileModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="userProfileModalLabel">Mon Profil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Loading State -->
                            <div id="profileLoadingState" class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                                <p class="mt-2">Chargement du profil...</p>
                            </div>

                            <!-- Error State -->
                            <div id="profileErrorState" class="alert alert-danger" style="display: none;">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                <span id="profileErrorMessage">Une erreur est survenue lors du chargement du profil.</span>
                            </div>

                            <!-- Profile Content -->
                            <div id="profileModalContent" style="display: none;">
                                <!-- Profile Header -->
                                <div class="text-center mb-4">
                                    <div class="profile-avatar-modal mb-3">
                                        <i class="fas fa-user fa-2x text-primary"></i>
                                    </div>
                                    <h4 id="profileModalName">Chargement...</h4>
                                    <p class="text-muted" id="profileModalRole">Chargement...</p>
                                    <span id="profileModalStatus" class="badge">Chargement...</span>
                                </div>

                                <!-- Profile Information -->
                                <div class="row">
                                    <!-- Personal Information -->
                                    <div class="col-md-6">
                                        <h6 class="text-primary mb-3">
                                            <i class="fas fa-user-circle me-2"></i>
                                            Informations Personnelles
                                        </h6>
                                        <div class="mb-3">
                                            <small class="text-muted">Nom</small>
                                            <div id="profileModalNom" class="fw-bold">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Prénom</small>
                                            <div id="profileModalPrenom" class="fw-bold">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Email</small>
                                            <div id="profileModalEmail" class="fw-bold">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Login</small>
                                            <div id="profileModalLogin" class="fw-bold">-</div>
                                        </div>
                                    </div>

                                    <!-- Account Information -->
                                    <div class="col-md-6">
                                        <h6 class="text-primary mb-3">
                                            <i class="fas fa-shield-alt me-2"></i>
                                            Informations du Compte
                                        </h6>
                                        <div class="mb-3">
                                            <small class="text-muted">Rôle</small>
                                            <div id="profileModalRoleBadge" class="fw-bold">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Statut</small>
                                            <div id="profileModalStatut" class="fw-bold">-</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Collaborator Information -->
                                <div id="profileModalCollaboratorSection" style="display: none;">
                                    <hr>
                                    <h6 class="text-primary mb-3">
                                        <i class="fas fa-users me-2"></i>
                                        Informations Collaborateur
                                    </h6>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <small class="text-muted">Nom Collaborateur</small>
                                                <div id="profileModalCollaborateurNom" class="fw-bold">-</div>
                                            </div>
                                            <div class="mb-3">
                                                <small class="text-muted">Email</small>
                                                <div id="profileModalCollaborateurEmail" class="fw-bold">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <small class="text-muted">Grade</small>
                                                <div id="profileModalCollaborateurGrade" class="fw-bold">-</div>
                                            </div>
                                            <div class="mb-3">
                                                <small class="text-muted">Poste</small>
                                                <div id="profileModalCollaborateurPoste" class="fw-bold">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Business Unit and Division -->
                                <div id="profileModalBusinessUnitSection" style="display: none;">
                                    <hr>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6 class="text-primary mb-3">
                                                <i class="fas fa-building me-2"></i>
                                                Business Unit
                                            </h6>
                                            <div id="profileModalBusinessUnitNom" class="fw-bold">-</div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="text-primary mb-3">
                                                <i class="fas fa-sitemap me-2"></i>
                                                Division
                                            </h6>
                                            <div id="profileModalDivisionNom" class="fw-bold">-</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- No Collaborator Message -->
                                <div id="profileModalNoCollaboratorSection" style="display: none;">
                                    <hr>
                                    <div class="text-center text-muted">
                                        <i class="fas fa-info-circle fa-2x mb-3"></i>
                                        <h6>Aucun Collaborateur Associé</h6>
                                        <p class="small">Cet utilisateur n'est pas lié à un profil collaborateur.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="openEditProfileModal()">
                                <i class="fas fa-edit me-2"></i>
                                Modifier le Profil
                            </button>
                            <button type="button" class="btn btn-warning" onclick="openChangePasswordModal()">
                                <i class="fas fa-key me-2"></i>
                                Changer le Mot de Passe
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        // Écouter l'ouverture de la modale de profil
        const userProfileModal = document.getElementById('userProfileModal');
        if (userProfileModal) {
            userProfileModal.addEventListener('show.bs.modal', () => {
                this.loadProfileData();
            });
        }
    }

    async loadProfileData() {
        try {
            // Afficher le loading
            document.getElementById('profileLoadingState').style.display = 'block';
            document.getElementById('profileErrorState').style.display = 'none';
            document.getElementById('profileModalContent').style.display = 'none';

            // Initialiser le SessionManager si nécessaire
            if (window.sessionManager && !window.sessionManager.isLoaded) {
                await window.sessionManager.initialize();
            }

            // Récupérer les données
            const user = window.sessionManager.getUser();
            const collaborateur = window.sessionManager.getCollaborateur();
            const businessUnit = window.sessionManager.getBusinessUnit();
            const division = window.sessionManager.getDivision();

            // Mettre à jour l'interface
            this.updateProfileModal(user, collaborateur, businessUnit, division);

            // Masquer le loading et afficher le contenu
            document.getElementById('profileLoadingState').style.display = 'none';
            document.getElementById('profileModalContent').style.display = 'block';

        } catch (error) {
            console.error('Erreur lors du chargement du profil:', error);
            document.getElementById('profileLoadingState').style.display = 'none';
            document.getElementById('profileErrorMessage').textContent = 'Erreur lors du chargement du profil: ' + error.message;
            document.getElementById('profileErrorState').style.display = 'block';
        }
    }

    updateProfileModal(user, collaborateur, businessUnit, division) {
        // En-tête du profil
        const fullName = `${user.prenom} ${user.nom}`;
        document.getElementById('profileModalName').textContent = fullName;
        document.getElementById('profileModalRole').textContent = user.role;
        
        const statusClass = user.statut === 'ACTIF' ? 'bg-success' : 'bg-danger';
        const statusElement = document.getElementById('profileModalStatus');
        statusElement.textContent = user.statut;
        statusElement.className = `badge ${statusClass}`;

        // Informations personnelles
        document.getElementById('profileModalNom').textContent = user.nom || '-';
        document.getElementById('profileModalPrenom').textContent = user.prenom || '-';
        document.getElementById('profileModalEmail').textContent = user.email || '-';
        document.getElementById('profileModalLogin').textContent = user.login || '-';

        // Informations du compte
        document.getElementById('profileModalRoleBadge').textContent = user.role || '-';
        document.getElementById('profileModalStatut').textContent = user.statut || '-';

        // Informations collaborateur
        if (collaborateur) {
            document.getElementById('profileModalCollaboratorSection').style.display = 'block';
            document.getElementById('profileModalNoCollaboratorSection').style.display = 'none';
            
            document.getElementById('profileModalCollaborateurNom').textContent = `${collaborateur.prenom} ${collaborateur.nom}`;
            document.getElementById('profileModalCollaborateurEmail').textContent = collaborateur.email || '-';
            document.getElementById('profileModalCollaborateurGrade').textContent = collaborateur.grade_nom || '-';
            document.getElementById('profileModalCollaborateurPoste').textContent = collaborateur.poste_nom || '-';
        } else {
            document.getElementById('profileModalCollaboratorSection').style.display = 'none';
            document.getElementById('profileModalNoCollaboratorSection').style.display = 'block';
        }

        // Business Unit et Division
        if (businessUnit || division) {
            document.getElementById('profileModalBusinessUnitSection').style.display = 'block';
            document.getElementById('profileModalBusinessUnitNom').textContent = businessUnit?.nom || '-';
            document.getElementById('profileModalDivisionNom').textContent = division?.nom || '-';
        } else {
            document.getElementById('profileModalBusinessUnitSection').style.display = 'none';
        }
    }
}

// Fonctions globales
function openEditModal() {
    const userInfo = getUserInfo();
    if (userInfo) {
        document.getElementById('editNom').value = userInfo.nom || '';
        document.getElementById('editPrenom').value = userInfo.prenom || '';
        document.getElementById('editEmail').value = userInfo.email || '';
        document.getElementById('editLogin').value = userInfo.login || '';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

function openPasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('passwordModal'));
    modal.show();
}

function openUserProfileModal() {
    const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
    modal.show();
}

function openEditProfileModal() {
    // Fermer la modale de profil et ouvrir la modale d'édition
    const profileModal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
    profileModal.hide();
    
    setTimeout(() => {
        openEditModal();
    }, 300);
}

function openChangePasswordModal() {
    // Fermer la modale de profil et ouvrir la modale de changement de mot de passe
    const profileModal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
    profileModal.hide();
    
    setTimeout(() => {
        openPasswordModal();
    }, 300);
}

function getUserInfo() {
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

async function saveProfile() {
    const formData = {
        nom: document.getElementById('editNom').value,
        prenom: document.getElementById('editPrenom').value,
        email: document.getElementById('editEmail').value,
        login: document.getElementById('editLogin').value
    };

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Mettre à jour les données locales
            const userInfo = getUserInfo();
            if (userInfo) {
                Object.assign(userInfo, formData);
                localStorage.setItem('user', JSON.stringify(userInfo));
            }

            // Rafraîchir le SessionManager si disponible
            if (window.sessionManager) {
                await window.sessionManager.refresh();
            }

            // Fermer la modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            modal.hide();

            // Afficher un message de succès
            showAlert('Profil mis à jour avec succès', 'success');
        } else {
            showAlert(data.message || 'Erreur lors de la mise à jour du profil', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showAlert('Erreur lors de la sauvegarde du profil', 'danger');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation des champs requis
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Veuillez remplir tous les champs', 'danger');
        return;
    }

    // Validation de la longueur
    if (newPassword.length < 8) {
        showAlert('Le nouveau mot de passe doit contenir au moins 8 caractères', 'danger');
        return;
    }

    // Validation de la complexité
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (!passwordPattern.test(newPassword)) {
        showAlert('Le nouveau mot de passe doit contenir au moins : une minuscule, une majuscule, un chiffre et un caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>?)', 'danger');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas', 'danger');
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

        const data = await response.json();

        if (data.success) {
            // Fermer la modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
            modal.hide();

            // Réinitialiser le formulaire
            document.getElementById('passwordForm').reset();

            // Afficher un message de succès
            showAlert('Mot de passe modifié avec succès', 'success');
        } else {
            // Afficher les erreurs détaillées du backend
            let errorMessage = data.message || 'Erreur lors du changement de mot de passe';
            if (data.errors && data.errors.length > 0) {
                errorMessage += '\n\nDétails :\n' + data.errors.join('\n');
            }
            showAlert(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        showAlert('Erreur lors du changement de mot de passe', 'danger');
    }
}

function showAlert(message, type) {
    // Créer une alerte Bootstrap
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Initialiser le gestionnaire de modales
document.addEventListener('DOMContentLoaded', function() {
    window.userModalsManager = new UserModalsManager();
});

// Styles CSS pour la modale de profil
const profileModalStyles = `
<style>
.profile-avatar-modal {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    color: white;
}

.modal-lg {
    max-width: 800px;
}

#userProfileModal .modal-body {
    max-height: 70vh;
    overflow-y: auto;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', profileModalStyles); 