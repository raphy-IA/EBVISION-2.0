// ==========================================
// FISCAL YEARS CRUD OPERATIONS
// ==========================================

// Voir un exercice fiscal
async function viewFiscalYear(id) {
    try {
        const response = await fetch(`/api/fiscal-years/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        console.log('Réponse API fiscal-year individuel:', await response.clone().json());

        if (response.ok) {
            const result = await response.json();
            const fiscalYear = result.data;

            document.getElementById('viewAnnee').textContent = fiscalYear.annee;
            document.getElementById('viewBudget').textContent = formatCurrency(fiscalYear.budget_global || 0);
            document.getElementById('viewDateDebut').textContent = formatDate(fiscalYear.date_debut);
            document.getElementById('viewDateFin').textContent = formatDate(fiscalYear.date_fin);
            document.getElementById('viewStatut').innerHTML = getStatutBadge(fiscalYear.statut);
            document.getElementById('viewCreatedAt').textContent = formatDateTime(fiscalYear.created_at);
            document.getElementById('viewUpdatedAt').textContent = formatDateTime(fiscalYear.updated_at);

            // Stocker l'ID pour le recalcul du budget
            window.currentViewingFiscalYearId = id;

            const modal = new bootstrap.Modal(document.getElementById('viewModal'));
            modal.show();
        } else {
            showAlert('Erreur lors du chargement de l\'exercice fiscal', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Créer un exercice fiscal
async function createFiscalYear() {
    const form = document.getElementById('createForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        libelle: document.getElementById('createLibelle').value,
        annee: parseInt(document.getElementById('createAnnee').value),
        date_debut: document.getElementById('createDateDebut').value,
        date_fin: document.getElementById('createDateFin').value,
        statut: document.getElementById('createStatut').value
        // budget_global n'est plus envoyé - il sera calculé automatiquement
    };

    try {
        const response = await fetch('/api/fiscal-years', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('createModal'));
            modal.hide();
            form.reset();
            showAlert('Exercice fiscal créé avec succès', 'success');
            loadFiscalYears();
            loadStats();
        } else {
            const error = await response.json();
            showAlert('Erreur lors de la création: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Modifier un exercice fiscal
async function editFiscalYear(id) {
    try {
        const response = await fetch(`/api/fiscal-years/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const fiscalYear = result.data;

            document.getElementById('editId').value = fiscalYear.id;
            document.getElementById('editAnnee').value = fiscalYear.annee;
            document.getElementById('editLibelle').value = fiscalYear.libelle;
            // budget_global n'est plus éditable

            // Convertir les dates au format YYYY-MM-DD pour les champs input[type="date"]
            const dateDebut = new Date(fiscalYear.date_debut);
            const dateFin = new Date(fiscalYear.date_fin);

            // Formatage manuel pour éviter les problèmes de timezone
            const formatDateForInput = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            document.getElementById('editDateDebut').value = formatDateForInput(dateDebut);
            document.getElementById('editDateFin').value = formatDateForInput(dateFin);
            document.getElementById('editStatut').value = fiscalYear.statut;

            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
        } else {
            showAlert('Erreur lors du chargement de l\'exercice fiscal', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Mettre à jour un exercice fiscal
async function updateFiscalYear() {
    const form = document.getElementById('editForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('editId').value;
    const data = {
        libelle: document.getElementById('editLibelle').value,
        date_debut: document.getElementById('editDateDebut').value,
        date_fin: document.getElementById('editDateFin').value
        // budget_global n'est plus envoyé - il est calculé automatiquement
    };

    try {
        const response = await fetch(`/api/fiscal-years/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            showAlert('Exercice fiscal mis à jour avec succès', 'success');
            loadFiscalYears();
            loadStats();
        } else {
            const error = await response.json();
            showAlert('Erreur lors de la mise à jour: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

// Ouvrir le modal de création
function openCreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('createModal'));
    document.getElementById('createForm').reset();
    modal.show();
}

// Recalculer le budget global
async function recalculateBudget() {
    const fiscalYearId = window.currentViewingFiscalYearId;

    if (!fiscalYearId) {
        showAlert('Aucune année fiscale sélectionnée', 'warning');
        return;
    }

    const button = event.target.closest('button');
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}/recalculate-budget`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const newBudget = result.data.budget_global;

            // Mettre à jour l'affichage
            document.getElementById('viewBudget').textContent = formatCurrency(newBudget || 0);

            showAlert(`Budget recalculé avec succès: ${formatCurrency(newBudget || 0)}`, 'success');

            // Recharger la liste pour mettre à jour le tableau
            loadFiscalYears();
        } else {
            const error = await response.json();
            showAlert('Erreur lors du recalcul: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    } finally {
        button.disabled = false;
        button.innerHTML = originalHTML;
    }
}
