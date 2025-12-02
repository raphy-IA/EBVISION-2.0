/* JavaScript pour la page Collaborateurs - EB-Vision 2.0 */
/* Optimisé pour les performances */

// Optimisations de performance
(function () {
    'use strict';

    // Debounce pour les fonctions fréquentes
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle pour les événements de scroll
    function throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Optimisation des requêtes DOM
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);

    // Cache des éléments fréquemment utilisés
    const cache = {
        searchInput: null,
        statusFilter: null,
        businessUnitFilter: null,
        collaborateursTable: null
    };

    // Initialisation optimisée
    document.addEventListener('DOMContentLoaded', function () {
        // Cache les éléments
        cache.searchInput = $('#search-input');
        cache.statusFilter = $('#status-filter');
        cache.businessUnitFilter = $('#business-unit-filter');
        cache.collaborateursTable = $('.table-responsive');

        // Optimiser les événements
        if (cache.searchInput) {
            cache.searchInput.addEventListener('input',
                debounce(filterCollaborateurs, 300)
            );
        }

        if (cache.statusFilter) {
            cache.statusFilter.addEventListener('change',
                debounce(filterCollaborateurs, 100)
            );
        }

        if (cache.businessUnitFilter) {
            cache.businessUnitFilter.addEventListener('change',
                debounce(filterCollaborateurs, 100)
            );
        }

        // Optimiser le scroll
        window.addEventListener('scroll',
            throttle(handleScroll, 100)
        );
    });

    function handleScroll() {
        // Optimisations de scroll si nécessaire
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Ajouter des optimisations de scroll ici si nécessaire
    }

    // Exposer les fonctions globales
    window.debounce = debounce;
    window.throttle = throttle;

})();


/* Script 1 */

const API_BASE_URL = '/api';
let collaborateurs = [];
let collaborateurToDelete = null;
let collaborateurDetailsForDelete = null;
let collaborateurRHId = null;

let currentUserRoles = [];
let canManageUserAccounts = false;

function initCurrentUserRoles() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.roles && Array.isArray(userData.roles)) {
            currentUserRoles = userData.roles;
        } else if (userData.role) {
            currentUserRoles = [userData.role];
        } else if (userData.principal_role) {
            currentUserRoles = [userData.principal_role];
        }
        canManageUserAccounts = currentUserRoles.includes('SUPER_ADMIN') || currentUserRoles.includes('ADMIN_IT');
    } catch (e) {
        currentUserRoles = [];
        canManageUserAccounts = false;
    }
}

// Helper: Vérifier si l'utilisateur est SUPER_ADMIN
function isCurrentUserSuperAdmin() {
    if (!currentUserRoles || currentUserRoles.length === 0) return false;
    return currentUserRoles.some(r => (typeof r === 'string' ? r : r.name) === 'SUPER_ADMIN');
}

// Fonction utilitaire pour les appels API authentifiés
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    initCurrentUserRoles();
    loadCollaborateurs();
    loadBusinessUnits();
    loadDivisions();
    loadTypesCollaborateurs();
    loadGrades();
    loadPostes();

    // Événement pour charger les postes quand le type de collaborateur change
    document.addEventListener('change', function (e) {
        if (e.target.id === 'typeCollaborateur-select' || e.target.id === 'edit-typeCollaborateur-select') {
            const typeId = e.target.value;
            const posteSelect = e.target.id === 'typeCollaborateur-select' ?
                document.getElementById('poste-select') :
                document.getElementById('edit-poste-select');

            if (typeId === 'CONSULTANT' && posteSelect) {
                // Chercher l'option "Consultant" et la sélectionner
                for (let option of posteSelect.options) {
                    if (option.textContent === 'Consultant') {
                        posteSelect.value = option.value;
                        break;
                    }
                }
            }
        }
    });
});

// Variables de pagination
let currentPage = 1;
let totalPages = 1;
let totalCollaborateurs = 0;
const itemsPerPage = 20;

async function loadCollaborateurs(page = 1) {
    showLoading(true);
    console.log(`🔄 Chargement des collaborateurs - Page ${page}...`);

    try {
        // Récupérer les valeurs des filtres
        const searchTerm = document.getElementById('search-input')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const businessUnitFilter = document.getElementById('business-unit-filter')?.value || '';

        // Construire l'URL avec les paramètres de filtres
        const params = new URLSearchParams({
            page: page,
            limit: itemsPerPage
        });

        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('statut', statusFilter);
        if (businessUnitFilter) params.append('business_unit_id', businessUnitFilter);

        console.log('🔍 Paramètres de filtres:', { searchTerm, statusFilter, businessUnitFilter });

        const token = localStorage.getItem('authToken');
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        console.log('📊 Données reçues:', data);
        console.log('📊 Structure complète de la réponse:', JSON.stringify(data, null, 2));

        if (data.success) {
            collaborateurs = data.data;
            currentPage = page;

            // Mettre à jour les informations de pagination
            if (data.pagination) {
                totalPages = data.pagination.totalPages;
                totalCollaborateurs = data.pagination.total;
                console.log('📊 Données de pagination reçues:', data.pagination);
                console.log('📊 totalPages calculé:', totalPages);
                console.log('📊 totalCollaborateurs:', totalCollaborateurs);
            } else {
                console.warn('⚠️ Aucune donnée de pagination reçue du serveur');
                // Valeurs par défaut
                totalPages = 1;
                totalCollaborateurs = collaborateurs.length;
            }

            console.log(`👥 Collaborateurs chargés: ${collaborateurs.length} (Page ${currentPage}/${totalPages}, Total: ${totalCollaborateurs})`);
            console.log('🔍 État des variables de pagination avant updatePaginationControls:', { currentPage, totalPages, totalCollaborateurs, itemsPerPage });
            // Plus besoin de filteredCollaborateurs car le filtrage se fait côté serveur
            displayCollaborateurs();
            updateStatistics();
            updatePaginationControls();
        } else {
            console.error('❌ Erreur API:', data);
            showAlert('Erreur lors du chargement des collaborateurs', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur fetch:', error);
        showAlert('Erreur de connexion', 'danger');
    } finally {
        showLoading(false);
        console.log('✅ Chargement terminé');
    }
}

// Fonction pour mettre à jour les contrôles de pagination
function updatePaginationControls() {
    console.log('🔄 Mise à jour des contrôles de pagination...');
    console.log('📊 Données de pagination:', { currentPage, totalPages, totalCollaborateurs, itemsPerPage });

    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        console.error('❌ Conteneur de pagination non trouvé: #pagination-container');
        return;
    }

    console.log('✅ Conteneur de pagination trouvé');

    let paginationHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-muted">
                        Affichage de ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, totalCollaborateurs)} sur ${totalCollaborateurs} collaborateurs
                    </div>
                    <nav aria-label="Pagination des collaborateurs">
                        <ul class="pagination pagination-sm mb-0">
            `;

    // Bouton Précédent
    console.log(`🔍 Logique bouton Précédent: currentPage=${currentPage}, currentPage > 1 = ${currentPage > 1}`);
    if (currentPage > 1) {
        console.log('✅ Bouton Précédent sera ACTIF');
        paginationHTML += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="loadCollaborateurs(${currentPage - 1})" aria-label="Précédent">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                `;
    } else {
        console.log('❌ Bouton Précédent sera DÉSACTIVÉ');
        paginationHTML += `
                    <li class="page-item disabled">
                        <span class="page-link" aria-label="Précédent">
                            <span aria-hidden="true">&laquo;</span>
                        </span>
                    </li>
                `;
    }

    // Numéros de pages
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                        <li class="page-item active">
                            <span class="page-link">${i}</span>
                        </li>
                    `;
        } else {
            paginationHTML += `
                        <li class="page-item">
                            <a class="page-link" href="#" onclick="loadCollaborateurs(${i})">${i}</a>
                        </li>
                    `;
        }
    }

    // Bouton Suivant
    console.log(`🔍 Logique bouton Suivant: currentPage=${currentPage}, totalPages=${totalPages}, currentPage < totalPages = ${currentPage < totalPages}`);
    if (currentPage < totalPages) {
        console.log('✅ Bouton Suivant sera ACTIF');
        paginationHTML += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="loadCollaborateurs(${currentPage + 1})" aria-label="Suivant">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                `;
    } else {
        console.log('❌ Bouton Suivant sera DÉSACTIVÉ');
        paginationHTML += `
                    <li class="page-item disabled">
                        <span class="page-link" aria-label="Suivant">
                            <span aria-hidden="true">&raquo;</span>
                        </span>
                    </li>
                `;
    }

    paginationHTML += `
                        </ul>
                    </nav>
                </div>
            `;

    paginationContainer.innerHTML = paginationHTML;
    console.log('✅ Contrôles de pagination mis à jour avec succès');
    console.log('📄 HTML généré:', paginationHTML.substring(0, 200) + '...');
}

function displayCollaborateurs() {
    console.log('🎨 Affichage des collaborateurs...');
    const tbody = document.getElementById('collaborateurs-table');
    console.log('📋 Tbody trouvé:', tbody);
    tbody.innerHTML = '';

    console.log('🔍 Nombre de collaborateurs à afficher:', collaborateurs.length);

    if (collaborateurs.length === 0) {
        console.log('📭 Aucun collaborateur à afficher');
        tbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center text-muted py-4">
                            <i class="fas fa-users fa-2x mb-3"></i>
                            <p>Aucun collaborateur trouvé</p>
                        </td>
                    </tr>
                `;
        return;
    }

    console.log('✅ Affichage de', collaborateurs.length, 'collaborateurs');
    collaborateurs.forEach((collaborateur, index) => {
        console.log('👤 Affichage collaborateur:', collaborateur.nom, collaborateur.prenom);
        const row = document.createElement('tr');
        row.setAttribute('data-collaborateur-id', collaborateur.id);
        const initials = getInitials(collaborateur.nom, collaborateur.prenom);

        const isDepart = collaborateur.statut === 'DEPART';

        row.innerHTML = `
                    <td>
                        ${window.photoUploadManager ?
                window.photoUploadManager.createPhotoElement(collaborateur, 'normal').outerHTML :
                `<div class="collaborateur-avatar">
                                ${initials}
                            </div>`
            }
                    </td>
                    <td>${collaborateur.nom}</td>
                    <td>${collaborateur.prenom}</td>
                    <td>${collaborateur.email || '-'}</td>
                    <td>${collaborateur.telephone || '-'}</td>
                    <td>${collaborateur.business_unit_nom || '-'}</td>
                    <td>${collaborateur.division_nom || '-'}</td>
                    <td>${collaborateur.type_collaborateur_nom || '-'}</td>
                    <td>${collaborateur.poste_nom || '-'}</td>
                    <td>${collaborateur.grade_nom || '-'}</td>
                    <td><span class="status-badge status-${collaborateur.statut.toLowerCase()}">${getStatusLabel(collaborateur.statut)}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" onclick="viewCollaborateur('${collaborateur.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${!isDepart ? `
                                <button class="btn btn-outline-warning" onclick="editCollaborateur('${collaborateur.id}')" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-primary" onclick="gestionRH('${collaborateur.id}')" title="Gestion RH">
                                    <i class="fas fa-user-tie"></i>
                                </button>
                                <button class="btn btn-outline-secondary" onclick="viewHistoriqueRH('${collaborateur.id}')" title="Historique RH">
                                    <i class="fas fa-history"></i>
                                </button>
                                ${canManageUserAccounts ? (
                    collaborateur.user_id ?
                        `<button class="btn btn-outline-success" onclick="manageUserAccount('${collaborateur.id}', '${collaborateur.user_id}')" title="Gérer le compte utilisateur">
                                            <i class="fas fa-user-shield"></i>
                                        </button>` :
                        `<button class="btn btn-outline-secondary" onclick="generateUserAccount('${collaborateur.id}')" title="Générer un compte utilisateur">
                                            <i class="fas fa-user-plus"></i>
                                        </button>`
                ) : ''}
                                <button class="btn btn-outline-danger" onclick="deleteCollaborateur('${collaborateur.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : `
                                <button class="btn btn-outline-secondary" onclick="viewDepartInfo('${collaborateur.id}')" title="Infos de départ">
                                    <i class="fas fa-sign-out-alt"></i>
                                </button>
                                <button class="btn btn-outline-primary" onclick="viewHistoriqueRH('${collaborateur.id}')" title="Historique RH">
                                    <i class="fas fa-history"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="rehireCollaborateur('${collaborateur.id}')" title="Ré-embaucher le collaborateur">
                                    <i class="fas fa-user-check"></i>
                                </button>
                            `}
                        </div>
                    </td>
                `;
        tbody.appendChild(row);
    });
    console.log('✅ Affichage terminé');
}

