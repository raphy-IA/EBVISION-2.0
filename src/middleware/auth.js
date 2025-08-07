const jwt = require('jsonwebtoken');

// Clé secrète pour le développement (à changer en production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Fonction pour générer un token JWT
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            permissions: user.permissions || ['users:read', 'users:create', 'users:update', 'users:delete']
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Fonction pour vérifier un token JWT
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token vérifié:', decoded.id);
        return decoded;
    } catch (error) {
        console.error('❌ Erreur token:', error.message);
        // DÉSACTIVER LE FALLBACK POUR TESTER LA VRAIE AUTHENTIFICATION
        console.log('⚠️ Token invalide, pas de fallback');
        return null;
    }
};

// Middleware d'authentification avec vérification réelle des tokens
const authenticateToken = (req, res, next) => {
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
            message: 'Token invalide ou expiré'
        });
    }

    req.user = decoded;
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

        // Vérifier si l'utilisateur a des permissions ou est admin
        const userPermissions = req.user.permissions || [];
        const userRole = req.user.role || req.user.grade || '';
        
        // Pour le développement, permettre l'accès à tous les utilisateurs connectés
        // Vérifier si l'utilisateur est connecté (a un ID)
        if (req.user.id || req.user.userId) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'Permission insuffisante'
            });
        }
    };
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