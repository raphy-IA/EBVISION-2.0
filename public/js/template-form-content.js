// Fonction pour générer le contenu du formulaire de création
function generateCreateFormContent() {
    return `
        <!-- Formulaire de création (caché par défaut) -->
        <div id="createForm" class="template-form" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Créer un nouveau modèle</h3>
                <button class="btn btn-outline-light" onclick="hideCreateForm()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Sélection du canal -->
            <div class="form-section">
                <h5><i class="fas fa-broadcast-tower me-2"></i>Type de canal</h5>
                <div class="channel-selector">
                    <div class="channel-option" data-channel="EMAIL" onclick="selectChannel('EMAIL')">
                        <i class="fas fa-envelope"></i>
                        <div><strong>Email</strong></div>
                        <small>Modèle pour envoi par email</small>
                    </div>
                    <div class="channel-option" data-channel="PHYSIQUE" onclick="selectChannel('PHYSIQUE')">
                        <i class="fas fa-mail-bulk"></i>
                        <div><strong>Courrier physique</strong></div>
                        <small>Modèle pour envoi postal</small>
                    </div>
                </div>
                
                <!-- Indicateur de canal sélectionné -->
                <div id="channelIndicator" style="display: none;">
                    <div class="channel-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span id="channelIndicatorText">Canal sélectionné</span>
                    </div>
                </div>
            </div>

            <!-- Informations générales -->
            <div class="form-section">
                <h5><i class="fas fa-info-circle me-2"></i>Informations générales</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="tplName" class="form-label required-field">Nom du modèle</label>
                        <input id="tplName" class="form-control" placeholder="Généré automatiquement" readonly>
                        <div class="form-text">Le nom est généré automatiquement selon le format : BU-Division-TypeCanal-TypeContenu-NumeroOrdre (Division optionnelle)</div>
                    </div>
                    <div class="col-md-6">
                        <label for="tplType" class="form-label">Type de contenu</label>
                        <select id="tplType" class="form-select" onchange="updateTemplateName()">
                            <option value="PRESENTATION_GENERALE">Présentation générale</option>
                            <option value="SERVICE_SPECIFIQUE">Service spécifique</option>
                            <option value="SUIVI_CLIENT">Suivi client</option>
                            <option value="RELANCE">Relance</option>
                        </select>
                    </div>
                </div>
                
                <!-- Champ pour le nom du service (visible seulement pour Service spécifique) -->
                <div id="serviceNameField" class="row g-3" style="display: none;">
                    <div class="col-md-6">
                        <label for="serviceName" class="form-label">Nom du service</label>
                        <input id="serviceName" class="form-control" placeholder="Ex: Audit financier, Conseil RH..." onchange="updateTemplateName()">
                        <div class="form-text">Ce nom sera utilisé dans la génération du nom du modèle</div>
                    </div>
                </div>
                </div>
            </div>

            <!-- Configuration organisationnelle -->
            <div class="form-section">
                <h5><i class="fas fa-sitemap me-2"></i>Configuration organisationnelle</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="tplBU" class="form-label required-field">Business Unit</label>
                        <select id="tplBU" class="form-select" required>
                            <option value="">Sélectionnez une Business Unit</option>
                        </select>
                        <div class="form-text">La Business Unit est obligatoire pour ce modèle</div>
                    </div>
                    <div class="col-md-6">
                        <label for="tplDivision" class="form-label">Division</label>
                        <select id="tplDivision" class="form-select" disabled>
                            <option value="">Sélectionnez une Division (optionnel)</option>
                        </select>
                        <div class="form-text">La Division est optionnelle</div>
                    </div>
                </div>
            </div>

            <!-- Configuration du modèle -->
            <div id="emailConfig" class="form-section template-config">
                <h5><i class="fas fa-envelope me-2"></i>Configuration Email</h5>
                <div class="email-config">
                    <div class="mb-3">
                        <label for="tplSubject" class="form-label required-field">Objet de l'email</label>
                        <input id="tplSubject" class="form-control" placeholder="Ex: Découvrez nos services - {{company_name}}">
                    </div>
                    <div class="mb-3">
                        <label for="tplBodyEmail" class="form-label required-field">Corps du message</label>
                        <textarea id="tplBodyEmail" class="form-control" rows="8" 
                                  placeholder="Rédigez votre message ici..."></textarea>
                    </div>
                </div>
            </div>

            <div id="physicalConfig" class="form-section template-config">
                <h5><i class="fas fa-mail-bulk me-2"></i>Configuration Courrier Physique</h5>
                <div class="physical-config">
                    <div class="mb-3">
                        <label for="tplBodyPhysical" class="form-label required-field">Contenu du courrier</label>
                        <textarea id="tplBodyPhysical" class="form-control" rows="8" 
                                  placeholder="Rédigez le contenu de votre courrier ici..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Placeholders disponibles -->
            <div class="form-section">
                <h5><i class="fas fa-tags me-2"></i>Placeholders disponibles</h5>
                <div class="placeholder-info">
                    <p class="mb-2"><strong>Vous pouvez utiliser ces variables dans votre contenu :</strong></p>
                    <div class="placeholder-list">
                        <div class="placeholder-item">{{company_name}}</div>
                        <div class="placeholder-item">{{company_industry}}</div>
                        <div class="placeholder-item">{{company_city}}</div>
                        <div class="placeholder-item">{{bu_name}}</div>
                        <div class="placeholder-item">{{division_name}}</div>
                        <div class="placeholder-item">{{contact_name}}</div>
                        <div class="placeholder-item">{{contact_email}}</div>
                        <div class="placeholder-item">{{contact_phone}}</div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="text-end">
                <button class="btn btn-outline-light me-2" onclick="hideCreateForm()">Annuler</button>
                <button class="btn btn-light" onclick="createTemplate()">
                    <i class="fas fa-save me-2"></i>Enregistrer le modèle
                </button>
            </div>
        </div>
    `;
}

// Fonction pour générer le contenu de la liste des modèles
function generateTemplatesListContent() {
    return `
        <!-- Liste des modèles -->
        <div class="template-list">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="fas fa-list me-2"></i>Modèles existants</h5>
            </div>
            <div id="templatesList">
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2 text-muted">Chargement des modèles...</p>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour initialiser le contenu de la page
function initializePageContent() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = generateCreateFormContent() + generateTemplatesListContent();
}
