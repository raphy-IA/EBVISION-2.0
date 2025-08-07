// Configuration des superviseurs de feuilles de temps
let allCollaborateurs = [];
let allSupervisors = [];
let supervisorsData = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page de configuration des superviseurs');
    initializePage();
});

async function initializePage() {
    try {
        // Vérifier l'authentification
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Charger les données
        await loadAllData();
        
        // Initialiser les événements
        initializeEvents();
        
        console.log('✅ Page de configuration des superviseurs initialisée');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showAlert('Erreur lors de l\'initialisation de la page', 'danger');
    }
}

async function loadAllData() {
    try {
        console.log('📊 Chargement des données...');
        
        // Charger les collaborateurs
        await loadCollaborateurs();
        
        // Charger les superviseurs
        allSupervisors = await loadSupervisors();
        
        // Remplir le select des superviseurs
        const supervisorSelect = document.getElementById('supervisor-select');
        supervisorSelect.innerHTML = '<option value="">Sélectionner un superviseur</option>';
        
        allSupervisors.forEach(supervisor => {
            const option = document.createElement('option');
            option.value = supervisor.id;
            option.textContent = `${supervisor.prenom} ${supervisor.nom}`;
            supervisorSelect.appendChild(option);
        });
        
        console.log(`✅ ${allSupervisors.length} superviseurs chargés`);
        
        // Charger les relations existantes
        await loadSupervisorRelations();
        
        // Mettre à jour les statistiques
        updateStats();
        
        console.log('✅ Données chargées avec succès');
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showAlert('Erreur lors du chargement des données', 'danger');
    }
}

