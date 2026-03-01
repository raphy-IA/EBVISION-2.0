
// Script de vérification d'authentification global
(function () {
    'use strict';

    // Vérifier l'authentification au chargement de la page
    document.addEventListener('DOMContentLoaded', function () {
        console.log('ℹ️ global-auth.js: Contrôle délégué à auth.js pour plus de stabilité.');
        /* 
        // Logique désactivée car redondante et trop agressive (provoquait des déconnexions sur erreurs 500)
        // auth.js gère désormais cela de manière robuste (uniquement sur 401).
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        fetch('/api/auth/verify', { ... })
        */
    });
})();

// Fonction utilitaire pour faire des requêtes authentifiées
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.warn('⚠️ Aucun token d\'authentification trouvé');
        throw new Error('Non authentifié');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
}
