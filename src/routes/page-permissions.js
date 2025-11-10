const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

/**
 * POST /api/auth/check-page-permission
 * Vérifier si l'utilisateur peut accéder à une page
 */
router.post('/check-page-permission', authenticateToken, async (req, res) => {
    try {
        const { pageName } = req.body;
        
        console.log('🔐 [check-page-permission] Vérification d\'accès pour:', pageName);
        console.log('   👤 User ID:', req.user.id);
        console.log('   📋 req.user.role:', req.user.role);
        console.log('   📋 req.user.roles:', req.user.roles);
        
        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'Nom de page requis'
            });
        }

        // SUPER_ADMIN a accès à tout
        // Vérifier à la fois req.user.role (string) et req.user.roles (array)
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || 
                            (req.user.roles && req.user.roles.includes('SUPER_ADMIN'));
        
        console.log('   🔍 isSuperAdmin:', isSuperAdmin);
        
        if (isSuperAdmin) {
            console.log('   ✅ Accès autorisé (SUPER_ADMIN)');
            return res.json({
                success: true,
                message: 'Accès autorisé (SUPER_ADMIN)',
                pageName
            });
        }

        // Vérifier les permissions par défaut
        const defaultPermissions = {
            'users': ['SUPER_ADMIN', 'ADMIN', 'ADMIN_IT'],
            'permissions-admin': ['SUPER_ADMIN', 'ADMIN', 'ADMIN_IT'],
            'dashboard-direction': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'dashboard-rentabilite': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'invoices': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'taux-horaires': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'reports': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'analytics': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'missions': ['SUPER_ADMIN', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'collaborateurs': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'dashboard': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'time-sheet': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN'],
            'prospecting': ['SUPER_ADMIN', 'USER', 'MANAGER', 'DIRECTOR', 'PARTNER', 'ADMIN']
        };

        const allowedRoles = defaultPermissions[pageName];
        if (allowedRoles && req.user.roles && req.user.roles.some(role => allowedRoles.includes(role))) {
            return res.json({
                success: true,
                message: 'Accès autorisé par rôle par défaut',
                pageName,
                userRoles: req.user.roles
            });
        }

        // Si la page n'est pas dans la liste, accès par défaut pour tous les utilisateurs authentifiés
        if (!allowedRoles) {
            return res.json({
                success: true,
                message: 'Accès autorisé par défaut',
                pageName,
                userRoles: req.user.roles
            });
        }

        return res.status(403).json({
            success: false,
            message: 'Accès non autorisé à cette page',
            pageName,
            userRoles: req.user.roles,
            requiredRoles: allowedRoles
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des permissions de page:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification des permissions'
        });
    }
});

module.exports = router;
