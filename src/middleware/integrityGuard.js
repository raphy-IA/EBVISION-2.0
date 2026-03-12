const SystemRegistry = require('../services/systemRegistry');

/**
 * Middleware d'intégrité (Garde de Licence)
 * Vérifie l'état de la licence à chaque requête sensible.
 */
const integrityGuard = async (req, res, next) => {
    // Si c'est la route de santé ou de diagnostic de licence, laissez passer
    if (req.path.startsWith('/api/health') || req.path.startsWith('/api/license/refresh')) {
        return next();
    }

    try {
        const isActive = await SystemRegistry.checkIntegrity();
        
        if (!isActive) {
            console.warn('[Security] Accès refusé : Système non autorisé ou licence expirée.');
            return res.status(403).json({
                success: false,
                code: 'LICENSE_EXPIRED',
                message: "L'autorisation d'utilisation de ce logiciel a expiré ou a été suspendue. Veuillez contacter l'administrateur système (EB-Vision Support).",
                contact: "https://support.eb-vision.com"
            });
        }
        
        next();
    } catch (error) {
        console.error('[Security] Erreur middleware intégrité:', error);
        // En cas d'erreur de vérification (base de données inaccessible ?), on laisse passer pour éviter une interruption accidentelle
        next();
    }
};

module.exports = { integrityGuard };
