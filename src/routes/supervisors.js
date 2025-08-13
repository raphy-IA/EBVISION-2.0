const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// GET /api/supervisors/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT ts.supervisor_id) AS total_supervisors,
                    COUNT(DISTINCT ts.collaborateur_id) AS total_collaborateurs,
                    COUNT(*) AS total_relations
                FROM time_sheet_supervisors ts
            `;
            const { rows } = await client.query(statsQuery);
            const row = rows[0] || {};
            return res.json({
                success: true,
                data: {
                    total_supervisors: Number(row.total_supervisors || 0),
                    total_collaborateurs: Number(row.total_collaborateurs || 0),
                    total_relations: Number(row.total_relations || 0),
                    pending_approvals: 0
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Erreur /api/supervisors/stats:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors du chargement des statistiques' });
    }
});

// GET /api/supervisors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            const query = `
                SELECT c.id, c.nom, c.prenom, c.email, bu.nom AS business_unit_nom
                FROM collaborateurs c
                LEFT JOIN business_units bu ON bu.id = c.business_unit_id
                WHERE c.statut = 'ACTIF'
                ORDER BY c.nom, c.prenom
            `;
            const { rows } = await client.query(query);
            return res.json({ success: true, data: rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Erreur /api/supervisors:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors du chargement des superviseurs' });
    }
});

// GET /api/supervisors/relations
router.get('/relations', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    ts.id,
                    ts.collaborateur_id,
                    ts.supervisor_id,
                    c.nom AS collaborateur_nom,
                    c.prenom AS collaborateur_prenom,
                    s.nom AS supervisor_nom,
                    s.prenom AS supervisor_prenom,
                    ts.created_at
                FROM time_sheet_supervisors ts
                JOIN collaborateurs c ON c.id = ts.collaborateur_id
                JOIN collaborateurs s ON s.id = ts.supervisor_id
                ORDER BY s.nom, s.prenom, c.nom, c.prenom
            `;
            const { rows } = await client.query(query);
            return res.json({ success: true, data: rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Erreur /api/supervisors/relations:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors du chargement des relations' });
    }
});

// POST /api/supervisors/relations
router.post('/relations', authenticateToken, async (req, res) => {
    try {
        const { supervisor_id, collaborateur_ids } = req.body || {};
        if (!supervisor_id || !Array.isArray(collaborateur_ids) || collaborateur_ids.length === 0) {
            return res.status(400).json({ success: false, error: 'supervisor_id et collaborateur_ids requis' });
        }

        const client = await pool.connect();
        try {
            // Vérifier que le superviseur existe
            const supCheck = await client.query('SELECT id FROM collaborateurs WHERE id = $1 AND statut = $2', [supervisor_id, 'ACTIF']);
            if (supCheck.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Superviseur non trouvé' });
            }

            // Vérifier que tous les collaborateurs existent
            const collCheck = await client.query('SELECT id FROM collaborateurs WHERE id = ANY($1) AND statut = $2', [collaborateur_ids, 'ACTIF']);
            if (collCheck.rowCount !== collaborateur_ids.length) {
                return res.status(404).json({ success: false, error: 'Un ou plusieurs collaborateurs non trouvés' });
            }

            // Insérer relations (ignorer doublons)
            for (const collabId of collaborateur_ids) {
                if (collabId === supervisor_id) continue;
                await client.query(
                    `INSERT INTO time_sheet_supervisors (collaborateur_id, supervisor_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [collabId, supervisor_id]
                );
            }

            return res.json({ success: true, message: 'Relations créées avec succès' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Erreur POST /api/supervisors/relations:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors de la création des relations' });
    }
});

// DELETE /api/supervisors/relations/:id
router.delete('/relations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            const del = await client.query('DELETE FROM time_sheet_supervisors WHERE id = $1 RETURNING id', [id]);
            if (del.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Relation non trouvée' });
            }
            return res.json({ success: true, message: 'Relation supprimée avec succès' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Erreur DELETE /api/supervisors/relations/:id:', error);
        return res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
});

module.exports = router;
