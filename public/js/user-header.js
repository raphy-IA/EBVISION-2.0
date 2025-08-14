// Script de compatibilité pour la top bar EBVISION 2.0
// Ce fichier charge les nouveaux modules modulaires

// Charger les dépendances dans le bon ordre
function loadTopBarModules() {
    // Charger les utilitaires d'abord
    const utilsScript = document.createElement('script');
    utilsScript.src = 'js/user-header-utils.js';
    document.head.appendChild(utilsScript);

    // Charger le module principal ensuite
    utilsScript.onload = function() {
        const mainScript = document.createElement('script');
        mainScript.src = 'js/user-header-main.js';
        document.head.appendChild(mainScript);

        // Charger l'initialisation en dernier
        mainScript.onload = function() {
            const initScript = document.createElement('script');
            initScript.src = 'js/user-header-init.js';
            document.head.appendChild(initScript);
        };
    };
}

// Charger les modules si le DOM est déjà prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTopBarModules);
} else {
    loadTopBarModules();
}


