// Fichier d'initialisation de la top bar EBVISION 2.0
// Ce fichier charge tous les modules nécessaires et initialise la top bar

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier que tous les modules sont chargés
    if (typeof UserHeaderManager === 'undefined') {
        console.error('UserHeaderManager non trouvé. Vérifiez que user-header-main.js est chargé.');
        return;
    }

    if (typeof UserHeaderUtils === 'undefined') {
        console.error('UserHeaderUtils non trouvé. Vérifiez que user-header-utils.js est chargé.');
        return;
    }

    // Initialiser la top bar
    try {
        new UserHeaderManager();
        console.log('✅ Top bar EBVISION 2.0 initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la top bar:', error);
    }
});

// Fonction pour réinitialiser la top bar (utile pour les SPA)
function reinitializeUserHeader() {
    // Supprimer l'ancienne top bar si elle existe
    const existingHeader = document.querySelector('.user-header-zone');
    if (existingHeader) {
        existingHeader.remove();
    }

    // Réinitialiser le padding du body
    document.body.style.paddingTop = '';

    // Recréer la top bar
    if (typeof UserHeaderManager !== 'undefined') {
        new UserHeaderManager();
        console.log('🔄 Top bar réinitialisée');
    }
}

// Exposer la fonction de réinitialisation
window.reinitializeUserHeader = reinitializeUserHeader;


