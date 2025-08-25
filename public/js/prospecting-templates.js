// Configuration des APIs
const API = new URL('/api/prospecting', window.location.origin).toString();
const API_BU = new URL('/api/business-units', window.location.origin).toString();
const API_DIV = new URL('/api/divisions', window.location.origin).toString();
let currentChannel = null;

// Fonction pour générer automatiquement le nom du modèle
async function updateTemplateName() {
    const buSelect = document.getElementById('tplBU');
    const divisionSelect = document.getElementById('tplDivision');
    const typeSelect = document.getElementById('tplType');
    const serviceNameInput = document.getElementById('serviceName');
    const nameInput = document.getElementById('tplName');
    const serviceNameField = document.getElementById('serviceNameField');
    
    // Vérifier si tous les éléments nécessaires sont présents
    if (!buSelect || !typeSelect || !nameInput) {
        console.log('Éléments manquants pour la génération du nom:', { buSelect: !!buSelect, typeSelect: !!typeSelect, nameInput: !!nameInput });
        return;
    }
    
    const selectedBU = buSelect.value;
    const selectedDivision = divisionSelect ? divisionSelect.value : '';
    const selectedType = typeSelect.value;
    const selectedChannel = currentChannel;
    
    // Masquer/afficher le champ nom du service selon le type
    if (selectedType === 'SERVICE_SPECIFIQUE') {
        serviceNameField.style.display = 'block';
    } else {
        serviceNameField.style.display = 'none';
        if (serviceNameInput) serviceNameInput.value = '';
    }
    
    // Si pas de BU ou de canal sélectionné, vider le nom
    if (!selectedBU || !selectedChannel) {
        nameInput.value = '';
        return;
    }
    
    // Récupérer le nom de la BU
    const buOption = buSelect.options[buSelect.selectedIndex];
    const buName = buOption ? buOption.text : '';
    
    // Récupérer le nom de la division si sélectionnée
    let divisionName = '';
    if (selectedDivision && divisionSelect) {
        const divisionOption = divisionSelect.options[divisionSelect.selectedIndex];
        divisionName = divisionOption ? divisionOption.text : '';
    }
    
    // Déterminer le type de canal
    let canalType = '';
    if (selectedChannel === 'EMAIL') {
        canalType = 'Email';
    } else if (selectedChannel === 'PHYSIQUE') {
        canalType = 'Courrier';
    }
    
    // Déterminer le type de contenu
    let contentType = '';
    switch (selectedType) {
        case 'PRESENTATION_GENERALE':
            contentType = 'GeneralServices';
            break;
        case 'SERVICE_SPECIFIQUE':
            const serviceName = serviceNameInput ? serviceNameInput.value.trim() : '';
            if (!serviceName) {
                nameInput.value = '';
                return;
            }
            // Nettoyer le nom du service (enlever espaces, caractères spéciaux)
            contentType = serviceName.replace(/[^a-zA-Z0-9]/g, '');
            break;
        case 'SUIVI_CLIENT':
            contentType = 'Suivi';
            break;
        case 'RELANCE':
            contentType = 'Relance';
            break;
        default:
            contentType = 'GeneralServices';
    }
    
    // Construire le nom de base avec ou sans division
    let baseName;
    if (divisionName) {
        // Format: BU-Division-Canal-Contenu
        baseName = `${buName}-${divisionName}-${canalType}-${contentType}`;
    } else {
        // Format: BU-Canal-Contenu (format original)
        baseName = `${buName}-${canalType}-${contentType}`;
    }
    
    // Chercher le prochain numéro d'ordre
    const orderNumber = await findNextOrderNumber(baseName);
    
    // Générer le nom final
    const finalName = `${baseName}-${orderNumber.toString().padStart(2, '0')}`;
    nameInput.value = finalName;
}