function updateStatistics() {
    // Utiliser totalCollaborateurs pour les statistiques globales (avec filtres appliqués)
    const total = totalCollaborateurs || 0;
    // Pour les actifs, on ne peut que compter ceux de la page actuelle
    // TODO: Modifier l'API pour retourner les statistiques filtrées
    const actifs = Array.isArray(collaborateurs) ? collaborateurs.filter(c => c.statut === 'ACTIF').length : 0;
    const totalHeures = 0; // TODO: Calculate from time entries
    const moyenneHeures = total > 0 ? (totalHeures / total).toFixed(1) : 0;

    const elTotal = document.getElementById('total-collaborateurs');
    const elActifs = document.getElementById('actifs-collaborateurs');
    const elTotalHeures = document.getElementById('total-heures');
    const elMoyenneHeures = document.getElementById('moyenne-heures');

    if (elTotal) elTotal.textContent = total;
    if (elActifs) elActifs.textContent = actifs;
    if (elTotalHeures) elTotalHeures.textContent = totalHeures;
    if (elMoyenneHeures) elMoyenneHeures.textContent = moyenneHeures;
}

function filterCollaborateurs() {
    console.log('🔍 Application des filtres...');
    // Réinitialiser à la page 1 lors du filtrage
    currentPage = 1;
    // Recharger les données avec les filtres appliqués
    loadCollaborateurs(1);
}

function showNewCollaborateurModal() {
    loadBusinessUnits();
    loadDivisions();
    loadTypesCollaborateurs();
    loadGrades();
    loadPostes();
    document.getElementById('newCollaborateurForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('newCollaborateurModal'));
    modal.show();
}

async function loadBusinessUnits() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/business-units?limit=100`);
        const data = await response.json();

        const selects = ['business-unit-select', 'edit-business-unit-select', 'business-unit-filter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Sélectionner une business unit</option>';

                let businessUnits = [];
                if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                    businessUnits = data.data;
                } else if (data.success && data.data && data.data.businessUnits && data.data.businessUnits.length > 0) {
                    // Gérer le format alternatif
                    businessUnits = data.data.businessUnits;
                }

                // Filtrer seulement les BU actives
                const activeBusinessUnits = businessUnits.filter(bu => bu.statut === 'ACTIF');

                if (activeBusinessUnits.length > 0) {
                    activeBusinessUnits.forEach(bu => {
                        const option = document.createElement('option');
                        option.value = bu.id;
                        option.textContent = bu.nom;
                        select.appendChild(option);
                    });
                } else {
                    // Ajouter une option par défaut
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "Aucune business unit active disponible";
                    option.disabled = true;
                    select.appendChild(option);
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des business units:', error);
    }
}

async function loadGrades() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/grades`);
        const data = await response.json();

        const selects = ['grade-select', 'edit-grade-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Sélectionner un grade</option>';

                if (data.success && data.data) {
                    data.data.forEach(grade => {
                        const option = document.createElement('option');
                        option.value = grade.id;
                        option.textContent = `${grade.nom} (${grade.code})`;
                        select.appendChild(option);
                    });
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des grades:', error);
    }
}

async function loadDivisions() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/divisions`);
        const data = await response.json();

        const selects = ['division-select', 'edit-division-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Sélectionner une division</option>';

                let divisions = [];
                if (data.success && data.data && data.data.divisions) {
                    divisions = data.data.divisions;
                } else if (data.success && data.data && Array.isArray(data.data)) {
                    // Gérer le cas où data.data est directement un array
                    divisions = data.data;
                }

                // Filtrer seulement les divisions actives
                const activeDivisions = divisions.filter(division => division.statut === 'ACTIF');

                if (activeDivisions.length > 0) {
                    activeDivisions.forEach(division => {
                        const option = document.createElement('option');
                        option.value = division.id;
                        option.textContent = division.nom;
                        select.appendChild(option);
                    });
                } else {
                    // Ajouter une option par défaut
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "Aucune division active disponible";
                    option.disabled = true;
                    select.appendChild(option);
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des divisions:', error);
    }
}

async function loadTypesCollaborateurs() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/types-collaborateurs`);
        const data = await response.json();

        const selects = ['type-collaborateur-select', 'edit-type-collaborateur-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Sélectionner un type</option>';

                if (data.success && data.data) {
                    data.data.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.id;
                        option.textContent = type.nom;
                        select.appendChild(option);
                    });
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des types de collaborateurs:', error);
    }
}

async function loadPostes() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/postes`);
        const data = await response.json();

        const selects = ['poste-select', 'edit-poste-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Sélectionner un poste</option>';

                if (data.success && data.data) {
                    data.data.forEach(poste => {
                        const option = document.createElement('option');
                        option.value = poste.id;
                        option.textContent = poste.nom;
                        select.appendChild(option);
                    });
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des postes:', error);
    }
}



// Fonction pour charger les divisions d'une business unit
async function loadDivisionsForBusinessUnit() {
    const businessUnitId = document.getElementById('business-unit-select').value;
    const divisionSelect = document.getElementById('division-select');

    divisionSelect.innerHTML = '<option value="">Sélectionner une division</option>';

    if (!businessUnitId) return;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/divisions?business_unit_id=${businessUnitId}`);
        const data = await response.json();

        let divisions = [];
        if (data.success && data.data && data.data.divisions) {
            divisions = data.data.divisions;
        } else if (data.success && data.data && Array.isArray(data.data)) {
            // Gérer le cas où data.data est directement un array
            divisions = data.data;
        }

        // Filtrer seulement les divisions actives
        const activeDivisions = divisions.filter(division => division.statut === 'ACTIF');

        if (activeDivisions.length > 0) {
            activeDivisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division.id;
                option.textContent = division.nom;
                divisionSelect.appendChild(option);
            });
        } else {
            // Ajouter une option par défaut
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Aucune division active disponible";
            option.disabled = true;
            divisionSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des divisions:', error);
    }
}

// Fonction pour charger les divisions lors de l'édition
async function loadDivisionsForBusinessUnitEdit(businessUnitId = null) {
    const buId = businessUnitId || document.getElementById('edit-business-unit-select').value;
    const divisionSelect = document.getElementById('edit-division-select');

    divisionSelect.innerHTML = '<option value="">Sélectionner une division</option>';

    if (!buId) return;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/divisions?business_unit_id=${buId}`);
        const data = await response.json();

        let divisions = [];
        if (data.success && data.data && data.data.divisions) {
            divisions = data.data.divisions;
        } else if (data.success && data.data && Array.isArray(data.data)) {
            divisions = data.data;
        }

        // Filtrer seulement les divisions actives
        const activeDivisions = divisions.filter(division => division.statut === 'ACTIF');

        if (activeDivisions.length > 0) {
            activeDivisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division.id;
                option.textContent = division.nom;
                divisionSelect.appendChild(option);
            });
        } else {
            // Ajouter une option par défaut
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Aucune division active disponible";
            option.disabled = true;
            divisionSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Erreur lors du chargement des divisions (édition):', error);
    }
}

async function submitCollaborateur() {
    const form = document.getElementById('newCollaborateurForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Validation supplémentaire pour la division
    const divisionSelect = document.getElementById('division-select');
    const selectedDivisionId = divisionSelect.value;

    if (selectedDivisionId) {
        // Vérifier que la division sélectionnée existe bien dans les options
        const divisionOption = divisionSelect.querySelector(`option[value="${selectedDivisionId}"]`);
        if (!divisionOption || divisionOption.disabled) {
            showAlert('La division sélectionnée n\'est pas valide. Veuillez en sélectionner une autre.', 'danger');
            return;
        }
    }

    const formData = {
        nom: document.getElementById('nom-input').value,
        prenom: document.getElementById('prenom-input').value,
        email: document.getElementById('email-input').value,
        initiales: document.getElementById('initiales-input').value,
        telephone: document.getElementById('telephone-input').value,
        business_unit_id: document.getElementById('business-unit-select').value,
        division_id: selectedDivisionId || null,
        date_embauche: document.getElementById('date-embauche-input').value,
        statut: 'ACTIF', // Statut par défaut
        notes: document.getElementById('notes-input').value,
        // Champs RH pour l'historique automatique
        poste_actuel_id: document.getElementById('poste-select').value,
        grade_actuel_id: document.getElementById('grade-select').value,
        type_collaborateur_id: document.getElementById('type-collaborateur-select').value
    };

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            const newCollaborateurId = data.data.id;

            // Créer automatiquement les historiques RH supplémentaires si nécessaire
            await createRHHistory(newCollaborateurId);

            // Upload de la photo si elle a été sélectionnée
            if (window.tempPhotoForNewCollaborateur) {
                try {
                    await uploadPhotoForNewCollaborateur(newCollaborateurId, window.tempPhotoForNewCollaborateur);
                    delete window.tempPhotoForNewCollaborateur;
                } catch (photoError) {
                    console.error('Erreur upload photo:', photoError);
                    // Ne pas bloquer la création si l'upload de photo échoue
                }
            }

            showAlert('Collaborateur créé avec succès et historiques RH initialisés', 'success');
            bootstrap.Modal.getInstance(document.getElementById('newCollaborateurModal')).hide();
            loadCollaborateurs(currentPage);
        } else {
            let message = data.message || data.error || 'Erreur inconnue';

            // Cas spécifique: doublon d'email collaborateur
            if (data.error === 'EMAIL_DUPLICATE' ||
                (data.details && typeof data.details === 'string' && data.details.includes('collaborateurs_email_key'))) {
                message = 'Cet email est déjà utilisé par un autre collaborateur. Veuillez saisir un email unique.';
            }

            showAlert(`Erreur lors de la création: ${message}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        showAlert('Erreur lors de la soumission', 'danger');
    }
}

async function uploadPhotoForNewCollaborateur(collaborateurId, photoFile) {
    try {
        const formData = new FormData();
        formData.append('photo', photoFile);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/collaborateurs/${collaborateurId}/upload-photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('✅ Photo uploadée avec succès pour le nouveau collaborateur');
            } else {
                console.error('❌ Erreur upload photo:', result.error);
            }
        } else {
            console.error('❌ Erreur upload photo:', response.status);
        }
    } catch (error) {
        console.error('❌ Erreur upload photo:', error);
        throw error;
    }
}

