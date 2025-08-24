// Fonction pour générer le contenu du formulaire de création de campagne
function generateCampaignFormContent() {
    return `
        <!-- Formulaire de création de campagne (caché par défaut) -->
        <div id="createCampaignForm" class="campaign-form" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Créer une nouvelle campagne</h3>
                <button class="btn btn-outline-light" onclick="hideCampaignForm()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Sélection du modèle -->
            <div class="form-section">
                <h5><i class="fas fa-file-alt me-2"></i>Sélection du modèle</h5>
                <div class="row g-3">
                    <div class="col-12">
                        <label for="campTemplate" class="form-label required-field">Modèle de prospection</label>
                        <select id="campTemplate" class="form-select" required>
                            <option value="">Sélectionnez un modèle</option>
                        </select>
                        <div class="form-text">Le modèle détermine le canal, la BU et la division de la campagne</div>
                    </div>
                </div>
            </div>

            <!-- Informations de la campagne -->
            <div class="form-section">
                <h5><i class="fas fa-info-circle me-2"></i>Informations de la campagne</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="campName" class="form-label required-field">Nom de la campagne</label>
                        <input id="campName" class="form-control" placeholder="Ex: Campagne Q1 2024 - Présentation générale">
                    </div>
                    <div class="col-md-6">
                        <label for="campResponsible" class="form-label required-field">Responsable de la campagne</label>
                        <select id="campResponsible" class="form-select" required>
                            <option value="">Sélectionnez un responsable</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Configuration automatique -->
            <div class="form-section">
                <h5><i class="fas fa-cogs me-2"></i>Configuration automatique</h5>
                <div class="auto-config-info">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="config-item">
                                <i class="fas fa-broadcast-tower"></i>
                                <div>
                                    <strong>Canal</strong>
                                    <div id="autoChannel" class="config-value">-</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="config-item">
                                <i class="fas fa-sitemap"></i>
                                <div>
                                    <strong>Business Unit</strong>
                                    <div id="autoBU" class="config-value">-</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="config-item">
                                <i class="fas fa-layer-group"></i>
                                <div>
                                    <strong>Division</strong>
                                    <div id="autoDivision" class="config-value">-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Planification -->
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt me-2"></i>Planification</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="campDate" class="form-label">Date de lancement planifiée</label>
                        <input id="campDate" type="date" class="form-control">
                        <div class="form-text">Laissez vide pour lancer immédiatement</div>
                    </div>
                    <div class="col-md-6">
                        <label for="campPriority" class="form-label">Priorité</label>
                        <select id="campPriority" class="form-select">
                            <option value="NORMAL">Normale</option>
                            <option value="HIGH">Élevée</option>
                            <option value="URGENT">Urgente</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Description -->
            <div class="form-section">
                <h5><i class="fas fa-align-left me-2"></i>Description</h5>
                <div class="row g-3">
                    <div class="col-12">
                        <label for="campDescription" class="form-label">Description de la campagne</label>
                        <textarea id="campDescription" class="form-control" rows="4" 
                                  placeholder="Décrivez l'objectif et le contexte de cette campagne..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="text-end">
                <button class="btn btn-outline-light me-2" onclick="hideCampaignForm()">Annuler</button>
                <button class="btn btn-light" onclick="createCampaign()">
                    <i class="fas fa-save me-2"></i>Créer la campagne
                </button>
            </div>
        </div>
    `;
}

// Fonction pour générer le contenu de la liste des campagnes
function generateCampaignsListContent() {
    return `
        <!-- Liste des campagnes -->
        <div class="campaigns-list">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="fas fa-list me-2"></i>Campagnes existantes</h5>
            </div>
            <div id="campaignsList">
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2 text-muted">Chargement des campagnes...</p>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour initialiser le contenu de la page
function initializeCampaignPageContent() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = generateCampaignFormContent() + generateCampaignsListContent();
}


