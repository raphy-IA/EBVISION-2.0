// Script pour gérer les modales utilisateur (profil et mot de passe)
class UserModalsManager {
    constructor() {
        this.init();
    }

    init() {
        this.createModals();
        this.setupEventListeners();
    }

    // Créer les modales
    createModals() {
        const modalsHTML = `
            <!-- Modal Profil Utilisateur -->
            <div class="modal fade" id="profileModal" tabindex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="profileModalLabel">
                                <i class="fas fa-user me-2"></i>
                                Mon Profil
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="profileForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="profileNom" class="form-label">Nom</label>
                                        <input type="text" class="form-control" id="profileNom" name="nom" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="profilePrenom" class="form-label">Prénom</label>
                                        <input type="text" class="form-control" id="profilePrenom" name="prenom" required>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="profileEmail" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="profileEmail" name="email" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="profileTelephone" class="form-label">Téléphone</label>
                                        <input type="tel" class="form-control" id="profileTelephone" name="telephone">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="profileRole" class="form-label">Rôle</label>
                                    <input type="text" class="form-control" id="profileRole" name="role" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="profileDepartement" class="form-label">Département</label>
                                    <input type="text" class="form-control" id="profileDepartement" name="departement">
                                </div>
                                <div class="mb-3">
                                    <label for="profileBio" class="form-label">Biographie</label>
                                    <textarea class="form-control" id="profileBio" name="bio" rows="3" placeholder="Parlez-nous de vous..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" onclick="saveProfile()">
                                <i class="fas fa-save me-2"></i>
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Changement de Mot de Passe -->
            <div class="modal fade" id="passwordModal" tabindex="-1" aria-labelledby="passwordModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="passwordModalLabel">
                                <i class="fas fa-key me-2"></i>
                                Changer le Mot de Passe
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="passwordForm">
                                <div class="mb-3">
                                    <label for="currentPassword" class="form-label">Mot de passe actuel</label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="currentPassword" name="currentPassword" required>
                                        <button class="btn btn-outline-secondary" type="button" onclick="togglePassword('currentPassword')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="newPassword" class="form-label">Nouveau mot de passe</label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="newPassword" name="newPassword" required>
                                        <button class="btn btn-outline-secondary" type="button" onclick="togglePassword('newPassword')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <div class="form-text">
                                        <small class="text-muted">
                                            Le mot de passe doit contenir au moins 8 caractères, incluant des lettres majuscules, minuscules et des chiffres.
                                        </small>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="confirmPassword" class="form-label">Confirmer le nouveau mot de passe</label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" required>
                                        <button class="btn btn-outline-secondary" type="button" onclick="togglePassword('confirmPassword')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle me-2"></i>
                                    <strong>Conseils de sécurité :</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>Utilisez un mot de passe unique pour chaque compte</li>
                                        <li>Évitez les informations personnelles facilement devinables</li>
                                        <li>Changez régulièrement votre mot de passe</li>
                                    </ul>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" onclick="changePassword()">
                                <i class="fas fa-key me-2"></i>
                                Changer le mot de passe
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ajouter les modales au body
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    // Configurer les écouteurs d'événements
    setupEventListeners() {
        // Charger les données du profil quand la modale s'ouvre
        document.getElementById('profileModal').addEventListener('show.bs.modal', (event) => {
            this.loadProfileData();
        });

        // Réinitialiser le formulaire de mot de passe quand la modale se ferme
        document.getElementById('passwordModal').addEventListener('hidden.bs.modal', (event) => {
            document.getElementById('passwordForm').reset();
        });

        // Validation en temps réel du mot de passe
        document.getElementById('newPassword').addEventListener('input', (event) => {
            this.validatePassword(event.target.value);
        });

        document.getElementById('confirmPassword').addEventListener('input', (event) => {
            this.validatePasswordConfirmation();
        });
    }

    // Charger les données du profil
    loadProfileData() {
        const userInfo = this.getUserInfo();
        if (userInfo) {
            document.getElementById('profileNom').value = userInfo.nom || '';
            document.getElementById('profilePrenom').value = userInfo.prenom || '';
            document.getElementById('profileEmail').value = userInfo.email || '';
            document.getElementById('profileTelephone').value = userInfo.telephone || '';
            document.getElementById('profileRole').value = userInfo.role || 'Utilisateur';
            document.getElementById('profileDepartement').value = userInfo.departement || '';
            document.getElementById('profileBio').value = userInfo.bio || '';
        }
    }

    // Obtenir les informations utilisateur
    getUserInfo() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    // Valider le mot de passe
    validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const strength = Object.values(requirements).filter(Boolean).length;
        const strengthText = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength - 1];
        const strengthColor = ['danger', 'warning', 'info', 'success', 'success'][strength - 1];

        // Afficher l'indicateur de force
        let strengthIndicator = document.getElementById('passwordStrength');
        if (!strengthIndicator) {
            strengthIndicator = document.createElement('div');
            strengthIndicator.id = 'passwordStrength';
            strengthIndicator.className = 'mt-2';
            document.getElementById('newPassword').parentNode.appendChild(strengthIndicator);
        }

        strengthIndicator.innerHTML = `
            <div class="progress mb-2" style="height: 5px;">
                <div class="progress-bar bg-${strengthColor}" style="width: ${(strength / 5) * 100}%"></div>
            </div>
            <small class="text-${strengthColor}">Force du mot de passe : ${strengthText}</small>
        `;
    }

    // Valider la confirmation du mot de passe
    validatePasswordConfirmation() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmField = document.getElementById('confirmPassword');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmField.setCustomValidity('Les mots de passe ne correspondent pas');
            confirmField.classList.add('is-invalid');
        } else {
            confirmField.setCustomValidity('');
            confirmField.classList.remove('is-invalid');
        }
    }
}

// Fonction pour sauvegarder le profil
function saveProfile() {
    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const profileData = Object.fromEntries(formData.entries());

    // Simuler la sauvegarde
    console.log('Sauvegarde du profil:', profileData);
    
    // Mettre à jour les données utilisateur locales
    const currentUserInfo = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUserInfo = { ...currentUserInfo, ...profileData };
    localStorage.setItem('user', JSON.stringify(updatedUserInfo));

    // Mettre à jour l'affichage
    if (window.UserHeaderManager) {
        window.UserHeaderManager.updateUserDisplay(updatedUserInfo);
    }

    // Afficher un message de succès
    showAlert('Profil mis à jour avec succès !', 'success');
    
    // Fermer la modale
    const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
    modal.hide();
}

// Fonction pour changer le mot de passe
function changePassword() {
    const form = document.getElementById('passwordForm');
    const formData = new FormData(form);
    const passwordData = Object.fromEntries(formData.entries());

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas', 'danger');
        return;
    }

    if (passwordData.newPassword.length < 8) {
        showAlert('Le mot de passe doit contenir au moins 8 caractères', 'danger');
        return;
    }

    // Simuler le changement de mot de passe
    console.log('Changement de mot de passe:', { currentPassword: '***', newPassword: '***' });
    
    // Afficher un message de succès
    showAlert('Mot de passe changé avec succès !', 'success');
    
    // Fermer la modale
    const modal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
    modal.hide();
}

// Fonction pour basculer la visibilité du mot de passe
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');

    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Fonction pour afficher des alertes
function showAlert(message, type = 'info') {
    // Créer l'alerte
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Ajouter l'alerte au body
    document.body.insertAdjacentHTML('beforeend', alertHTML);

    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// Initialiser les modales quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    window.UserModalsManager = new UserModalsManager();
}); 