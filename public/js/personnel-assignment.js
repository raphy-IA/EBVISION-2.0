/**
 * Fonctions pour l'affectation améliorée du personnel
 * avec filtrage par Business Unit et interface 2 colonnes
 */

// Afficher les affectations avec la nouvelle interface
function displayAssignmentsNew() {
    const container = document.getElementById('assignments-container');

    if (selectedTasks.length === 0) {
        container.innerHTML = '<p class="text-muted">Sélectionnez d\'abord les tâches pour voir les affectations disponibles.</p>';
        return;
    }

    const assignmentsHtml = selectedTasks.map(taskId => {
        const assignment = assignments[taskId];
        const task = assignment.task;

        // Initialiser les filtres pour cette tâche si nécessaire
        if (!taskFilters[taskId]) {
            taskFilters[taskId] = { buFilter: '', searchQuery: '' };
        }

        return `
            <div class="personnel-assignment-container">
                <h6 class="mb-3">
                    <i class="fas fa-tasks me-2"></i>${task.code} - ${task.libelle}
                    ${task.obligatoire ? '<span class="badge bg-warning ms-2">Obligatoire</span>' : ''}
                </h6>
                
                <div class="row">
                    <!-- Colonne gauche : Sélection des collaborateurs -->
                    <div class="col-md-5">
                        <h6 class="mb-3"><i class="fas fa-user-plus me-2"></i>Sélection des Collaborateurs</h6>
                        
                        <!-- Filtre Business Unit -->
                        <div class="mb-3">
                            <label class="form-label">Business Unit</label>
                            <select class="form-select form-select-sm" id="bu-filter-${taskId}" 
                                    onchange="filterCollaborateursByBU('${taskId}', this.value)">
                                <option value="">Toutes les Business Units</option>
                                ${businessUnits.map(bu => `<option value="${bu.id}">${bu.nom}</option>`).join('')}
                            </select>
                        </div>
                        
                        <!-- Recherche -->
                        <div class="mb-3">
                            <input type="text" class="form-control form-control-sm" 
                                   id="search-${taskId}"
                                   placeholder="Rechercher un collaborateur..."
                                   oninput="searchCollaborateurs('${taskId}', this.value)">
                        </div>
                        
                        <!-- Liste des collaborateurs -->
                        <div class="collaborateurs-list" id="collab-list-${taskId}">
                            ${renderCollaborateursList(taskId)}
                        </div>
                    </div>
                    
                    <!-- Colonne droite : Planification des heures -->
                    <div class="col-md-7">
                        <h6 class="mb-3"><i class="fas fa-clock me-2"></i>Planification des Heures</h6>
                        <div class="selected-collaborateurs-area" id="selected-collabs-${taskId}">
                            ${renderSelectedCollaborateurs(taskId)}
                        </div>
                        
                        <!-- Total pour cette tâche -->
                        <div class="alert alert-info mt-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Total heures:</strong> <span id="total_heures_${taskId}">0</span> h
                                </div>
                                <div class="col-md-6">
                                    <strong>Coût total:</strong> <span id="total_cout_${taskId}">${formatCurrency(0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = assignmentsHtml;

    // Mettre à jour les totaux pour chaque tâche
    selectedTasks.forEach(taskId => {
        updateTaskTotals(taskId);
    });
}

// Rendre la liste des collaborateurs disponibles
function renderCollaborateursList(taskId) {
    const assignment = assignments[taskId];

    // Obtenir les filtres pour cette tâche spécifique
    const filters = taskFilters[taskId] || { buFilter: '', searchQuery: '' };

    // Filtrer les collaborateurs selon les critères de cette tâche
    let collabsToShow = collaborateurs;

    if (filters.buFilter || filters.searchQuery) {
        collabsToShow = collaborateurs.filter(collab => {
            // Filtre BU
            const matchesBU = !filters.buFilter || collab.business_unit_id === filters.buFilter;

            // Filtre recherche
            const matchesSearch = !filters.searchQuery ||
                `${collab.nom} ${collab.prenom}`.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                (collab.grade_nom && collab.grade_nom.toLowerCase().includes(filters.searchQuery.toLowerCase()));

            return matchesBU && matchesSearch;
        });
    }

    if (collabsToShow.length === 0) {
        return '<div class="text-center text-muted p-3">Aucun collaborateur disponible</div>';
    }

    return collabsToShow.map(collab => {
        const isSelected = assignment && assignment.collaborateurs && assignment.collaborateurs[collab.id];
        return `
            <div class="collaborateur-item ${isSelected ? 'selected' : ''}" 
                 id="item-${taskId}-${collab.id}">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           id="check-${taskId}-${collab.id}"
                           ${isSelected ? 'checked' : ''}
                           onchange="handleCheckboxChange('${taskId}', '${collab.id}', this.checked)">
                    <label class="form-check-label w-100" for="check-${taskId}-${collab.id}" style="cursor: pointer;">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${collab.nom} ${collab.prenom}</strong><br>
                                <small class="text-muted">${collab.grade_nom || 'N/A'}</small>
                            </div>
                            <div class="text-end">
                                <small class="text-muted">${collab.business_unit_nom || 'N/A'}</small><br>
                                <small><strong>${collab.taux_horaire || 0} ${getCurrencySymbol()}/h</strong></small>
                            </div>
                        </div>
                    </label>
                </div>
            </div>
        `;
    }).join('');
}

// Rendre les collaborateurs sélectionnés avec saisie des heures
function renderSelectedCollaborateurs(taskId) {
    const assignment = assignments[taskId];

    if (!assignment || !assignment.collaborateurs || Object.keys(assignment.collaborateurs).length === 0) {
        return '<div class="text-center text-muted p-3">Aucun collaborateur sélectionné</div>';
    }

    return Object.entries(assignment.collaborateurs).map(([collabId, data]) => {
        const collab = collaborateurs.find(c => c.id === collabId);
        if (!collab) return '';

        const heures = data.heures || 0;
        const cout = data.cout || 0;

        return `
            <div class="selected-collab-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <strong>${collab.nom} ${collab.prenom}</strong><br>
                        <small class="text-muted">${collab.grade_nom || 'N/A'} - ${collab.taux_horaire || 0} ${getCurrencySymbol()}/h</small>
                    </div>
                    <i class="fas fa-times remove-btn" 
                       onclick="removeCollaborateur('${taskId}', '${collabId}')"
                       title="Retirer"></i>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label small">Heures</label>
                        <input type="number" class="form-control form-control-sm" 
                               value="${heures}" min="0" step="0.5"
                               onchange="updateCollaborateurHeures('${taskId}', '${collabId}', this.value)">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">Coût total</label>
                        <div class="form-control form-control-sm bg-light" id="cout-${taskId}-${collabId}">
                            ${formatCurrency(cout)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filtrer les collaborateurs par Business Unit
function filterCollaborateursByBU(taskId, buId) {
    console.log(`🔍 Filtre BU pour tâche ${taskId}: ${buId}`);

    // Initialiser les filtres pour cette tâche si nécessaire
    if (!taskFilters[taskId]) {
        taskFilters[taskId] = { buFilter: '', searchQuery: '' };
    }

    taskFilters[taskId].buFilter = buId;

    // Mettre à jour l'affichage de la liste pour cette tâche
    const listContainer = document.getElementById(`collab-list-${taskId}`);
    if (listContainer) {
        listContainer.innerHTML = renderCollaborateursList(taskId);
    }
}

// Rechercher des collaborateurs
function searchCollaborateurs(taskId, query) {
    console.log(`🔍 Recherche pour tâche ${taskId}: ${query}`);

    // Initialiser les filtres pour cette tâche si nécessaire
    if (!taskFilters[taskId]) {
        taskFilters[taskId] = { buFilter: '', searchQuery: '' };
    }

    taskFilters[taskId].searchQuery = query;

    // Mettre à jour l'affichage de la liste pour cette tâche
    const listContainer = document.getElementById(`collab-list-${taskId}`);
    if (listContainer) {
        listContainer.innerHTML = renderCollaborateursList(taskId);
    }
}

// Gérer le changement de checkbox
function handleCheckboxChange(taskId, collabId, isChecked) {
    console.log(`📝 handleCheckboxChange: taskId=${taskId}, collabId=${collabId}, isChecked=${isChecked}`);

    const assignment = assignments[taskId];
    if (!assignment) {
        console.error('❌ Assignment non trouvé');
        return;
    }

    if (isChecked) {
        // Sélectionner
        const collab = collaborateurs.find(c => c.id === collabId);
        if (!collab) {
            console.error('❌ Collaborateur non trouvé:', collabId);
            return;
        }

        assignment.collaborateurs[collabId] = {
            heures: 0,
            taux: collab.taux_horaire || 0,
            cout: 0
        };
        console.log('✅ Collaborateur ajouté:', collab.nom, collab.prenom);

        // Mettre à jour la classe CSS de l'item
        const item = document.getElementById(`item-${taskId}-${collabId}`);
        if (item) item.classList.add('selected');
    } else {
        // Désélectionner
        delete assignment.collaborateurs[collabId];
        console.log('✅ Collaborateur retiré');

        // Mettre à jour la classe CSS de l'item
        const item = document.getElementById(`item-${taskId}-${collabId}`);
        if (item) item.classList.remove('selected');
    }

    // Mettre à jour l'affichage de la zone de droite
    const selectedContainer = document.getElementById(`selected-collabs-${taskId}`);
    if (selectedContainer) {
        selectedContainer.innerHTML = renderSelectedCollaborateurs(taskId);
    }

    updateTaskTotals(taskId);
    updateBudgetCalculator();
}

// Retirer un collaborateur de la sélection
function removeCollaborateur(taskId, collabId) {
    console.log(`🗑️ removeCollaborateur: taskId=${taskId}, collabId=${collabId}`);

    // Supprimer du modèle
    const assignment = assignments[taskId];
    if (assignment && assignment.collaborateurs[collabId]) {
        delete assignment.collaborateurs[collabId];
    }

    // Décocher la checkbox
    const checkbox = document.getElementById(`check-${taskId}-${collabId}`);
    if (checkbox) {
        checkbox.checked = false;
    }

    // Mettre à jour la classe CSS de l'item
    const item = document.getElementById(`item-${taskId}-${collabId}`);
    if (item) {
        item.classList.remove('selected');
    }

    // Mettre à jour l'affichage de la zone de droite
    const selectedContainer = document.getElementById(`selected-collabs-${taskId}`);
    if (selectedContainer) {
        selectedContainer.innerHTML = renderSelectedCollaborateurs(taskId);
    }

    updateTaskTotals(taskId);
    updateBudgetCalculator();
}

// Mettre à jour les totaux d'une tâche
function updateTaskTotals(taskId) {
    const assignment = assignments[taskId];
    let totalHeures = 0;
    let totalCout = 0;

    if (assignment && assignment.collaborateurs) {
        Object.values(assignment.collaborateurs).forEach(data => {
            totalHeures += parseFloat(data.heures) || 0;
            totalCout += parseFloat(data.cout) || 0;
        });
    }

    assignment.totalHeures = totalHeures;

    const heuresEl = document.getElementById(`total_heures_${taskId}`);
    const coutEl = document.getElementById(`total_cout_${taskId}`);

    if (heuresEl) heuresEl.textContent = totalHeures.toFixed(1);
    if (coutEl) coutEl.textContent = formatCurrency(totalCout);
}
