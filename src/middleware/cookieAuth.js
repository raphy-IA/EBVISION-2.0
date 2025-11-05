const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';

/**
 * Middleware pour gérer l'authentification via cookies httpOnly
 * Plus sécurisé que localStorage car protégé contre XSS
 */

// Configuration des cookies sécurisés
const cookieOptions = {
    httpOnly: true,        // Empêche l'accès JavaScript (protection XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
    sameSite: 'strict',    // Protection CSRF
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    path: '/'              // Disponible sur tout le site
};

/**
 * Définir un cookie d'authentification sécurisé
 */
const setAuthCookie = (res, token, user) => {
    // Cookie principal avec le token
    res.cookie('authToken', token, cookieOptions);
    
    // Cookie avec les infos utilisateur (sans données sensibles)
    const userInfo = {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role
    };
    
    res.cookie('userInfo', JSON.stringify(userInfo), {
        ...cookieOptions,
        httpOnly: false // Permet l'accès côté client pour l'affichage
    });
    
    console.log('✅ Cookies d\'authentification définis');
};

/**
 * Supprimer les cookies d'authentification
 */
const clearAuthCookies = (res) => {
    res.clearCookie('authToken', { path: '/' });
    res.clearCookie('userInfo', { path: '/' });
    console.log('🧹 Cookies d\'authentification supprimés');
};

/**
 * Middleware pour vérifier l'authentification via cookie
 */
const authenticateCookie = (req, res, next) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token d\'authentification manquant'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Erreur token cookie:', error.message);
        
        // Supprimer le cookie invalide
        clearAuthCookies(res);
        
        return res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré'
        });
    }
};

/**
 * Middleware hybride : supporte à la fois les cookies et les headers Authorization
 */
const authenticateHybrid = (req, res, next) => {
    // Priorité 1: Cookie httpOnly (plus sécurisé)
    let token = req.cookies.authToken;
    
    // Priorité 2: Header Authorization (pour compatibilité)
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token d\'authentification manquant'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Erreur token:', error.message);
        
        // Supprimer les cookies invalides
        clearAuthCookies(res);
        
        return res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré'
        });
    }
};

module.exports = {
    setAuthCookie,
    clearAuthCookies,
    authenticateCookie,
    authenticateHybrid,
    cookieOptions
};