// Fonction pour trouver le prochain numéro d'ordre
async function findNextOrderNumber(baseName) {
    try {
        const response = await fetch(`${API}/templates`, {
            headers: getAuthHeader()
        });
        
        if (!response.ok) {
            console.error('Erreur lors de la récupération des modèles');
            return 1;
        }
        
        const data = await response.json();
        const templates = data.data || data || [];
        
        // Filtrer les modèles qui commencent par le même nom de base
        const matchingTemplates = templates.filter(template => 
            template.name && template.name.startsWith(baseName)
        );
        
        if (matchingTemplates.length === 0) {
            return 1;
        }
        
        // Extraire les numéros d'ordre existants
        const orderNumbers = matchingTemplates.map(template => {
            const match = template.name.match(/-(\d{2})$/);
            return match ? parseInt(match[1]) : 0;
        });
        
        // Trouver le prochain numéro disponible
        const maxOrder = Math.max(...orderNumbers);
        return maxOrder + 1;
        
    } catch (error) {
        console.error('Erreur lors de la recherche du numéro d\'ordre:', error);
        return 1;
    }
}

// Fonctions utilitaires
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Gestion de l'affichage du formulaire
function showCreateForm() {
    document.getElementById('createForm').style.display = 'block';
    document.getElementById('createForm').scrollIntoView({ behavior: 'smooth' });
}

