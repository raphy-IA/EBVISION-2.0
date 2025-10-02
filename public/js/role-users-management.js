/**
 * Gestion des rôles et utilisateurs (LOGIQUE INVERSÉE)
 * Affiche les rôles à gauche et les utilisateurs ayant ce rôle à droite
 */

let currentSelectedRole = null;

// Couleurs des badges de rôles
const ROLE_COLORS = {
    'SUPER_ADMIN': 'danger',
    'ADMIN': 'primary',
    'ADMIN_IT': 'info',
    'ASSOCIE': 'warning',
    'DIRECTEUR': 'success',
    'MANAGER': 'secondary',
    'SUPERVISEUR': 'dark',
    'CONSULTANT': 'info',
    'COLLABORATEUR': 'primary',
    'USER': 'secondary'
};

// Priorité des rôles (pour tri)
const ROLE_PRIORITY = {
    'SUPER_ADMIN': 10,
    'ADMIN': 9,
    'ADMIN_IT': 8,
    'ASSOCIE': 7,
    'DIRECTEUR': 6,
    'MANAGER': 5,
    'SUPERVISEUR': 4,
    'CONSULTANT': 3,
    'COLLABORATEUR': 2,
    'USER': 1
};

/**
 * Charger tous les rôles dans la liste de gauche
 */
async function loadRolesList() {
    try {
        console.log('🔄 Chargement de la liste des rôles...');
        
        const response = await authenticatedFetch('/api/users/roles');
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des rôles');
        }
        
        const roles = await response.json();
        console.log('📋 Rôles chargés:', roles);
        
        // Trier par priorité
        const sortedRoles = roles.sort((a, b) => {
            const priorityA = ROLE_PRIORITY[a.name] || 0;
            const priorityB = ROLE_PRIORITY[b.name] || 0;
            return priorityB - priorityA;
        });
        
        displayRolesList(sortedRoles);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        const container = document.getElementById('roles-list');
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur lors du chargement des rôles
            </div>
        `;
    }
}

/**
 * Afficher la liste des rôles
 */
function displayRolesList(roles) {
    console.log('📋 Affichage de la liste des rôles...');
    console.log('📊 Nombre de rôles:', roles.length);
    
    const container = document.getElementById('user-roles-list');
    console.log('📦 Container trouvé:', container ? 'OUI' : 'NON');
    
    if (!container) {
        console.error('❌ Container roles-list introuvable !');
        return;
    }
    
    if (roles.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucun rôle trouvé</p>';
        return;
    }
    
    console.log('🎨 Génération du HTML pour', roles.length, 'rôles');
    
    try {
        const html = roles.map(role => {
            const colorClass = ROLE_COLORS[role.name] || 'secondary';
            const textColorClass = ['light', 'warning'].includes(colorClass) ? 'text-dark' : 'text-white';
            const description = role.description || '';
            const safeDescription = description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            return `
                <div class="list-group-item list-group-item-action role-item" 
                     data-role-id="${role.id}" 
                     data-role-name="${role.name}"
                     onclick="selectRole('${role.id}', '${role.name}', '${safeDescription}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-${colorClass} ${textColorClass}">${role.name}</span>
                            <small class="text-muted ms-2">${role.description || 'Aucune description'}</small>
                        </div>
                        <span class="badge bg-secondary" id="role-count-${role.id}">
                            <i class="fas fa-spinner fa-spin"></i>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ HTML généré avec succès, taille:', html.length);
        container.innerHTML = html;
        console.log('✅ HTML inséré dans le container');
        
        // Charger le nombre d'utilisateurs pour chaque rôle
        roles.forEach(role => {
            loadUserCountForRole(role.id);
        });
        
        console.log('✅ Affichage terminé !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'affichage:', error);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur lors de l'affichage des rôles: ${error.message}
            </div>
        `;
    }
}

/**
 * Charger le nombre d'utilisateurs ayant un rôle
 */
async function loadUserCountForRole(roleId) {
    try {
        const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/users-count`);
        if (response.ok) {
            const data = await response.json();
            const count = data.count || 0;
            const badge = document.getElementById(`role-count-${roleId}`);
            if (badge) {
                badge.innerHTML = count;
            }
        }
    } catch (error) {
        console.error(`Erreur lors du chargement du compteur pour le rôle ${roleId}:`, error);
    }
}

/**
 * Sélectionner un rôle
 */
