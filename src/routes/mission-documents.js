const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MissionDocument = require('../models/MissionDocument');
const Mission = require('../models/Mission');
const MissionType = require('../models/MissionType');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// --- Storage Config (Reuse existing upload logic if possible or define here) ---
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET /api/mission-documents/:missionId/tree
router.get('/:missionId/tree', authenticateToken, async (req, res) => {
    try {
        const { missionId } = req.params;

        let documents = await MissionDocument.findAllByMissionId(missionId);

        // If tree is empty, check if we should initialize it from MissionType default structure
        if (documents.length === 0) {
            console.log(`📂 Tree is empty for mission ${missionId}. Attempting to generate default structure.`);
            const mission = await Mission.findById(missionId);

            if (mission) {
                console.log(`✅ Mission found: ${mission.id}, Type: ${mission.mission_type_id}`);

                if (mission.mission_type_id) {
                    const missionType = await MissionType.findById(mission.mission_type_id);
                    console.log(`📋 Mission Type found: ${missionType ? missionType.libelle : 'null'}`);

                    if (missionType && missionType.default_folder_structure) {
                        console.log(`🛠 Generatng structure from template: ${JSON.stringify(missionType.default_folder_structure).substring(0, 50)}...`);

                        // Recursively create folders from template
                        // Helper function for recursion
                        const createNodes = async (nodes, parentId) => {
                            for (const node of nodes) {
                                try {
                                    const created = await MissionDocument.create({
                                        mission_id: missionId,
                                        parent_id: parentId,
                                        name: node.name,
                                        type: node.type,
                                        created_by: req.user ? req.user.id : null,
                                        // Use locking from JSON if specified, otherwise default to true for template items
                                        is_locked: node.is_locked !== undefined ? node.is_locked : true
                                    });
                                    if (node.children && node.children.length > 0) {
                                        await createNodes(node.children, created.id);
                                    }
                                } catch (err) {
                                    console.error('❌ Error creating node during generation:', err);
                                }
                            }
                        };

                        await createNodes(missionType.default_folder_structure, null);
                        console.log('✅ Structure generation complete.');

                        // Refetch documents
                        documents = await MissionDocument.findAllByMissionId(missionId);
                        console.log(`📂 New document count: ${documents.length}`);
                    } else {
                        console.log('⚠️ No default_folder_structure found for this Mission Type.');
                    }
                } else {
                    console.log('⚠️ Mission has no mission_type_id.');
                }
            } else {
                console.log('❌ Mission not found in DB.');
            }
        } else {
            console.log(`📂 Tree already exists (${documents.length} nodes). Skipping generation.`);
        }

        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('Error fetching mission document tree:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/mission-documents/node
// Create just a folder or file node
router.post('/node', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { mission_id, parent_id, name, type } = req.body;

        let file_path = null;
        let mime_type = null;
        let size = null;

        if (req.file) {
            // It's a file upload
            file_path = '/uploads' + req.file.path.split('uploads')[1].replace(/\\/g, '/');
            mime_type = req.file.mimetype;
            size = req.file.size;
        }

        const newNode = await MissionDocument.create({
            mission_id,
            parent_id: parent_id || null,
            name: name || (req.file ? req.file.originalname : 'New Folder'),
            type: type || (req.file ? 'file' : 'folder'),
            file_path,
            mime_type,
            size,
            created_by: req.user.id
        });

        res.json({ success: true, data: newNode });
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/mission-documents/node/:id
// Rename or Move
router.put('/node/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parent_id } = req.body;

        const node = await MissionDocument.findById(id);
        if (!node) return res.status(404).json({ success: false, error: 'Node not found' });

        if (node.is_locked) {
            return res.status(403).json({ success: false, error: 'Ce dossier ou fichier système ne peut pas être modifié.' });
        }

        const updatedNode = await MissionDocument.update(id, { name, parent_id });
        res.json({ success: true, data: updatedNode });
    } catch (error) {
        console.error('Error updating node:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /api/mission-documents/node/:id
router.delete('/node/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const node = await MissionDocument.findById(id);
        if (!node) return res.status(404).json({ success: false, error: 'Node not found' });

        if (node.is_locked) {
            return res.status(403).json({ success: false, error: 'Ce dossier ou fichier système ne peut pas être supprimé.' });
        }

        // Check if folder has children? ON DELETE CASCADE handles it in DB, but files on disk remain.
        // For now, let DB handle structure cleanup. File cleanup is a separate maintenance task.
        await MissionDocument.delete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
