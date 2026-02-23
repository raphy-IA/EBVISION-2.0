const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';

/**
 * Middleware pour gérer l'authentification via cookies httpOnly
 * Plus sécurisé que localStorage car protégé contre XSS
 */

// Configuration des cookies sécurisés
// Configuration des cookies sécurisés
const cookieOptions = {
    httpOnly: true,        // Empêche l'accès JavaScript (protection XSS)
    // HTTPS uniquement si configuré ou en production, mais désactivable via COOKIE_SECURE=false
    secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
    sameSite: 'lax',       // Changé de 'strict' à 'lax' pour assurer la persistance lors des redirections
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

    console.log(`✅ Cookies d'authentification définis pour ${user.email} (Secure: ${cookieOptions.secure}, SameSite: ${cookieOptions.sameSite})`);
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
 * Amélioré pour être plus robuste face aux tokens expirés/zombies.
 */
const authenticateHybrid = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies.authToken;

    let tokenToVerify = null;
    let fallbackAvailable = false;

    // Stratégie : Essayer d'abord le token qui semble le plus frais/valide
    // Si l'un échoue, on tente l'autre au lieu de rejeter immédiatement.

    const tryVerify = (token, source) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            if (process.env.NODE_ENV !== 'production') {
                console.log(`🔑 Auth réussie via ${source} pour ${decoded.email}`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Erreur token (${source}):`, error.message);
            if (source === 'cookie') clearAuthCookies(res);
            return false;
        }
    };

    // 1. Tenter le cookie d'abord (plus sécurisé)
    if (cookieToken) {
        if (tryVerify(cookieToken, 'cookie')) return next();
        fallbackAvailable = true;
    }

    // 2. Tenter le header si le cookie a échoué ou est absent
    if (headerToken) {
        if (tryVerify(headerToken, 'header')) return next();
    }

    // Si on arrive ici, aucun token n'est valide
    console.warn('⚠️ Accès refusé : aucun token valide trouvé');
    return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide ou expiré. Veuillez vous reconnecter.',
        expired: true
    });
};

module.exports = {
    setAuthCookie,
    clearAuthCookies,
    authenticateCookie,
    authenticateHybrid,
    cookieOptions
};





