async function selectRole(roleId, roleName, roleDescription) {
    console.log(`🔍 Sélection du rôle: ${roleName} (${roleId})`);
    
    // Mettre à jour la sélection visuelle
    document.querySelectorAll('.role-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-role-id="${roleId}"]`).classList.add('active');
    
    // Activer le bouton d'ajout
    document.getElementById('add-user-to-role-btn').disabled = false;
    document.getElementById('role-users-search').disabled = false;
    
    // Mettre à jour le titre
    const colorClass = ROLE_COLORS[roleName] || 'secondary';
    const textColorClass = ['light', 'warning'].includes(colorClass) ? 'text-dark' : 'text-white';
    document.getElementById('role-users-title').innerHTML = `
        <i class="fas fa-users me-2"></i>Utilisateurs du rôle 
        <span class="badge bg-${colorClass} ${textColorClass}">${roleName}</span>
    `;
    
    // Sauvegarder le rôle sélectionné
    currentSelectedRole = { id: roleId, name: roleName, description: roleDescription };
    
    // Charger les utilisateurs ayant ce rôle
    await loadUsersForRole(roleId, roleName);
}

/**
 * Charger les utilisateurs ayant un rôle spécifique
 */
async function loadUsersForRole(roleId, roleName) {
    try {
        console.log(`🔄 Chargement des utilisateurs pour le rôle ${roleName}...`);
        
        const container = document.getElementById('role-users-content');
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="text-muted mt-2">Chargement des utilisateurs...</p>
            </div>
        `;
        
        // Récupérer tous les utilisateurs avec leurs rôles
        const usersResponse = await authenticatedFetch('/api/permissions/users');
        if (!usersResponse.ok) {
            throw new Error('Erreur lors du chargement des utilisateurs');
        }
        
        const allUsers = await usersResponse.json();
        console.log('📋 Tous les utilisateurs:', allUsers);
        
        // Filtrer les utilisateurs ayant ce rôle
        const usersWithRole = [];
        
        for (const user of allUsers) {
            const userRolesResponse = await authenticatedFetch(`/api/users/${user.id}/roles`);
            if (userRolesResponse.ok) {
                const userRolesData = await userRolesResponse.json();
                const userRoles = userRolesData.data || [];
                
                if (userRoles.some(r => r.id === roleId)) {
                    usersWithRole.push({
                        ...user,
                        roles: userRoles
                    });
                }
            }
        }
        
        console.log(`✅ ${usersWithRole.length} utilisateur(s) avec le rôle ${roleName}`);
        
        displayUsersForRole(usersWithRole, roleName);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        const container = document.getElementById('role-users-content');
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur lors du chargement des utilisateurs
            </div>
        `;
    }
}

/**
 * Afficher les utilisateurs ayant un rôle
 */
function displayUsersForRole(users, roleName) {
    const container = document.getElementById('role-users-content');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i>
                Aucun utilisateur n'a le rôle <strong>${roleName}</strong>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        // Afficher tous les rôles de l'utilisateur
        const rolesHTML = user.roles.map(role => {
            const colorClass = ROLE_COLORS[role.name] || 'secondary';
            const textColorClass = ['light', 'warning'].includes(colorClass) ? 'text-dark' : 'text-white';
            return `<span class="badge bg-${colorClass} ${textColorClass} me-1">${role.name}</span>`;
        }).join('');
        
        return `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${user.nom} ${user.prenom}</h6>
                            <small class="text-muted d-block">${user.email}</small>
                            <div class="mt-1">${rolesHTML}</div>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" 
                                onclick="removeUserFromRole('${user.id}', '${currentSelectedRole.id}', '${user.nom}', '${user.prenom}')" 
                                title="Retirer ce rôle">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Afficher le modal pour ajouter un utilisateur au rôle
 */
async function showAddUserToRoleModal() {
    if (!currentSelectedRole) {
        alert('Veuillez sélectionner un rôle');
        return;
    }
    
    document.getElementById('selectedRole').value = currentSelectedRole.name;
    await loadAvailableUsersForRole();
    const modal = new bootstrap.Modal(document.getElementById('addUserToRoleModal'));
    modal.show();
}

/**
 * Charger les utilisateurs disponibles (qui n'ont pas encore ce rôle)
 */
async function loadAvailableUsersForRole() {
    try {
        // Récupérer tous les utilisateurs
        const usersResponse = await authenticatedFetch('/api/permissions/users');
        if (!usersResponse.ok) {
            throw new Error('Erreur lors du chargement des utilisateurs');
        }
        
        const allUsers = await usersResponse.json();
        
        // Récupérer les utilisateurs ayant déjà ce rôle
        const usersWithRoleIds = new Set();
        
        for (const user of allUsers) {
            const userRolesResponse = await authenticatedFetch(`/api/users/${user.id}/roles`);
            if (userRolesResponse.ok) {
                const userRolesData = await userRolesResponse.json();
                const userRoles = userRolesData.data || [];
                
                if (userRoles.some(r => r.id === currentSelectedRole.id)) {
                    usersWithRoleIds.add(user.id);
                }
            }
        }
        
        // Filtrer les utilisateurs disponibles
        const availableUsers = allUsers.filter(user => !usersWithRoleIds.has(user.id));
        
        const select = document.getElementById('userToAdd');
        select.innerHTML = '<option value="">Sélectionner un utilisateur</option>';
        availableUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.nom} ${user.prenom} (${user.email})`;
            select.appendChild(option);
        });
        
        if (availableUsers.length === 0) {
            select.innerHTML = '<option value="">Tous les utilisateurs ont déjà ce rôle</option>';
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des utilisateurs disponibles:', error);
    }
}