function hideCreateForm() {
    document.getElementById('createForm').style.display = 'none';
    resetForm();
}

        // Sélection du canal
        function selectChannel(channel) {
            currentChannel = channel;
            
            // Mettre à jour les options visuelles
            document.querySelectorAll('.channel-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelector(`[data-channel="${channel}"]`).classList.add('active');
            
            // Afficher l'indicateur de canal sélectionné
            const indicator = document.getElementById('channelIndicator');
            const indicatorText = document.getElementById('channelIndicatorText');
            const indicatorDiv = indicator.querySelector('.channel-indicator');
            
            if (channel === 'EMAIL') {
                indicatorText.textContent = 'Canal Email sélectionné';
                indicatorDiv.className = 'channel-indicator email';
                indicatorDiv.querySelector('i').className = 'fas fa-envelope';
            } else if (channel === 'PHYSIQUE') {
                indicatorText.textContent = 'Canal Courrier physique sélectionné';
                indicatorDiv.className = 'channel-indicator physical';
                indicatorDiv.querySelector('i').className = 'fas fa-mail-bulk';
            }
            
            indicator.style.display = 'block';
            
            // Afficher la configuration appropriée
            document.querySelectorAll('.template-config').forEach(config => {
                config.classList.remove('active');
            });
            
            if (channel === 'EMAIL') {
                document.getElementById('emailConfig').classList.add('active');
            } else if (channel === 'PHYSIQUE') {
                document.getElementById('physicalConfig').classList.add('active');
            }
            
            // Mettre à jour le nom du modèle
            updateTemplateName();
        }

// Réinitialisation du formulaire
        function resetForm() {
            const tplName = document.getElementById('tplName');
            const tplType = document.getElementById('tplType');
            const tplSubject = document.getElementById('tplSubject');
            const tplBodyEmail = document.getElementById('tplBodyEmail');
            const tplBodyPhysical = document.getElementById('tplBodyPhysical');
            const tplBU = document.getElementById('tplBU');
            const tplDivision = document.getElementById('tplDivision');
            
            if (tplName) tplName.value = '';
            if (tplType) tplType.value = 'PRESENTATION_GENERALE';
            if (tplSubject) tplSubject.value = '';
            if (tplBodyEmail) tplBodyEmail.value = '';
            if (tplBodyPhysical) tplBodyPhysical.value = '';
            if (tplBU) tplBU.value = '';
            if (tplDivision) {
                tplDivision.innerHTML = '<option value="">Sélectionnez une Division (optionnel)</option>';
                tplDivision.disabled = true;
            }
            
            // Réinitialiser le champ nom du service
            const serviceNameInput = document.getElementById('serviceName');
            const serviceNameField = document.getElementById('serviceNameField');
            if (serviceNameInput) {
                serviceNameInput.value = '';
            }
            if (serviceNameField) {
                serviceNameField.style.display = 'none';
            }
            
            // Réinitialiser la sélection du canal
            currentChannel = null;
            const channelOptions = document.querySelectorAll('.channel-option');
            if (channelOptions) {
                channelOptions.forEach(option => {
                    option.classList.remove('active');
                });
            }
            const templateConfigs = document.querySelectorAll('.template-config');
            if (templateConfigs) {
                templateConfigs.forEach(config => {
                    config.classList.remove('active');
                });
            }

            // Masquer l'indicateur de canal
            const indicator = document.getElementById('channelIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }

            // Remettre le formulaire en mode création
            const createForm = document.getElementById('createForm');
            if (createForm) {
                const h3Element = createForm.querySelector('h3');
                if (h3Element) {
                    h3Element.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Créer un nouveau modèle';
                }
                const saveButton = createForm.querySelector('.btn-light');
                if (saveButton) {
                    saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer le modèle';
                    saveButton.onclick = createTemplate;
                }
            }
        }

// Création d'un modèle
async function createTemplate() {
    // Validation
    const name = document.getElementById('tplName').value.trim();
    const type_courrier = document.getElementById('tplType').value;
    const subject = document.getElementById('tplSubject').value.trim();
    
    // Récupérer le contenu selon le canal sélectionné
    let body_template = '';
    if (currentChannel === 'EMAIL') {
        body_template = document.getElementById('tplBodyEmail').value.trim();
    } else if (currentChannel === 'PHYSIQUE') {
        body_template = document.getElementById('tplBodyPhysical').value.trim();
    }
    
    const business_unit_id = document.getElementById('tplBU').value;
    const division_id = document.getElementById('tplDivision').value || null;

    // Validations
    if (!name) {
        alert('Le nom du modèle est obligatoire');
        return;
    }
    if (!currentChannel) {
        alert('Veuillez sélectionner un type de canal');
        return;
    }
    if (!business_unit_id) {
        alert('La Business Unit est obligatoire');
        return;
    }
    if (currentChannel === 'EMAIL' && !subject) {
        alert('L\'objet de l\'email est obligatoire');
        return;
    }
    if (!body_template) {
        alert('Le contenu du modèle est obligatoire');
        return;
    }

    try {
        const res = await fetch(`${API}/templates`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
                name,
                channel: currentChannel,
                type_courrier,
                subject: currentChannel === 'EMAIL' ? subject : null,
                body_template,
                business_unit_id,
                division_id
            })
        });

        if (res.ok) {
            alert('Modèle créé avec succès !');
            hideCreateForm();
            await loadTemplates();
        } else {
            const error = await res.json().catch(() => ({}));
            alert('Erreur: ' + (error.message || error.error || res.status));
        }
    } catch (error) {
        console.error('Erreur création modèle:', error);
        alert('Erreur lors de la création du modèle: ' + error.message);
    }
}

