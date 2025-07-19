const jwt = require('jsonwebtoken');

// Clé secrète pour le développement (à changer en production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';

// Middleware d'authentification simplifié
const authenticateToken = (req, res, next) => {
    // Pour le développement, on accepte toutes les requêtes
    // En production, on vérifierait le token JWT
    req.user = {
        id: 'dev-user-id',
        email: 'admin@trs.com',
        nom: 'Admin',
        prenom: 'TRS',
        role: 'ADMIN',
        permissions: ['*'] // Toutes les permissions
    };
    next();
};

// Middleware de vérification des permissions
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        // Pour le développement, on accepte tout
        // En production, on vérifierait les permissions spécifiques
        if (req.user.permissions.includes('*') || req.user.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'Permission insuffisante'
            });
        }
    };
};

// Générer un token JWT
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Vérifier un token JWT
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Middleware d'authentification avec token (pour une utilisation future)
const authenticateWithToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token d\'authentification manquant'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Token invalide'
        });
    }

    req.user = decoded;
    next();
};

// Middleware de vérification des rôles
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        // Pour le développement, on accepte tout
        // En production, on vérifierait les rôles spécifiques
        if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'Rôle insuffisant'
            });
        }
    };
};

module.exports = {
    authenticateToken,
    authenticateWithToken,
    requirePermission,
    requireRole,
    generateToken,
    verifyToken,
    JWT_SECRET
}; 