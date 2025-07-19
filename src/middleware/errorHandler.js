// Middleware de gestion d'erreurs global
function errorHandler(err, req, res, next) {
    console.error('❌ Erreur:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Erreurs de validation Joi
    if (err.isJoi) {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    // Erreurs de validation Express-validator
    if (err.type === 'validation') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.errors
        });
    }

    // Erreurs d'authentification JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token invalide',
            message: 'Votre session a expiré, veuillez vous reconnecter'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expiré',
            message: 'Votre session a expiré, veuillez vous reconnecter'
        });
    }

    // Erreurs de base de données
    if (err.code === '23505') { // Violation de contrainte unique
        return res.status(409).json({
            error: 'Conflit de données',
            message: 'Cette ressource existe déjà'
        });
    }

    if (err.code === '23503') { // Violation de clé étrangère
        return res.status(400).json({
            error: 'Référence invalide',
            message: 'Impossible de supprimer cette ressource car elle est utilisée ailleurs'
        });
    }

    if (err.code === '42P01') { // Table inexistante
        return res.status(500).json({
            error: 'Erreur de base de données',
            message: 'Structure de base de données manquante'
        });
    }

    // Erreurs de fichiers
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'Fichier trop volumineux',
            message: 'La taille du fichier dépasse la limite autorisée'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Fichier inattendu',
            message: 'Type de fichier non autorisé'
        });
    }

    // Erreurs de rate limiting
    if (err.status === 429) {
        return res.status(429).json({
            error: 'Trop de requêtes',
            message: 'Vous avez dépassé la limite de requêtes, veuillez réessayer plus tard'
        });
    }

    // Erreurs personnalisées
    if (err.status) {
        return res.status(err.status).json({
            error: err.error || 'Erreur',
            message: err.message
        });
    }

    // Erreur par défaut (500)
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Erreur interne du serveur' 
        : err.message;

    res.status(statusCode).json({
        error: 'Erreur interne',
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err
        })
    });
}

module.exports = errorHandler; 