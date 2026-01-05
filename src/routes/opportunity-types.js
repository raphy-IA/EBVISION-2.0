const express = require('express');
const router = express.Router();
const OpportunityType = require('../models/OpportunityType');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/opportunity-types:
 *   get:
 *     summary: Récupérer tous les types d'opportunités
 *     tags: [Opportunités]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des types d'opportunités
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     opportunityTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nom:
 *                             type: string
 *                           code:
 *                             type: string
 *                           description:
 *                             type: string
 */
// GET /api/opportunity-types - Récupérer tous les types d'opportunités
router.get('/', async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                ot.id,
                ot.name,
                ot.nom,
                ot.code,
                ot.description,
                ot.couleur,
                ot.default_probability,
                ot.default_duration_days,
                ot.created_at,
                ot.updated_at,
                COUNT(o.id) as nombre_opportunites
            FROM opportunity_types ot
            LEFT JOIN opportunities o ON ot.id = o.opportunity_type_id
            WHERE ot.is_active = true
            GROUP BY ot.id, ot.name, ot.nom, ot.code, ot.description, ot.couleur, ot.default_probability, ot.default_duration_days, ot.created_at, ot.updated_at
            ORDER BY COALESCE(ot.nom, ot.name) ASC
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
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                ot.id,
                ot.name,
                ot.nom,
                ot.code,
                ot.description,
                ot.couleur,
                ot.default_probability,
                ot.default_duration_days,
                ot.created_at,
                ot.updated_at
            FROM opportunity_types ot
            WHERE ot.id = $1 AND ot.is_active = true
        `;

        const result = await pool.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }

        const type = result.rows[0];

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
        console.log('📋 Données reçues dans la route POST opportunity-types:', JSON.stringify(req.body, null, 2));

        const { pool } = require('../utils/database');

        const {
            nom,
            code,
            description,
            couleur,
            default_probability,
            default_duration_days
        } = req.body;

        if (!nom) {
            return res.status(400).json({
                success: false,
                error: 'Le nom est obligatoire'
            });
        }

        // Créer le type
        const insertQuery = `
            INSERT INTO opportunity_types (name, nom, code, description, couleur, default_probability, default_duration_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        console.log('📋 Requête SQL:', insertQuery);
        console.log('📋 Valeurs à insérer:', [nom, nom, code, description, couleur, default_probability || 50, default_duration_days || 30]);

        const result = await pool.query(insertQuery, [
            nom, // Utiliser nom pour name (colonne NOT NULL)
            nom, // Garder aussi nom pour la compatibilité
            code,
            description,
            couleur,
            default_probability || 50,
            default_duration_days || 30
        ]);

        const newType = result.rows[0];

        // Créer automatiquement les étapes par défaut (modèle standard)
        await createDefaultStagesForType(pool, newType.id);

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
            default_probability,
            default_duration_days,
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
                default_probability = $5,
                default_duration_days = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;

        const updateResult = await pool.query(updateQuery, [
            nom,
            code,
            description,
            couleur,
            default_probability || 50,
            default_duration_days || 30,
            req.params.id
        ]);

        // Mettre à jour les templates si fournis
        if (templates && Array.isArray(templates)) {
            // Imposer les contraintes Identification/Décision
            const maxOrder = templates.reduce((max, t) => Math.max(max, t.stage_order || 0), 0);
            const hasIdentification = templates.some(t => t.stage_order === 1 && t.nom === 'Identification');
            const hasDecision = templates.some(t => t.stage_order === maxOrder && t.nom === 'Décision');

            if (!hasIdentification || !hasDecision) {
                return res.status(400).json({
                    success: false,
                    error: 'La première étape doit être "Identification" (ordre 1) et la dernière étape doit être "Décision".'
                });
            }

            // Forcer les noms sur la première et la dernière étape pour éviter le renommage
            templates.forEach(t => {
                if (t.stage_order === 1) {
                    t.nom = 'Identification';
                }
                if (t.stage_order === maxOrder) {
                    t.nom = 'Décision';
                }
            });

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

// POST /api/opportunity-types/:id/create-default-stages - Créer les étapes par défaut pour un type
router.post('/:id/create-default-stages', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('../utils/database');

        // Vérifier que le type existe
        const typeCheck = await pool.query('SELECT * FROM opportunity_types WHERE id = $1', [id]);
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }

        // Étapes par défaut pour tous les types (modèle "vente standard")
        const defaultStages = [
            {
                stage_name: 'Identification',
                stage_order: 1,
                description: 'Identification et premier contact avec le prospect',
                min_duration_days: 1,
                max_duration_days: 7,
                is_mandatory: true,
                validation_required: true
            },
            {
                stage_name: 'Qualification',
                stage_order: 2,
                description: 'Validation du besoin, budget, décideurs et timing',
                min_duration_days: 3,
                max_duration_days: 10,
                is_mandatory: true,
                validation_required: true
            },
            {
                stage_name: 'Proposition',
                stage_order: 3,
                description: 'Production et envoi de l\'offre commerciale',
                min_duration_days: 3,
                max_duration_days: 10,
                is_mandatory: true,
                validation_required: true
            },
            {
                stage_name: 'Négociation',
                stage_order: 4,
                description: 'Convergence sur prix, périmètre, délais et conditions',
                min_duration_days: 5,
                max_duration_days: 15,
                is_mandatory: true,
                validation_required: false
            },
            {
                stage_name: 'Décision',
                stage_order: 5,
                description: 'Validation finale et signature du contrat',
                min_duration_days: 1,
                max_duration_days: 7,
                is_mandatory: true,
                validation_required: true
            }
        ];

        await pool.query('BEGIN');

        await createDefaultStagesForType(pool, id, defaultStages);

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Étapes par défaut créées avec succès'
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Erreur lors de la création des étapes par défaut:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création des étapes par défaut'
        });
    }
});

