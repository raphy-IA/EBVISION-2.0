// Gestionnaire d'administration des permissions
class PermissionsAdmin {
    constructor() {
        this.currentRole = null;
        this.currentUser = null;
        this.currentBusinessUnit = null;
        this.currentUserForRoles = null;
        this.currentRoleForUsers = null;
        this.currentUserRole = this.getCurrentUserRole();
        this.init();
    }

    getCurrentUserRole() {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            if (userData.roles && Array.isArray(userData.roles)) {
                if (userData.roles.includes('SUPER_ADMIN')) {
                    return 'SUPER_ADMIN';
                }
                return userData.roles[0] || 'USER';
            }
            if (userData.role) {
                return userData.role;
            }
            if (userData.principal_role) {
                return userData.principal_role;
            }
        } catch (e) {
            console.error('Erreur lecture rôle courant dans PermissionsAdmin:', e);
        }
        return 'USER';
    }

    async init() {
        await this.loadRoles();
        await this.loadUsers();
        await this.loadBusinessUnits();
        await this.loadUsersForRoles();
        this.setupEventListeners();
        this.menuPermissionsData = null; // Cache pour les permissions de menu
    }

    setupEventListeners() {
        // Recherche d'utilisateurs
        document.getElementById('user-search')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Recherche d'utilisateurs pour les rôles
        document.getElementById('user-roles-search')?.addEventListener('input', (e) => {
            this.filterUsersForRoles(e.target.value);
        });

        // Changement d'onglet
        document.getElementById('permissionsTabs')?.addEventListener('shown.bs.tab', (e) => {
            const target = e.target.getAttribute('data-bs-target');
            if (target === '#audit') {
                this.loadAuditLog();
            } else if (target === '#menu-permissions') {
                this.loadMenuRoles();
            } else if (target === '#objective-permissions') {
                this.loadObjectiveRoles();
            }
        });
    }

    // ===== GESTION DES RÔLES =====
    async loadRoles() {
        try {
            const response = await authenticatedFetch('/api/permissions/roles');
            if (response.ok) {
                const roles = await response.json();
                this.displayRoles(roles);
            } else {
                this.showAlert('Erreur lors du chargement des rôles', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des rôles', 'danger');
        }
    }

    displayRoles(roles) {
        const container = document.getElementById('roles-list');
        if (!container) return;

        const isSuperAdmin = this.currentUserRole === 'SUPER_ADMIN';

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer si l'utilisateur n'est pas SUPER_ADMIN
        const filteredRoles = isSuperAdmin ? roles : roles.filter(r => r.name !== 'SUPER_ADMIN');

        container.innerHTML = filteredRoles.map(role => `
            <div class="role-item mb-2 p-2 border rounded ${this.currentRole === role.id ? 'bg-primary text-white' : 'bg-light'}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1 cursor-pointer" onclick="permissionsAdmin.selectRole('${role.id}')">
                        <div class="d-flex align-items-center mb-1">
                            <strong>${role.name}</strong>
                            ${role.is_system_role ? '<span class="badge bg-warning ms-2">Système</span>' : ''}
                        </div>
                        <small class="${this.currentRole === role.id ? 'text-white-50' : 'text-muted'}">${role.description || 'Aucune description'}</small>
                    </div>
                    <div class="btn-group btn-group-sm ms-2" role="group">
                        <button class="btn btn-sm ${this.currentRole === role.id ? 'btn-light' : 'btn-outline-primary'}" 
                                onclick="event.stopPropagation(); showEditRoleModal('${role.id}', '${role.name.replace(/'/g, "\\'")}', '${(role.description || '').replace(/'/g, "\\'")}', ${role.is_system_role ? 'true' : 'false'});"
                                title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${isSuperAdmin && !role.is_system_role ? `
                            <button class="btn btn-sm ${this.currentRole === role.id ? 'btn-danger' : 'btn-outline-danger'}" 
                                    onclick="event.stopPropagation(); confirmDeleteRole('${role.id}', '${role.name.replace(/'/g, "\\'")}')"
                                    title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async selectRole(roleId) {
        this.currentRole = roleId;
        await this.loadRolePermissions(roleId);
        this.loadRoles(); // Recharger pour mettre à jour la sélection
    }

    async loadRolePermissions(roleId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                this.displayRolePermissions(data);
            } else {
                this.showAlert('Erreur lors du chargement des permissions du rôle', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des permissions du rôle', 'danger');
        }
    }

    displayRolePermissions(data) {
        const container = document.getElementById('role-permissions');
        if (!container) return;

        const { role, permissions, allPermissions } = data;

        // Filtrer les permissions de menu car elles ont leur propre onglet dédié
        const nonMenuPermissions = allPermissions.filter(p => !p.code.startsWith('menu.'));
        const nonMenuGrantedPermissions = permissions.filter(p => !p.code.startsWith('menu.'));

        container.innerHTML = `
            <div class="mb-3">
                <h6>Rôle: ${role.name}</h6>
                <p class="text-muted">${role.description || 'Aucune description'}</p>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Note :</strong> Les permissions de menu sont gérées dans l'onglet "Permissions de Menu"
                </div>
            </div>
            <div class="row">
                ${this.groupPermissionsByCategory(nonMenuPermissions, nonMenuGrantedPermissions).map(category => `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">${category.name}</h6>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-outline-primary btn-sm" 
                                            onclick="permissionsAdmin.selectAllInCategory('${role.id}', '${category.name}', true)"
                                            title="Tout sélectionner">
                                        <i class="fas fa-check-square me-1"></i>Tout
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                                            onclick="permissionsAdmin.selectAllInCategory('${role.id}', '${category.name}', false)"
                                            title="Tout désélectionner">
                                        <i class="fas fa-square me-1"></i>Aucun
                                    </button>
                                </div>
                            </div>
                            <div class="card-body" data-category="${category.name}">
                                ${category.permissions.map(perm => `
                                    <div class="form-check">
                                        <input class="form-check-input permission-checkbox" 
                                               type="checkbox" 
                                               id="perm-${perm.id}" 
                                               data-perm-id="${perm.id}"
                                               data-category="${category.name}"
                                               ${perm.granted ? 'checked' : ''}
                                               onchange="permissionsAdmin.toggleRolePermission('${role.id}', '${perm.id}', this.checked)">
                                        <label class="form-check-label" for="perm-${perm.id}">
                                            ${perm.name}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    groupPermissionsByCategory(allPermissions, grantedPermissions) {
        const categories = {};

        // Créer un Set des IDs accordés pour une recherche plus rapide
        const grantedIds = new Set(grantedPermissions.map(gp => String(gp.id)));

        allPermissions.forEach(perm => {
            if (!categories[perm.category]) {
                categories[perm.category] = {
                    name: perm.category.charAt(0).toUpperCase() + perm.category.slice(1),
                    permissions: []
                };
            }

            // Comparer les IDs en les convertissant en string pour éviter les problèmes de type
            const granted = grantedIds.has(String(perm.id));

            categories[perm.category].permissions.push({
                ...perm,
                granted
            });
        });

        return Object.values(categories);
    }

    async toggleRolePermission(roleId, permissionId, granted) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/permissions/${permissionId}`, {
                method: granted ? 'POST' : 'DELETE'
            });

            if (response.ok) {
                this.showAlert(`Permission ${granted ? 'accordée' : 'révoquée'} avec succès`, 'success');
            } else {
                this.showAlert('Erreur lors de la modification de la permission', 'danger');
                // Recharger pour annuler le changement
                await this.loadRolePermissions(roleId);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la modification de la permission', 'danger');
            await this.loadRolePermissions(roleId);
        }
    }

    /**
     * Sélectionner ou désélectionner toutes les permissions d'une catégorie
     * @param {string} roleId - ID du rôle
     * @param {string} categoryName - Nom de la catégorie
     * @param {boolean} selectAll - true pour tout sélectionner, false pour tout désélectionner
     */
    async selectAllInCategory(roleId, categoryName, selectAll) {
        try {
            // Trouver toutes les checkboxes de cette catégorie
            const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-category="${categoryName}"]`);

            if (checkboxes.length === 0) {
                console.warn(`Aucune permission trouvée pour la catégorie: ${categoryName}`);
                return;
            }

            // Afficher un indicateur de chargement
            this.showAlert(
                `${selectAll ? 'Sélection' : 'Désélection'} de ${checkboxes.length} permission(s) en cours...`,
                'info'
            );

            // Créer un tableau de promesses pour toutes les modifications
            const promises = [];

            checkboxes.forEach(checkbox => {
                const permissionId = checkbox.getAttribute('data-perm-id');
                const isChecked = checkbox.checked;

                // Si l'état doit changer
                if (isChecked !== selectAll) {
                    // Cocher/décocher visuellement la case
                    checkbox.checked = selectAll;

                    // Ajouter la requête API
                    const promise = authenticatedFetch(
                        `/api/permissions/roles/${roleId}/permissions/${permissionId}`,
                        {
                            method: selectAll ? 'POST' : 'DELETE'
                        }
                    );

                    promises.push(promise);
                }
            });

            // Attendre que toutes les requêtes soient terminées
            if (promises.length > 0) {
                const results = await Promise.allSettled(promises);

                // Vérifier s'il y a eu des erreurs
                const errors = results.filter(r => r.status === 'rejected' || !r.value.ok);

                if (errors.length === 0) {
                    this.showAlert(
                        `${promises.length} permission(s) ${selectAll ? 'accordée(s)' : 'révoquée(s)'} avec succès`,
                        'success'
                    );
                } else if (errors.length < promises.length) {
                    this.showAlert(
                        `${promises.length - errors.length} permission(s) modifiée(s), ${errors.length} erreur(s)`,
                        'warning'
                    );
                    // Recharger pour synchroniser l'affichage
                    await this.loadRolePermissions(roleId);
                } else {
                    this.showAlert(
                        'Erreur lors de la modification des permissions',
                        'danger'
                    );
                    // Recharger pour annuler les changements visuels
                    await this.loadRolePermissions(roleId);
                }
            } else {
                this.showAlert(
                    `Toutes les permissions de cette catégorie sont déjà ${selectAll ? 'sélectionnées' : 'désélectionnées'}`,
                    'info'
                );
            }

        } catch (error) {
            console.error('Erreur lors de la sélection en masse:', error);
            this.showAlert('Erreur lors de la modification des permissions', 'danger');
            // Recharger pour annuler les changements
            await this.loadRolePermissions(roleId);
        }
    }

    // ===== GESTION DES UTILISATEURS =====
    async loadUsers() {
        try {
            const response = await authenticatedFetch('/api/permissions/users');
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            } else {
                this.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
        }
    }

    displayUsers(users) {
        const container = document.getElementById('users-list');
        if (!container) return;

        container.innerHTML = users.map(user => `
            <div class="user-item mb-2 p-2 border rounded cursor-pointer ${this.currentUser?.id === user.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectUser('${user.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${user.nom} ${user.prenom}</strong>
                        <span class="badge bg-secondary ms-1">${user.roles_display || user.role_name || 'Aucun rôle'}</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <small class="text-muted">${user.email || 'Aucun email'}</small>
            </div>
        `).join('');
    }

    filterUsers(searchTerm) {
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach(item => {
            const userName = item.querySelector('strong').textContent.toLowerCase();
            const email = item.querySelector('small').textContent.toLowerCase();
            const matches = userName.includes(searchTerm.toLowerCase()) ||
                email.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    async selectUser(userId) {
        this.currentUser = userId;
        await this.loadUserPermissions(userId);
        this.loadUsers(); // Recharger pour mettre à jour la sélection
    }

    async loadUserPermissions(userId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/users/${userId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                this.displayUserPermissions(data);
            } else {
                this.showAlert('Erreur lors du chargement des permissions de l\'utilisateur', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des permissions de l\'utilisateur', 'danger');
        }
    }

    displayUserPermissions(data) {
        const container = document.getElementById('user-permissions');
        if (!container) return;

        const { user, permissions, allPermissions } = data;

        console.log('📋 Permissions reçues pour l\'utilisateur:', {
            userId: user.id,
            userName: `${user.nom} ${user.prenom}`,
            totalPermissions: allPermissions.length,
            grantedPermissions: permissions.length,
            grantedIds: permissions.map(p => p.id)
        });

        // Filtrer les permissions de menu car elles ont leur propre onglet dédié
        const nonMenuPermissions = allPermissions.filter(p => !p.code.startsWith('menu.'));
        const nonMenuGrantedPermissions = permissions.filter(p => !p.code.startsWith('menu.'));

        console.log('📊 Permissions après filtrage menu:', {
            totalNonMenu: nonMenuPermissions.length,
            grantedNonMenu: nonMenuGrantedPermissions.length
        });

        container.innerHTML = `
            <div class="mb-3">
                <h6>Utilisateur: ${user.nom} ${user.prenom}</h6>
                <p class="text-muted">Rôle: ${user.role_name || 'Aucun rôle'}</p>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Note :</strong> Les permissions de menu sont gérées dans l'onglet "Permissions de Menu"
                </div>
            </div>
            <div class="row">
                ${this.groupPermissionsByCategory(nonMenuPermissions, nonMenuGrantedPermissions).map(category => `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">${category.name}</h6>
                            </div>
                            <div class="card-body">
                                ${category.permissions.map(perm => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" 
                                               id="user-perm-${perm.id}" 
                                               ${perm.granted ? 'checked' : ''}
                                               onchange="permissionsAdmin.toggleUserPermission('${user.id}', '${perm.id}', this.checked)">
                                        <label class="form-check-label" for="user-perm-${perm.id}">
                                            ${perm.name}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async toggleUserPermission(userId, permissionId, granted) {
        try {
            const response = await authenticatedFetch(`/api/permissions/users/${userId}/permissions/${permissionId}`, {
                method: granted ? 'POST' : 'DELETE'
            });

            if (response.ok) {
                this.showAlert(`Permission ${granted ? 'accordée' : 'révoquée'} avec succès`, 'success');
            } else {
                this.showAlert('Erreur lors de la modification de la permission', 'danger');
                await this.loadUserPermissions(userId);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la modification de la permission', 'danger');
            await this.loadUserPermissions(userId);
        }
    }

    // ===== GESTION DES BUSINESS UNITS =====
    async loadBusinessUnits() {
        try {
            const response = await authenticatedFetch('/api/permissions/business-units');
            if (response.ok) {
                const businessUnits = await response.json();
                this.displayBusinessUnits(businessUnits);
            } else {
                this.showAlert('Erreur lors du chargement des Business Units', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des Business Units', 'danger');
        }
    }

    displayBusinessUnits(businessUnits) {
        const container = document.getElementById('business-units-list');
        if (!container) return;

        // Stocker les BUs pour référence future
        this.businessUnitsList = businessUnits;

        container.innerHTML = businessUnits.map(bu => `
            <div class="bu-item mb-2 p-2 border rounded cursor-pointer ${this.currentBusinessUnit?.id === bu.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectBusinessUnit('${bu.id}', '${bu.name}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${bu.name}</strong>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <small class="text-muted">${bu.description || 'Aucune description'}</small>
            </div>
        `).join('');
    }

    async selectBusinessUnit(buId, buName) {
        this.currentBusinessUnit = { id: buId, name: buName };
        await this.loadBusinessUnitAccess(buId);
        this.loadBusinessUnits(); // Recharger pour mettre à jour la sélection

        // Activer le bouton "Ajouter un utilisateur"
        const addBtn = document.getElementById('add-user-to-bu-btn');
        if (addBtn) {
            addBtn.disabled = false;
        }
    }

    async loadBusinessUnitAccess(buId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/business-units/${buId}/access`);
            if (response.ok) {
                const data = await response.json();
                this.displayBusinessUnitAccess(data);
            } else {
                this.showAlert('Erreur lors du chargement des accès', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des accès', 'danger');
        }
    }

    async displayBusinessUnitAccess(data) {
        const container = document.getElementById('bu-access-list');
        if (!container) return;

        const { businessUnit, userAccess } = data;

        // Pour chaque utilisateur, récupérer TOUTES ses BUs
        const usersBUs = await Promise.all(
            userAccess.map(async (access) => {
                try {
                    const response = await authenticatedFetch(`/api/permissions/users/${access.user_id}/business-units`);
                    if (response.ok) {
                        const busData = await response.json();
                        return { userId: access.user_id, businessUnits: busData };
                    }
                } catch (error) {
                    console.error(`Erreur lors de la récupération des BUs pour l'utilisateur ${access.user_id}:`, error);
                }
                return { userId: access.user_id, businessUnits: [] };
            })
        );

        // Créer un map pour accéder rapidement aux BUs par userId
        const busMap = {};
        usersBUs.forEach(item => {
            busMap[item.userId] = item.businessUnits;
        });

        container.innerHTML = `
            <div class="mb-3">
                <h6>Business Unit: ${businessUnit.name}</h6>
                <p class="text-muted">${businessUnit.description || 'Aucune description'}</p>
            </div>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Niveau d'accès (BU actuelle)</th>
                            <th>Autres Business Units</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userAccess.map(access => {
            const userBUs = busMap[access.user_id] || [];
            const otherBUs = userBUs.filter(bu => bu.business_unit_id !== businessUnit.id);

            return `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${access.nom} ${access.prenom}</strong>
                                        ${access.access_type === 'COLLABORATEUR' ?
                    `<br><small class="text-info">
                                                <i class="fas fa-user-tie"></i> Collaborateur principal
                                                ${access.collaborateur_nom ? `(${access.collaborateur_nom} ${access.collaborateur_prenom})` : ''}
                                            </small>` :
                    `<br><small class="text-warning">
                                                <i class="fas fa-key"></i> Accès explicite
                                            </small>`
                }
                                    </div>
                                </td>
                                <td>
                                    ${access.access_type === 'COLLABORATEUR' ?
                    `<span class="badge bg-success">ADMIN (Principal)</span>` :
                    `<select class="form-select form-select-sm" 
                                                onchange="permissionsAdmin.updateBusinessUnitAccess('${businessUnit.id}', '${access.user_id}', this.value)">
                                            <option value="READ" ${access.access_level === 'READ' ? 'selected' : ''}>Lecture</option>
                                            <option value="WRITE" ${access.access_level === 'WRITE' ? 'selected' : ''}>Écriture</option>
                                            <option value="ADMIN" ${access.access_level === 'ADMIN' ? 'selected' : ''}>Administration</option>
                                        </select>`
                }
                                </td>
                                <td>
                                    ${otherBUs.length > 0 ?
                    otherBUs.map(bu => `
                                            <span class="badge bg-${bu.access_type === 'COLLABORATEUR' ? 'info' : 'secondary'} me-1 mb-1" 
                                                  title="${bu.access_type === 'COLLABORATEUR' ? 'BU Principale' : 'Accès ' + bu.access_level}">
                                                ${bu.business_unit_nom} 
                                                ${bu.access_type === 'COLLABORATEUR' ?
                            '<i class="fas fa-star"></i>' :
                            `<small>(${bu.access_level})</small>`
                        }
                                            </span>
                                        `).join('') :
                    `<span class="text-muted">Aucune autre BU</span>`
                }
                                </td>
                                <td>
                                    ${access.access_type === 'EXPLICIT' ?
                    `<button class="btn btn-danger btn-sm" 
                                                onclick="permissionsAdmin.removeBusinessUnitAccess('${businessUnit.id}', '${access.user_id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>` :
                    `<span class="text-muted">Accès principal</span>`
                }
                                </td>
                            </tr>
                        `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async updateBusinessUnitAccess(buId, userId, accessLevel) {
        try {
            const response = await authenticatedFetch(`/api/permissions/business-units/${buId}/access/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ access_level: accessLevel })
            });

            if (response.ok) {
                this.showAlert('Niveau d\'accès mis à jour avec succès', 'success');
            } else {
                this.showAlert('Erreur lors de la mise à jour du niveau d\'accès', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la mise à jour du niveau d\'accès', 'danger');
        }
    }

    async removeBusinessUnitAccess(buId, userId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet accès ?')) {
            return;
        }

        try {
            const response = await authenticatedFetch(`/api/permissions/business-units/${buId}/access/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showAlert('Accès supprimé avec succès', 'success');
                await this.loadBusinessUnitAccess(buId);
            } else {
                this.showAlert('Erreur lors de la suppression de l\'accès', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la suppression de l\'accès', 'danger');
        }
    }

    async showAddUserToBUModal() {
        if (!this.currentBusinessUnit) {
            this.showAlert('Veuillez sélectionner une Business Unit', 'warning');
            return;
        }

        // Remplir le champ de la BU avec le nom stocké
        document.getElementById('selectedBU').value = this.currentBusinessUnit.name || 'BU';

        // Charger la liste des utilisateurs
        try {
            const response = await authenticatedFetch('/api/permissions/users');
            if (response.ok) {
                const users = await response.json();
                const select = document.getElementById('userToBUAdd');
                select.innerHTML = '<option value="">Sélectionner un utilisateur</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.nom} ${user.prenom} (${user.email})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs:', error);
        }

        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('addUserToBUModal'));
        modal.show();
    }

    async addUserToBU() {
        const userId = document.getElementById('userToBUAdd').value;
        const accessLevel = document.getElementById('accessLevelBU').value;

        if (!userId || !this.currentBusinessUnit) {
            this.showAlert('Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            const response = await authenticatedFetch(`/api/permissions/business-units/${this.currentBusinessUnit.id}/access/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ access_level: accessLevel })
            });

            if (response.ok) {
                this.showAlert('Utilisateur ajouté avec succès', 'success');

                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserToBUModal'));
                modal.hide();

                // Recharger la liste des accès
                await this.loadBusinessUnitAccess(this.currentBusinessUnit.id);
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Erreur lors de l\'ajout de l\'utilisateur', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de l\'ajout de l\'utilisateur', 'danger');
        }
    }

    // ===== GESTION DE L'AUDIT =====
    async loadAuditLog() {
        try {
            const startDate = document.getElementById('audit-start-date')?.value;
            const endDate = document.getElementById('audit-end-date')?.value;
            const action = document.getElementById('audit-action-filter')?.value;

            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (action) params.append('action', action);

            const response = await authenticatedFetch(`/api/permissions/audit?${params}`);
            if (response.ok) {
                const auditLog = await response.json();
                this.displayAuditLog(auditLog);
            } else {
                this.showAlert('Erreur lors du chargement du journal d\'audit', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement du journal d\'audit', 'danger');
        }
    }

    displayAuditLog(auditLog) {
        const container = document.getElementById('audit-log');
        if (!container) return;

        if (auditLog.length === 0) {
            container.innerHTML = '<p class="text-muted">Aucun événement d\'audit trouvé</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Utilisateur</th>
                            <th>Action</th>
                            <th>Type</th>
                            <th>Détails</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${auditLog.map(event => `
                            <tr>
                                <td>${new Date(event.created_at).toLocaleString('fr-FR')}</td>
                                <td>${event.username || 'Système'}</td>
                                <td>
                                    <span class="badge bg-${this.getActionBadgeColor(event.action)}">
                                        ${event.action}
                                    </span>
                                </td>
                                <td>${event.target_type}</td>
                                <td>${event.details ? JSON.stringify(event.details) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getActionBadgeColor(action) {
        switch (action) {
            case 'GRANT': return 'success';
            case 'REVOKE': return 'danger';
            case 'MODIFY': return 'warning';
            default: return 'secondary';
        }
    }

    // ===== GESTION DES RÔLES UTILISATEURS (LOGIQUE: Rôles → Utilisateurs) =====
    async loadUsersForRoles() {
        try {
            // Charger les rôles pour l'onglet "Rôles Utilisateurs"
            const response = await authenticatedFetch('/api/permissions/roles');
            if (response.ok) {
                const roles = await response.json();
                this.displayRolesForUsers(roles);
            } else {
                this.showAlert('Erreur lors du chargement des rôles', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des rôles', 'danger');
        }
    }

    displayRolesForUsers(roles) {
        const container = document.getElementById('user-roles-list');
        if (!container) return;

        if (roles.length === 0) {
            container.innerHTML = '<p class="text-muted">Aucun rôle trouvé</p>';
            return;
        }

        container.innerHTML = roles.map(role => `
            <div class="role-item mb-2 p-2 border rounded cursor-pointer ${this.currentRoleForUsers === role.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectRoleForUsers('${role.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${role.name}</strong>
                        ${role.is_system_role ? '<span class="badge bg-warning ms-1">Système</span>' : ''}
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <small class="${this.currentRoleForUsers === role.id ? 'text-white-50' : 'text-muted'}">${role.description || 'Aucune description'}</small>
            </div>
        `).join('');
    }

    async selectRoleForUsers(roleId) {
        this.currentRoleForUsers = roleId;
        await this.loadUsersForRole(roleId);
        this.loadUsersForRoles(); // Recharger pour mettre à jour la sélection
    }

    async loadUsersForRole(roleId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/users`);
            if (response.ok) {
                const data = await response.json();
                this.displayUsersForRole(data);

                // Activer le bouton "Ajouter un Utilisateur"
                const addBtn = document.getElementById('add-user-to-role-btn');
                if (addBtn) {
                    addBtn.disabled = false;
                }
            } else {
                this.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
        }
    }

    displayUsersForRole(data) {
        const container = document.getElementById('role-users-content');
        if (!container) return;

        const { role, users } = data;

        container.innerHTML = `
            <div class="mb-3">
                <h6>Rôle: ${role.name}</h6>
                <p class="text-muted">${role.description || 'Aucune description'}</p>
            </div>
            ${users.length > 0 ? `
                <div class="list-group">
                    ${users.map(user => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${user.nom} ${user.prenom}</h6>
                                    <small class="text-muted">${user.email}</small>
                                </div>
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="permissionsAdmin.removeUserFromRole('${role.id}', '${user.id}', '${user.nom} ${user.prenom}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-muted">Aucun utilisateur avec ce rôle</p>'}
        `;
    }

    filterRolesForUsers(searchTerm) {
        const roleItems = document.querySelectorAll('#user-roles-list .role-item');
        roleItems.forEach(item => {
            const roleText = item.textContent.toLowerCase();
            const matches = roleText.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    async removeUserFromRole(roleId, userId, userName) {
        if (!confirm(`Êtes-vous sûr de vouloir retirer le rôle de l'utilisateur "${userName}" ?`)) {
            return;
        }

        try {
            const response = await authenticatedFetch(`/api/users/${userId}/roles/${roleId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showAlert('Rôle retiré avec succès', 'success');
                // Recharger les utilisateurs du rôle
                await this.loadUsersForRole(roleId);
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'Erreur lors de la suppression du rôle', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la suppression du rôle', 'danger');
        }
    }

    // ===== GESTION DES PERMISSIONS DE MENU =====
    async loadMenuRoles() {
        try {
            const response = await authenticatedFetch('/api/permissions/roles');
            if (response.ok) {
                const roles = await response.json();
                this.displayMenuRoles(roles);
            } else {
                this.showAlert('Erreur lors du chargement des rôles', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des rôles', 'danger');
        }
    }

    displayMenuRoles(roles) {
        const container = document.getElementById('menu-roles-list');
        if (!container) return;

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer si l'utilisateur n'est pas SUPER_ADMIN
        const isSuperAdmin = this.currentUserRole === 'SUPER_ADMIN';
        const filteredRoles = isSuperAdmin ? roles : roles.filter(r => r.name !== 'SUPER_ADMIN');

        container.innerHTML = filteredRoles.map(role => `
            <div class="role-item mb-2 p-2 border rounded cursor-pointer ${this.currentMenuRole?.id === role.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectMenuRole('${role.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${role.name}</strong>
                        ${role.is_system_role ? '<span class="badge bg-warning ms-1">Système</span>' : ''}
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <small class="text-muted">${role.description || 'Aucune description'}</small>
            </div>
        `).join('');
    }

    async selectMenuRole(roleId) {
        this.currentMenuRole = { id: roleId };
        await this.loadMenuRolePermissions(roleId);
        this.loadMenuRoles(); // Recharger pour mettre à jour la sélection
    }

    async loadMenuRolePermissions(roleId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                this.menuPermissionsData = data;
                this.displayMenuRolePermissions(data);
            } else {
                this.showAlert('Erreur lors du chargement des permissions de menu du rôle', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des permissions de menu du rôle', 'danger');
        }
    }

    displayMenuRolePermissions(data) {
        const container = document.getElementById('menu-role-permissions');
        if (!container) return;

        const { role, permissions, allPermissions } = data;

        // Filtrer seulement les permissions de menu
        const menuPermissions = allPermissions.filter(p => p.code.startsWith('menu.'));
        const userMenuPermissions = permissions.filter(p => p.code.startsWith('menu.'));

        // Grouper par section
        const menuSections = this.groupMenuPermissionsBySection(menuPermissions, userMenuPermissions);

        container.innerHTML = `
            <div class="mb-3 d-flex justify-content-between align-items-center">
                <div>
                    <h6>Rôle: ${role.name}</h6>
                    <p class="text-muted mb-0">${role.description || 'Aucune description'}</p>
                </div>
                <div class="btn-group" role="group">
                    ${userMenuPermissions.length < menuPermissions.length ? `
                        <button class="btn btn-success btn-sm" onclick="permissionsAdmin.toggleAllMenuPermissions(true)">
                            <i class="fas fa-check-double me-1"></i>Tout accorder
                        </button>
                    ` : ''}
                    ${userMenuPermissions.length > 0 ? `
                        <button class="btn btn-danger btn-sm" onclick="permissionsAdmin.toggleAllMenuPermissions(false)">
                            <i class="fas fa-times me-1"></i>Tout révoquer
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="menu-permissions-summary">
                <div class="menu-permissions-stats">
                    <div class="menu-stat-item">
                        <div class="menu-stat-number">${menuSections.length}</div>
                        <div class="menu-stat-label">Sections</div>
                    </div>
                    <div class="menu-stat-item">
                        <div class="menu-stat-number">${userMenuPermissions.length}</div>
                        <div class="menu-stat-label">Permissions accordées</div>
                    </div>
                    <div class="menu-stat-item">
                        <div class="menu-stat-number">${menuPermissions.length - userMenuPermissions.length}</div>
                        <div class="menu-stat-label">Permissions refusées</div>
                    </div>
                </div>
            </div>
            
            <div class="menu-sections-container">
                ${menuSections.map(section => this.renderMenuSection(section)).join('')}
            </div>
        `;

        // Ajouter les événements pour les toggles
        this.setupMenuSectionToggles();
    }

    groupMenuPermissionsBySection(allPermissions, userPermissions) {
        const excludedPermissions = [
            'menu.business_unit.responsables_bu_division'
        ];

        // Configuration pour les icônes et noms connus
        const sectionConfig = {
            'dashboard': { name: 'DASHBOARD', icon: 'fas fa-tachometer-alt' },
            'objectifs': { name: 'OBJECTIFS', icon: 'fas fa-bullseye' },
            'evaluations': { name: 'ÉVALUATIONS', icon: 'fas fa-clipboard-check' },
            'rapports': { name: 'RAPPORTS', icon: 'fas fa-chart-bar' },
            'gestion_des_temps': { name: 'GESTION DES TEMPS', icon: 'fas fa-clock' },
            'gestion_mission': { name: 'GESTION MISSION', icon: 'fas fa-tasks' },
            'market_pipeline': { name: 'MARKET PIPELINE', icon: 'fas fa-chart-line' },
            'gestion_rh': { name: 'GESTION RH', icon: 'fas fa-users' },
            'configurations': { name: 'CONFIGURATIONS', icon: 'fas fa-cog' },
            'business_unit': { name: 'BUSINESS UNIT', icon: 'fas fa-building' },
            'parametres_administration': { name: 'PARAMÈTRES ADMINISTRATION', icon: 'fas fa-user-cog' }
        };

        const sectionsMap = {};

        // Grouper les permissions par section
        allPermissions.forEach(permission => {
            if (excludedPermissions.includes(permission.code)) {
                return;
            }

            // Extraire la clé de section (ex: 'dashboard' depuis 'menu.dashboard.view')
            const parts = permission.code.split('.');
            if (parts.length < 3) return; // Ignorer si format incorrect

            const sectionKey = parts[1];

            if (!sectionsMap[sectionKey]) {
                // Utiliser la config connue ou des valeurs par défaut
                const config = sectionConfig[sectionKey] || {
                    name: sectionKey.toUpperCase().replace(/_/g, ' '),
                    icon: 'fas fa-folder' // Icône par défaut
                };

                sectionsMap[sectionKey] = {
                    key: sectionKey, // Stocker la clé pour usage futur
                    name: config.name,
                    icon: config.icon,
                    permissions: []
                };
            }

            const isGranted = userPermissions.some(p => p.code === permission.code);
            sectionsMap[sectionKey].permissions.push({
                ...permission,
                granted: isGranted
            });
        });

        // Ordre d'affichage des sections (correspondant à la sidebar)
        const sectionOrder = [
            'dashboard',
            'objectifs',
            'evaluations',
            'rapports',
            'gestion_des_temps',
            'gestion_mission',
            'market_pipeline',
            'gestion_rh',
            'configurations',
            'business_unit',
            'parametres_administration'
        ];

        return Object.values(sectionsMap).sort((a, b) => {
            const indexA = sectionOrder.indexOf(a.key);
            const indexB = sectionOrder.indexOf(b.key);

            // Si les deux sont dans l'ordre défini
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            // Si seulement a est dans l'ordre, il vient avant
            if (indexA !== -1) return -1;

            // Si seulement b est dans l'ordre, il vient avant
            if (indexB !== -1) return 1;

            // Sinon, tri alphabétique
            return a.name.localeCompare(b.name);
        });
    }

    renderMenuSection(section) {
        const grantedCount = section.permissions.filter(p => p.granted).length;
        const totalCount = section.permissions.length;

        // Utiliser la clé de section stockée
        const sectionKey = section.key;

        // Trouver la permission de section principale
        const sectionMainPermission = this.menuPermissionsData.allPermissions.find(p => {
            return p.code === `menu.${sectionKey}`;
        });

        // Vérifier si la section principale est accordée
        const sectionMainGranted = sectionMainPermission ?
            this.menuPermissionsData.permissions.some(p => p.code === sectionMainPermission.code) :
            false;

        return `
            <div class="menu-section-card">
                <div class="menu-section-header">
                    <div class="d-flex align-items-center">
                        <i class="${section.icon} section-icon"></i>
                        <div class="ms-2">
                            <div class="d-flex align-items-center">
                                <span class="section-title">${section.name}</span>
                                <span class="badge bg-light text-dark ms-2">${grantedCount}/${totalCount}</span>
                            </div>
                            ${sectionMainPermission ? `
                                <div class="section-main-toggle mt-1">
                                    <div class="form-check form-switch form-switch-sm">
                                        <input class="form-check-input" type="checkbox" 
                                               id="section-main-${sectionMainPermission.id}" 
                                               ${sectionMainGranted ? 'checked' : ''}
                                               onchange="permissionsAdmin.toggleMenuPermission('${this.currentMenuRole.id}', '${sectionMainPermission.id}', this.checked)">
                                        <label class="form-check-label text-white" for="section-main-${sectionMainPermission.id}">
                                            <small>${sectionMainGranted ? 'Section activée' : 'Section désactivée'}</small>
                                        </label>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="menu-section-actions">
                        ${grantedCount < totalCount ? `
                            <button class="menu-section-action-btn grant-all" 
                                    onclick="permissionsAdmin.toggleAllSectionPermissions('${sectionKey}', true)">
                                <i class="fas fa-check-double"></i> Tout accorder
                            </button>
                        ` : ''}
                        ${grantedCount > 0 ? `
                            <button class="menu-section-action-btn revoke-all" 
                                    onclick="permissionsAdmin.toggleAllSectionPermissions('${sectionKey}', false)">
                                <i class="fas fa-times"></i> Tout révoquer
                            </button>
                        ` : ''}
                        <button class="menu-section-toggle" onclick="permissionsAdmin.toggleMenuSection(this)">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="menu-section-body">
                    <div class="menu-section-content">
                        ${section.permissions.map(permission => this.renderMenuPermission(permission)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderMenuPermission(permission) {
        const permissionName = permission.code.split('.').slice(2).join('.');
        const displayName = permissionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `
            <div class="menu-link-item">
                <div class="menu-link-info">
                    <div class="menu-link-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <div class="menu-link-text">
                        <div class="menu-link-name">${displayName}</div>
                        <div class="menu-link-description">${permission.description}</div>
                    </div>
                </div>
                <div class="menu-link-controls">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" 
                               id="menu-perm-${permission.id}" 
                               ${permission.granted ? 'checked' : ''}
                               onchange="permissionsAdmin.toggleMenuPermission('${this.currentMenuRole.id}', '${permission.id}', this.checked)">
                        <label class="form-check-label" for="menu-perm-${permission.id}">
                            <span class="menu-permission-badge ${permission.granted ? 'menu-permission-granted' : 'menu-permission-denied'}">
                                ${permission.granted ? 'Accordé' : 'Refusé'}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    setupMenuSectionToggles() {
        // Les événements sont déjà ajoutés via onclick dans le HTML généré
    }

    toggleMenuSection(button) {
        const sectionCard = button.closest('.menu-section-card');
        const content = sectionCard.querySelector('.menu-section-content');
        const icon = button.querySelector('i');

        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            icon.className = 'fas fa-chevron-down';
        } else {
            content.classList.add('collapsed');
            icon.className = 'fas fa-chevron-right';
        }
    }

    async toggleMenuPermission(roleId, permissionId, granted) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/permissions/${permissionId}`, {
                method: granted ? 'POST' : 'DELETE'
            });

            if (response.ok) {
                this.showAlert(`Permission de menu ${granted ? 'accordée' : 'révoquée'} avec succès`, 'success');
                // Mettre à jour l'affichage
                await this.loadMenuRolePermissions(roleId);
            } else {
                this.showAlert('Erreur lors de la modification de la permission de menu', 'danger');
                // Recharger pour annuler le changement
                await this.loadMenuRolePermissions(roleId);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la modification de la permission de menu', 'danger');
            await this.loadMenuRolePermissions(roleId);
        }
    }

    async toggleAllSectionPermissions(sectionKey, grant) {
        if (!this.currentMenuRole?.id) {
            this.showAlert('Aucun rôle sélectionné', 'warning');
            return;
        }

        if (!confirm(`Êtes-vous sûr de vouloir ${grant ? 'accorder' : 'révoquer'} toutes les permissions de cette section ?`)) {
            return;
        }

        try {
            // Trouver toutes les permissions de la section
            const sectionPermissions = this.menuPermissionsData.allPermissions.filter(p => {
                // sectionKey est maintenant la clé brute (ex: 'dashboard', 'objectifs')
                return p.code.split('.')[1] === sectionKey;
            });

            // Effectuer les modifications en parallèle
            const promises = sectionPermissions.map(permission =>
                authenticatedFetch(`/api/permissions/roles/${this.currentMenuRole.id}/permissions/${permission.id}`, {
                    method: grant ? 'POST' : 'DELETE'
                })
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            if (successCount === sectionPermissions.length) {
                this.showAlert(`${successCount} permissions ${grant ? 'accordées' : 'révoquées'} avec succès`, 'success');
                await this.loadMenuRolePermissions(this.currentMenuRole.id);
            } else {
                this.showAlert(`${successCount}/${sectionPermissions.length} permissions modifiées avec succès`, 'warning');
                await this.loadMenuRolePermissions(this.currentMenuRole.id);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la modification des permissions', 'danger');
        }
    }

    async toggleAllMenuPermissions(grant) {
        if (!this.currentMenuRole?.id) {
            this.showAlert('Aucun rôle sélectionné', 'warning');
            return;
        }

        if (!confirm(`Êtes-vous sûr de vouloir ${grant ? 'accorder' : 'révoquer'} TOUTES les permissions de menu pour ce rôle ?`)) {
            return;
        }

        try {
            // Trouver toutes les permissions de menu
            const menuPermissions = this.menuPermissionsData.allPermissions.filter(p => p.code.startsWith('menu.'));

            // Effectuer les modifications en parallèle
            const promises = menuPermissions.map(permission =>
                authenticatedFetch(`/api/permissions/roles/${this.currentMenuRole.id}/permissions/${permission.id}`, {
                    method: grant ? 'POST' : 'DELETE'
                })
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            if (successCount === menuPermissions.length) {
                this.showAlert(`${successCount} permissions de menu ${grant ? 'accordées' : 'révoquées'} avec succès`, 'success');
                await this.loadMenuRolePermissions(this.currentMenuRole.id);
            } else {
                this.showAlert(`${successCount}/${menuPermissions.length} permissions modifiées avec succès`, 'warning');
                await this.loadMenuRolePermissions(this.currentMenuRole.id);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors de la modification des permissions', 'danger');
        }
    }

    // ===== UTILITAIRES =====
    showAlert(message, type) {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-suppression après 5 secondes
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // ===== GESTION DES PERMISSIONS OBJECTIFS =====
    async loadObjectiveRoles() {
        try {
            const response = await authenticatedFetch('/api/permissions/roles');
            if (response.ok) {
                const roles = await response.json();
                this.displayObjectiveRoles(roles);
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    displayObjectiveRoles(roles) {
        const container = document.getElementById('objective-roles-list');
        if (!container) return;

        // 🔒 PROTECTION SUPER_ADMIN: Filtrer si l'utilisateur n'est pas SUPER_ADMIN
        const isSuperAdmin = this.currentUserRole === 'SUPER_ADMIN';
        const filteredRoles = isSuperAdmin ? roles : roles.filter(r => r.name !== 'SUPER_ADMIN');

        container.innerHTML = filteredRoles.map(role => `
            <div class="role-item mb-2 p-2 border rounded ${this.currentObjectiveRole === role.id ? 'bg-primary text-white' : 'bg-light'} cursor-pointer"
                 onclick="permissionsAdmin.selectObjectiveRole('${role.id}')">
                <div class="d-flex align-items-center mb-1">
                    <strong>${role.name}</strong>
                    ${role.is_system_role ? '<span class="badge bg-warning ms-2">Système</span>' : ''}
                </div>
                <small class="${this.currentObjectiveRole === role.id ? 'text-white-50' : 'text-muted'}">${role.description || 'Aucune description'}</small>
            </div>
        `).join('');
    }

    async selectObjectiveRole(roleId) {
        this.currentObjectiveRole = roleId;
        await this.loadObjectiveRoles(); // Refresh UI
        await this.loadObjectivePermissionsForMatrix(roleId);
    }

    async loadObjectivePermissionsForMatrix(roleId) {
        try {
            const response = await authenticatedFetch(`/api/permissions/roles/${roleId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                this.displayObjectivePermissionsMatrix(data, roleId);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('Erreur lors du chargement des permissions', 'danger');
        }
    }

    displayObjectivePermissionsMatrix(data, roleId) {
        const container = document.getElementById('objective-permissions-matrix');
        if (!container) return;

        const { allPermissions, permissions } = data;

        // Filtrer uniquement les permissions de catégorie 'objectives'
        const objPermissions = allPermissions.filter(p => p.category === 'objectives');
        const grantedIds = new Set(permissions.map(p => p.id));

        if (objPermissions.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Aucune permission d\'objectif définie dans le système.</div>';
            return;
        }

        // Organiser par niveau (Global, BU, Division, Grade, Individual)
        const levels = ['GLOBAL', 'BU', 'DIVISION', 'GRADE', 'INDIVIDUAL'];
        const actions = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'DISTRIBUTE'];

        const levelLabels = {
            'GLOBAL': 'Global (Entreprise)',
            'BU': 'Business Unit',
            'DIVISION': 'Division',
            'GRADE': 'Grade',
            'INDIVIDUAL': 'Individuel'
        };

        const actionLabels = {
            'VIEW': 'Voir',
            'CREATE': 'Créer',
            'EDIT': 'Modifier',
            'DELETE': 'Supprimer',
            'DISTRIBUTE': 'Distribuer'
        };

        let html = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Niveau</th>
                            ${actions.map(a => `<th class="text-center">${actionLabels[a]}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        levels.forEach(level => {
            html += `<tr><td><strong>${levelLabels[level]}</strong></td>`;

            actions.forEach(action => {
                // Chercher la permission correspondante
                // Code pattern: OBJECTIVES_{LEVEL}_{ACTION}
                const expectedCode = `OBJECTIVES_${level}_${action}`;
                const perm = objPermissions.find(p => p.code === expectedCode);

                html += '<td class="text-center">';
                if (perm) {
                    const isGranted = grantedIds.has(perm.id);
                    html += `
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input" type="checkbox" 
                                   ${isGranted ? 'checked' : ''}
                                   onchange="permissionsAdmin.toggleRolePermission('${roleId}', '${perm.id}', this.checked)">
                        </div>
                    `;
                } else {
                    html += '<span class="text-muted">-</span>';
                }
                html += '</td>';
            });

            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="alert alert-info mt-3">
                <i class="fas fa-info-circle me-2"></i>
                Les modifications sont enregistrées automatiquement.
            </div>
        `;

        container.innerHTML = html;
    }
}

// Fonctions globales pour les événements
function showCreateRoleModal() {
    const modal = new bootstrap.Modal(document.getElementById('createRoleModal'));
    const roleSystemCheckbox = document.getElementById('role-system');
    if (roleSystemCheckbox) {
        const isSuperAdmin = permissionsAdmin.currentUserRole === 'SUPER_ADMIN';
        roleSystemCheckbox.checked = false;
        roleSystemCheckbox.disabled = !isSuperAdmin;
    }
    modal.show();
}

async function createRole() {
    const name = document.getElementById('role-name').value;
    const description = document.getElementById('role-description').value;
    const isSystem = document.getElementById('role-system').checked;

    if (!name) {
        permissionsAdmin.showAlert('Le nom du rôle est requis', 'danger');
        return;
    }

    try {
        const response = await authenticatedFetch('/api/permissions/roles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                is_system_role: isSystem
            })
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Rôle créé avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createRoleModal')).hide();
            document.getElementById('create-role-form').reset();
            await permissionsAdmin.loadRoles();
        } else {
            permissionsAdmin.showAlert('Erreur lors de la création du rôle', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de la création du rôle', 'danger');
    }
}

function showEditRoleModal(roleId, roleName, roleDescription, isSystemRole) {
    document.getElementById('edit-role-id').value = roleId;
    document.getElementById('edit-role-name').value = roleName;
    document.getElementById('edit-role-description').value = roleDescription;
    const systemCheckbox = document.getElementById('edit-role-system');
    if (systemCheckbox) {
        const isSuperAdmin = permissionsAdmin.currentUserRole === 'SUPER_ADMIN';
        systemCheckbox.checked = !!isSystemRole;
        systemCheckbox.disabled = !isSuperAdmin;
    }

    const modal = new bootstrap.Modal(document.getElementById('editRoleModal'));
    modal.show();
}

async function updateRole() {
    const roleId = document.getElementById('edit-role-id').value;
    const name = document.getElementById('edit-role-name').value;
    const description = document.getElementById('edit-role-description').value;
    const systemCheckbox = document.getElementById('edit-role-system');
    const isSystem = systemCheckbox ? systemCheckbox.checked : undefined;

    if (!name) {
        permissionsAdmin.showAlert('Le nom du rôle est requis', 'danger');
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/permissions/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                // is_system_role est interprété côté backend : pour les non SUPER_ADMIN,
                // il sera ignoré pour éviter les modifications non autorisées.
                is_system_role: isSystem
            })
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Rôle modifié avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editRoleModal')).hide();
            await permissionsAdmin.loadRoles();
        } else {
            const error = await response.json();
            permissionsAdmin.showAlert(error.error || 'Erreur lors de la modification du rôle', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de la modification du rôle', 'danger');
    }
}

function confirmDeleteRole(roleId, roleName) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${roleName}" ?\n\nCette action est irréversible et supprimera toutes les associations de ce rôle avec les utilisateurs.`)) {
        deleteRole(roleId);
    }
}

async function deleteRole(roleId) {
    try {
        const response = await authenticatedFetch(`/api/permissions/roles/${roleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Rôle supprimé avec succès', 'success');
            permissionsAdmin.currentRole = null;
            await permissionsAdmin.loadRoles();

            // Réinitialiser l'affichage des permissions
            const container = document.getElementById('role-permissions');
            if (container) {
                container.innerHTML = '<p class="text-muted">Sélectionnez un rôle pour voir ses permissions</p>';
            }
        } else {
            const error = await response.json();

            // Afficher un message détaillé avec la raison si disponible
            let errorMessage = error.error || 'Erreur lors de la suppression du rôle';

            if (error.reason) {
                errorMessage += `\n\n${error.reason}`;
            }

            // Si des utilisateurs sont affectés, afficher un message spécifique
            if (error.userCount) {
                permissionsAdmin.showAlert(
                    `❌ ${errorMessage}`,
                    'warning'
                );
            } else {
                permissionsAdmin.showAlert(errorMessage, 'danger');
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de la suppression du rôle', 'danger');
    }
}

// ===== GESTION DES RÔLES MULTIPLES =====

// Charger les utilisateurs pour la gestion des rôles
async function loadUsersForRoles() {
    try {
        const response = await authenticatedFetch('/api/permissions/users');
        if (response.ok) {
            const users = await response.json();
            permissionsAdmin.displayUsersForRoles(users);
        } else {
            permissionsAdmin.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
    }
}

// Afficher les utilisateurs pour la gestion des rôles
function displayUsersForRoles(users) {
    const container = document.getElementById('user-roles-list');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucun utilisateur trouvé</p>';
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="list-group-item list-group-item-action user-item" 
             data-user-id="${user.id}" 
             data-user-name="${user.nom} ${user.prenom}"
             onclick="selectUserForRoles('${user.id}', '${user.nom} ${user.prenom}')">
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${user.nom} ${user.prenom}</h6>
                <small class="text-muted">${user.email}</small>
            </div>
                <p class="mb-1 text-muted">${user.roles_display || 'Aucun rôle'}</p>
        </div>
    `).join('');
}

// Sélectionner un utilisateur pour gérer ses rôles
async function selectUserForRoles(userId, userName) {
    console.log(`🔄 Sélection de l'utilisateur: ${userName} (${userId})`);

    // Mettre à jour l'interface
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    // Activer le bouton d'ajout de rôle
    const addRoleBtn = document.getElementById('add-user-to-role-btn');
    if (addRoleBtn) {
        addRoleBtn.disabled = false;
    }

    // Charger les rôles de l'utilisateur
    await loadUserRoles(userId, userName);
}

// Charger les rôles d'un utilisateur
async function loadUserRoles(userId, userName) {
    try {
        console.log(`🔄 Chargement des rôles pour l'utilisateur: ${userName} (${userId})`);
        const response = await authenticatedFetch(`/api/users/${userId}/roles`);
        if (response.ok) {
            const userRolesData = await response.json();
            console.log('📋 Réponse API:', userRolesData);

            // Extraire les rôles du format { success: true, data: [...] }
            let userRoles = [];
            if (userRolesData && userRolesData.data && Array.isArray(userRolesData.data)) {
                userRoles = userRolesData.data;
            } else if (Array.isArray(userRolesData)) {
                // Si c'est directement un tableau
                userRoles = userRolesData;
            }

            console.log(`✅ ${userRoles.length} rôle(s) trouvé(s):`, userRoles);
            displayUserRoles(userId, userName, userRoles);
        } else {
            console.error('❌ Erreur HTTP:', response.status);
            permissionsAdmin.showAlert('Erreur lors du chargement des rôles de l\'utilisateur', 'danger');
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        console.error('Stack:', error.stack);
        permissionsAdmin.showAlert('Erreur lors du chargement des rôles de l\'utilisateur', 'danger');
    }
}

// Afficher les rôles d'un utilisateur
function displayUserRoles(userId, userName, userRoles) {
    console.log(`📋 Affichage des rôles pour ${userName}:`, userRoles);
    const container = document.getElementById('role-users-content');
    if (!container) {
        console.error('❌ Conteneur role-users-content non trouvé');
        return;
    }

    container.innerHTML = `
        <div class="mb-3">
            <h6>Rôles de ${userName}</h6>
            <p class="text-muted">Gérez les rôles assignés à cet utilisateur</p>
        </div>
        <div id="user-roles-list-container">
            ${userRoles.length > 0 ?
            userRoles.map(role => `
                    <div class="card mb-2">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${role.name}</h6>
                                    <small class="text-muted">${role.description || 'Pas de description'}</small>
                                </div>
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="removeRoleFromUser('${userId}', '${role.id}', '${role.name}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('') :
            '<p class="text-muted">Aucun rôle assigné</p>'
        }
        </div>
    `;

    // Stocker l'utilisateur sélectionné
    permissionsAdmin.currentUserForRoles = { id: userId, name: userName };
}

// Afficher le modal d'ajout de rôle
async function showAddRoleModal() {
    if (!permissionsAdmin.currentUserForRoles) {
        permissionsAdmin.showAlert('Veuillez sélectionner un utilisateur', 'warning');
        return;
    }

    // Remplir les informations de l'utilisateur
    document.getElementById('selectedUser').value = permissionsAdmin.currentUserForRoles.name;

    // Charger les rôles disponibles
    await loadAvailableRoles();

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('addRoleModal'));
    modal.show();
}

// Charger les rôles disponibles pour l'ajout
async function loadAvailableRoles() {
    try {
        console.log('🔄 Chargement des rôles disponibles...');

        // Récupérer tous les rôles depuis /api/users/roles
        const response = await authenticatedFetch('/api/users/roles');
        if (!response.ok) {
            console.error('❌ Erreur lors du chargement des rôles:', response.status);
            permissionsAdmin.showAlert('Erreur lors du chargement des rôles', 'danger');
            return;
        }

        const allRoles = await response.json();
        console.log('📋 Tous les rôles:', allRoles);

        // Récupérer les rôles actuels de l'utilisateur
        console.log(`🔄 Chargement des rôles de l'utilisateur ${permissionsAdmin.currentUserForRoles.id}...`);
        const userRolesResponse = await authenticatedFetch(`/api/users/${permissionsAdmin.currentUserForRoles.id}/roles`);

        let userRoles = [];
        if (userRolesResponse.ok) {
            const userRolesData = await userRolesResponse.json();
            console.log('📋 Réponse des rôles utilisateur:', userRolesData);

            // Vérifier si la réponse a une propriété 'data' (structure { success: true, data: [...] })
            if (userRolesData && userRolesData.data && Array.isArray(userRolesData.data)) {
                userRoles = userRolesData.data;
            } else if (Array.isArray(userRolesData)) {
                // Si c'est directement un tableau
                userRoles = userRolesData;
            }
        }

        console.log('📊 Rôles actuels de l\'utilisateur:', userRoles);

        // Filtrer les rôles déjà assignés
        const availableRoles = allRoles.filter(role =>
            !userRoles.some(userRole => userRole.id === role.id)
        );

        console.log('✅ Rôles disponibles pour ajout:', availableRoles);

        const select = document.getElementById('roleToAdd');
        select.innerHTML = '<option value="">Sélectionner un rôle</option>';
        availableRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = `${role.name} - ${role.description || 'Pas de description'}`;
            select.appendChild(option);
        });

        console.log(`✅ ${availableRoles.length} rôle(s) disponible(s) chargé(s)`);
    } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        console.error('Stack:', error.stack);
        permissionsAdmin.showAlert('Erreur lors du chargement des rôles', 'danger');
    }
}

// Ajouter un rôle à un utilisateur
async function addRoleToUser() {
    const roleId = document.getElementById('roleToAdd').value;
    if (!roleId) {
        permissionsAdmin.showAlert('Veuillez sélectionner un rôle', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/users/${permissionsAdmin.currentUserForRoles.id}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roleId })
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Rôle ajouté avec succès', 'success');

            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addRoleModal'));
            modal.hide();

            // Recharger les rôles de l'utilisateur
            await loadUserRoles(permissionsAdmin.currentUserForRoles.id, permissionsAdmin.currentUserForRoles.name);
        } else {
            const error = await response.json();
            permissionsAdmin.showAlert(error.message || 'Erreur lors de l\'ajout du rôle', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de l\'ajout du rôle', 'danger');
    }
}

// Retirer un rôle d'un utilisateur
async function removeRoleFromUser(userId, roleId, roleName) {
    if (!confirm(`Êtes-vous sûr de vouloir retirer le rôle "${roleName}" de cet utilisateur ?`)) {
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/users/${userId}/roles/${roleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Rôle retiré avec succès', 'success');

            // Recharger les rôles de l'utilisateur
            await loadUserRoles(userId, permissionsAdmin.currentUserForRoles.name);
        } else {
            const error = await response.json();
            permissionsAdmin.showAlert(error.message || 'Erreur lors de la suppression du rôle', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de la suppression du rôle', 'danger');
    }
}

// Filtrer les utilisateurs pour les rôles
function filterUsersForRoles(searchTerm) {
    const userItems = document.querySelectorAll('#user-roles-list .user-item');
    userItems.forEach(item => {
        const userName = item.dataset.userName.toLowerCase();
        const email = item.querySelector('small').textContent.toLowerCase();
        const matches = userName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
        item.style.display = matches ? 'block' : 'none';
    });
}

/**
 * Synchroniser les permissions et menus de l'application
 * Accessible uniquement par SUPER_ADMIN
 */
async function syncPermissionsAndMenus() {
    const btn = document.getElementById('syncPermissionsBtn');
    const originalText = btn.innerHTML;

    try {
        // Désactiver le bouton et afficher le chargement
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Synchronisation en cours...';

        const response = await authenticatedFetch('/api/sync/permissions-menus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Afficher un message de succès détaillé
            const statsMessage = `
                <strong>Synchronisation réussie !</strong><br>
                <small>
                    <strong>Pages:</strong> ${result.stats.pages.added} ajoutées, ${result.stats.pages.updated} mises à jour, ${result.stats.pages.skipped} inchangées (${result.stats.pages.total} total)<br>
                    <strong>Sections de menu:</strong> ${result.stats.menus.sections.added} ajoutées, ${result.stats.menus.sections.updated} mises à jour<br>
                    <strong>Items de menu:</strong> ${result.stats.menus.items.added} ajoutés, ${result.stats.menus.items.updated} mis à jour<br>
                    <strong>Permissions:</strong> ${result.stats.permissions.added} ajoutées, ${result.stats.permissions.updated} mises à jour, ${result.stats.permissions.deleted || 0} supprimées, ${result.stats.permissions.skipped} inchangées
                </small>
            `;

            permissionsAdmin.showAlert(statsMessage, 'success', 10000);

            // Recharger les données
            setTimeout(() => {
                location.reload();
            }, 3000);
        } else {
            permissionsAdmin.showAlert(result.message || 'Erreur lors de la synchronisation', 'danger');
        }
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        permissionsAdmin.showAlert('Erreur lors de la synchronisation: ' + error.message, 'danger');
    } finally {
        // Réactiver le bouton
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Vérifier si l'utilisateur est SUPER_ADMIN et afficher le bouton
 */
async function checkSuperAdminAndShowSyncButton() {
    try {
        console.log('🔍 Vérification du rôle SUPER_ADMIN...');

        // D'abord, vérifier le rôle depuis le cache local (plus fiable et rapide)
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedRole = cachedUser.role || cachedUser.principal_role;

        console.log('👤 Données utilisateur en cache:', cachedUser);
        console.log('👤 Rôle en cache:', cachedRole);

        if (cachedRole === 'SUPER_ADMIN') {
            console.log('✅ SUPER_ADMIN détecté via cache');
            const syncBtn = document.getElementById('syncPermissionsBtn');
            if (syncBtn) {
                syncBtn.style.display = 'inline-block';
                console.log('✅ Bouton de synchronisation affiché');
            } else {
                console.error('❌ Bouton syncPermissionsBtn non trouvé dans le DOM');
                // Lister tous les boutons pour debug
                const allButtons = document.querySelectorAll('button');
                console.log('📋 Boutons présents:', Array.from(allButtons).map(b => b.id || b.className));
            }
            return;
        }

        // Fallback: vérifier via l'API si le cache ne contient pas SUPER_ADMIN
        console.log('🔍 Vérification via API...');

        const authResponse = await authenticatedFetch('/api/auth/verify');
        if (!authResponse.ok) {
            console.log('⚠️ Utilisateur non authentifié');
            return;
        }

        const meResponse = await authenticatedFetch('/api/auth/me');
        if (!meResponse.ok) {
            console.log('⚠️ Impossible de récupérer les informations utilisateur');
            return;
        }

        const userResponse = await meResponse.json();
        const userData = userResponse.data?.user || userResponse.data || userResponse;

        if (!userData || !userData.id) {
            console.error('❌ ID utilisateur manquant:', userData);
            return;
        }

        // Essayer de récupérer les rôles via l'API
        console.log(`🔍 Récupération des rôles pour l'utilisateur ${userData.id}...`);
        const rolesResponse = await authenticatedFetch(`/api/users/${userData.id}/roles`);

        if (!rolesResponse.ok) {
            console.warn('⚠️ Erreur API rôles:', rolesResponse.status, '- Utilisation du rôle en cache');
            // Si l'API échoue, utiliser le rôle du userData
            const apiRole = userData.role || userData.principal_role;
            if (apiRole === 'SUPER_ADMIN') {
                const syncBtn = document.getElementById('syncPermissionsBtn');
                if (syncBtn) {
                    syncBtn.style.display = 'inline-block';
                    console.log('✅ Bouton de synchronisation affiché (via userData)');
                }
            }
            return;
        }

        const rolesData = await rolesResponse.json();
        const roles = rolesData.data || rolesData;

        const isSuperAdmin = Array.isArray(roles) && roles.some(role => role.name === 'SUPER_ADMIN');
        console.log('🔒 Est SUPER_ADMIN (API)?', isSuperAdmin);

        if (isSuperAdmin) {
            const syncBtn = document.getElementById('syncPermissionsBtn');
            if (syncBtn) {
                syncBtn.style.display = 'inline-block';
                console.log('✅ Bouton de synchronisation affiché');
            } else {
                console.error('❌ Bouton syncPermissionsBtn non trouvé');
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification du rôle SUPER_ADMIN:', error);
    }
}

// Fonction pour afficher le modal d'ajout d'utilisateur à un rôle
async function showAddUserToRoleModal() {
    if (!permissionsAdmin.currentRoleForUsers) {
        permissionsAdmin.showAlert('Veuillez sélectionner un rôle', 'warning');
        return;
    }

    // Charger tous les utilisateurs
    try {
        const response = await authenticatedFetch('/api/permissions/users');
        if (!response.ok) {
            permissionsAdmin.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
            return;
        }

        const allUsers = await response.json();

        // Récupérer les utilisateurs qui ont déjà ce rôle
        const roleUsersResponse = await authenticatedFetch(`/api/permissions/roles/${permissionsAdmin.currentRoleForUsers}/users`);
        let roleUsers = [];
        if (roleUsersResponse.ok) {
            const roleUsersData = await roleUsersResponse.json();
            roleUsers = roleUsersData.users || [];
        }

        // Filtrer les utilisateurs qui n'ont pas déjà ce rôle
        const availableUsers = allUsers.filter(user =>
            !roleUsers.some(roleUser => roleUser.id === user.id)
        );

        // Créer et afficher le modal
        const modalHtml = `
            <div class="modal fade" id="addUserToRoleModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Ajouter un utilisateur au rôle</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Sélectionner un utilisateur</label>
                                <select class="form-select" id="userToAddToRole">
                                    <option value="">Sélectionner un utilisateur</option>
                                    ${availableUsers.map(user => `
                                        <option value="${user.id}">${user.nom} ${user.prenom} (${user.email})</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" onclick="addUserToRole()">Ajouter</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Supprimer le modal existant s'il y en a un
        const existingModal = document.getElementById('addUserToRoleModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Ajouter le modal au DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('addUserToRoleModal'));
        modal.show();
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors du chargement des utilisateurs', 'danger');
    }
}

// Fonction pour ajouter un utilisateur à un rôle
async function addUserToRole() {
    const userId = document.getElementById('userToAddToRole').value;
    if (!userId) {
        permissionsAdmin.showAlert('Veuillez sélectionner un utilisateur', 'warning');
        return;
    }

    if (!permissionsAdmin.currentRoleForUsers) {
        permissionsAdmin.showAlert('Aucun rôle sélectionné', 'warning');
        return;
    }

    try {
        const response = await authenticatedFetch(`/api/users/${userId}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roleId: permissionsAdmin.currentRoleForUsers })
        });

        if (response.ok) {
            permissionsAdmin.showAlert('Utilisateur ajouté au rôle avec succès', 'success');

            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserToRoleModal'));
            modal.hide();

            // Recharger les utilisateurs du rôle
            await permissionsAdmin.loadUsersForRole(permissionsAdmin.currentRoleForUsers);
        } else {
            const error = await response.json();
            permissionsAdmin.showAlert(error.message || 'Erreur lors de l\'ajout de l\'utilisateur au rôle', 'danger');
        }
    } catch (error) {
        console.error('Erreur:', error);
        permissionsAdmin.showAlert('Erreur lors de l\'ajout de l\'utilisateur au rôle', 'danger');
    }
}

// Initialisation
let permissionsAdmin;
document.addEventListener('DOMContentLoaded', () => {
    permissionsAdmin = new PermissionsAdmin();

    // Attendre un peu que le DOM soit complètement rendu avant de chercher le bouton
    setTimeout(() => {
        checkSuperAdminAndShowSyncButton();
    }, 500);


});