async function createRHHistory(collaborateurId) {
    try {
        const typeCollaborateurId = document.getElementById('type-collaborateur-select').value;
        const posteId = document.getElementById('poste-select').value;
        const gradeId = document.getElementById('grade-select').value;
        const dateEffet = document.getElementById('date-embauche-input').value;

        console.log('🔧 Création des historiques RH pour collaborateur:', collaborateurId);
        console.log('📊 Données RH:', { typeCollaborateurId, posteId, gradeId, dateEffet });

        // Créer l'historique des grades
        if (gradeId) {
            const gradeHistory = {
                collaborateur_id: collaborateurId,
                grade_id: gradeId,
                date_effet: dateEffet,
                motif: 'Initialisation - Création du collaborateur'
            };

            await authenticatedFetch(`${API_BASE_URL}/evolution-grades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gradeHistory)
            });
            console.log('✅ Historique grade créé');
        }

        // Créer l'historique des postes
        if (posteId) {
            const posteHistory = {
                collaborateur_id: collaborateurId,
                poste_id: posteId,
                date_effet: dateEffet,
                motif: 'Initialisation - Création du collaborateur'
            };

            await authenticatedFetch(`${API_BASE_URL}/evolution-postes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(posteHistory)
            });
            console.log('✅ Historique poste créé');
        }

        // Créer l'historique organisationnel
        const businessUnitId = document.getElementById('business-unit-select').value;
        const divisionId = document.getElementById('division-select').value;

        if (businessUnitId) {
            const orgHistory = {
                collaborateur_id: collaborateurId,
                business_unit_id: businessUnitId,
                division_id: divisionId || null,
                date_effet: dateEffet,
                motif: 'Initialisation - Création du collaborateur'
            };

            await authenticatedFetch(`${API_BASE_URL}/evolution-organisations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orgHistory)
            });
            console.log('✅ Historique organisation créé');
        }

        console.log('🎉 Tous les historiques RH ont été créés avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la création des historiques RH:', error);
        // Ne pas bloquer la création du collaborateur si les historiques échouent
        showAlert('Collaborateur créé mais erreur lors de l\'initialisation des historiques RH', 'warning');
    }
}

function showLoading(show) {
    console.log('🔄 showLoading:', show);
    const loadingElement = document.getElementById('collaborateurs-loading');
    // Ne jamais forcer l'affichage des autres onglets: respecter Bootstrap
    const activePane = document.querySelector('#collaborateursTabsContent .tab-pane.show.active');
    const contentElement = document.getElementById('collaborateurs-content');

    console.log('📋 Loading element:', loadingElement);
    console.log('📋 Active pane:', activePane);

    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }

    // Ne masquer/afficher le contenu que si l'onglet Collaborateurs est l'onglet actif
    if (contentElement && activePane && activePane.id === 'collaborateurs-content') {
        contentElement.style.display = show ? 'none' : 'block';
    }

    console.log('✅ showLoading terminé');
}

function getInitials(nom, prenom) {
    return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
}

function getStatusLabel(status) {
    const labels = {
        'ACTIF': 'Actif',
        'INACTIF': 'Inactif',
        'CONGE': 'En congé',
        'DEPART': 'Départ'
    };
    return labels[status] || status;
}

function showAlert(message, type) {
    // Supprimer les alertes existantes du même type
    const existingAlerts = document.querySelectorAll(`.alert-${type}`);
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                max-width: 500px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;

    // Ajouter une icône selon le type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'danger':
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle me-2"></i>';
            break;
    }

    alertDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    ${icon}
                    <span class="flex-grow-1">${message}</span>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
                </div>
            `;

    document.body.appendChild(alertDiv);

    // Auto-suppression après 7 secondes pour les messages de succès, 10 secondes pour les erreurs
    const timeout = type === 'success' ? 7000 : 10000;
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, timeout);
}

function exportCollaborateurs() {
    showAlert('Export Excel en cours de développement', 'info');
}

// =====================================================
// FONCTIONS DE GESTION RH
// =====================================================

// Fonction pour rafraîchir toutes les données du modal RH
async function refreshRHModalData(collaborateurId) {
    console.log('🔄 Rafraîchissement des données du modal RH pour le collaborateur:', collaborateurId);

    try {
        // Rafraîchir les historiques avec délai pour éviter les conflits
        console.log('📊 Rafraîchissement des historiques...');
        await loadHistoriqueGrades(collaborateurId);
        await new Promise(resolve => setTimeout(resolve, 100)); // Petit délai

        await loadHistoriquePostes(collaborateurId);
        await new Promise(resolve => setTimeout(resolve, 100));

        await loadHistoriqueOrganisations(collaborateurId);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Rafraîchir les données de sélection
        console.log('📋 Rafraîchissement des données de sélection...');
        await loadBusinessUnitsForRH();
        await new Promise(resolve => setTimeout(resolve, 100));

        await loadDivisionsForBusinessUnitForRH();
        await new Promise(resolve => setTimeout(resolve, 100));

        await loadPostesForRH();
        await new Promise(resolve => setTimeout(resolve, 100));

        await loadPostesForType();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Rafraîchir le tableau principal
        console.log('📊 Rafraîchissement du tableau principal...');
        await loadCollaborateurs(currentPage);

        // Forcer le rafraîchissement visuel du tableau
        console.log('🔄 Rafraîchissement visuel du tableau...');
        await forceTableRefresh();

        // Forcer le rechargement des données du collaborateur depuis le serveur
        console.log('🔄 Rechargement des données du collaborateur depuis le serveur...');
        await reloadCollaborateurData(collaborateurId);

        // Forcer le rafraîchissement de l'affichage du collaborateur dans le modal
        console.log('🔄 Mise à jour de l\'affichage du collaborateur...');
        const collaborateur = collaborateurs.find(c => c.id === collaborateurId);
        if (collaborateur) {
            // Mettre à jour les informations affichées dans le modal
            updateCollaborateurDisplayInModal(collaborateur);
        }

        console.log('✅ Données du modal RH rafraîchies avec succès');

        // Afficher un message de confirmation du rafraîchissement
        showAlert('🔄 Données mises à jour avec succès !', 'success');

    } catch (error) {
        console.error('❌ Erreur lors du rafraîchissement des données RH:', error);
        showAlert('⚠️ Erreur lors du rafraîchissement des données. Veuillez recharger manuellement.', 'warning');

        // En cas d'erreur, proposer un rechargement complet de la page
        setTimeout(() => {
            if (confirm('Une erreur est survenue lors du rafraîchissement. Voulez-vous recharger la page entière ?')) {
                window.location.reload();
            }
        }, 2000);
    }
}

// Fonction pour forcer le rafraîchissement visuel du tableau
async function forceTableRefresh() {
    console.log('🔄 Forçage du rafraîchissement visuel du tableau...');

    try {
        // Ajouter un indicateur de chargement
        const tableContainer = document.querySelector('#collaborateurs-content');
        if (tableContainer) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'text-center py-2';
            loadingIndicator.innerHTML = '<small class="text-muted">🔄 Mise à jour des données...</small>';
            tableContainer.insertBefore(loadingIndicator, tableContainer.firstChild);

            // Supprimer l'indicateur après un court délai
            setTimeout(() => {
                if (loadingIndicator.parentNode) {
                    loadingIndicator.remove();
                }
            }, 1000);
        }

        // Forcer le rechargement des données depuis le serveur
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs?page=${currentPage}&limit=20`);
        const data = await response.json();

        if (data.success && data.data) {
            // Mettre à jour la variable globale
            collaborateurs = data.data;

            // Re-afficher le tableau
            displayCollaborateurs(data.data);

            console.log('✅ Tableau rafraîchi avec succès');
        } else {
            console.error('❌ Erreur lors du rafraîchissement du tableau:', data.error);
        }
    } catch (error) {
        console.error('❌ Erreur lors du rafraîchissement forcé du tableau:', error);
    }
}

// Fonction pour recharger les données du collaborateur depuis le serveur
async function reloadCollaborateurData(collaborateurId) {
    console.log('🔄 Rechargement des données du collaborateur depuis le serveur:', collaborateurId);

    try {
        // Recharger les données du collaborateur depuis l'API
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurId}`);
        const data = await response.json();

        if (data.success && data.data) {
            // Mettre à jour la variable globale collaborateurs
            const index = collaborateurs.findIndex(c => c.id === collaborateurId);
            if (index !== -1) {
                collaborateurs[index] = data.data;
                console.log('✅ Données du collaborateur mises à jour dans la variable globale');
            }

            // Mettre à jour l'affichage dans le tableau principal
            updateCollaborateurInTable(data.data);

            return data.data;
        } else {
            console.error('❌ Erreur lors du rechargement des données du collaborateur:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur lors du rechargement des données du collaborateur:', error);
        return null;
    }
}

// Fonction pour mettre à jour un collaborateur dans le tableau principal
function updateCollaborateurInTable(collaborateur) {
    console.log('🔄 Mise à jour du collaborateur dans le tableau:', collaborateur);

    // Trouver la ligne du collaborateur dans le tableau
    const rows = document.querySelectorAll('#collaborateurs-table tr');
    rows.forEach(row => {
        const button = row.querySelector(`button[onclick*="${collaborateur.id}"]`);
        if (button) {
            // Mettre à jour les cellules de la ligne
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                // Mettre à jour le nom/prénom
                cells[0].textContent = `${collaborateur.prenom} ${collaborateur.nom}`;

                // Mettre à jour l'email
                cells[1].textContent = collaborateur.email || 'N/A';

                // Mettre à jour le statut
                cells[2].textContent = collaborateur.statut || 'N/A';

                // Mettre à jour la date d'embauche
                cells[3].textContent = collaborateur.date_embauche ?
                    new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR') : 'N/A';
            }

        }
    });
}

// Fonction pour mettre à jour l'affichage du collaborateur dans le modal
function updateCollaborateurDisplayInModal(collaborateur) {


    // Mettre à jour le nom du collaborateur dans le titre du modal
    const modalTitle = document.querySelector('#rhModal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Gestion RH - ${collaborateur.prenom} ${collaborateur.nom}`;
    }

    // Mettre à jour les informations de base si elles sont affichées
    const collaborateurInfo = document.querySelector('#rhModal .collaborateur-info');
    if (collaborateurInfo) {
        collaborateurInfo.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <strong>Nom:</strong> ${collaborateur.nom}<br>
                            <strong>Prénom:</strong> ${collaborateur.prenom}<br>
                            <strong>Email:</strong> ${collaborateur.email || 'N/A'}
                        </div>
                        <div class="col-md-6">
                            <strong>Statut:</strong> ${collaborateur.statut || 'N/A'}<br>
                            <strong>Date d'embauche:</strong> ${collaborateur.date_embauche ? new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}
                        </div>
                    </div>
                `;
    }
}

function gestionRH(collaborateurId) {
    console.log('🔧 Début gestionRH pour collaborateurId:', collaborateurId);
    collaborateurRHId = collaborateurId;
    const collaborateur = collaborateurs.find(c => c.id === collaborateurId);

    console.log('📊 Collaborateur trouvé:', collaborateur);

    if (!collaborateur) {
        console.log('❌ Collaborateur non trouvé dans la liste');
        showAlert('Collaborateur non trouvé', 'danger');
        return;
    }

    console.log('✅ Collaborateur trouvé, mise à jour des informations...');

    // Mettre à jour le titre du modal
    const nomElement = document.getElementById('rh-collaborateur-nom');
    const nomCompletElement = document.getElementById('rh-collaborateur-nom-complet');
    const emailElement = document.getElementById('rh-collaborateur-email');
    const buElement = document.getElementById('rh-collaborateur-business-unit');
    const divisionElement = document.getElementById('rh-collaborateur-division');
    const dateEmbElement = document.getElementById('rh-collaborateur-date-embauche');
    const statutElement = document.getElementById('rh-collaborateur-statut');
    const gradeElement = document.getElementById('rh-collaborateur-grade-actuel');
    const posteElement = document.getElementById('rh-collaborateur-poste-actuel');

    console.log('🔍 Éléments DOM trouvés:', {
        nom: !!nomElement,
        nomComplet: !!nomCompletElement,
        email: !!emailElement,
        bu: !!buElement,
        division: !!divisionElement,
        dateEmb: !!dateEmbElement,
        statut: !!statutElement,
        grade: !!gradeElement,
        poste: !!posteElement
    });

    if (nomElement) nomElement.textContent = `${collaborateur.nom} ${collaborateur.prenom}`;
    if (nomCompletElement) nomCompletElement.textContent = `${collaborateur.nom} ${collaborateur.prenom}`;
    if (emailElement) emailElement.textContent = collaborateur.email || 'Non renseigné';
    if (buElement) buElement.textContent = collaborateur.business_unit_nom || 'Non assigné';
    if (divisionElement) divisionElement.textContent = collaborateur.division_nom || 'Non assigné';
    if (dateEmbElement) dateEmbElement.textContent = collaborateur.date_embauche ? new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR') : 'Non renseigné';
    if (statutElement) statutElement.textContent = getStatusLabel(collaborateur.statut);
    if (gradeElement) gradeElement.textContent = collaborateur.grade_nom || 'Non assigné';
    if (posteElement) posteElement.textContent = collaborateur.poste_nom || 'Non assigné';

    console.log('📝 Informations mises à jour:', {
        nom: `${collaborateur.nom} ${collaborateur.prenom}`,
        email: collaborateur.email || 'Non renseigné',
        bu: collaborateur.business_unit_nom || 'Non assigné',
        division: collaborateur.division_nom || 'Non assigné',
        grade: collaborateur.grade_nom || 'Non assigné',
        poste: collaborateur.poste_nom || 'Non assigné'
    });

    // Afficher le modal d'abord
    const modal = new bootstrap.Modal(document.getElementById('gestionRHModal'));
    modal.show();

    // Attendre que le modal soit complètement affiché avant de charger les données
    setTimeout(async () => {
        console.log('🔄 Chargement des données après affichage du modal...');
        // Charger les données pour les selects
        await loadGradesForRH();
        await loadTypesCollaborateursForRH();
        await loadPostesForRH();
        await loadBusinessUnitsForRH();
        await loadDivisionsForBusinessUnitForRH();

        // Charger l'historique
        loadHistoriqueGrades(collaborateurId);
        loadHistoriquePostes(collaborateurId);
        loadHistoriqueOrganisations(collaborateurId);

        // Pré-remplir les champs avec les informations actuelles après un délai supplémentaire
        setTimeout(() => {
            preRemplirFormulaires();
        }, 1500); // Délai plus long pour s'assurer que tous les éléments sont chargés
    }, 500); // Délai pour laisser le modal s'afficher
}

async function loadGradesForRH() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/grades`);
        const data = await response.json();

        const select = document.getElementById('rh-grade-select');
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un grade</option>';

            if (data.success && data.data) {
                data.data.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade.id;
                    option.textContent = `${grade.nom} (${grade.code})`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des grades:', error);
    }
}