// POST /api/opportunity-types/:id/save-configuration - Sauvegarder la configuration complète
router.post('/:id/save-configuration', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('../utils/database');

        // Vérifier que le type existe
        const typeCheck = await pool.query('SELECT * FROM opportunity_types WHERE id = $1', [id]);
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Type d\'opportunité non trouvé'
            });
        }

        // Cette route peut être utilisée pour des opérations de validation ou de post-traitement
        // après la sauvegarde de la configuration via les routes workflow

        res.json({
            success: true,
            message: 'Configuration sauvegardée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde de la configuration'
        });
    }
});

// Fonctions utilitaires pour les actions et documents par défaut
function getDefaultActionsForStage(stageName) {
    const actionsMap = {
        'Identification': [
            { type: 'premier_contact', mandatory: true, order: 1 },
            { type: 'qualification_besoin', mandatory: true, order: 2 }
        ],
        'Qualification': [
            { type: 'rdv_planifie', mandatory: true, order: 1 },
            { type: 'rdv_realise', mandatory: true, order: 2 },
            { type: 'analyse_besoin_approfondie', mandatory: true, order: 3 }
        ],
        'Proposition': [
            { type: 'proposition_envoyee', mandatory: true, order: 1 }
        ],
        'Négociation': [
            { type: 'negociation_menee', mandatory: true, order: 1 },
            { type: 'conditions_acceptees', mandatory: true, order: 2 }
        ],
        'Décision': [
            { type: 'contrat_prepare', mandatory: true, order: 1 },
            { type: 'contrat_signe', mandatory: true, order: 2 }
        ]
    };

    return actionsMap[stageName] || [];
}

function getDefaultDocumentsForStage(stageName) {
    const documentsMap = {
        'Identification': [
            { type: 'fiche_prospect', mandatory: true }
        ],
        'Qualification': [
            { type: 'compte_rendu_rdv', mandatory: true },
            { type: 'presentation_cabinet', mandatory: false }
        ],
        'Proposition': [
            { type: 'proposition_commerciale', mandatory: true },
            { type: 'elements_techniques', mandatory: false }
        ],
        'Négociation': [
            { type: 'conditions_finales', mandatory: true }
        ],
        'Décision': [
            { type: 'contrat_signe', mandatory: true }
        ]
    };

    return documentsMap[stageName] || [];
}

// Créer les étapes par défaut (modèle standard) pour un type donné
async function createDefaultStagesForType(pool, opportunityTypeId, defaultStagesParam) {
    const stagesToUse = defaultStagesParam || [
        {
            stage_name: 'Identification',
            stage_order: 1,
            description: 'Identification et premier contact avec le prospect',
            min_duration_days: 1,
            max_duration_days: 7,
            is_mandatory: true,
            validation_required: true
        },
        {
            stage_name: 'Qualification',
            stage_order: 2,
            description: 'Validation du besoin, budget, décideurs et timing',
            min_duration_days: 3,
            max_duration_days: 10,
            is_mandatory: true,
            validation_required: true
        },
        {
            stage_name: 'Proposition',
            stage_order: 3,
            description: 'Production et envoi de l\'offre commerciale',
            min_duration_days: 3,
            max_duration_days: 10,
            is_mandatory: true,
            validation_required: true
        },
        {
            stage_name: 'Négociation',
            stage_order: 4,
            description: 'Convergence sur prix, périmètre, délais et conditions',
            min_duration_days: 5,
            max_duration_days: 15,
            is_mandatory: true,
            validation_required: false
        },
        {
            stage_name: 'Décision',
            stage_order: 5,
            description: 'Validation finale et signature du contrat',
            min_duration_days: 1,
            max_duration_days: 7,
            is_mandatory: true,
            validation_required: true
        }
    ];

    for (const stage of stagesToUse) {
        const stageResult = await pool.query(`
            INSERT INTO opportunity_stage_templates (
                opportunity_type_id, stage_name, stage_order, description,
                min_duration_days, max_duration_days, is_mandatory, validation_required
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [
            opportunityTypeId,
            stage.stage_name,
            stage.stage_order,
            stage.description,
            stage.min_duration_days,
            stage.max_duration_days,
            stage.is_mandatory,
            stage.validation_required
        ]);

        const stageId = stageResult.rows[0].id;

        // Ajouter les actions requises selon l'étape
        const stageActions = getDefaultActionsForStage(stage.stage_name);
        for (const action of stageActions) {
            await pool.query(`
                INSERT INTO stage_required_actions (stage_template_id, action_type, is_mandatory, validation_order)
                VALUES ($1, $2, $3, $4)
            `, [stageId, action.type, action.mandatory, action.order]);
        }

        // Ajouter les documents requis selon l'étape
        const stageDocuments = getDefaultDocumentsForStage(stage.stage_name);
        for (const doc of stageDocuments) {
            await pool.query(`
                INSERT INTO stage_required_documents (stage_template_id, document_type, is_mandatory)
                VALUES ($1, $2, $3)
            `, [stageId, doc.type, doc.mandatory]);
        }
    }
}

module.exports = router; 