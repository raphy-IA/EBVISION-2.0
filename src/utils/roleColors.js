/**
 * Configuration des couleurs pour les badges de rôles
 * Utilisé pour l'affichage cohérent des rôles dans toute l'application
 */

const ROLE_COLORS = {
    'SUPER_ADMIN': {
        bg: 'danger',          // Rouge
        text: 'white',
        hex: '#dc3545',
        priority: 10
    },
    'ADMIN': {
        bg: 'primary',         // Bleu
        text: 'white',
        hex: '#0d6efd',
        priority: 9
    },
    'ADMIN_IT': {
        bg: 'info',            // Cyan
        text: 'white',
        hex: '#0dcaf0',
        priority: 8
    },
    'ASSOCIE': {
        bg: 'warning',         // Jaune/Or
        text: 'dark',
        hex: '#ffc107',
        priority: 7
    },
    'DIRECTEUR': {
        bg: 'success',         // Vert
        text: 'white',
        hex: '#198754',
        priority: 6
    },
    'MANAGER': {
        bg: 'secondary',       // Gris foncé
        text: 'white',
        hex: '#6c757d',
        priority: 5
    },
    'SUPERVISEUR': {
        bg: 'dark',            // Noir/Gris très foncé
        text: 'white',
        hex: '#212529',
        priority: 4
    },
    'CONSULTANT': {
        bg: 'light',           // Gris clair
        text: 'dark',
        hex: '#f8f9fa',
        priority: 3
    },
    'COLLABORATEUR': {
        bg: 'light',           // Gris clair
        text: 'dark',
        hex: '#f8f9fa',
        priority: 2
    },
    'USER': {
        bg: 'light',           // Gris clair
        text: 'dark',
        hex: '#f8f9fa',
        priority: 1
    }
};

/**
 * Obtenir la configuration de couleur pour un rôle
 * @param {string} roleName - Nom du rôle
 * @returns {object} Configuration de couleur
 */
function getRoleColor(roleName) {
    return ROLE_COLORS[roleName] || {
        bg: 'secondary',
        text: 'white',
        hex: '#6c757d',
        priority: 0
    };
}

/**
 * Générer le HTML d'un badge de rôle
 * @param {string} roleName - Nom du rôle
 * @param {boolean} small - Taille réduite du badge
 * @returns {string} HTML du badge
 */
function getRoleBadgeHTML(roleName, small = false) {
    const color = getRoleColor(roleName);
    const sizeClass = small ? 'badge-sm' : '';
    return `<span class="badge bg-${color.bg} text-${color.text} ${sizeClass}">${roleName}</span>`;
}

/**
 * Générer le HTML de plusieurs badges de rôles
 * @param {Array<string>} roles - Tableau des noms de rôles
 * @param {boolean} small - Taille réduite des badges
 * @returns {string} HTML des badges
 */
function getRolesBadgesHTML(roles, small = false) {
    if (!roles || roles.length === 0) {
        return '<span class="text-muted">Aucun rôle</span>';
    }
    
    // Trier par priorité décroissante
    const sortedRoles = roles.sort((a, b) => {
        const priorityA = getRoleColor(a).priority;
        const priorityB = getRoleColor(b).priority;
        return priorityB - priorityA;
    });
    
    return sortedRoles
        .map(role => getRoleBadgeHTML(role, small))
        .join(' ');
}

/**
 * Trier les rôles par ordre de priorité (du plus élevé au plus bas)
 * @param {Array<string>} roles - Tableau des noms de rôles
 * @returns {Array<string>} Rôles triés
 */
function sortRolesByPriority(roles) {
    if (!roles || roles.length === 0) return [];
    
    return roles.sort((a, b) => {
        const priorityA = getRoleColor(a).priority;
        const priorityB = getRoleColor(b).priority;
        return priorityB - priorityA;
    });
}

/**
 * Obtenir le rôle avec la priorité la plus élevée
 * @param {Array<string>} roles - Tableau des noms de rôles
 * @returns {string|null} Nom du rôle prioritaire
 */
function getHighestPriorityRole(roles) {
    if (!roles || roles.length === 0) return null;
    
    const sorted = sortRolesByPriority(roles);
    return sorted[0];
}

module.exports = {
    ROLE_COLORS,
    getRoleColor,
    getRoleBadgeHTML,
    getRolesBadgesHTML,
    sortRolesByPriority,
    getHighestPriorityRole
};