// Chargement des modèles
async function loadTemplates() {
    try {
        const res = await fetch(`${API}/templates`, { headers: getAuthHeader() });
        const data = await res.json();
        const templates = data.data || [];
        
        const container = document.getElementById('templatesList');
        
        if (templates.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-envelope-open-text fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Aucun modèle créé pour le moment</p>
                    <button class="btn btn-primary" onclick="showCreateForm()">
                        <i class="fas fa-plus me-2"></i>Créer le premier modèle
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        templates.forEach(template => {
            const channelClass = template.channel === 'EMAIL' ? 'email' : 'physical';
            const channelIcon = template.channel === 'EMAIL' ? 'fa-envelope' : 'fa-mail-bulk';
            
            html += `
                <div class="template-item">
                    <div class="template-header">
                        <div class="template-name">${template.name}</div>
                        <span class="template-channel ${channelClass}">
                            <i class="fas ${channelIcon} me-1"></i>${template.channel}
                        </span>
                    </div>
                    <div class="template-details">
                        <div><strong>Type:</strong> ${template.type_courrier}</div>
                        ${template.subject ? `<div><strong>Objet:</strong> ${template.subject}</div>` : ''}
                        <div><strong>BU:</strong> ${template.business_unit_name || 'N/A'}</div>
                        ${template.division_name ? `<div><strong>Division:</strong> ${template.division_name}</div>` : ''}
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="editTemplate('${template.id}')">
                            <i class="fas fa-edit me-1"></i>Modifier
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTemplate('${template.id}')">
                            <i class="fas fa-trash me-1"></i>Supprimer
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur chargement modèles:', error);
        document.getElementById('templatesList').innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur lors du chargement des modèles
            </div>
        `;
    }
}

// Chargement des Business Units
async function loadBUs() {
    try {
        const res = await fetch(API_BU, { headers: getAuthHeader() });
        const data = await res.json();
        const buSel = document.getElementById('tplBU');
        buSel.innerHTML = '<option value="">Sélectionnez une Business Unit</option>';
        (data.data || data || []).forEach(bu => {
            const opt = document.createElement('option');
            opt.value = bu.id;
            opt.textContent = bu.nom;
            buSel.appendChild(opt);
        });
    } catch (error) {
        console.error('Erreur chargement BUs:', error);
    }
}

// Chargement des divisions pour une BU
async function loadDivisionsForBU(buId) {
    const divSel = document.getElementById('tplDivision');
    divSel.innerHTML = '<option value="">Sélectionnez une Division (optionnel)</option>';
    divSel.disabled = !buId;
    
    if (!buId) return;
    
    try {
        const res = await fetch(`${API_DIV}?business_unit_id=${encodeURIComponent(buId)}`, { 
            headers: getAuthHeader() 
        });
        const data = await res.json();
        (data.data || data || []).forEach(dv => {
            const opt = document.createElement('option');
            opt.value = dv.id;
            opt.textContent = dv.nom;
            divSel.appendChild(opt);
        });
    } catch (error) {
        console.error('Erreur chargement divisions:', error);
    }
}

        // Édition d'un modèle
        async function editTemplate(id) {
            try {
                // Récupérer les données du modèle
                const res = await fetch(`${API}/templates/${id}`, { headers: getAuthHeader() });
                if (!res.ok) {
                    throw new Error('Erreur lors de la récupération du modèle');
                }
                const data = await res.json();
                const template = data.data;

                // Pré-remplir le formulaire
                const tplName = document.getElementById('tplName');
                const tplType = document.getElementById('tplType');
                const tplSubject = document.getElementById('tplSubject');
                const tplBodyEmail = document.getElementById('tplBodyEmail');
                const tplBodyPhysical = document.getElementById('tplBodyPhysical');
                const tplBU = document.getElementById('tplBU');
                const tplDivision = document.getElementById('tplDivision');
                
                if (tplName) tplName.value = template.name || '';
                if (tplType) tplType.value = template.type_courrier || 'PRESENTATION_GENERALE';
                if (tplSubject) tplSubject.value = template.subject || '';
                
                // Pré-remplir le contenu selon le canal
                if (template.channel === 'EMAIL') {
                    if (tplBodyEmail) tplBodyEmail.value = template.body_template || '';
                } else if (template.channel === 'PHYSIQUE') {
                    if (tplBodyPhysical) tplBodyPhysical.value = template.body_template || '';
                }
                
                if (tplBU) tplBU.value = template.business_unit_id || '';
                
                // Charger les divisions si une BU est sélectionnée
                if (template.business_unit_id) {
                    await loadDivisionsForBU(template.business_unit_id);
                    if (tplDivision) tplDivision.value = template.division_id || '';
                }

                // Sélectionner le canal
                selectChannel(template.channel);

                // Modifier le formulaire pour l'édition
                const createForm = document.getElementById('createForm');
                if (createForm) {
                    const h3Element = createForm.querySelector('h3');
                    if (h3Element) {
                        h3Element.innerHTML = '<i class="fas fa-edit me-2"></i>Modifier le modèle';
                    }
                    
                    const saveButton = createForm.querySelector('.btn-light');
                    if (saveButton) {
                        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Mettre à jour le modèle';
                        saveButton.onclick = () => updateTemplate(id);
                    }
                }

                // Afficher le formulaire
                showCreateForm();
            } catch (error) {
                console.error('Erreur chargement modèle:', error);
                alert('Erreur lors du chargement du modèle');
            }
        }

        // Mise à jour d'un modèle
        async function updateTemplate(id) {
            // Validation
            const name = document.getElementById('tplName').value.trim();
            const type_courrier = document.getElementById('tplType').value;
            const subject = document.getElementById('tplSubject').value.trim();
            
            // Récupérer le contenu selon le canal sélectionné
            let body_template = '';
            if (currentChannel === 'EMAIL') {
                body_template = document.getElementById('tplBodyEmail').value.trim();
            } else if (currentChannel === 'PHYSIQUE') {
                body_template = document.getElementById('tplBodyPhysical').value.trim();
            }
            
            const business_unit_id = document.getElementById('tplBU').value;
            const division_id = document.getElementById('tplDivision').value || null;

            // Validations
            if (!name) {
                alert('Le nom du modèle est obligatoire');
                return;
            }
            if (!currentChannel) {
                alert('Veuillez sélectionner un type de canal');
                return;
            }
            if (!business_unit_id) {
                alert('La Business Unit est obligatoire');
                return;
            }
            if (currentChannel === 'EMAIL' && !subject) {
                alert('L\'objet de l\'email est obligatoire');
                return;
            }
            if (!body_template) {
                alert('Le contenu du modèle est obligatoire');
                return;
            }

            try {
                const res = await fetch(`${API}/templates/${id}`, {
                    method: 'PUT',
                    headers: getAuthHeader(),
                    body: JSON.stringify({
                        name,
                        channel: currentChannel,
                        type_courrier,
                        subject: currentChannel === 'EMAIL' ? subject : null,
                        body_template,
                        business_unit_id,
                        division_id
                    })
                });

                if (res.ok) {
                    alert('Modèle mis à jour avec succès !');
                    hideCreateForm();
                    await loadTemplates();
                } else {
                    const error = await res.json().catch(() => ({}));
                    alert('Erreur: ' + (error.message || error.error || res.status));
                }
            } catch (error) {
                console.error('Erreur mise à jour modèle:', error);
                alert('Erreur lors de la mise à jour du modèle');
            }
        }

        // Suppression d'un modèle
        async function deleteTemplate(id) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.')) {
                try {
                    const res = await fetch(`${API}/templates/${id}`, {
                        method: 'DELETE',
                        headers: getAuthHeader()
                    });

                    if (res.ok) {
                        alert('Modèle supprimé avec succès !');
                        await loadTemplates();
                    } else {
                        const error = await res.json().catch(() => ({}));
                        alert('Erreur: ' + (error.message || error.error || res.status));
                    }
                } catch (error) {
                    console.error('Erreur suppression modèle:', error);
                    alert('Erreur lors de la suppression du modèle');
                }
            }
        }

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadTemplates();
        await loadBUs();
        
        // Event listeners
        const tplBU = document.getElementById('tplBU');
        if (tplBU) {
            tplBU.addEventListener('change', (e) => {
                loadDivisionsForBU(e.target.value);
                updateTemplateName(); // Mettre à jour le nom quand la BU change
            });
        }
        
        // Event listener pour la division
        const tplDivision = document.getElementById('tplDivision');
        if (tplDivision) {
            tplDivision.addEventListener('change', () => {
                updateTemplateName(); // Mettre à jour le nom quand la division change
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
});
