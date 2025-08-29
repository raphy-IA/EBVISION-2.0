// Gestionnaire d'administration des permissions
class PermissionsAdmin {
    constructor() {
        this.currentRole = null;
        this.currentUser = null;
        this.currentBusinessUnit = null;
        this.init();
    }

    async init() {
        await this.loadRoles();
        await this.loadUsers();
        await this.loadBusinessUnits();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Recherche d'utilisateurs
        document.getElementById('user-search')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Changement d'onglet
        document.getElementById('permissionsTabs')?.addEventListener('shown.bs.tab', (e) => {
            const target = e.target.getAttribute('data-bs-target');
            if (target === '#audit') {
                this.loadAuditLog();
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

        container.innerHTML = roles.map(role => `
            <div class="role-item mb-2 p-2 border rounded cursor-pointer ${this.currentRole?.id === role.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectRole('${role.id}')">
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

        container.innerHTML = `
            <div class="mb-3">
                <h6>Rôle: ${role.name}</h6>
                <p class="text-muted">${role.description || 'Aucune description'}</p>
            </div>
            <div class="row">
                ${this.groupPermissionsByCategory(allPermissions, permissions).map(category => `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">${category.name}</h6>
                            </div>
                            <div class="card-body">
                                ${category.permissions.map(perm => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" 
                                               id="perm-${perm.id}" 
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
        
        allPermissions.forEach(perm => {
            if (!categories[perm.category]) {
                categories[perm.category] = {
                    name: perm.category.charAt(0).toUpperCase() + perm.category.slice(1),
                    permissions: []
                };
            }
            
            const granted = grantedPermissions.some(gp => gp.id === perm.id);
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
                        <strong>${user.username}</strong>
                        <span class="badge bg-secondary ms-1">${user.role_name || 'Aucun rôle'}</span>
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
            const username = item.querySelector('strong').textContent.toLowerCase();
            const email = item.querySelector('small').textContent.toLowerCase();
            const matches = username.includes(searchTerm.toLowerCase()) || 
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

        container.innerHTML = `
            <div class="mb-3">
                <h6>Utilisateur: ${user.username}</h6>
                <p class="text-muted">Rôle: ${user.role_name || 'Aucun rôle'}</p>
            </div>
            <div class="row">
                ${this.groupPermissionsByCategory(allPermissions, permissions).map(category => `
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

        container.innerHTML = businessUnits.map(bu => `
            <div class="bu-item mb-2 p-2 border rounded cursor-pointer ${this.currentBusinessUnit?.id === bu.id ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="permissionsAdmin.selectBusinessUnit('${bu.id}')">
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

    async selectBusinessUnit(buId) {
        this.currentBusinessUnit = buId;
        await this.loadBusinessUnitAccess(buId);
        this.loadBusinessUnits(); // Recharger pour mettre à jour la sélection
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

    displayBusinessUnitAccess(data) {
        const container = document.getElementById('bu-access-list');
        if (!container) return;

        const { businessUnit, userAccess } = data;

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
                            <th>Niveau d'accès</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userAccess.map(access => `
                            <tr>
                                <td>${access.username}</td>
                                <td>
                                    <select class="form-select form-select-sm" 
                                            onchange="permissionsAdmin.updateBusinessUnitAccess('${businessUnit.id}', '${access.user_id}', this.value)">
                                        <option value="READ" ${access.access_level === 'READ' ? 'selected' : ''}>Lecture</option>
                                        <option value="WRITE" ${access.access_level === 'WRITE' ? 'selected' : ''}>Écriture</option>
                                        <option value="ADMIN" ${access.access_level === 'ADMIN' ? 'selected' : ''}>Administration</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn btn-danger btn-sm" 
                                            onclick="permissionsAdmin.removeBusinessUnitAccess('${businessUnit.id}', '${access.user_id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
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
}

// Fonctions globales pour les événements
function showCreateRoleModal() {
    const modal = new bootstrap.Modal(document.getElementById('createRoleModal'));
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

// Initialisation
let permissionsAdmin;
document.addEventListener('DOMContentLoaded', () => {
    permissionsAdmin = new PermissionsAdmin();
});
