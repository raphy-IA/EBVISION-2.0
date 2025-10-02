/**
 * Utilitaire d'affichage des rôles multiples
 * Affiche les rôles sous forme de badges colorés
 */

// Couleurs des badges de rôles (identiques à celles dans role-users-management.js et users.html)
const ROLE_BADGE_COLORS = {
    'SUPER_ADMIN': { bg: 'danger', text: 'white' },
    'ADMIN': { bg: 'primary', text: 'white' },
    'ADMIN_IT': { bg: 'info', text: 'white' },
    'ASSOCIE': { bg: 'warning', text: 'dark' },
    'DIRECTEUR': { bg: 'success', text: 'white' },
    'MANAGER': { bg: 'secondary', text: 'white' },
    'SUPERVISEUR': { bg: 'dark', text: 'white' },
    'CONSULTANT': { bg: 'light', text: 'dark' },
    'COLLABORATEUR': { bg: 'light', text: 'dark' },
    'USER': { bg: 'light', text: 'dark' }
};

// Priorité des rôles (pour tri)
const ROLE_DISPLAY_PRIORITY = {
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
 * Obtenir la couleur d'un rôle
 * @param {string} roleName - Nom du rôle
 * @returns {object} - Couleurs { bg, text }
 */
function getRoleColors(roleName) {
    return ROLE_BADGE_COLORS[roleName] || { bg: 'secondary', text: 'white' };
}

/**
 * Générer le HTML d'un badge de rôle
 * @param {string} roleName - Nom du rôle
 * @param {boolean} small - Taille réduite
 * @returns {string} HTML du badge
 */
function generateRoleBadge(roleName, small = false) {
    const colors = getRoleColors(roleName);
    const sizeClass = small ? 'badge-sm' : '';
    return `<span class="badge bg-${colors.bg} text-${colors.text} ${sizeClass} me-1">${roleName}</span>`;
}

/**
 * Générer le HTML de plusieurs badges de rôles
 * @param {Array<string>|Array<object>} roles - Tableau de noms de rôles ou d'objets rôles
 * @param {boolean} small - Taille réduite
 * @returns {string} HTML des badges
 */
function generateRolesBadges(roles, small = false) {
    if (!roles || roles.length === 0) {
        return '<span class="text-muted fst-italic">Aucun rôle</span>';
    }
    
    // Convertir en tableau de noms si ce sont des objets
    const roleNames = roles.map(role => typeof role === 'string' ? role : role.name);
    
    // Trier par priorité décroissante
    const sortedRoles = roleNames.sort((a, b) => {
        const priorityA = ROLE_DISPLAY_PRIORITY[a] || 0;
        const priorityB = ROLE_DISPLAY_PRIORITY[b] || 0;
        return priorityB - priorityA;
    });
    
    return sortedRoles.map(role => generateRoleBadge(role, small)).join('');
}

/**
 * Récupérer les rôles d'un utilisateur depuis l'API
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Tableau des rôles
 */
async function fetchUserRoles(userId) {
    try {
        const response = await authenticatedFetch(`/api/users/${userId}/roles`);
        if (response.ok) {
            const data = await response.json();
            return data.data || [];
        }
        return [];
    } catch (error) {
        console.error('Erreur lors de la récupération des rôles:', error);
        return [];
    }
}

/**
 * Mettre à jour l'affichage d'un élément avec les rôles d'un utilisateur
 * @param {string} elementId - ID de l'élément à mettre à jour
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} small - Taille réduite des badges
 */
async function updateElementWithUserRoles(elementId, userId, small = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Afficher un loader pendant le chargement
    element.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    
    const roles = await fetchUserRoles(userId);
    element.innerHTML = generateRolesBadges(roles, small);
}

/**
 * Mettre à jour l'affichage d'un élément avec des rôles déjà récupérés
 * @param {string} elementId - ID de l'élément à mettre à jour
 * @param {Array} roles - Tableau des rôles
 * @param {boolean} small - Taille réduite des badges
 */
function updateElementWithRoles(elementId, roles, small = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = generateRolesBadges(roles, small);
}

// Exposer les fonctions globalement pour qu'elles soient utilisables partout
window.rolesDisplay = {
    getRoleColors,
    generateRoleBadge,
    generateRolesBadges,
    fetchUserRoles,
    updateElementWithUserRoles,
    updateElementWithRoles,
    ROLE_BADGE_COLORS,
    ROLE_DISPLAY_PRIORITY
};