async function loadTypesCollaborateursForRH() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/types-collaborateurs`);
        const data = await response.json();

        const select = document.getElementById('rh-type-collaborateur-select');
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un type</option>';

            if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                data.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.nom;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des types collaborateurs:', error);
    }
}

async function loadPostesForRH() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/postes`);
        const data = await response.json();

        const select = document.getElementById('rh-poste-select');
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un poste</option>';

            if (data.success && data.data) {
                data.data.forEach(poste => {
                    const option = document.createElement('option');
                    option.value = poste.id;
                    option.textContent = poste.nom;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des postes:', error);
    }
}

async function loadBusinessUnitsForRH() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/business-units?limit=100`);
        const data = await response.json();

        const select = document.getElementById('rh-business-unit-select');
        if (select) {
            select.innerHTML = '<option value="">Sélectionner une Business Unit</option>';

            let businessUnits = [];
            if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                businessUnits = data.data;
            } else if (data.success && data.data && data.data.businessUnits && data.data.businessUnits.length > 0) {
                // Gérer le format alternatif
                businessUnits = data.data.businessUnits;
            }

            // Filtrer seulement les BU actives
            const activeBusinessUnits = businessUnits.filter(bu => bu.statut === 'ACTIF');

            if (activeBusinessUnits.length > 0) {
                activeBusinessUnits.forEach(bu => {
                    const option = document.createElement('option');
                    option.value = bu.id;
                    option.textContent = bu.nom;
                    select.appendChild(option);
                });
            } else {
                // Ajouter une option par défaut
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "Aucune business unit active disponible";
                option.disabled = true;
                select.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des business units:', error);
    }
}

async function loadDivisionsForBusinessUnitForRH() {
    const businessUnitSelect = document.getElementById('rh-business-unit-select');
    const divisionSelect = document.getElementById('rh-division-select');

    if (!businessUnitSelect || !divisionSelect) {
        console.log('⚠️ Éléments du DOM non trouvés pour loadDivisionsForBusinessUnitForRH');
        return;
    }

    const businessUnitId = businessUnitSelect.value;

    divisionSelect.innerHTML = '<option value="">Sélectionner une division</option>';

    if (!businessUnitId) return;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/divisions?business_unit_id=${businessUnitId}`);
        const data = await response.json();

        let divisions = [];
        if (data.success && data.data && data.data.divisions) {
            divisions = data.data.divisions;
        } else if (data.success && data.data && Array.isArray(data.data)) {
            // Gérer le cas où data.data est directement un array
            divisions = data.data;
        }

        // Filtrer seulement les divisions actives
        const activeDivisions = divisions.filter(division => division.statut === 'ACTIF');

        if (activeDivisions.length > 0) {
            activeDivisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division.id;
                option.textContent = division.nom;
                divisionSelect.appendChild(option);
            });
        } else {
            // Ajouter une option par défaut
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Aucune division active disponible";
            option.disabled = true;
            divisionSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des divisions:', error);
    }
}

async function loadPostesForType() {
    const typeId = document.getElementById('type-collaborateur-select').value;
    const posteSelect = document.getElementById('poste-select');

    posteSelect.innerHTML = '<option value="">Sélectionner un poste</option>';

    if (!typeId) return;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/postes?type_collaborateur_id=${typeId}`);
        const data = await response.json();

        if (data.success && data.data) {
            data.data.forEach(poste => {
                const option = document.createElement('option');
                option.value = poste.id;
                option.textContent = poste.nom;
                posteSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des postes pour le type:', error);
    }
}

async function ajouterEvolutionGrade() {
    console.log('🔧 Début ajouterEvolutionGrade');
    const gradeId = document.getElementById('rh-grade-select').value;
    const dateEffet = document.getElementById('rh-grade-date-effet').value;
    const motif = document.getElementById('rh-grade-motif').value;
    const salaire = document.getElementById('rh-grade-salaire').value;

    console.log('📊 Données récupérées:', { gradeId, dateEffet, motif, salaire, collaborateurRHId });

    if (!gradeId || !dateEffet) {
        console.log('❌ Validation échouée: champs manquants');
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        console.log('🌐 Envoi de la requête POST vers /api/collaborateurs/evolution-grades');
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-grades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                collaborateur_id: collaborateurRHId,
                grade_id: gradeId,
                date_debut: dateEffet,
                motif: motif,
                taux_horaire_personnalise: salaire || null
            })
        });

        console.log('📥 Réponse reçue:', response.status, response.statusText);
        const data = await response.json();
        console.log('📊 Données de réponse:', data);

        if (data.success) {
            console.log('✅ Succès: évolution de grade ajoutée');
            showAlert('✅ Évolution de grade ajoutée avec succès ! Le collaborateur a été mis à jour.', 'success');

            // Rafraîchir le tableau principal d'abord
            await loadCollaborateurs(currentPage);

            // Fermer le modal RH après le rafraîchissement
            const rhModal = bootstrap.Modal.getInstance(document.getElementById('gestionRHModal'));
            if (rhModal) {
                rhModal.hide();
            }

            // Réinitialiser le formulaire
            document.getElementById('rh-grade-select').value = '';
            document.getElementById('rh-grade-date-effet').value = '';
            document.getElementById('rh-grade-motif').value = '';
            document.getElementById('rh-grade-salaire').value = '';
        } else {
            console.log('❌ Erreur API:', data.error);
            showAlert(`❌ Erreur lors de l'ajout de l'évolution de grade: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'évolution de grade:', error);
        showAlert('❌ Erreur lors de l\'ajout de l\'évolution de grade. Veuillez réessayer.', 'danger');
    }
}

async function ajouterEvolutionPoste() {
    console.log('🔧 Début ajouterEvolutionPoste');
    const posteId = document.getElementById('rh-poste-select').value;
    const dateEffet = document.getElementById('rh-poste-date-effet').value;
    const motif = document.getElementById('rh-poste-motif').value;

    console.log('📊 Données récupérées:', { posteId, dateEffet, motif, collaborateurRHId });

    if (!posteId || !dateEffet) {
        console.log('❌ Validation échouée: champs manquants');
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        console.log('🌐 Envoi de la requête POST vers /api/collaborateurs/evolution-postes');
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-postes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                collaborateur_id: collaborateurRHId,
                poste_id: posteId,
                date_debut: dateEffet,
                motif: motif
            })
        });

        console.log('📥 Réponse reçue:', response.status, response.statusText);
        const data = await response.json();
        console.log('📊 Données de réponse:', data);

        if (data.success) {
            console.log('✅ Succès: évolution de poste ajoutée');
            showAlert('✅ Évolution de poste ajoutée avec succès ! Le collaborateur a été mis à jour.', 'success');

            // Rafraîchir le tableau principal d'abord
            await loadCollaborateurs(currentPage);

            // Fermer le modal RH après le rafraîchissement
            const rhModal = bootstrap.Modal.getInstance(document.getElementById('gestionRHModal'));
            if (rhModal) {
                rhModal.hide();
            }

            // Réinitialiser le formulaire
            document.getElementById('rh-poste-select').value = '';
            document.getElementById('rh-poste-date-effet').value = '';
            document.getElementById('rh-poste-motif').value = '';
        } else {
            console.log('❌ Erreur API:', data.error);
            showAlert(`❌ Erreur lors de l'ajout de l'évolution de poste: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'évolution de poste:', error);
        showAlert('❌ Erreur lors de l\'ajout de l\'évolution de poste. Veuillez réessayer.', 'danger');
    }
}

async function ajouterEvolutionOrganisation() {
    const buId = document.getElementById('rh-business-unit-select').value;
    const divisionId = document.getElementById('rh-division-select').value;
    const dateEffet = document.getElementById('rh-organisation-date-effet').value;
    const motif = document.getElementById('rh-organisation-motif').value;

    if (!buId || !divisionId || !dateEffet) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-organisations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                collaborateur_id: collaborateurRHId,
                business_unit_id: buId,
                division_id: divisionId,
                date_debut: dateEffet,
                motif: motif
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Évolution organisationnelle ajoutée avec succès ! Le collaborateur a été mis à jour.', 'success');

            // Rafraîchir le tableau principal d'abord
            await loadCollaborateurs(currentPage);

            // Fermer le modal RH après le rafraîchissement
            const rhModal = bootstrap.Modal.getInstance(document.getElementById('gestionRHModal'));
            if (rhModal) {
                rhModal.hide();
            }

            // Réinitialiser le formulaire
            document.getElementById('rh-business-unit-select').value = '';
            document.getElementById('rh-division-select').value = '';
            document.getElementById('rh-organisation-date-effet').value = '';
            document.getElementById('rh-organisation-motif').value = '';
        } else {
            showAlert(`❌ Erreur lors de l'ajout de l'évolution organisationnelle: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'évolution organisationnelle:', error);
        showAlert('❌ Erreur lors de l\'ajout de l\'évolution organisationnelle. Veuillez réessayer.', 'danger');
    }
}

async function loadHistoriqueGrades(collaborateurId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-grades/collaborateur/${collaborateurId}`);
        const data = await response.json();

        const tbody = document.getElementById('historique-grades-body');
        if (tbody) {
            if (data.success && data.data && data.data.length > 0) {
                tbody.innerHTML = data.data.map(evolution => `
                            <tr>
                                <td>${evolution.grade_nom || 'N/A'}</td>
                                <td>${new Date(evolution.date_debut).toLocaleDateString('fr-FR')}</td>
                                <td>${evolution.date_fin ? new Date(evolution.date_fin).toLocaleDateString('fr-FR') : '-'}</td>
                                <td>${evolution.taux_horaire_personnalise !== null ? formatCurrency(evolution.taux_horaire_personnalise, 'XAF') : 'N/A'}</td>
                                <td>${evolution.motif || '-'}</td>
                            </tr>
                        `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun historique</td></tr>';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des grades:', error);
    }
}

async function loadHistoriquePostes(collaborateurId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-postes/collaborateur/${collaborateurId}`);
        const data = await response.json();

        const tbody = document.getElementById('historique-postes-body');
        if (tbody) {
            if (data.success && data.data && data.data.length > 0) {
                tbody.innerHTML = data.data.map(evolution => `
                            <tr>
                                <td>${evolution.poste_nom || 'N/A'}</td>
                                <td>${new Date(evolution.date_debut).toLocaleDateString('fr-FR')}</td>
                                <td>${evolution.date_fin ? new Date(evolution.date_fin).toLocaleDateString('fr-FR') : '-'}</td>
                                <td>${evolution.motif || '-'}</td>
                            </tr>
                        `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun historique</td></tr>';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des postes:', error);
    }
}

