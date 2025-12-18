const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { authenticateToken } = require('../middleware/auth');

// Setup storage
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        // Create directory structure: uploads/missions/YYYY/MM
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const uploadDir = path.join(process.cwd(), 'uploads', 'missions', `${year}`, `${month}`);

        try {
            await fs.ensureDir(uploadDir);
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        // Sanitize filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept documents and images
    if (file.mimetype.match(/^application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)|image\//)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non supporté'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

/**
 * POST /api/documents/upload
 * Upload a single file
 */
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        console.log('📝 Upload request received');
        console.log('Headers Content-Type:', req.headers['content-type']);
        console.log('File:', req.file);

        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
        }

        // Return relative path for storage in DB
        // Path should start with /uploads so it can be served statically
        const relativePath = '/uploads' + req.file.path.split('uploads')[1].replace(/\\/g, '/');

        res.json({
            success: true,
            data: {
                path: relativePath,
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
