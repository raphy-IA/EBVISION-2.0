// Configuration des APIs
const API = new URL('/api/prospecting', window.location.origin).toString();
const API_BU = new URL('/api/business-units', window.location.origin).toString();
const API_DIV = new URL('/api/divisions', window.location.origin).toString();
let currentChannel = null;

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
        }

// Réinitialisation du formulaire
        function resetForm() {
            document.getElementById('tplName').value = '';
            document.getElementById('tplType').value = 'PRESENTATION_GENERALE';
            document.getElementById('tplSubject').value = '';
            document.getElementById('tplBody').value = '';
            document.getElementById('tplBU').value = '';
            document.getElementById('tplDivision').innerHTML = '<option value="">Sélectionnez une Division (optionnel)</option>';
            document.getElementById('tplDivision').disabled = true;
            
            // Réinitialiser la sélection du canal
            currentChannel = null;
            document.querySelectorAll('.channel-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelectorAll('.template-config').forEach(config => {
                config.classList.remove('active');
            });

            // Masquer l'indicateur de canal
            const indicator = document.getElementById('channelIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }

            // Remettre le formulaire en mode création
            const createForm = document.getElementById('createForm');
            if (createForm) {
                createForm.querySelector('h3').innerHTML = '<i class="fas fa-plus-circle me-2"></i>Créer un nouveau modèle';
                const saveButton = createForm.querySelector('.btn-light');
                saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer le modèle';
                saveButton.onclick = createTemplate;
            }
        }

// Création d'un modèle
async function createTemplate() {
    // Validation
    const name = document.getElementById('tplName').value.trim();
    const type_courrier = document.getElementById('tplType').value;
    const subject = document.getElementById('tplSubject').value.trim();
    const body_template = document.getElementById('tplBody').value.trim();
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
        alert('Erreur lors de la création du modèle');
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
                document.getElementById('tplName').value = template.name || '';
                document.getElementById('tplType').value = template.type_courrier || 'PRESENTATION_GENERALE';
                document.getElementById('tplSubject').value = template.subject || '';
                document.getElementById('tplBody').value = template.body_template || '';
                document.getElementById('tplBU').value = template.business_unit_id || '';
                
                // Charger les divisions si une BU est sélectionnée
                if (template.business_unit_id) {
                    await loadDivisionsForBU(template.business_unit_id);
                    document.getElementById('tplDivision').value = template.division_id || '';
                }

                // Sélectionner le canal
                selectChannel(template.channel);

                // Modifier le formulaire pour l'édition
                const createForm = document.getElementById('createForm');
                createForm.querySelector('h3').innerHTML = '<i class="fas fa-edit me-2"></i>Modifier le modèle';
                createForm.querySelector('.btn-light').innerHTML = '<i class="fas fa-save me-2"></i>Mettre à jour le modèle';
                createForm.querySelector('.btn-light').onclick = () => updateTemplate(id);

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
            const body_template = document.getElementById('tplBody').value.trim();
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
    await loadTemplates();
    await loadBUs();
    
    // Event listeners
    document.getElementById('tplBU').addEventListener('change', (e) => {
        loadDivisionsForBU(e.target.value);
    });
});