async function loadHistoriqueOrganisations(collaborateurId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/evolution-organisations/collaborateur/${collaborateurId}`);
        const data = await response.json();

        const tbody = document.getElementById('historique-organisations-body');
        if (tbody) {
            if (data.success && data.data && data.data.length > 0) {
                tbody.innerHTML = data.data.map(evolution => `
                            <tr>
                                <td>${evolution.business_unit_nom || 'N/A'}</td>
                                <td>${evolution.division_nom || 'N/A'}</td>
                                <td>${new Date(evolution.date_debut).toLocaleDateString('fr-FR')}</td>
                                <td>${evolution.date_fin ? new Date(evolution.date_fin).toLocaleDateString('fr-FR') : '-'}</td>
                                <td>${evolution.motif || '-'}</td>
                            </tr>
                        `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun historique</td></tr>';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des organisations:', error);
    }
}

function preRemplirFormulaires() {
    const collaborateur = collaborateurs.find(c => c.id === collaborateurRHId);

    if (!collaborateur) {
        showAlert('Collaborateur non trouvé', 'danger');
        return;
    }

    console.log('🔧 Début preRemplirFormulaires pour:', collaborateur.nom, collaborateur.prenom);

    // Vérifier que tous les éléments du DOM existent
    const elements = {
        'rh-grade-select': document.getElementById('rh-grade-select'),
        'rh-grade-date-effet': document.getElementById('rh-grade-date-effet'),
        'rh-grade-salaire': document.getElementById('rh-grade-salaire'),
        'rh-grade-motif': document.getElementById('rh-grade-motif'),
        'rh-poste-select': document.getElementById('rh-poste-select'),
        'rh-poste-date-effet': document.getElementById('rh-poste-date-effet'),
        'rh-poste-motif': document.getElementById('rh-poste-motif'),
        'rh-type-collaborateur-select': document.getElementById('rh-type-collaborateur-select'),
        'rh-type-collaborateur-date-effet': document.getElementById('rh-type-collaborateur-date-effet'),
        'rh-type-collaborateur-motif': document.getElementById('rh-type-collaborateur-motif'),
        'rh-business-unit-select': document.getElementById('rh-business-unit-select'),
        'rh-division-select': document.getElementById('rh-division-select'),
        'rh-organisation-date-effet': document.getElementById('rh-organisation-date-effet'),
        'rh-organisation-motif': document.getElementById('rh-organisation-motif')
    };

    // Vérifier si tous les éléments existent
    const missingElements = Object.entries(elements)
        .filter(([name, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.log('⚠️ Éléments manquants:', missingElements);
        console.log('🔄 Réessai dans 500ms...');
        setTimeout(() => {
            preRemplirFormulaires();
        }, 500);
        return;
    }

    console.log('✅ Tous les éléments trouvés, pré-remplissage en cours...');

    // Pré-remplir les champs de grade
    elements['rh-grade-select'].value = collaborateur.grade_actuel_id || '';
    elements['rh-grade-date-effet'].value = new Date().toISOString().split('T')[0]; // Date d'aujourd'hui
    elements['rh-grade-salaire'].value = ''; // Réinitialiser le salaire personnalisé
    elements['rh-grade-motif'].value = '';

    // Pré-remplir les champs de poste
    elements['rh-poste-select'].value = collaborateur.poste_actuel_id || '';
    elements['rh-poste-date-effet'].value = new Date().toISOString().split('T')[0]; // Date d'aujourd'hui
    elements['rh-poste-motif'].value = '';

    // Pré-remplir le champ type de collaborateur
    elements['rh-type-collaborateur-select'].value = collaborateur.type_collaborateur_id || '';
    elements['rh-type-collaborateur-date-effet'].value = new Date().toISOString().split('T')[0]; // Date d'aujourd'hui
    elements['rh-type-collaborateur-motif'].value = '';
    console.log('🔧 Type de collaborateur pré-rempli:', {
        collaborateurId: collaborateur.id,
        typeCollaborateurId: collaborateur.type_collaborateur_id,
        elementValue: elements['rh-type-collaborateur-select'].value
    });

    // Pré-remplir les champs organisationnels
    elements['rh-business-unit-select'].value = collaborateur.business_unit_id || '';

    // Charger les divisions pour la business unit actuelle
    setTimeout(() => {
        loadDivisionsForBusinessUnitForRH();
        setTimeout(() => {
            if (elements['rh-division-select']) {
                elements['rh-division-select'].value = collaborateur.division_id || '';
                console.log('✅ Division pré-remplie:', collaborateur.division_id);
            }
        }, 200);
    }, 100);

    elements['rh-organisation-date-effet'].value = new Date().toISOString().split('T')[0]; // Date d'aujourd'hui
    elements['rh-organisation-motif'].value = '';

    console.log('✅ Pré-remplissage terminé avec succès');
    showAlert('Formulaires pré-remplis avec les informations actuelles', 'success');
}

// =====================================================
// FONCTIONS D'ÉDITION ET SUPPRESSION
// =====================================================

async function editCollaborateur(id) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${id}`);
        const data = await response.json();

        if (data.success) {
            const collaborateur = data.data;

            // Remplir seulement les champs modifiables
            document.getElementById('edit-id-input').value = collaborateur.id;
            document.getElementById('edit-nom-input').value = collaborateur.nom;
            document.getElementById('edit-prenom-input').value = collaborateur.prenom;
            document.getElementById('edit-email-input').value = collaborateur.email || '';
            document.getElementById('edit-initiales-input').value = collaborateur.initiales || '';
            document.getElementById('edit-telephone-input').value = collaborateur.telephone || '';
            document.getElementById('edit-date-embauche-input').value = collaborateur.date_embauche ? collaborateur.date_embauche.split('T')[0] : '';
            document.getElementById('edit-notes-input').value = collaborateur.notes || '';

            // Afficher la photo dans le modal (avec seulement le bouton "Changer photo")
            const photoContainer = document.getElementById('edit-photo-container');
            const uploadBtn = document.getElementById('edit-upload-photo-btn');

            if (photoContainer) {
                photoContainer.innerHTML = '';

                // Créer un élément photo simple avec seulement le bouton "Changer photo"
                const photoElement = document.createElement('div');
                photoElement.className = 'collaborateur-photo-edit';

                if (collaborateur.photo_url) {
                    photoElement.innerHTML = `
                                <div class="photo-display mb-3">
                                    <img src="${collaborateur.photo_url}" 
                                         alt="Photo de ${collaborateur.nom} ${collaborateur.prenom}" 
                                         class="img-fluid rounded" 
                                         style="max-width: 150px; max-height: 150px; object-fit: cover;">
                                </div>
                            `;
                } else {
                    // Afficher les initiales si pas de photo
                    const initials = getInitials(collaborateur.nom, collaborateur.prenom);
                    photoElement.innerHTML = `
                                <div class="photo-display mb-3">
                                    <div class="collaborateur-avatar-edit d-flex align-items-center justify-content-center">
                                        <span class="initials-edit">${initials}</span>
                                    </div>
                                </div>
                            `;
                }

                photoContainer.appendChild(photoElement);

                // Configurer le bouton "Changer photo"
                if (uploadBtn) {
                    uploadBtn.dataset.collaborateurId = collaborateur.id;
                }
            }

            new bootstrap.Modal(document.getElementById('editCollaborateurModal')).show();
        } else {
            showAlert('Erreur lors du chargement du collaborateur', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

async function updateCollaborateur() {
    const form = document.getElementById('editCollaborateurForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('edit-id-input').value;
    const formData = {
        nom: document.getElementById('edit-nom-input').value,
        prenom: document.getElementById('edit-prenom-input').value,
        email: document.getElementById('edit-email-input').value,
        initiales: document.getElementById('edit-initiales-input').value,
        telephone: document.getElementById('edit-telephone-input').value,
        date_embauche: document.getElementById('edit-date-embauche-input').value,
        notes: document.getElementById('edit-notes-input').value
    };

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Collaborateur mis à jour avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editCollaborateurModal')).hide();
            loadCollaborateurs(currentPage);
        } else {
            showAlert(`Erreur lors de la mise à jour: ${data.message || data.error || 'Erreur inconnue'}`, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showAlert('Erreur lors de la mise à jour', 'danger');
    }
}

function ensureDeleteModalFields() {
    const modalEl = document.getElementById('deleteConfirmModal');
    if (!modalEl) return;

    const modalBody = modalEl.querySelector('.modal-body');
    if (!modalBody) return;

    if (modalBody.querySelector('#depart-collab-summary')) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
                <div id="depart-collab-summary" class="mb-3 p-2 rounded bg-light">
                    <div class="fw-bold" id="depart-collab-name"></div>
                    <div class="small text-muted" id="depart-collab-role"></div>
                </div>
                <div class="mb-3">
                    <label for="depart-motif-select" class="form-label">Motif du départ</label>
                    <select id="depart-motif-select" class="form-select" required>
                        <option value="FIN_CONTRAT">Fin de contrat</option>
                        <option value="DEMISSION">Démission</option>
                        <option value="RUPTURE_PERIODE_ESSAI">Rupture de période d'essai</option>
                        <option value="LICENCIEMENT_FAUTE">Licenciement pour faute</option>
                        <option value="LICENCIEMENT_ECO">Licenciement économique / réorganisation</option>
                        <option value="FIN_MISSION">Fin de mission (consultant)</option>
                        <option value="RETRAITE">Départ à la retraite</option>
                        <option value="DECES">Décès</option>
                        <option value="AUTRE">Autre (préciser dans les remarques)</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="depart-date-effet" class="form-label">Date d'effet</label>
                    <input type="date" id="depart-date-effet" class="form-control" required />
                </div>
                <div class="mb-3">
                    <label for="depart-remarques" class="form-label">Détails / remarques</label>
                    <textarea id="depart-remarques" class="form-control" rows="3" placeholder="Préciser les conditions du départ si nécessaire..."></textarea>
                </div>
            `;
    while (wrapper.firstChild) {
        modalBody.appendChild(wrapper.firstChild);
    }
}

function deleteCollaborateur(id) {
    collaborateurToDelete = id;
    collaborateurDetailsForDelete = collaborateurs.find(c => c.id === id) || null;
    ensureDeleteModalFields();

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl && collaborateurDetailsForDelete) {
        const nameEl = modalEl.querySelector('#depart-collab-name');
        const roleEl = modalEl.querySelector('#depart-collab-role');
        const dateEl = modalEl.querySelector('#depart-date-effet');
        const motifSelect = modalEl.querySelector('#depart-motif-select');
        const remarquesEl = modalEl.querySelector('#depart-remarques');

        if (nameEl) {
            nameEl.textContent = `${collaborateurDetailsForDelete.prenom || ''} ${collaborateurDetailsForDelete.nom || ''}`.trim();
        }
        if (roleEl) {
            const bu = collaborateurDetailsForDelete.business_unit_nom || '-';
            const grade = collaborateurDetailsForDelete.grade_nom || '-';
            const poste = collaborateurDetailsForDelete.poste_nom || '-';
            roleEl.textContent = `BU: ${bu} | Poste: ${poste} | Grade: ${grade}`;
        }
        const today = new Date().toISOString().slice(0, 10);
        if (dateEl) dateEl.value = today;
        if (motifSelect && !motifSelect.value) motifSelect.value = 'FIN_CONTRAT';
        if (remarquesEl) remarquesEl.value = '';
    }

    new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
}

// Charger dynamiquement les rôles depuis l'API et remplir les checkboxes du modal Générer un compte
async function loadGeneratedRoles() {
    try {
        console.log('🔄 Chargement des rôles pour le modal "Générer un compte utilisateur"...');
        const rolesContainer = document.getElementById('generatedRolesCheckboxes');
        if (!rolesContainer) {
            console.warn('⚠️ Container generatedRolesCheckboxes non trouvé');
            return;
        }

        // Indicateur de chargement
        rolesContainer.innerHTML = '<div class="col-12"><p class="text-muted">Chargement des rôles...</p></div>';

        const response = await authenticatedFetch(`${API_BASE_URL}/users/roles`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        console.log('📡 Réponse API rôles modal:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('📋 Réponse API complète:', responseData);

        // Gérer les deux formats de réponse possibles
        let roles;
        if (Array.isArray(responseData)) {
            // Format direct: [role1, role2, ...]
            roles = responseData;
        } else if (responseData.success && responseData.data) {
            // Format avec success: {success: true, data: [...]}
            roles = responseData.data;
        } else {
            throw new Error('Format de réponse inattendu');
        }

        console.log('📋 Rôles extraits pour modal:', roles);

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer si l'utilisateur n'est pas SUPER_ADMIN
        if (!isCurrentUserSuperAdmin()) {
            roles = roles.filter(r => r.name !== 'SUPER_ADMIN');
            console.log('🔒 SUPER_ADMIN filtré - non visible pour cet utilisateur');
        }

        rolesContainer.innerHTML = '';

        if (roles && roles.length > 0) {
            roles.forEach(role => {
                const colDiv = document.createElement('div');
                colDiv.className = 'col-md-6 mb-2';

                colDiv.innerHTML = `
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="${role.id}" id="generatedRole_${role.id}">
                                <label class="form-check-label" for="generatedRole_${role.id}">
                                    <strong>${role.name}</strong>
                                    ${role.description ? `<br><small class="text-muted">${role.description}</small>` : ''}
                                </label>
                            </div>
                        `;

                rolesContainer.appendChild(colDiv);
            });
            console.log(`✅ ${roles.length} rôles chargés dans le modal`);
        } else {
            console.warn('⚠️ Aucun rôle trouvé');
            rolesContainer.innerHTML = '<div class="col-12"><p class="text-muted">Aucun rôle disponible</p></div>';
        }

    } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        const rolesContainer = document.getElementById('generatedRolesCheckboxes');
        if (rolesContainer) {
            rolesContainer.innerHTML = '<div class="col-12"><p class="text-danger">Erreur lors du chargement des rôles</p></div>';
        }
        showAlert('Erreur lors du chargement des rôles', 'danger');
    }
}

// Charger dynamiquement les rôles pour le modal "Gérer le Compte Utilisateur"
async function loadUserRolesForEdit(userId) {
    try {
        console.log('🔄 Chargement des rôles pour l\'utilisateur:', userId);

        const container = document.getElementById('editUserRolesContainer');
        if (!container) {
            console.warn('⚠️ Container editUserRolesContainer non trouvé');
            return;
        }

        // Charger tous les rôles disponibles
        const allRolesResponse = await authenticatedFetch(`${API_BASE_URL}/users/roles`);
        if (!allRolesResponse.ok) {
            throw new Error('Erreur lors du chargement des rôles');
        }
        const allRolesData = await allRolesResponse.json();
        // Gérer les deux formats de réponse possibles
        let allRoles = [];
        if (Array.isArray(allRolesData)) {
            allRoles = allRolesData;
        } else if (allRolesData.success && allRolesData.data) {
            allRoles = allRolesData.data;
        } else if (allRolesData.data) {
            allRoles = allRolesData.data;
        }
        console.log('📋 Tous les rôles:', allRoles);

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer si l'utilisateur n'est pas SUPER_ADMIN
        if (!isCurrentUserSuperAdmin()) {
            allRoles = allRoles.filter(r => r.name !== 'SUPER_ADMIN');
            console.log('🔒 SUPER_ADMIN filtré - non visible pour cet utilisateur');
        }

        // Charger les rôles de l'utilisateur
        const userRolesResponse = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/roles`);
        let userRoles = [];
        if (userRolesResponse.ok) {
            const userRolesData = await userRolesResponse.json();
            userRoles = userRolesData.data || userRolesData || [];
        }
        console.log('📊 Rôles de l\'utilisateur:', userRoles);

        // Créer les checkboxes avec couleurs
        const roleColors = {
            'SUPER_ADMIN': 'danger',
            'ADMIN': 'primary',
            'ADMIN_IT': 'info',
            'ASSOCIE': 'warning',
            'DIRECTEUR': 'success',
            'MANAGER': 'secondary',
            'SUPERVISEUR': 'dark',
            'CONSULTANT': 'light',
            'COLLABORATEUR': 'light',
            'USER': 'light'
        };

        // Générer le HTML des checkboxes (design simple)
        const rolesHTML = allRoles.map(role => {
            const isChecked = userRoles.some(ur => ur.id === role.id || ur === role.id);
            const colorClass = roleColors[role.name] || 'secondary';
            const textColorClass = ['light', 'warning'].includes(colorClass) ? 'text-dark' : 'text-white';

            return `
                        <div class="col-12">
                            <div class="form-check d-flex align-items-center py-1 px-2 role-check-item ${isChecked ? 'role-checked' : ''}" 
                                 style="border-left: 3px solid transparent; transition: all 0.2s;">
                                <input class="form-check-input me-2 mt-0" 
                                       type="checkbox" 
                                       id="editRole_${role.id}" 
                                       name="userRoles" 
                                       value="${role.id}"
                                       ${isChecked ? 'checked' : ''}
                                       style="cursor: pointer;">
                                <label class="form-check-label d-flex align-items-center w-100" 
                                       for="editRole_${role.id}" 
                                       style="cursor: pointer; margin-bottom: 0;">
                                    <span class="badge bg-${colorClass} ${textColorClass} me-2" style="min-width: 120px; font-size: 0.75rem;">${role.name}</span>
                                    <small class="text-muted" style="font-size: 0.8rem; line-height: 1.2;">${role.description || 'Aucune description'}</small>
                                </label>
                            </div>
                        </div>
                    `;
        }).join('');

        container.innerHTML = rolesHTML;
        console.log('✅ Rôles chargés et affichés');

        // Ajouter les événements pour l'effet visuel au survol et à la sélection
        const roleCheckItems = container.querySelectorAll('.role-check-item');
        roleCheckItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');

            // Effet au survol
            item.addEventListener('mouseenter', function () {
                if (!checkbox.checked) {
                    this.style.backgroundColor = '#e9ecef';
                    this.style.borderLeftColor = '#6c757d';
                }
            });

            item.addEventListener('mouseleave', function () {
                if (!checkbox.checked) {
                    this.style.backgroundColor = 'transparent';
                    this.style.borderLeftColor = 'transparent';
                }
            });

            // Effet à la sélection
            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    item.classList.add('role-checked');
                    item.style.backgroundColor = '#e7f3ff';
                    item.style.borderLeftColor = '#0d6efd';
                } else {
                    item.classList.remove('role-checked');
                    item.style.backgroundColor = 'transparent';
                    item.style.borderLeftColor = 'transparent';
                }
            });

            // Initialiser l'apparence pour les rôles déjà cochés
            if (checkbox.checked) {
                item.style.backgroundColor = '#e7f3ff';
                item.style.borderLeftColor = '#0d6efd';
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        const container = document.getElementById('editUserRolesContainer');
        if (container) {
            container.innerHTML = `
                        <div class="col-12">
                            <div class="alert alert-danger" role="alert">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Erreur lors du chargement des rôles. Veuillez réessayer.
                            </div>
                        </div>
                    `;
        }
    }
}

