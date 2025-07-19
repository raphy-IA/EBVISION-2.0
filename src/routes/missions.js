const express = require('express');
const router = express.Router();

/**
 * GET /api/missions
 * Récupérer toutes les missions avec pagination et filtres
 */
router.get('/', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            client_id: req.query.client_id,
            statut: req.query.statut,
            type_mission: req.query.type_mission,
            search: req.query.search
        };

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (options.client_id) {
            whereConditions.push(`m.client_id = $${paramIndex++}`);
            queryParams.push(options.client_id);
        }

        if (options.statut) {
            whereConditions.push(`m.statut = $${paramIndex++}`);
            queryParams.push(options.statut);
        }

        if (options.type_mission) {
            whereConditions.push(`m.type_mission = $${paramIndex++}`);
            queryParams.push(options.type_mission);
        }

        if (options.search) {
            whereConditions.push(`(
                m.titre ILIKE $${paramIndex} OR 
                m.description ILIKE $${paramIndex} OR
                c.nom ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${options.search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (options.page - 1) * options.limit;
        const dataQuery = `
            SELECT m.*, c.nom as client_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            ${whereClause}
            ORDER BY m.date_creation DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(options.limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages: Math.ceil(total / options.limit)
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des missions',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id
 * Récupérer une mission par ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT m.*, c.nom as client_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE m.id = $1
        `;
        
        const result = await pool.query(query, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la mission',
            details: error.message
        });
    }
});

/**
 * POST /api/missions
 * Créer une nouvelle mission
 */
router.post('/', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const { titre, description, client_id, statut, type_mission, date_debut, date_fin_prevue, budget_prevue } = req.body;
        
        const query = `
            INSERT INTO missions (
                titre, description, client_id, statut, type_mission, 
                date_debut, date_fin_prevue, budget_prevue
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, client_id, statut || 'en_cours', type_mission,
            date_debut, date_fin_prevue, budget_prevue
        ]);
        
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Mission créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de la mission',
            details: error.message
        });
    }
});

/**
 * PUT /api/missions/:id
 * Mettre à jour une mission
 */
router.put('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const { titre, description, client_id, statut, type_mission, date_debut, date_fin_prevue, budget_prevue } = req.body;
        
        const query = `
            UPDATE missions SET
                titre = $1,
                description = $2,
                client_id = $3,
                statut = $4,
                type_mission = $5,
                date_debut = $6,
                date_fin_prevue = $7,
                budget_prevue = $8,
                date_modification = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, client_id, statut, type_mission,
            date_debut, date_fin_prevue, budget_prevue, req.params.id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Mission mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la mission',
            details: error.message
        });
    }
});

/**
 * DELETE /api/missions/:id
 * Supprimer une mission
 */
router.delete('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const result = await pool.query('DELETE FROM missions WHERE id = $1', [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Mission supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de la mission',
            details: error.message
        });
    }
});

module.exports = router; 