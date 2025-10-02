/**
 * Gestionnaire d'upload de photos pour les collaborateurs
 * EB-Vision 2.0
 */

class PhotoUploadManager {
    constructor() {
        this.currentCollaborateurId = null;
        this.uploadProgress = 0;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        this.init();
    }

    init() {
        console.log('📸 Initialisation du PhotoUploadManager');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Écouter les clics sur les boutons d'upload de photo
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-upload-photo')) {
                e.preventDefault();
                const collaborateurId = e.target.dataset.collaborateurId;
                if (collaborateurId) {
                    // Pour un collaborateur existant
                    this.openPhotoUpload(collaborateurId);
                } else {
                    // Pour un nouveau collaborateur (pas encore créé)
                    this.openPhotoUploadForNew();
                }
            }
            
            if (e.target.matches('.btn-remove-photo')) {
                e.preventDefault();
                this.removePhoto(e.target.dataset.collaborateurId);
            }
            
            if (e.target.matches('.btn-remove-temp-photo')) {
                e.preventDefault();
                this.removeTempPhoto();
            }
            
            if (e.target.matches('.btn-change-photo')) {
                e.preventDefault();
                this.openPhotoUpload(e.target.dataset.collaborateurId);
            }
        });

        // Écouter les changements de fichiers
        document.addEventListener('change', (e) => {
            if (e.target.matches('.photo-file-input')) {
                this.handleFileSelect(e.target);
            }
        });
    }

    openPhotoUpload(collaborateurId) {
        this.currentCollaborateurId = collaborateurId;
        this.isNewCollaborateur = false;
        
        // Créer le modal d'upload
        const modal = this.createUploadModal();
        document.body.appendChild(modal);
        
        // Afficher le modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Nettoyer après fermeture
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    openPhotoUploadForNew() {
        this.currentCollaborateurId = null;
        this.isNewCollaborateur = true;
        
        // Créer le modal d'upload
        const modal = this.createUploadModal();
        document.body.appendChild(modal);
        
        // Afficher le modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Nettoyer après fermeture
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    createUploadModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'photoUploadModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-camera me-2"></i>
                            Uploader une photo de profil
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="upload-area" id="uploadArea">
                                    <div class="upload-content">
                                        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                        <h6>Glissez-déposez votre photo ici</h6>
                                        <p class="text-muted">ou cliquez pour sélectionner</p>
                                        <input type="file" class="photo-file-input" accept="image/*" style="display: none;">
                                        <button type="button" class="btn btn-primary btn-select-file">
                                            <i class="fas fa-folder-open me-2"></i>
                                            Sélectionner une photo
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <small class="text-muted">
                                        <i class="fas fa-info-circle me-1"></i>
                                        Formats acceptés: JPG, PNG, GIF, WebP (max 5MB)
                                    </small>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="preview-area" id="previewArea" style="display: none;">
                                    <h6>Aperçu</h6>
                                    <div class="preview-container">
                                        <img id="previewImage" class="img-fluid rounded" alt="Aperçu">
                                    </div>
                                    <div class="mt-3">
                                        <button type="button" class="btn btn-success btn-upload-confirm" disabled>
                                            <i class="fas fa-upload me-2"></i>
                                            Uploader la photo
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="progress-area" id="progressArea" style="display: none;">
                                    <h6>Upload en cours...</h6>
                                    <div class="progress">
                                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                                    </div>
                                    <small class="text-muted" id="progressText">0%</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ajouter les styles CSS
        this.addUploadStyles();
        
        // Configurer les événements du modal
        this.setupModalEvents(modal);
        
        return modal;
    }

    addUploadStyles() {
        if (!document.getElementById('photo-upload-styles')) {
            const style = document.createElement('style');
            style.id = 'photo-upload-styles';
            style.textContent = `
                .upload-area {
                    border: 2px dashed #dee2e6;
                    border-radius: 10px;
                    padding: 2rem;
                    text-align: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .upload-area:hover {
                    border-color: #007bff;
                    background-color: #f8f9fa;
                }
                
                .upload-area.dragover {
                    border-color: #28a745;
                    background-color: #d4edda;
                }
                
                .preview-container {
                    max-width: 300px;
                    max-height: 300px;
                    margin: 0 auto;
                    overflow: hidden;
                    border-radius: 10px;
                }
                
                .preview-container img {
                    max-width: 100%;
                    max-height: 300px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    display: block;
                    margin: 0 auto;
                }
                
                
                
                .photo-actions {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .photo-container:hover .photo-actions {
                    opacity: 1;
                }
                
                .photo-container {
                    position: relative;
                    display: inline-block;
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupModalEvents(modal) {
        const uploadArea = modal.querySelector('#uploadArea');
        const fileInput = modal.querySelector('.photo-file-input');
        const selectButton = modal.querySelector('.btn-select-file');
        const uploadButton = modal.querySelector('.btn-upload-confirm');

        // Clic sur la zone d'upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Clic sur le bouton de sélection
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Upload de la photo
        uploadButton.addEventListener('click', () => {
            this.uploadPhoto();
        });
    }

    handleFileSelect(input) {
        const file = input.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        // Vérifier le type de fichier
        if (!this.allowedTypes.includes(file.type)) {
            this.showError('Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP.');
            return;
        }

        // Vérifier la taille
        if (file.size > this.maxFileSize) {
            this.showError('Le fichier est trop volumineux. Taille maximum: 5MB.');
            return;
        }

        // Afficher l'aperçu
        this.showPreview(file);
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const modal = document.getElementById('photoUploadModal');
            const previewArea = modal.querySelector('#previewArea');
            const previewImage = modal.querySelector('#previewImage');
            const uploadButton = modal.querySelector('.btn-upload-confirm');

            previewImage.src = e.target.result;
            previewArea.style.display = 'block';
            uploadButton.disabled = false;

            // Stocker le fichier pour l'upload
            this.selectedFile = file;
        };
        reader.readAsDataURL(file);
    }

    async uploadPhoto() {
        if (!this.selectedFile) {
            return;
        }

        const modal = document.getElementById('photoUploadModal');
        const progressArea = modal.querySelector('#progressArea');
        const progressBar = modal.querySelector('.progress-bar');
        const progressText = modal.querySelector('#progressText');
        const uploadButton = modal.querySelector('.btn-upload-confirm');

        // Afficher la progression
        progressArea.style.display = 'block';
        uploadButton.disabled = true;

        try {
            if (this.isNewCollaborateur) {
                // Pour un nouveau collaborateur, stocker temporairement la photo
                this.storePhotoForNewCollaborateur();
                
                this.showSuccess('Photo sélectionnée ! Elle sera uploadée lors de la création du collaborateur.');
                
                // Fermer le modal
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                bootstrapModal.hide();
            } else {
                // Pour un collaborateur existant
                if (!this.currentCollaborateurId) {
                    this.showError('ID du collaborateur manquant');
                    return;
                }

                const formData = new FormData();
                formData.append('photo', this.selectedFile);

                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/collaborateurs/${this.currentCollaborateurId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess('Photo uploadée avec succès !');
                        
                        // Mettre à jour l'affichage
                        this.updatePhotoDisplay(this.currentCollaborateurId, result.data.photo_url);
                        
                        // Fermer le modal
                        const bootstrapModal = bootstrap.Modal.getInstance(modal);
                        bootstrapModal.hide();
                        
                        // Rafraîchir la liste si nécessaire
                        if (typeof loadCollaborateurs === 'function') {
                            loadCollaborateurs();
                        }
                    } else {
                        this.showError(result.error || 'Erreur lors de l\'upload');
                    }
                } else {
                    const error = await response.json();
                    this.showError(error.error || 'Erreur lors de l\'upload');
                }
            }
        } catch (error) {
            console.error('Erreur upload:', error);
            this.showError('Erreur de connexion');
        } finally {
            progressArea.style.display = 'none';
            uploadButton.disabled = false;
        }
    }

    storePhotoForNewCollaborateur() {
        // Stocker la photo temporairement pour le nouveau collaborateur
        const photoContainer = document.getElementById('new-photo-container');
        if (photoContainer) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoContainer.innerHTML = `
                    <div class="photo-container">
                        <img src="${e.target.result}" class="collaborateur-avatar large" alt="Photo sélectionnée">
                        <div class="photo-actions">
                            <button class="btn btn-sm btn-outline-danger btn-remove-temp-photo" title="Supprimer la photo">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                // Stocker le fichier pour l'upload ultérieur
                window.tempPhotoForNewCollaborateur = this.selectedFile;
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    removeTempPhoto() {
        const photoContainer = document.getElementById('new-photo-container');
        if (photoContainer) {
            photoContainer.innerHTML = '';
            delete window.tempPhotoForNewCollaborateur;
            this.showSuccess('Photo supprimée');
        }
    }

    async removePhoto(collaborateurId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/collaborateurs/${collaborateurId}/photo`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('Photo supprimée avec succès !');
                
                // Mettre à jour l'affichage
                this.updatePhotoDisplay(collaborateurId, null);
                
                // Rafraîchir la liste si nécessaire
                if (typeof loadCollaborateurs === 'function') {
                    loadCollaborateurs();
                }
            } else {
                const error = await response.json();
                this.showError(error.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            this.showError('Erreur de connexion');
        }
    }

    updatePhotoDisplay(collaborateurId, photoUrl) {
        // Mettre à jour l'affichage de la photo dans le tableau
        const row = document.querySelector(`tr[data-collaborateur-id="${collaborateurId}"]`);
        if (!row) return;
        
        const avatarCell = row.querySelector('td:first-child');
        if (!avatarCell) return;
        
        // Recréer l'élément photo avec les nouvelles données
        const collaborateur = { 
            id: collaborateurId, 
            photo_url: photoUrl,
            nom: row.querySelector('td:nth-child(2)')?.textContent || '',
            prenom: row.querySelector('td:nth-child(3)')?.textContent || ''
        };
        
        avatarCell.innerHTML = '';
        avatarCell.appendChild(this.createPhotoElement(collaborateur, 'normal'));
    }

    showSuccess(message) {
        // Utiliser le système d'alertes existant ou créer une alerte Bootstrap
        if (typeof showAlert === 'function') {
            showAlert(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof showAlert === 'function') {
            showAlert(message, 'danger');
        } else {
            alert('Erreur: ' + message);
        }
    }

    // Méthode utilitaire pour créer un élément photo
    createPhotoElement(collaborateur, size = 'normal') {
        const container = document.createElement('div');
        container.className = 'photo-container';
        
        if (collaborateur.photo_url) {
            const img = document.createElement('img');
            // Utiliser le style existant collaborateur-avatar
            img.className = `collaborateur-avatar ${size === 'large' ? 'large' : ''}`;
            // Construire l'URL correcte pour l'affichage
            const photoUrl = collaborateur.photo_url ? `/${collaborateur.photo_url}` : '';
            img.src = photoUrl;
            img.alt = `${collaborateur.prenom} ${collaborateur.nom}`;
            img.onerror = () => {
                // Fallback vers le placeholder si l'image ne charge pas
                img.style.display = 'none';
                container.appendChild(this.createPlaceholder(collaborateur, size));
            };
            container.appendChild(img);
        } else {
            container.appendChild(this.createPlaceholder(collaborateur, size));
        }

        // Ajouter les actions si nécessaire
        if (size === 'large') {
            const actions = document.createElement('div');
            actions.className = 'photo-actions';
            actions.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-change-photo" 
                        data-collaborateur-id="${collaborateur.id}" 
                        title="Changer la photo">
                    <i class="fas fa-camera"></i>
                </button>
                ${collaborateur.photo_url ? `
                    <button class="btn btn-sm btn-outline-danger btn-remove-photo ms-1" 
                            data-collaborateur-id="${collaborateur.id}" 
                            title="Supprimer la photo">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            `;
            container.appendChild(actions);
        }

        return container;
    }

    createPlaceholder(collaborateur, size = 'normal') {
        const placeholder = document.createElement('div');
        // Utiliser le style existant collaborateur-avatar
        placeholder.className = `collaborateur-avatar ${size === 'large' ? 'large' : ''}`;
        placeholder.textContent = collaborateur.initiales || 
            (collaborateur.prenom && collaborateur.nom ? 
                (collaborateur.prenom.charAt(0) + collaborateur.nom.charAt(0)).toUpperCase() : 
                '?');
        return placeholder;
    }
}

// Initialiser le gestionnaire de photos
window.photoUploadManager = new PhotoUploadManager();
