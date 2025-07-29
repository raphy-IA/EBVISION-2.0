const express = require('express');
const router = express.Router();
const OpportunityType = require('../models/OpportunityType');
const { authenticateToken } = require('../middleware/auth');

// GET /api/opportunity-types - Récupérer tous les types d'opportunités
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                ot.id,
                ot.nom,
                ot.code,
                ot.description,
                ot.couleur,
                ot.created_at,
                ot.updated_at,
                COUNT(o.id) as nombre_opportunites
            FROM opportunity_types ot
            LEFT JOIN opportunities o ON ot.id = o.opportunity_type_id
            GROUP BY ot.id, ot.nom, ot.code, ot.description, ot.couleur, ot.created_at, ot.updated_at
            ORDER BY ot.nom ASC
        `;
        
        const { rows } = await pool.query(query);
        
        res.json({
            success: true,
            data: {
                opportunityTypes: rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des types d\'opportunités:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des types d\'opportunités'
        });
    }
});

// GET /api/opportunity-types/:id - Récupérer un type par ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const type = await OpportunityType.findById(req.params.id);
        if (!type) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: {
                type: type
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du type d\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du type d\'opportunité'
        });
    }
});

// POST /api/opportunity-types - Créer un nouveau type
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const {
            nom,
            code,
            description,
            couleur,
            templates
        } = req.body;

        if (!nom) {
            return res.status(400).json({
                success: false,
                error: 'Le nom est obligatoire'
            });
        }

        // Créer le type
        const insertQuery = `
            INSERT INTO opportunity_types (nom, code, description, couleur)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            nom,
            code,
            description,
            couleur
        ]);

        const newType = result.rows[0];

        // Ajouter les templates si fournis
        if (templates && Array.isArray(templates)) {
            for (const template of templates) {
                await pool.query(`
                    INSERT INTO opportunity_stage_templates 
                    (opportunity_type_id, nom, description, stage_order, duree_jours)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    newType.id,
                    template.nom,
                    template.description,
                    template.stage_order,
                    template.duree_jours
                ]);
            }
        }

        res.status(201).json({
            success: true,
            data: {
                opportunityType: newType
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création du type d\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du type d\'opportunité'
        });
    }
});

// PUT /api/opportunity-types/:id - Mettre à jour un type
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const {
            nom,
            code,
            description,
            couleur,
            templates
        } = req.body;

        if (!nom) {
            return res.status(400).json({
                success: false,
                error: 'Le nom est obligatoire'
            });
        }

        // Vérifier si le type existe
        const existingType = await pool.query(
            'SELECT id FROM opportunity_types WHERE id = $1',
            [req.params.id]
        );

        if (existingType.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }

        // Mettre à jour le type
        const updateQuery = `
            UPDATE opportunity_types SET
                nom = $1,
                code = $2,
                description = $3,
                couleur = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const updateResult = await pool.query(updateQuery, [
            nom,
            code,
            description,
            couleur,
            req.params.id
        ]);

        // Mettre à jour les templates si fournis
        if (templates && Array.isArray(templates)) {
            // Supprimer les anciens templates
            await pool.query(
                'DELETE FROM opportunity_stage_templates WHERE opportunity_type_id = $1',
                [req.params.id]
            );

            // Ajouter les nouveaux templates
            for (const template of templates) {
                await pool.query(`
                    INSERT INTO opportunity_stage_templates 
                    (opportunity_type_id, nom, description, stage_order, duree_jours)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    req.params.id,
                    template.nom,
                    template.description,
                    template.stage_order,
                    template.duree_jours
                ]);
            }
        }

        res.json({
            success: true,
            data: {
                opportunityType: updateResult.rows[0]
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du type:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du type'
        });
    }
});

// DELETE /api/opportunity-types/:id - Supprimer un type
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        // Vérifier s'il y a des opportunités utilisant ce type
        const opportunitiesCount = await pool.query(
            'SELECT COUNT(*) FROM opportunities WHERE opportunity_type_id = $1',
            [req.params.id]
        );

        if (parseInt(opportunitiesCount.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de supprimer ce type car il est utilisé par des opportunités'
            });
        }

        // Supprimer les templates associés
        await pool.query(
            'DELETE FROM opportunity_stage_templates WHERE opportunity_type_id = $1',
            [req.params.id]
        );

        // Supprimer le type
        const result = await pool.query(
            'DELETE FROM opportunity_types WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Type d\'opportunité supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du type:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du type'
        });
    }
});

// GET /api/opportunity-types/:id/templates - Récupérer les templates d'étapes d'un type
router.get('/:id/templates', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            SELECT 
                id,
                nom,
                description,
                stage_order,
                duree_jours,
                created_at,
                updated_at
            FROM opportunity_stage_templates 
            WHERE opportunity_type_id = $1
            ORDER BY stage_order ASC
        `;
        
        const { rows } = await pool.query(query, [req.params.id]);
        
        res.json({
            success: true,
            data: {
                templates: rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des templates:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des templates'
        });
    }
});

module.exports = router; 