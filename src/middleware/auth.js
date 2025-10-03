const jwt = require('jsonwebtoken');

// Clé secrète pour le développement (à changer en production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Fonction pour générer un token JWT
const generateToken = (user, userRoles = []) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            roles: userRoles, // Rôles multiples au lieu d'un seul rôle
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

        // Vérifier si l'utilisateur a des permissions
        const userPermissions = req.user.permissions || [];
        const userRoles = req.user.roles || []; // Rôles multiples
        
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

// Hiérarchie des rôles (du plus élevé au plus bas)
const ROLE_HIERARCHY = {
    'SUPER_ADMIN': 10,
    'ADMIN': 9,
    'ADMIN_IT': 8,
    'ASSOCIE': 7,          // Partenaire/Associé
    'DIRECTEUR': 6,        // Directeur
    'MANAGER': 5,
    'SUPERVISEUR': 4,
    'CONSULTANT': 3,
    'COLLABORATEUR': 2,
    'USER': 1
};

/**
 * Middleware de vérification des rôles basé uniquement sur user_roles
 * Plus de notion de "rôle principal" - tous les rôles sont égaux
 * L'accès est accordé si l'utilisateur a AU MOINS UN des rôles requis
 */
const requireRole = (roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        try {
            // Convertir roles en array si c'est une string
            const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
            console.log(`🔍 [requireRole] Vérification des rôles pour l'utilisateur ${req.user.id}`);
            console.log(`   Rôles requis:`, requiredRoles);
            
            // Récupérer TOUS les rôles de l'utilisateur depuis user_roles
            const { pool } = require('../utils/database');
            const userRolesQuery = `
                SELECT r.name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
            `;
            
            const userRolesResult = await pool.query(userRolesQuery, [req.user.id]);
            const userRoles = userRolesResult.rows.map(row => row.name);
            
            console.log(`   Rôles de l'utilisateur:`, userRoles);
            
            // SUPER_ADMIN a accès à tout
            if (userRoles.includes('SUPER_ADMIN')) {
                console.log(`   ✅ Accès accordé (SUPER_ADMIN)`);
                return next();
            }
            
            // Vérifier si l'utilisateur a au moins un des rôles requis
            // On utilise la hiérarchie: si l'utilisateur a un rôle de niveau supérieur, il a accès
            let hasAccess = false;
            
            for (const userRole of userRoles) {
                const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
                
                for (const requiredRole of requiredRoles) {
                    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
                    
                    if (userRoleLevel >= requiredRoleLevel) {
                        hasAccess = true;
                        console.log(`   ✅ Accès accordé (${userRole} >= ${requiredRole})`);
                        break;
                    }
                }
                
                if (hasAccess) break;
            }
            
            if (hasAccess) {
                next();
            } else {
                console.log(`   ❌ Accès refusé`);
                res.status(403).json({
                    success: false,
                    message: 'Rôle insuffisant',
                    userRoles: userRoles,
                    requiredRoles: requiredRoles
                });
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des rôles:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification des permissions'
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