/**
 * Récupérer les rôles sélectionnés
 * @returns {Array<string>} IDs des rôles sélectionnés
 */
function getSelectedRoles() {
    const checkboxes = document.querySelectorAll('input[name="userRoles"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function generateUserAccount(collaborateurId) {
    // Récupérer les informations du collaborateur
    const collaborateur = collaborateurs.find(c => c.id === collaborateurId);
    if (!collaborateur) {
        showAlert('Collaborateur non trouvé', 'danger');
        return;
    }

    // Générer les informations de connexion
    const login = generateLogin(collaborateur.prenom, collaborateur.nom);
    const email = collaborateur.email;
    const nom = collaborateur.nom;
    const prenom = collaborateur.prenom;

    // Charger dynamiquement les rôles avant d'afficher le modal
    await loadGeneratedRoles();

    // Afficher le modal de génération
    document.getElementById('generatedLogin').value = login;
    document.getElementById('generatedEmail').value = email;
    document.getElementById('generatedNom').value = nom;
    document.getElementById('generatedPrenom').value = prenom;
    document.getElementById('collaborateurIdForAccount').value = collaborateurId;

    new bootstrap.Modal(document.getElementById('generateUserAccountModal')).show();
}

async function manageUserAccount(collaborateurId, userId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await authenticatedFetch(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success) {
            const user = data.data;

            // Remplir le modal de modification
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserFirstName').value = user.prenom;
            document.getElementById('editUserName').value = user.nom;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserLogin').value = user.login || '';
            document.getElementById('editUserPassword').value = '';

            // Désactiver les champs nom, prénom, email (utilisateur lié)
            const nameField = document.getElementById('editUserName');
            const firstNameField = document.getElementById('editUserFirstName');
            const emailField = document.getElementById('editUserEmail');

            nameField.disabled = true;
            firstNameField.disabled = true;
            emailField.disabled = true;
            nameField.classList.add('form-control-plaintext');
            firstNameField.classList.add('form-control-plaintext');
            emailField.classList.add('form-control-plaintext');

            // Ajouter des messages d'aide
            nameField.title = 'Ce champ est géré via le collaborateur associé. Cliquez sur "Voir le collaborateur" pour le modifier.';
            firstNameField.title = 'Ce champ est géré via le collaborateur associé. Cliquez sur "Voir le collaborateur" pour le modifier.';
            emailField.title = 'Ce champ est géré via le collaborateur associé. Cliquez sur "Voir le collaborateur" pour le modifier.';

            // Note explicative supprimée pour une interface plus claire

            // Mettre à jour le titre du modal
            document.querySelector('#editUserModal .modal-title').innerHTML =
                '<i class="fas fa-user-shield me-2"></i>Gérer le Compte Utilisateur (Lié à Collaborateur)';

            // Charger les rôles dynamiquement avec pré-sélection
            await loadUserRolesForEdit(user.id);

            // Afficher le modal
            new bootstrap.Modal(document.getElementById('editUserModal')).show();
        } else {
            showAlert('Utilisateur non trouvé', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'danger');
    }
}

function generateLogin(prenom, nom) {
    // Première lettre du prénom + nom complet
    const firstLetter = prenom.charAt(0).toLowerCase();
    const nomLower = nom.toLowerCase().replace(/\s+/g, '');
    return firstLetter + nomLower;
}

async function updateUser() {
    const form = document.getElementById('editUserForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('editUserId').value;
    const formData = {};

    // Ajouter login seulement s'il n'est pas vide
    const loginValue = document.getElementById('editUserLogin').value.trim();
    if (loginValue) {
        formData.login = loginValue;
    }

    // Récupérer les rôles sélectionnés
    const selectedRoles = getSelectedRoles();
    console.log('📋 Rôles sélectionnés:', selectedRoles);

    // Vérifier qu'au moins un rôle est sélectionné
    if (selectedRoles.length === 0) {
        showAlert('Veuillez sélectionner au moins un rôle', 'warning');
        return;
    }

    formData.roles = selectedRoles;

    // Ajouter nom, prénom, email seulement si les champs ne sont pas désactivés et pas vides
    const nameField = document.getElementById('editUserName');
    const firstNameField = document.getElementById('editUserFirstName');
    const emailField = document.getElementById('editUserEmail');

    if (!nameField.disabled && nameField.value.trim()) {
        formData.nom = nameField.value.trim();
    }
    if (!firstNameField.disabled && firstNameField.value.trim()) {
        formData.prenom = firstNameField.value.trim();
    }
    if (!emailField.disabled && emailField.value.trim()) {
        formData.email = emailField.value.trim();
    }

    const newPassword = document.getElementById('editUserPassword').value;
    if (newPassword) {
        formData.password = newPassword;
    }



    try {
        const token = localStorage.getItem('authToken');
        const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (data.success) {
            showAlert('✅ Utilisateur mis à jour avec succès ! Les modifications ont été appliquées.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadCollaborateurs(currentPage); // Recharger la liste des collaborateurs
        } else {
            let errorMessage = data.message || 'Erreur inconnue';

            // Améliorer les messages d'erreur spécifiques
            if (data.errors && data.errors.length > 0) {
                errorMessage = 'Erreurs de validation :\n' + data.errors.join('\n');
            } else if (data.message && data.message.includes('mot de passe')) {
                errorMessage = 'Le mot de passe ne respecte pas les règles de sécurité. Vérifiez qu\'il contient au moins 8 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.';
            } else if (data.message && data.message.includes('email')) {
                errorMessage = 'L\'email fourni est invalide ou existe déjà dans le système.';
            }

            showAlert(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showAlert('Erreur lors de la mise à jour', 'danger');
    }
}

async function confirmGenerateUserAccount() {
    const collaborateurId = document.getElementById('collaborateurIdForAccount').value;
    const login = document.getElementById('generatedLogin').value;
    const email = document.getElementById('generatedEmail').value;
    const nom = document.getElementById('generatedNom').value;
    const prenom = document.getElementById('generatedPrenom').value;
    const password = document.getElementById('generatedPassword').value;

    // Récupérer les rôles sélectionnés (IDs des rôles)
    const selectedRoles = [];
    const roleCheckboxes = document.querySelectorAll('#generatedRolesCheckboxes input[type="checkbox"]:checked');
    roleCheckboxes.forEach(checkbox => {
        selectedRoles.push(checkbox.value); // Les IDs de rôles sont des UUIDs
    });

    if (!login || !email || !nom || !prenom) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'danger');
        return;
    }

    if (selectedRoles.length === 0) {
        showAlert('Veuillez sélectionner au moins un rôle', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurId}/generate-user-account`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login,
                email,
                nom,
                prenom,
                roles: selectedRoles, // Envoyer les rôles multiples (tableau d'IDs)
                password
            })
        });

        const data = await response.json();
        if (data.success) {
            showAlert('✅ Compte utilisateur créé avec succès ! Le collaborateur peut maintenant se connecter.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('generateUserAccountModal')).hide();
            loadCollaborateurs(currentPage); // Recharger la liste
        } else {
            showAlert(`❌ Erreur lors de la création du compte: ${data.message || 'Erreur inconnue'}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la création du compte:', error);
        showAlert('❌ Erreur lors de la création du compte. Veuillez réessayer.', 'danger');
    }
}

function generateNewPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('generatedPassword').value = password;
}

async function confirmDelete() {
    if (!collaborateurToDelete) return;

    try {
        const modalEl = document.getElementById('deleteConfirmModal');
        ensureDeleteModalFields();

        const motifSelect = modalEl ? modalEl.querySelector('#depart-motif-select') : null;
        const dateInput = modalEl ? modalEl.querySelector('#depart-date-effet') : null;
        const remarquesInput = modalEl ? modalEl.querySelector('#depart-remarques') : null;

        const today = new Date().toISOString().slice(0, 10);
        const typeDepart = motifSelect && motifSelect.value ? motifSelect.value : 'SUPPRESSION';
        const dateEffet = dateInput && dateInput.value ? dateInput.value : today;
        const remarques = remarquesInput && remarquesInput.value ? remarquesInput.value : '';

        const departPayload = {
            type_depart: typeDepart,
            date_effet: dateEffet,
            motif: typeDepart,
            remarques
        };

        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurToDelete}/depart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(departPayload)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Collaborateur mis en départ et compte désactivé avec succès !', 'success');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            loadCollaborateurs(currentPage);
        } else {
            showAlert(`❌ Erreur lors de la mise en départ: ${data.message || data.error || 'Erreur inconnue'}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la mise en départ:', error);
        showAlert('❌ Erreur lors de la mise en départ. Veuillez réessayer.', 'danger');
    } finally {
        collaborateurToDelete = null;
        collaborateurDetailsForDelete = null;
    }
}

function ensureDepartInfoModal() {
    let modalEl = document.getElementById('departInfoModal');
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'departInfoModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-sign-out-alt me-2"></i>Informations de départ</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="departInfoModalBody">
                            <p class="text-muted mb-0">Chargement des informations de départ...</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modalEl);
    return modalEl;
}

async function viewDepartInfo(collaborateurId) {
    try {
        const modalEl = ensureDepartInfoModal();
        const bodyEl = modalEl.querySelector('#departInfoModalBody');
        if (bodyEl) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">Chargement des informations de départ...</p>';
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurId}/depart-info`);
        const data = await response.json();

        if (!data.success || !data.data) {
            if (bodyEl) {
                bodyEl.innerHTML = `<p class="text-danger mb-0">${data.message || data.error || 'Aucune information de départ trouvée.'}</p>`;
            }
        } else {
            const depart = data.data;
            if (bodyEl) {
                bodyEl.innerHTML = `
                            <dl class="row mb-0">
                                <dt class="col-sm-4">Type de départ</dt>
                                <dd class="col-sm-8">${depart.type_depart || '-'}</dd>
                                <dt class="col-sm-4">Date d'effet</dt>
                                <dd class="col-sm-8">${depart.date_effet ? new Date(depart.date_effet).toLocaleDateString('fr-FR') : '-'}</dd>
                                <dt class="col-sm-4">Motif</dt>
                                <dd class="col-sm-8">${depart.motif || '-'}</dd>
                                <dt class="col-sm-4">Remarques</dt>
                                <dd class="col-sm-8">${depart.remarques || '<span class="text-muted">Aucune remarque</span>'}</dd>
                            </dl>
                        `;
            }
        }

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (error) {
        console.error('❌ Erreur lors du chargement des infos de départ:', error);
        showAlert('❌ Erreur lors du chargement des informations de départ.', 'danger');
    }
}

async function rehireCollaborateur(collaborateurId) {
    try {
        if (!confirm('Confirmez-vous la ré-embauche de ce collaborateur ?')) {
            return;
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurId}/reembaucher`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showAlert('✅ Collaborateur ré-embauché avec succès. Son compte utilisateur a été réactivé si disponible.', 'success');
            loadCollaborateurs(currentPage);
        } else {
            showAlert(`❌ Erreur lors de la ré-embauche: ${data.message || data.error || 'Erreur inconnue'}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la ré-embauche:', error);
        showAlert('❌ Erreur lors de la ré-embauche du collaborateur.', 'danger');
    }
}

function ensureHistoriqueRHModal() {
    let modalEl = document.getElementById('historiqueRHModal');
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'historiqueRHModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-history me-2 text-primary"></i>
                                Historique RH du collaborateur
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="historiqueRHHeader" class="mb-3 small text-muted"></div>
                            <div id="historiqueRHContainer">
                                <p class="text-muted mb-0">Chargement de l'historique RH...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modalEl);
    return modalEl;
}

async function viewHistoriqueRH(collaborateurId) {
    try {
        const collaborateur = collaborateurs.find(c => c.id === collaborateurId);
        const modalEl = ensureHistoriqueRHModal();
        const headerEl = modalEl.querySelector('#historiqueRHHeader');
        const containerEl = modalEl.querySelector('#historiqueRHContainer');

        if (headerEl && collaborateur) {
            headerEl.innerHTML = `
                        <strong>${collaborateur.prenom || ''} ${collaborateur.nom || ''}</strong>
                        &middot; Statut: <span class="badge bg-${collaborateur.statut === 'DEPART' ? 'danger' : 'secondary'}">${getStatusLabel(collaborateur.statut)}</span>
                        ${collaborateur.date_embauche ? `&middot; Embauché le ${new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR')}` : ''}
                    `;
        }

        if (containerEl) {
            containerEl.innerHTML = '<p class="text-muted mb-0">Chargement de l\'historique RH...</p>';
        }

        const [gradesRes, postesRes, orgRes, departsRes] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/evolution-grades/collaborateur/${collaborateurId}`),
            authenticatedFetch(`${API_BASE_URL}/evolution-postes/collaborateur/${collaborateurId}`),
            authenticatedFetch(`${API_BASE_URL}/evolution-organisations/collaborateur/${collaborateurId}`),
            authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurId}/departs-historique`).catch(() => null)
        ]);

        const gradesData = gradesRes ? await gradesRes.json() : { success: false };
        const postesData = postesRes ? await postesRes.json() : { success: false };
        const orgData = orgRes ? await orgRes.json() : { success: false };
        const departsData = departsRes ? await departsRes.json() : { success: false };

        const events = [];

        // Événement de création du collaborateur (basé sur la date d'embauche)
        if (collaborateur && collaborateur.date_embauche) {
            const bu = collaborateur.business_unit_nom || 'BU non définie';
            const division = collaborateur.division_nom || 'Division non définie';
            events.push({
                type: 'CREATION',
                date: collaborateur.date_embauche,
                endDate: null,
                titre: 'Création du collaborateur',
                details: `Affectation initiale: ${bu} / ${division}`
            });
        }

        if (gradesData.success && Array.isArray(gradesData.data)) {
            gradesData.data.forEach(e => {
                if (!e.date_debut) return;
                events.push({
                    type: 'GRADE',
                    date: e.date_debut,
                    endDate: e.date_fin,
                    titre: `Changement de grade: ${e.grade_nom || 'N/A'}`,
                    details: `Motif: ${e.motif || '-'}${e.taux_horaire_personnalise !== null ? ` · Salaire personnalisé: ${formatCurrency(e.taux_horaire_personnalise, 'XAF')}` : ''}`
                });
            });
        }

        if (postesData.success && Array.isArray(postesData.data)) {
            postesData.data.forEach(e => {
                if (!e.date_debut) return;
                events.push({
                    type: 'POSTE',
                    date: e.date_debut,
                    endDate: e.date_fin,
                    titre: `Changement de poste: ${e.poste_nom || 'N/A'}`,
                    details: `Motif: ${e.motif || '-'}`
                });
            });
        }

        if (orgData.success && Array.isArray(orgData.data)) {
            orgData.data.forEach(e => {
                if (!e.date_debut) return;
                events.push({
                    type: 'ORGANISATION',
                    date: e.date_debut,
                    endDate: e.date_fin,
                    titre: `Changement organisationnel: ${e.business_unit_nom || 'BU ?'} / ${e.division_nom || 'Division ?'}`,
                    details: `Motif: ${e.motif || '-'}`
                });
            });
        }

        if (departsData && departsData.success && Array.isArray(departsData.data)) {
            departsData.data.forEach(d => {
                if (!d.date_effet) return;
                const isRehire = d.type_depart === 'REEMBAUCHE';
                events.push({
                    type: isRehire ? 'REEMBAUCHE' : 'DEPART',
                    date: d.date_effet,
                    endDate: null,
                    titre: isRehire
                        ? 'Ré-embauche du collaborateur'
                        : `Départ du collaborateur (${d.type_depart || 'Type non précisé'})`,
                    details: `Motif: ${d.motif || '-'}${d.remarques ? ` · Remarques: ${d.remarques}` : ''}`
                });
            });
        }

        if (!events.length) {
            if (containerEl) {
                containerEl.innerHTML = '<p class="text-muted mb-0">Aucun historique RH trouvé pour ce collaborateur.</p>';
            }
        } else {
            events.sort((a, b) => new Date(a.date) - new Date(b.date));

            const timelineHtml = `
                        <div class="timeline">
                            ${events.map(ev => {
                const dateStr = new Date(ev.date).toLocaleDateString('fr-FR');
                const badgeClass = ev.type === 'DEPART'
                    ? 'danger'
                    : ev.type === 'REEMBAUCHE'
                        ? 'success'
                        : ev.type === 'GRADE'
                            ? 'info'
                            : ev.type === 'POSTE'
                                ? 'primary'
                                : ev.type === 'CREATION'
                                    ? 'dark'
                                    : 'secondary';
                const typeLabel = ev.type === 'DEPART'
                    ? 'Départ'
                    : ev.type === 'REEMBAUCHE'
                        ? 'Ré-embauche'
                        : ev.type === 'GRADE'
                            ? 'Grade'
                            : ev.type === 'POSTE'
                                ? 'Poste'
                                : ev.type === 'CREATION'
                                    ? 'Création'
                                    : 'Organisation';
                return `
                                    <div class="timeline-item mb-3">
                                        <div class="d-flex">
                                            <div class="me-3">
                                                <span class="badge bg-${badgeClass}">${typeLabel}</span>
                                            </div>
                                            <div>
                                                <div class="fw-bold">${ev.titre}</div>
                                                <div class="small text-muted">Le ${dateStr}</div>
                                                ${ev.details ? `<div class="small">${ev.details}</div>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    `;

            if (containerEl) {
                containerEl.innerHTML = timelineHtml;
            }
        }

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (error) {
        console.error('❌ Erreur lors du chargement de l\'historique RH:', error);
        showAlert('❌ Erreur lors du chargement de l\'historique RH.', 'danger');
    }
}

function viewCollaborateur(id) {
    const collaborateur = collaborateurs.find(c => c.id === id);

    if (!collaborateur) {
        showAlert('Collaborateur non trouvé', 'danger');
        return;
    }

    // Afficher la photo de profil (sans boutons de modification pour le modal de visualisation)
    const photoContainer = document.getElementById('view-photo-container');
    if (photoContainer) {
        photoContainer.innerHTML = '';

        // Créer un élément photo simple sans boutons pour le modal de visualisation
        const photoElement = document.createElement('div');
        photoElement.className = 'collaborateur-photo-view';

        if (collaborateur.photo_url) {
            photoElement.innerHTML = `
                        <img src="${collaborateur.photo_url}" 
                             alt="Photo de ${collaborateur.nom} ${collaborateur.prenom}" 
                             class="img-fluid rounded-circle" 
                             style="width: 120px; height: 120px; object-fit: cover;">
                    `;
        } else {
            // Afficher les initiales si pas de photo
            const initials = getInitials(collaborateur.nom, collaborateur.prenom);
            photoElement.innerHTML = `
                        <div class="collaborateur-avatar-large d-flex align-items-center justify-content-center">
                            <span class="initials-large">${initials}</span>
                        </div>
                    `;
        }

        photoContainer.appendChild(photoElement);
    }

    // Remplir le modal avec les données
    document.getElementById('view-nom').textContent = collaborateur.nom;
    document.getElementById('view-prenom').textContent = collaborateur.prenom;
    document.getElementById('view-email').textContent = collaborateur.email || '-';
    document.getElementById('view-telephone').textContent = collaborateur.telephone || '-';
    document.getElementById('view-initiales').textContent = collaborateur.initiales;
    document.getElementById('view-date-embauche').textContent = collaborateur.date_embauche ? new Date(collaborateur.date_embauche).toLocaleDateString('fr-FR') : '-';
    document.getElementById('view-date-depart').textContent = collaborateur.date_depart ? new Date(collaborateur.date_depart).toLocaleDateString('fr-FR') : '-';
    document.getElementById('view-statut').textContent = getStatusLabel(collaborateur.statut);
    document.getElementById('view-notes').textContent = collaborateur.notes || '-';

    // Relations avec les nouvelles propriétés mappées
    document.getElementById('view-business-unit').textContent = collaborateur.business_unit_nom || '-';
    document.getElementById('view-division').textContent = collaborateur.division_nom || '-';
    document.getElementById('view-grade').textContent = collaborateur.grade_nom || '-';
    document.getElementById('view-type-collaborateur').textContent = collaborateur.type_collaborateur_nom || '-';
    document.getElementById('view-poste').textContent = collaborateur.poste_nom || '-';

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('viewCollaborateurModal'));
    modal.show();
}

async function ajouterEvolutionTypeCollaborateur() {
    console.log('🔧 Début ajouterEvolutionTypeCollaborateur');
    const typeCollaborateurId = document.getElementById('rh-type-collaborateur-select').value;
    const dateEffet = document.getElementById('rh-type-collaborateur-date-effet').value;
    const motif = document.getElementById('rh-type-collaborateur-motif').value;

    console.log('📊 Données récupérées:', { typeCollaborateurId, dateEffet, motif, collaborateurRHId });

    if (!typeCollaborateurId || !dateEffet) {
        console.log('❌ Validation échouée: champs manquants');
        showAlert('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        console.log('🌐 Envoi de la requête PUT vers /api/collaborateurs/' + collaborateurRHId + '/type');
        const response = await authenticatedFetch(`${API_BASE_URL}/collaborateurs/${collaborateurRHId}/type`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type_collaborateur_id: typeCollaborateurId
            })
        });

        console.log('📥 Réponse reçue:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur HTTP:', response.status, errorText);
            showAlert(`Erreur serveur (${response.status}): ${errorText}`, 'danger');
            return;
        }

        const data = await response.json();
        console.log('📊 Données de réponse:', data);

        if (data.success) {
            console.log('✅ Succès: type de collaborateur mis à jour');
            showAlert('✅ Type de collaborateur mis à jour avec succès ! Le collaborateur a été mis à jour.', 'success');

            // Rafraîchir le tableau principal d'abord
            await loadCollaborateurs(currentPage);

            // Fermer le modal RH après le rafraîchissement
            const rhModal = bootstrap.Modal.getInstance(document.getElementById('gestionRHModal'));
            if (rhModal) {
                rhModal.hide();
            }

            // Réinitialiser le formulaire
            document.getElementById('rh-type-collaborateur-select').value = '';
            document.getElementById('rh-type-collaborateur-date-effet').value = '';
            document.getElementById('rh-type-collaborateur-motif').value = '';
        } else {
            console.log('❌ Erreur API:', data.error);
            showAlert(`Erreur lors de la mise à jour: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du type de collaborateur:', error);
        showAlert(`Erreur de connexion: ${error.message}`, 'danger');
    }
}

// ========================================
// FONCTIONS POUR LES SUPERVISEURS
// ========================================

// Charger les statistiques des superviseurs
async function loadSupervisorsStats() {
    try {
        const response = await authenticatedFetch('/api/supervisors/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('total-supervisors').textContent = data.data.total_supervisors || 0;
            document.getElementById('total-collaborateurs-supervised').textContent = data.data.total_collaborateurs || 0;
            document.getElementById('pending-approvals').textContent = data.data.pending_approvals || 0;
            document.getElementById('total-relations').textContent = data.data.total_relations || 0;
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des stats superviseurs:', error);
    }
}

// Charger les superviseurs disponibles
async function loadSupervisors() {
    try {
        const response = await authenticatedFetch('/api/supervisors');
        const data = await response.json();

        const select = document.getElementById('supervisor-select');
        select.innerHTML = '<option value="">Sélectionner un superviseur</option>';

        if (data.success && data.data) {
            data.data.forEach(supervisor => {
                const option = document.createElement('option');
                option.value = supervisor.id;
                option.textContent = `${supervisor.nom} ${supervisor.prenom}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des superviseurs:', error);
    }
}

// Charger tous les collaborateurs ACTIFS pour la sélection (ignorer la pagination)
async function loadCollaborateursForSupervision() {
    try {
        const select = document.getElementById('collaborateurs-select');
        if (!select) return;

        select.innerHTML = '';

        let page = 1;
        const limit = 200; // limite élevée pour réduire le nombre d'appels
        let totalPages = 1;

        const allCollaborateurs = [];

        do {
            const url = `/api/collaborateurs?page=${page}&limit=${limit}&statut=ACTIF`;
            const response = await authenticatedFetch(url);
            const data = await response.json();

            if (!data.success) {
                console.error('❌ Erreur API lors du chargement des collaborateurs pour supervision:', data.error || data.message);
                break;
            }

            if (Array.isArray(data.data)) {
                allCollaborateurs.push(...data.data);
            }

            if (data.pagination && typeof data.pagination.totalPages === 'number') {
                totalPages = data.pagination.totalPages;
            } else {
                totalPages = 1;
            }

            page += 1;
        } while (page <= totalPages);

        allCollaborateurs.forEach(collaborateur => {
            const option = document.createElement('option');
            option.value = collaborateur.id;
            option.textContent = `${collaborateur.nom} ${collaborateur.prenom} - ${collaborateur.business_unit_nom || 'Sans BU'}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('❌ Erreur lors du chargement des collaborateurs pour supervision:', error);
    }
}

// Charger les relations superviseur (affichage compact avec dépliage des collaborateurs)
async function loadSupervisorRelations() {
    try {
        const response = await authenticatedFetch('/api/supervisors/relations');
        const data = await response.json();

        const container = document.getElementById('supervisors-container');

        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">Aucune relation superviseur configurée</div>';
            return;
        }

        // Regrouper par superviseur
        const supervisorIdToGroup = new Map();
        for (const rel of data.data) {
            if (!supervisorIdToGroup.has(rel.supervisor_id)) {
                supervisorIdToGroup.set(rel.supervisor_id, {
                    supervisor_id: rel.supervisor_id,
                    supervisor_nom: rel.supervisor_nom,
                    supervisor_prenom: rel.supervisor_prenom,
                    collaborators: []
                });
            }
            supervisorIdToGroup.get(rel.supervisor_id).collaborators.push({
                relation_id: rel.id,
                collaborateur_id: rel.collaborateur_id,
                collaborateur_nom: rel.collaborateur_nom,
                collaborateur_prenom: rel.collaborateur_prenom
            });
        }

        // Construire l'affichage: une ligne par superviseur, clic pour déplier
        let html = '';
        for (const group of supervisorIdToGroup.values()) {
            const collapseId = `sup-collabs-${group.supervisor_id}`;
            const count = group.collaborators.length;
            html += `
                        <div class="card mb-2">
                            <div class="card-header d-flex align-items-center justify-content-between py-2" role="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                                <div class="d-flex align-items-center gap-2">
                                    <i class="fas fa-user-shield text-primary"></i>
                                    <strong>${group.supervisor_nom} ${group.supervisor_prenom}</strong>
                                </div>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="badge bg-success"><i class="fas fa-users me-1"></i>${count}</span>
                                    <i class="fas fa-chevron-down text-muted"></i>
                                </div>
                            </div>
                            <div id="${collapseId}" class="collapse">
                                <div class="card-body py-2">
                                    <ul class="list-group list-group-flush">
                                        ${group.collaborators.map(col => `
                                            <li class="list-group-item d-flex align-items-center justify-content-between">
                                                <div>
                                                    <i class="fas fa-user text-secondary me-2"></i>
                                                    ${col.collaborateur_nom} ${col.collaborateur_prenom}
                                                </div>
                                                <button class="btn btn-sm btn-outline-danger" onclick="deleteSupervisorRelation('${col.relation_id}')" title="Supprimer la relation">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
        }

        container.innerHTML = html;
    } catch (error) {
        console.error('❌ Erreur lors du chargement des relations:', error);
        document.getElementById('supervisors-container').innerHTML = '<div class="text-center text-muted">Erreur lors du chargement des relations</div>';
    }
}

// Ajouter une relation superviseur
async function addSupervisorRelation(event) {
    event.preventDefault();

    const supervisorId = document.getElementById('supervisor-select').value;
    const collaborateurIds = Array.from(document.getElementById('collaborateurs-select').selectedOptions).map(option => option.value);

    if (!supervisorId || collaborateurIds.length === 0) {
        showAlert('Veuillez sélectionner un superviseur et au moins un collaborateur', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch('/api/supervisors/relations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                supervisor_id: supervisorId,
                collaborateur_ids: collaborateurIds
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Relation superviseur ajoutée avec succès !', 'success');
            document.getElementById('add-supervisor-form').reset();
            loadSupervisorRelations();
            loadSupervisorsStats();
        } else {
            showAlert(`❌ Erreur lors de l'ajout de la relation: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de la relation:', error);
        showAlert('❌ Erreur lors de l\'ajout de la relation. Veuillez réessayer.', 'danger');
    }
}

// Supprimer une relation superviseur
async function deleteSupervisorRelation(relationId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette relation superviseur ?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/supervisors/relations/${relationId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Relation superviseur supprimée avec succès !', 'success');
            loadSupervisorRelations();
            loadSupervisorsStats();
        } else {
            showAlert(`❌ Erreur lors de la suppression: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        showAlert('❌ Erreur lors de la suppression. Veuillez réessayer.', 'danger');
    }
}

// Initialiser les superviseurs quand l'onglet est activé
document.addEventListener('DOMContentLoaded', function () {
    // Écouter le changement d'onglet
    const superviseursTab = document.getElementById('superviseurs-tab');
    if (superviseursTab) {
        superviseursTab.addEventListener('shown.bs.tab', function () {
            loadSupervisorsStats();
            loadSupervisors();
            loadCollaborateursForSupervision();
            loadSupervisorRelations();
        });
    }

    // Écouter le formulaire d'ajout de superviseur
    const addSupervisorForm = document.getElementById('add-supervisor-form');
    if (addSupervisorForm) {
        addSupervisorForm.addEventListener('submit', addSupervisorRelation);
    }
});


