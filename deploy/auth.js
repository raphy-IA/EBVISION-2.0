// Script de vérification d'authentification
(function() {
    'use strict';
    
    // Fonction pour vérifier si l'utilisateur est authentifié
    function isAuthenticated() {
        const authToken = sessionStorage.getItem('authToken');
        const authTimestamp = sessionStorage.getItem('authTimestamp');
        
        if (!authToken || !authTimestamp) {
            return false;
        }
        
        // Vérifier si la session n'a pas expiré (24 heures)
        const now = Date.now();
        const sessionAge = now - parseInt(authTimestamp);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
        
        if (sessionAge > maxSessionAge) {
            // Session expirée, nettoyer le stockage
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('authTimestamp');
            return false;
        }
        
        return true;
    }
    
    // Fonction pour rediriger vers la page de connexion
    function redirectToLogin() {
        // Sauvegarder l'URL actuelle pour redirection après connexion
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'index.html';
    }
    
    // Fonction pour déconnecter l'utilisateur
    function logout() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authTimestamp');
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = 'index.html';
    }
    
    // Fonction pour authentifier l'utilisateur
    function authenticateUser(username, password) {
        if (username === 'EB' && password === 'EB@Partners') {
            // Générer un token d'authentification simple
            const authToken = btoa(username + ':' + Date.now());
            sessionStorage.setItem('authToken', authToken);
            sessionStorage.setItem('authTimestamp', Date.now().toString());
            return true;
        }
        return false;
    }
    
    // Fonction pour vérifier l'authentification au chargement de la page
    function checkAuthentication() {
        if (!isAuthenticated()) {
            redirectToLogin();
            return false;
        }
        return true;
    }
    
    // Fonction pour rafraîchir le timestamp d'authentification
    function refreshAuthTimestamp() {
        if (isAuthenticated()) {
            sessionStorage.setItem('authTimestamp', Date.now().toString());
        }
    }
    
    // Exposer les fonctions globalement
    window.Auth = {
        isAuthenticated: isAuthenticated,
        checkAuthentication: checkAuthentication,
        authenticateUser: authenticateUser,
        logout: logout,
        refreshAuthTimestamp: refreshAuthTimestamp
    };
    
    // Vérifier l'authentification immédiatement si on n'est pas sur la page de connexion
    if (!window.location.pathname.includes('index.html')) {
        checkAuthentication();
        
        // Rafraîchir le timestamp toutes les 5 minutes
        setInterval(refreshAuthTimestamp, 5 * 60 * 1000);
        
        // Ajouter un bouton de déconnexion si il n'existe pas déjà
        document.addEventListener('DOMContentLoaded', function() {
            if (!document.getElementById('logoutBtn')) {
                const headerActions = document.querySelector('.header-actions');
                if (headerActions) {
                    const logoutBtn = document.createElement('button');
                    logoutBtn.id = 'logoutBtn';
                    logoutBtn.className = 'logout-btn';
                    logoutBtn.innerHTML = '🚪 Déconnexion';
                    logoutBtn.onclick = logout;
                    headerActions.appendChild(logoutBtn);
                }
            }
        });
    }
})(); 