const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/photos';
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom de fichier unique avec timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'collaborateur-' + uniqueSuffix + ext);
    }
});

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    // Vérifier le type MIME
    if (file.mimetype.startsWith('image/')) {
        // Vérifier l'extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP.'), false);
        }
    } else {
        cb(new Error('Seules les images sont autorisées.'), false);
    }
};

// Configuration de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 1 // Un seul fichier à la fois
    }
});

// Middleware pour traiter et redimensionner l'image
const processImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const filePath = req.file.path;
        const fileName = req.file.filename;
        
        // Redimensionner l'image à 300x300 pixels avec un crop centré
        await sharp(filePath)
            .resize(300, 300, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 })
            .toFile(path.join('uploads/photos', 'thumb_' + fileName));
        
        // Créer aussi une version plus petite pour les avatars (100x100)
        await sharp(filePath)
            .resize(100, 100, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(path.join('uploads/photos', 'avatar_' + fileName));
        
        // Supprimer le fichier original
        fs.unlinkSync(filePath);
        
        // Mettre à jour le chemin du fichier
        req.file.filename = fileName;
        req.file.path = path.join('uploads/photos', 'thumb_' + fileName);
        req.file.avatarPath = path.join('uploads/photos', 'avatar_' + fileName);
        
        next();
    } catch (error) {
        console.error('Erreur lors du traitement de l\'image:', error);
        
        // Supprimer le fichier en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(400).json({
            success: false,
            error: 'Erreur lors du traitement de l\'image',
            details: error.message
        });
    }
};

// Middleware pour supprimer une photo existante
const deleteExistingPhoto = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const collaborateurId = req.params.id || req.body.collaborateur_id;
        
        if (collaborateurId) {
            const { pool } = require('../utils/database');
            const result = await pool.query(
                'SELECT photo_url FROM collaborateurs WHERE id = $1',
                [collaborateurId]
            );
            
            if (result.rows.length > 0 && result.rows[0].photo_url) {
                const oldPhotoPath = result.rows[0].photo_url;
                
                // Supprimer les fichiers existants
                const filesToDelete = [
                    oldPhotoPath,
                    oldPhotoPath.replace('thumb_', 'avatar_'),
                    oldPhotoPath.replace('avatar_', 'thumb_')
                ];
                
                filesToDelete.forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log('🗑️ Fichier supprimé:', filePath);
                    }
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'ancienne photo:', error);
        next(); // Continuer même en cas d'erreur
    }
};

module.exports = {
    upload: upload.single('photo'),
    processImage,
    deleteExistingPhoto
};