async function loadCollaborateurs() {
    try {
        const response = await fetch('/api/collaborateurs', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allCollaborateurs = data.data || [];
        
        // Remplir le select multiple des collaborateurs
        const collaborateursSelect = document.getElementById('collaborateurs-select');
        collaborateursSelect.innerHTML = '';
        
        allCollaborateurs.forEach(collaborateur => {
            const option = document.createElement('option');
            option.value = collaborateur.id;
            option.textContent = `${collaborateur.prenom} ${collaborateur.nom}`;
            collaborateursSelect.appendChild(option);
        });
        
        console.log(`✅ ${allCollaborateurs.length} collaborateurs chargés`);
    } catch (error) {
        console.error('❌ Erreur lors du chargement des collaborateurs:', error);
        throw error;
    }
}

async function loadSupervisors() {
    try {
        console.log('🔍 Debug: Token utilisé:', localStorage.getItem('authToken'));
        
        // Forcer l'utilisation du token de test si aucun token n'est trouvé
        let token = localStorage.getItem('authToken');
        if (!token) {
            console.log('⚠️ Aucun token trouvé, utilisation du token de test');
            token = 'test-token';
        }
        
        // Récupérer TOUS les collaborateurs pour pouvoir choisir n'importe qui comme superviseur
        const response = await fetch('/api/collaborateurs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Tous les collaborateurs chargés pour sélection superviseur:', data.data.length);
        return data.data; // Retourner tous les collaborateurs
    } catch (error) {
        console.error('❌ Erreur lors du chargement des superviseurs:', error);
        throw error;
    }
}

async function loadSupervisorRelations() {
    try {
        supervisorsData = [];
        
        // Récupérer tous les superviseurs qui ont des collaborateurs assignés
        const response = await fetch('/api/time-sheet-supervisors/all-supervisors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const supervisorsList = await response.json();
            
            // Pour chaque superviseur qui a des collaborateurs, charger ses collaborateurs
            for (const supervisor of supervisorsList.data) {
                const supervisorResponse = await fetch(`/api/time-sheet-supervisors/supervisor/${supervisor.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                if (supervisorResponse.ok) {
                    const data = await supervisorResponse.json();
                    supervisorsData.push({
                        supervisor: supervisor,
                        collaborateurs: data.data || []
                    });
                }
            }
        }
        
        // Afficher les superviseurs
        displaySupervisors();
        
        // Mettre à jour le filtre des collaborateurs
        filterCollaborateursForSupervisor();
        
        console.log(`✅ Relations superviseurs chargées`);
    } catch (error) {
        console.error('❌ Erreur lors du chargement des relations superviseurs:', error);
        throw error;
    }
}

function displaySupervisors() {
    const container = document.getElementById('supervisors-container');
    
    if (supervisorsData.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-info-circle text-muted" style="font-size: 3em;"></i>
                <p class="text-muted mt-3">Aucun superviseur configuré</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = supervisorsData.map(supervisorData => {
        const { supervisor, collaborateurs } = supervisorData;
        
        return `
            <div class="supervisor-card">
                <div class="supervisor-header">
                    <div class="supervisor-info">
                        <h5><i class="fas fa-user-tie"></i> ${supervisor.prenom} ${supervisor.nom}</h5>
                        <p class="text-muted mb-0">
                            <i class="fas fa-envelope"></i> ${supervisor.email}
                        </p>
                    </div>
                    <div class="supervisor-actions">
                        <span class="badge bg-primary">${collaborateurs.length} collaborateur(s)</span>
                    </div>
                </div>
                
                <div class="collaborateur-list">
                    ${collaborateurs.length > 0 ? 
                        collaborateurs.map(collaborateur => `
                            <div class="collaborateur-item">
                                <div>
                                    <strong>${collaborateur.prenom} ${collaborateur.nom}</strong>
                                    <br>
                                    <small class="text-muted">${collaborateur.email}</small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-danger" 
                                                                                         onclick="removeSupervisorRelation('${collaborateur.id}', '${supervisor.id}', '${collaborateur.prenom} ${collaborateur.nom}', '${supervisor.prenom} ${supervisor.nom}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') :
                        '<p class="text-muted text-center">Aucun collaborateur assigné</p>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

function initializeEvents() {
    // Formulaire d'ajout de superviseur
    const addForm = document.getElementById('add-supervisor-form');
    addForm.addEventListener('submit', handleAddSupervisor);
    
    // Modal de suppression
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    
    // Événement pour filtrer les collaborateurs quand le superviseur change
    const supervisorSelect = document.getElementById('supervisor-select');
    supervisorSelect.addEventListener('change', filterCollaborateursForSupervisor);
}

// Fonction pour filtrer les collaborateurs disponibles pour un superviseur
function filterCollaborateursForSupervisor() {
    const supervisorId = document.getElementById('supervisor-select').value;
    const collaborateursSelect = document.getElementById('collaborateurs-select');
    
    if (!supervisorId) {
        // Si aucun superviseur sélectionné, afficher tous les collaborateurs
        Array.from(collaborateursSelect.options).forEach(option => {
            option.style.display = '';
            option.disabled = false;
            option.style.color = '';
            option.style.fontStyle = '';
        });
        return;
    }
    
    // Trouver les collaborateurs déjà supervisés par ce superviseur
    const alreadySupervised = [];
    supervisorsData.forEach(data => {
        if (data.supervisor.id === supervisorId) {
            data.collaborateurs.forEach(collaborateur => {
                alreadySupervised.push(collaborateur.id);
            });
        }
    });
    
    // Filtrer les options
    Array.from(collaborateursSelect.options).forEach(option => {
        if (option.value === supervisorId) {
            // Masquer le superviseur lui-même
            option.style.display = 'none';
            option.disabled = true;
        } else if (alreadySupervised.includes(option.value)) {
            // Désactiver les collaborateurs déjà supervisés
            option.style.display = '';
            option.disabled = true;
            option.style.color = '#6c757d';
            option.style.fontStyle = 'italic';
        } else {
            // Activer les collaborateurs disponibles
            option.style.display = '';
            option.disabled = false;
            option.style.color = '';
            option.style.fontStyle = '';
        }
    });
}

async function handleAddSupervisor(event) {
    event.preventDefault();
    
    const supervisorId = document.getElementById('supervisor-select').value;
    const collaborateursSelect = document.getElementById('collaborateurs-select');
    const selectedCollaborateurs = Array.from(collaborateursSelect.selectedOptions).map(option => option.value);
    
    if (!supervisorId) {
        showAlert('Veuillez sélectionner un superviseur', 'warning');
        return;
    }
    
    if (selectedCollaborateurs.length === 0) {
        showAlert('Veuillez sélectionner au moins un collaborateur', 'warning');
        return;
    }
    
    // Vérifier qu'aucun collaborateur sélectionné n'est le superviseur lui-même
    if (selectedCollaborateurs.includes(supervisorId)) {
        showAlert('Un superviseur ne peut pas se superviser lui-même', 'warning');
        return;
    }
    
    try {
        console.log('➕ Ajout des relations superviseur...');
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Ajouter chaque relation superviseur
        for (const collaborateurId of selectedCollaborateurs) {
            try {
                const response = await fetch('/api/time-sheet-supervisors', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        collaborateur_id: collaborateurId,
                        supervisor_id: supervisorId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    const collaborateur = allCollaborateurs.find(c => c.id === collaborateurId);
                    const collaborateurName = collaborateur ? `${collaborateur.prenom} ${collaborateur.nom}` : collaborateurId;
                    errors.push(`${collaborateurName}: ${errorData.error || 'Erreur lors de l\'ajout'}`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                const collaborateur = allCollaborateurs.find(c => c.id === collaborateurId);
                const collaborateurName = collaborateur ? `${collaborateur.prenom} ${collaborateur.nom}` : collaborateurId;
                errors.push(`${collaborateurName}: ${error.message}`);
                errorCount++;
            }
        }
        
        // Afficher le résultat
        if (successCount > 0 && errorCount === 0) {
            showAlert(`${successCount} relation(s) superviseur ajoutée(s) avec succès`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showAlert(`${successCount} relation(s) ajoutée(s), ${errorCount} erreur(s). Détails: ${errors.join('; ')}`, 'warning');
        } else {
            showAlert(`Aucune relation ajoutée. Erreurs: ${errors.join('; ')}`, 'danger');
        }
        
        // Réinitialiser le formulaire
        document.getElementById('add-supervisor-form').reset();
        
        // Recharger les données
        await loadSupervisorRelations();
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des relations superviseur:', error);
        showAlert(error.message, 'danger');
    }
}

function removeSupervisorRelation(collaborateurId, supervisorId, collaborateurName, supervisorName) {
    // Stocker les données pour la suppression
    window.deleteData = {
        collaborateurId,
        supervisorId,
        collaborateurName,
        supervisorName
    };
    
    // Afficher les noms dans le modal
    document.getElementById('delete-collaborateur-name').textContent = collaborateurName;
    document.getElementById('delete-supervisor-name').textContent = supervisorName;
    
    // Afficher le modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

async function handleConfirmDelete() {
    try {
        const { collaborateurId, supervisorId } = window.deleteData;
        
        console.log('🗑️ Suppression de la relation superviseur...');
        
        const response = await fetch(`/api/time-sheet-supervisors/${collaborateurId}/${supervisorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        const data = await response.json();
        console.log('✅ Relation superviseur supprimée:', data);
        
        showAlert('Relation superviseur supprimée avec succès', 'success');
        
        // Fermer le modal
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        deleteModal.hide();
        
        // Recharger les données
        await loadSupervisorRelations();
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur lors de la suppression de la relation superviseur:', error);
        showAlert(error.message, 'danger');
    }
}

async function updateStats() {
    try {
        // Compter les superviseurs uniques
        const uniqueSupervisors = new Set();
        const uniqueCollaborateurs = new Set();
        let totalRelations = 0;
        
        supervisorsData.forEach(data => {
            uniqueSupervisors.add(data.supervisor.id);
            data.collaborateurs.forEach(collaborateur => {
                uniqueCollaborateurs.add(collaborateur.id);
                totalRelations++;
            });
        });
        
        // Mettre à jour les statistiques
        document.getElementById('total-supervisors').textContent = uniqueSupervisors.size;
        document.getElementById('total-collaborateurs').textContent = uniqueCollaborateurs.size;
        document.getElementById('total-relations').textContent = totalRelations;
        
        // Charger les feuilles en attente
        try {
                         const response = await fetch('/api/time-sheet-approvals/pending', {
                 headers: {
                     'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                 }
             });
            
            if (response.ok) {
                const data = await response.json();
                document.getElementById('pending-approvals').textContent = data.data.length;
            } else {
                document.getElementById('pending-approvals').textContent = '0';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des feuilles en attente:', error);
            document.getElementById('pending-approvals').textContent = '0';
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour des statistiques:', error);
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertId = 'alert-' + Date.now();
    
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHtml;
    
    // Auto-dismiss après 5 secondes
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
} 