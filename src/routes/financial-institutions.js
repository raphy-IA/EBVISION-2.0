const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// Appliquer l'authentification
router.use(authenticateToken);

/**
 * GET /api/financial-institutions
 * Liste des établissements financiers
 */
router.get('/', async (req, res) => {
    try {
        const { type, is_active } = req.query;

        let query = 'SELECT * FROM financial_institutions WHERE 1=1';
        const params = [];

        if (type) {
            params.push(type);
            query += ` AND type = $${params.length}`;
        }

        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` AND is_active = $${params.length}`;
        }

        query += ' ORDER BY name';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erreur récupération établissements:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/financial-institutions
 * Créer un établissement financier
 */
router.post('/', async (req, res) => {
    try {
        // Vérifier que l'utilisateur est Admin
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Seul un administrateur peut créer un établissement financier'
            });
        }

        const { code, name, type, country, swift_code } = req.body;

        if (!code || !name) {
            return res.status(400).json({
                success: false,
                error: 'Le code et le nom sont obligatoires'
            });
        }

        const query = `
            INSERT INTO financial_institutions (code, name, type, country, swift_code)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [
            code,
            name,
            type || 'BANK',
            country || 'CMR',
            swift_code
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Établissement financier créé'
        });

    } catch (error) {
        console.error('Erreur création établissement:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                error: 'Un établissement avec ce code existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