/**
 * Ajouter un utilisateur à un rôle
 */
async function addUserToRole() {
    const userId = document.getElementById('userToAdd').value;
    
    if (!userId) {
        alert('Veuillez sélectionner un utilisateur');
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/api/users/${userId}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roleId: currentSelectedRole.id })
        });
        
        if (response.ok) {
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserToRoleModal'));
            modal.hide();
            
            // Afficher un message de succès
            showAlert('Rôle ajouté avec succès', 'success');
            
            // Recharger les utilisateurs du rôle
            await loadUsersForRole(currentSelectedRole.id, currentSelectedRole.name);
            
            // Recharger le compteur
            await loadUserCountForRole(currentSelectedRole.id);
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de l\'ajout du rôle', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout du rôle:', error);
        showAlert('Erreur lors de l\'ajout du rôle', 'danger');
    }
}

/**
 * Retirer un utilisateur d'un rôle
 */
async function removeUserFromRole(userId, roleId, userNom, userPrenom) {
    if (!confirm(`Êtes-vous sûr de vouloir retirer le rôle "${currentSelectedRole.name}" de ${userNom} ${userPrenom} ?`)) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/api/users/${userId}/roles/${roleId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Rôle retiré avec succès', 'success');
            
            // Recharger les utilisateurs du rôle
            await loadUsersForRole(currentSelectedRole.id, currentSelectedRole.name);
            
            // Recharger le compteur
            await loadUserCountForRole(currentSelectedRole.id);
        } else {
            const error = await response.json();
            showAlert(error.message || 'Erreur lors de la suppression du rôle', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la suppression du rôle:', error);
        showAlert('Erreur lors de la suppression du rôle', 'danger');
    }
}

/**
 * Filtrer les rôles
 */
function filterRoles(searchTerm) {
    const roleItems = document.querySelectorAll('.role-item');
    roleItems.forEach(item => {
        const roleName = item.dataset.roleName.toLowerCase();
        const matches = roleName.includes(searchTerm.toLowerCase());
        item.style.display = matches ? 'block' : 'none';
    });
}

/**
 * Filtrer les utilisateurs
 */
function filterRoleUsers(searchTerm) {
    const userCards = document.querySelectorAll('#role-users-content .card');
    userCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        card.style.display = matches ? 'block' : 'none';
    });
}

/**
 * Afficher un message d'alerte
 */
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// Initialiser le module quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de role-users-management.js');
    
    // Écouter le changement d'onglet
    const userRolesTab = document.querySelector('[data-bs-target="#user-roles"]');
    if (userRolesTab) {
        userRolesTab.addEventListener('shown.bs.tab', function() {
            console.log('📋 Onglet "Rôles Utilisateurs" activé');
            loadRolesList();
        });
    }
    
    // Si l'onglet "Rôles Utilisateurs" est déjà actif au chargement, charger les rôles
    const userRolesPane = document.getElementById('user-roles');
    if (userRolesPane && userRolesPane.classList.contains('active')) {
        console.log('📋 Onglet "Rôles Utilisateurs" déjà actif, chargement des rôles...');
        loadRolesList();
    }
    
    // Écouter la recherche des rôles
    const rolesSearch = document.getElementById('roles-search');
    if (rolesSearch) {
        rolesSearch.addEventListener('input', function(e) {
            filterRoles(e.target.value);
        });
    }
    
    // Écouter la recherche des utilisateurs
    const roleUsersSearch = document.getElementById('role-users-search');
    if (roleUsersSearch) {
        roleUsersSearch.addEventListener('input', function(e) {
            filterRoleUsers(e.target.value);
        });
    }
});
