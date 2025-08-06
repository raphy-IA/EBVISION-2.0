
// Script de vérification d'authentification global
(function() {
    'use strict';
    
    // Vérifier l'authentification au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        // Si on est sur la page de login ou d'accueil, ne rien faire
        if (window.location.pathname === '/login.html' || 
            window.location.pathname === '/' || 
            window.location.pathname.includes('login')) {
            return;
        }
        
        // Vérifier si un token existe
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('🔒 Aucun token trouvé, redirection vers la page de connexion');
            window.location.href = '/login.html';
            return;
        }
        
        // Vérifier la validité du token
        fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                console.log('🔒 Token invalide, redirection vers la page de connexion');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            } else {
                console.log('✅ Token valide, utilisateur authentifié');
            }
        })
        .catch(error => {
            console.error('❌ Erreur lors de la vérification du token:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    });
})();
