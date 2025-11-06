const express = require('express');
const router = express.Router();
const { getBrandingService } = require('../services/brandingService');
const { authenticateToken } = require('../middleware/auth');

/**
 * Routes API pour la gestion du branding white-label
 */

/**
 * GET /api/branding/config
 * Récupère la configuration de branding active
 * Public - Accessible sans authentification pour la page de login
 */
router.get('/config', (req, res) => {
    try {
        const brandingService = getBrandingService();
        const config = brandingService.getCurrentBrand();
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la configuration'
        });
    }
});

/**
 * GET /api/branding/config/:brandId
 * Récupère une configuration de branding spécifique
 * Authentification requise
 */
router.get('/config/:brandId', authenticateToken, (req, res) => {
    try {
        const { brandId } = req.params;
        const brandingService = getBrandingService();
        const config = brandingService.loadBrandConfig(brandId);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuration introuvable'
            });
        }
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

/**
 * GET /api/branding/list
 * Liste tous les brandings disponibles
 * Authentification requise - Admin seulement
 */
router.get('/list', authenticateToken, (req, res) => {
    try {
        // Vérifier les permissions admin
        const userRoles = req.user.roles || [req.user.role];
        const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('DIRECTEUR');
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé - Droits administrateur requis'
            });
        }

        const brandingService = getBrandingService();
        const brands = brandingService.listAvailableBrands();
        
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('Erreur lors de la liste des brandings:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

/**
 * POST /api/branding/set/:brandId
 * Change le branding actif
 * Authentification requise - Admin seulement
 */
router.post('/set/:brandId', authenticateToken, (req, res) => {
    try {
        // Vérifier les permissions admin
        const userRoles = req.user.roles || [req.user.role];
        const isAdmin = userRoles.includes('SUPER_ADMIN');
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé - Droits Super Admin requis'
            });
        }

        const { brandId } = req.params;
        const brandingService = getBrandingService();
        
        const success = brandingService.setBrand(brandId);
        
        if (success) {
            res.json({
                success: true,
                message: `Branding changé vers: ${brandId}`
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Impossible de changer le branding'
            });
        }
    } catch (error) {
        console.error('Erreur lors du changement de branding:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

/**
 * POST /api/branding/create
 * Crée une nouvelle configuration client
 * Authentification requise - Super Admin seulement
 */
router.post('/create', authenticateToken, (req, res) => {
    try {
        // Vérifier les permissions super admin
        const userRoles = req.user.roles || [req.user.role];
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
        
        if (!isSuperAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé - Droits Super Admin requis'
            });
        }

        const { clientId, config } = req.body;
        
        if (!clientId || !config) {
            return res.status(400).json({
                success: false,
                error: 'clientId et config sont requis'
            });
        }

        const brandingService = getBrandingService();
        
        // Valider la configuration
        const validation = brandingService.validateConfig(config);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Configuration invalide',
                details: validation.errors
            });
        }

        const success = brandingService.createClientBranding(clientId, config);
        
        if (success) {
            res.json({
                success: true,
                message: `Configuration créée pour: ${clientId}`,
                clientId
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Impossible de créer la configuration'
            });
        }
    } catch (error) {
        console.error('Erreur lors de la création de la configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

/**
 * DELETE /api/branding/cache/:brandId?
 * Invalide le cache du branding
 * Authentification requise - Admin seulement
 */
router.delete('/cache/:brandId?', authenticateToken, (req, res) => {
    try {
        // Vérifier les permissions admin
        const userRoles = req.user.roles || [req.user.role];
        const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('DIRECTEUR');
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé - Droits administrateur requis'
            });
        }

        const { brandId } = req.params;
        const brandingService = getBrandingService();
        
        brandingService.invalidateCache(brandId);
        
        res.json({
            success: true,
            message: brandId ? `Cache invalidé pour: ${brandId}` : 'Cache complet invalidé'
        });
    } catch (error) {
        console.error('Erreur lors de l\'invalidation du cache:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

module.exports = router;




