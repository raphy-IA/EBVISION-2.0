const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const Opportunity = require('../models/Opportunity');
const Client = require('../models/Client');
const Collaborateur = require('../models/Collaborateur');
const BusinessUnit = require('../models/BusinessUnit');
const OpportunityType = require('../models/OpportunityType');
const { authenticateToken } = require('../middleware/auth');
const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// GET /api/opportunities - Récupérer toutes les opportunités
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            statut, 
            client_id, 
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Récupérer les Business Units auxquelles l'utilisateur a accès
        const permissionManager = require('../utils/PermissionManager');
        const userBusinessUnits = await permissionManager.getUserBusinessUnits(req.user.id);
        const userBusinessUnitIds = userBusinessUnits.map(bu => bu.id);
        
        console.log(`🔍 Utilisateur ${req.user.id} a accès aux BU:`, userBusinessUnitIds);
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            search,
            statut,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            sortBy,
            sortOrder,
            userBusinessUnitIds // Ajouter les BU de l'utilisateur
        };

        const result = await Opportunity.findAll(options);

        res.json({
            success: true,
            data: {
                opportunities: result.opportunities.map(opp => ({
                    id: opp.id,
                    nom: opp.nom,
                    description: opp.description,
                    client_id: opp.client_id,
                    client_nom: opp.client_nom,
                    client_email: opp.client_email,
                    collaborateur_id: opp.collaborateur_id,
                    collaborateur_nom: opp.collaborateur_nom,
                    collaborateur_prenom: opp.collaborateur_prenom,
                    business_unit_id: opp.business_unit_id,
                    business_unit_nom: opp.business_unit_nom,
                    business_unit_code: opp.business_unit_code,
                    opportunity_type_id: opp.opportunity_type_id,
                    opportunity_type_nom: opp.opportunity_type_nom,
                    opportunity_type_description: opp.opportunity_type_description,
                    statut: opp.statut,
                    type_opportunite: opp.type_opportunite,
                    source: opp.source,
                    probabilite: opp.probabilite,
                    montant_estime: opp.montant_estime,
                    devise: opp.devise,
                    date_fermeture_prevue: opp.date_fermeture_prevue,
                    date_fermeture_reelle: opp.date_fermeture_reelle,
                    etape_vente: opp.etape_vente,
                    notes: opp.notes,
                    created_at: opp.created_at,
                    updated_at: opp.updated_at
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.total,
                    pages: Math.ceil(result.total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opportunités:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des opportunités'
        });
    }
});

// GET /api/opportunities/won-for-mission - Opportunités gagnées sans mission
router.get('/won-for-mission', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.*,
                c.nom as client_nom,
                c.email as client_email,
                col.nom as collaborateur_nom,
                col.prenom as collaborateur_prenom,
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                ot.name as opportunity_type_nom,
                ot.description as opportunity_type_description
            FROM opportunities o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
            WHERE o.statut IN ('GAGNEE', 'WON')
            AND NOT EXISTS (
                SELECT 1 FROM missions m WHERE m.opportunity_id = o.id
            )
            ORDER BY o.created_at DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: {
                opportunities: result.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opportunités gagnées:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des opportunités gagnées'
        });
    }
});

// GET /api/opportunities/:id - Récupérer une opportunité par ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);
        
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        // Récupérer les étapes de l'opportunité
        const stages = await opportunity.getStages();
        const stageStats = await opportunity.getStageStats();

        res.json({
            success: true,
            data: {
                opportunity: {
                    id: opportunity.id,
                    nom: opportunity.nom,
                    description: opportunity.description,
                    client_id: opportunity.client_id,
                    client_nom: opportunity.client_nom,
                    client_email: opportunity.client_email,
                    client_telephone: opportunity.client_telephone,
                    collaborateur_id: opportunity.collaborateur_id,
                    collaborateur_nom: opportunity.collaborateur_nom,
                    collaborateur_prenom: opportunity.collaborateur_prenom,
                    collaborateur_email: opportunity.collaborateur_email,
                    business_unit_id: opportunity.business_unit_id,
                    business_unit_nom: opportunity.business_unit_nom,
                    business_unit_code: opportunity.business_unit_code,
                    opportunity_type_id: opportunity.opportunity_type_id,
                    opportunity_type_nom: opportunity.opportunity_type_nom,
                    opportunity_type_description: opportunity.opportunity_type_description,
                    statut: opportunity.statut,
                    type_opportunite: opportunity.type_opportunite,
                    source: opportunity.source,
                    probabilite: opportunity.probabilite,
                    montant_estime: opportunity.montant_estime,
                    devise: opportunity.devise,
                    date_fermeture_prevue: opportunity.date_fermeture_prevue,
                    date_fermeture_reelle: opportunity.date_fermeture_reelle,
                    etape_vente: opportunity.etape_vente,
                    notes: opportunity.notes,
                    created_at: opportunity.created_at,
                    updated_at: opportunity.updated_at
                },
                stages: stages,
                stageStats: stageStats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'opportunité'
        });
    }
});

// GET /api/opportunities/:id/workflow - État complet workflow (étape, actions, documents, alertes)
router.get('/:id/workflow', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const opportunity = await Opportunity.findById(id);
        if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunité non trouvée' });

        const OpportunityStage = require('../models/OpportunityStage');
        const stages = await OpportunityStage.findByOpportunityId(id);
        const stats = await OpportunityStage.getStageStats(id);

        const { pool } = require('../utils/database');
        const actions = await pool.query(
            'SELECT * FROM opportunity_actions WHERE opportunity_id = $1 ORDER BY performed_at DESC', [id]
        );
        const documents = await pool.query(
            'SELECT * FROM opportunity_documents WHERE opportunity_id = $1 ORDER BY uploaded_at DESC', [id]
        );
        const alertsResp = await pool.query(
            `SELECT id, stage_name, stage_order, status, due_date, risk_level, priority_level
             FROM opportunity_stages WHERE opportunity_id = $1`, [id]
        );
        const now = new Date();
        const alerts = alertsResp.rows.filter(st => ((st.status !== 'COMPLETED' && st.due_date && new Date(st.due_date) < now) || (st.risk_level === 'HIGH' || st.risk_level === 'CRITICAL')));

        res.json({ success: true, data: { opportunity, stages, stats, actions: actions.rows, documents: documents.rows, alerts } });
    } catch (e) {
        console.error('Erreur workflow opportunité:', e);
        res.status(500).json({ success: false, error: 'Erreur récupération workflow' });
    }
});

// GET /api/opportunities/:id/requirements - Actions & Documents requis pour l'étape actuelle
router.get('/:id/requirements', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('../utils/database');
        const OpportunityStage = require('../models/OpportunityStage');
        const stages = await OpportunityStage.findByOpportunityId(id);
        const current = stages.find(s => s.status === 'IN_PROGRESS') || stages.find(s => s.status === 'PENDING');
        if (!current) return res.json({ success: true, data: { stage: null, requiredActions: [], requiredDocuments: [], actionCounts: {}, documentCounts: {} } });
        const ra = await pool.query('SELECT action_type, is_mandatory, validation_order FROM stage_required_actions WHERE stage_template_id = $1', [current.stage_template_id]);
        const rd = await pool.query('SELECT document_type, is_mandatory FROM stage_required_documents WHERE stage_template_id = $1', [current.stage_template_id]);
        // Comptages réalisés pour l'étape courante (ou non rattachées si stage_id null)
        const actionsCountResp = await pool.query(
            `SELECT action_type, COUNT(*)::int AS count, MAX(performed_at) AS last_performed_at
             FROM opportunity_actions
             WHERE opportunity_id = $1 AND (stage_id = $2 OR stage_id IS NULL)
             GROUP BY action_type`,
            [id, current.id]
        );
        const documentsCountResp = await pool.query(
            `SELECT document_type,
                    COUNT(*)::int AS count,
                    SUM(CASE WHEN validation_status = 'validated' THEN 1 ELSE 0 END)::int AS validated_count,
                    MAX(uploaded_at) AS last_uploaded_at
             FROM opportunity_documents
             WHERE opportunity_id = $1 AND (stage_id = $2 OR stage_id IS NULL)
             GROUP BY document_type`,
            [id, current.id]
        );
        const actionCounts = Object.fromEntries(actionsCountResp.rows.map(r => [r.action_type, r]));
        const documentCounts = Object.fromEntries(documentsCountResp.rows.map(r => [r.document_type, r]));
        res.json({ success: true, data: { stage: current, requiredActions: ra.rows, requiredDocuments: rd.rows, actionCounts, documentCounts } });
    } catch (e) {
        console.error('Erreur requirements opportunité:', e);
        res.status(500).json({ success: false, error: 'Erreur récupération requirements' });
    }
});

// POST /api/opportunities/:id/actions - Enregistrer une action (et tenter auto-validation)
router.post('/:id/actions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action_type, description, stage_id, metadata, is_validating } = req.body;
        const { pool } = require('../utils/database');
        const ins = await pool.query(
            `INSERT INTO opportunity_actions (opportunity_id, stage_id, action_type, description, performed_by, metadata, is_validating)
             VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,true)) RETURNING *`,
            [id, stage_id || null, action_type, description || null, req.user.id, metadata || {}, is_validating]
        );
        // Mise à jour last_activity
        await pool.query('UPDATE opportunities SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        // Tenter une auto-validation si une étape est en cours
        const OpportunityWorkflowService = require('../services/opportunityWorkflowService');
        if (stage_id) { await OpportunityWorkflowService.validateStageRequirements(id, { id: stage_id, stage_template_id: ins.rows[0].stage_id }); }
        res.status(201).json({ success: true, data: { action: ins.rows[0] } });
    } catch (e) {
        console.error('Erreur enregistrement action:', e);
        res.status(500).json({ success: false, error: 'Erreur enregistrement action' });
    }
});

// POST /api/opportunities/:id/documents - Enregistrer un document (métadonnées; upload géré ailleurs)
router.post('/:id/documents', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { stage_id, document_type, file_name, file_path } = req.body;
        const { pool } = require('../utils/database');
        const ins = await pool.query(
            `INSERT INTO opportunity_documents (opportunity_id, stage_id, document_type, file_name, file_path, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [id, stage_id || null, document_type, file_name || null, file_path || null, req.user.id]
        );
        await pool.query('UPDATE opportunities SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        res.status(201).json({ success: true, data: { document: ins.rows[0] } });
    } catch (e) {
        console.error('Erreur enregistrement document:', e);
        res.status(500).json({ success: false, error: 'Erreur enregistrement document' });
    }
});

// PUT /api/opportunities/:id/documents/:docId/validate - Valider/Rejeter
router.put('/:id/documents/:docId/validate', authenticateToken, async (req, res) => {
    try {
        const { id, docId } = req.params;
        const { status } = req.body; // validated|rejected|pending
        const { pool } = require('../utils/database');
        const up = await pool.query(
            `UPDATE opportunity_documents SET validation_status = $1::varchar, validator_id = $2,
                    validated_at = CASE WHEN $1::varchar = 'validated' THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE id = $3 AND opportunity_id = $4 RETURNING *`,
            [status, req.user.id, docId, id]
        );
        res.json({ success: true, data: { document: up.rows[0] } });
    } catch (e) {
        console.error('Erreur validation document:', e);
        res.status(500).json({ success: false, error: 'Erreur validation document' });
    }
});

// Upload d'un document d'opportunité (multipart/form-data)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'opportunities');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${base}__${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// POST /api/opportunities/:id/documents/upload
router.post('/:id/documents/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { stage_id, document_type } = req.body;
        if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' });
        const relPath = `/uploads/opportunities/${req.file.filename}`;
        const { pool } = require('../utils/database');
        const ins = await pool.query(
            `INSERT INTO opportunity_documents (opportunity_id, stage_id, document_type, file_name, file_path, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [id, stage_id || null, document_type || null, req.file.originalname, relPath, req.user.id]
        );
        res.status(201).json({ success: true, data: { document: ins.rows[0] } });
    } catch (e) {
        console.error('Erreur upload document:', e);
        res.status(500).json({ success: false, error: 'Erreur upload document' });
    }
});

// POST /api/opportunities - Créer une nouvelle opportunité
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Données reçues dans la route POST:', JSON.stringify(req.body, null, 2));
        
        const {
            nom,
            description,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            statut,
            type_opportunite,
            source,
            probabilite,
            montant_estime,
            devise,
            date_fermeture_prevue,
            notes
        } = req.body;

        if (!nom) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'opportunité est obligatoire'
            });
        }

        if (!business_unit_id) {
            return res.status(400).json({
                success: false,
                error: 'La business unit est obligatoire'
            });
        }

        const opportunityData = {
            nom,
            description,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id: opportunity_type_id || type_opportunite || null,
            // Laisser le backend définir NOUVELLE si non fourni
            statut,
            type_opportunite,
            source,
            probabilite,
            montant_estime,
            devise,
            date_fermeture_prevue,
            notes,
            created_by: req.user?.id || null
        };

        // Affecter automatiquement l'année fiscale en cours si non fournie
        try {
            if (!opportunityData.fiscal_year_id) {
                const fy = await pool.query(`
                    SELECT id FROM fiscal_years 
                    WHERE date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE 
                    AND statut = 'EN_COURS' 
                    LIMIT 1
                `);
                opportunityData.fiscal_year_id = fy.rows.length > 0 ? fy.rows[0].id : null;
            }
        } catch (fyErr) {
            console.warn('⚠️ Impossible de déterminer l\'année fiscale en cours pour l\'opportunité:', fyErr.message);
        }
        
        console.log('📋 Données envoyées au modèle Opportunity.create:', JSON.stringify(opportunityData, null, 2));
        
        const opportunity = await Opportunity.create(opportunityData);

        // Instancier les étapes depuis les templates si un type est fourni
        try {
            const typeIdToUse = opportunity_type_id || type_opportunite || null;
            if (typeIdToUse) {
                const type = await OpportunityType.findById(typeIdToUse);
                if (type) {
                    await type.createStagesForOpportunity(opportunity.id);
                }
            }
        } catch (e) {
            console.warn('⚠️ Impossible d\'instancier les étapes depuis les templates:', e.message);
        }

        res.status(201).json({
            success: true,
            data: {
                opportunity: opportunity
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de l\'opportunité'
        });
    }
});

// PUT /api/opportunities/:id - Mettre à jour une opportunité
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);
        
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        const updatedOpportunity = await opportunity.update({
            ...req.body,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            data: {
                opportunity: updatedOpportunity
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'opportunité'
        });
    }
});

// DELETE /api/opportunities/:id - Supprimer une opportunité
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Opportunity.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Opportunité supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'opportunité'
        });
    }
});

// GET /api/opportunities/stats/overview - Statistiques générales
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = await Opportunity.getStats();
        
        res.json({
            success: true,
            data: {
                stats: stats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// GET /api/opportunities/form-data - Données pour les formulaires
router.get('/form-data', authenticateToken, async (req, res) => {
    try {
        const [clients, collaborateurs, businessUnits, opportunityTypes] = await Promise.all([
            Client.findAll(),
            Collaborateur.findAll(),
            BusinessUnit.findAll(),
            OpportunityType.findAll()
        ]);

        res.json({
            success: true,
            data: {
                clients: clients,
                collaborateurs: collaborateurs,
                businessUnits: businessUnits,
                opportunityTypes: opportunityTypes
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données de formulaire:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des données de formulaire'
        });
    }
});

// Route pour récupérer l'historique complet d'une opportunité
router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const history = await OpportunityWorkflowService.getOpportunityHistory(id);
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/opportunities/:id/abandon - Abandonner une opportunité
router.post('/:id/abandon', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, details, notify_managers, archive_documents, update_crm } = req.body;
        const userId = req.user.id;

        // Vérifier que l'opportunité existe
        const opportunity = await Opportunity.findById(id);
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        // Vérifier que l'opportunité n'est pas déjà fermée
        if (['GAGNEE', 'PERDUE', 'ANNULEE'].includes(opportunity.statut)) {
            return res.status(400).json({
                success: false,
                error: 'Cette opportunité est déjà fermée'
            });
        }

        // Commencer une transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Mettre à jour le statut de l'opportunité
            await client.query(`
                UPDATE opportunities 
                SET 
                    statut = 'ANNULEE',
                    date_fermeture_reelle = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            // 2. Marquer toutes les étapes comme terminées
            await client.query(`
                UPDATE opportunity_stages 
                SET 
                    status = 'COMPLETED',
                    completed_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE opportunity_id = $1
            `, [id]);

            // 3. Enregistrer l'action d'abandon
            await client.query(`
                INSERT INTO opportunity_actions (
                    opportunity_id, 
                    stage_id, 
                    action_type, 
                    action_description, 
                    performed_by, 
                    performed_at,
                    data
                ) VALUES (
                    $1, 
                    (SELECT id FROM opportunity_stages WHERE opportunity_id = $1 ORDER BY stage_order DESC LIMIT 1),
                    'abandon_opportunite',
                    $2,
                    $3,
                    CURRENT_TIMESTAMP,
                    $4
                )
            `, [id, `Abandon de l'opportunité - Raison: ${reason}`, userId, JSON.stringify({
                reason: reason,
                details: details,
                notify_managers: notify_managers,
                archive_documents: archive_documents,
                update_crm: update_crm
            })]);

            // 4. Si notification des managers activée, créer une notification
            if (notify_managers) {
                await client.query(`
                    INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        type,
                        data,
                        created_at
                    ) VALUES (
                        $1,
                        'Opportunité abandonnée',
                        $2,
                        'opportunity_abandoned',
                        $3,
                        CURRENT_TIMESTAMP
                    )
                `, [userId, `L'opportunité "${opportunity.nom}" a été abandonnée. Raison: ${reason}`, JSON.stringify({
                    opportunity_id: id,
                    opportunity_name: opportunity.nom,
                    reason: reason,
                    details: details
                })]);
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Opportunité abandonnée avec succès',
                data: {
                    opportunity_id: id,
                    new_status: 'ANNULEE',
                    reason: reason
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur lors de l\'abandon de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'abandon de l\'opportunité: ' + error.message
        });
    }
});

// POST /api/opportunities/:id/reopen - Réouvrir une opportunité abandonnée
router.post('/:id/reopen', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, details, notify_team, reactivate_stages, update_crm } = req.body;
        const userId = req.user.id;

        // Vérifier que l'opportunité existe
        const opportunity = await Opportunity.findById(id);
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        // Vérifier que l'opportunité est bien abandonnée
        if (opportunity.statut !== 'ANNULEE') {
            return res.status(400).json({
                success: false,
                error: 'Seules les opportunités abandonnées peuvent être réouvertes'
            });
        }

        // Commencer une transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Mettre à jour le statut de l'opportunité
            await client.query(`
                UPDATE opportunities 
                SET 
                    statut = 'EN_COURS',
                    date_fermeture_reelle = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            // 2. Réactiver les étapes si demandé
            if (reactivate_stages) {
                // Trouver la dernière étape non terminée ou reprendre depuis le début
                const lastStageQuery = `
                    SELECT stage_order, status 
                    FROM opportunity_stages 
                    WHERE opportunity_id = $1 
                    ORDER BY stage_order DESC 
                    LIMIT 1
                `;
                const lastStageResult = await client.query(lastStageQuery, [id]);
                
                if (lastStageResult.rows.length > 0) {
                    const lastStage = lastStageResult.rows[0];
                    // Si la dernière étape était terminée, reprendre depuis le début
                    if (lastStage.status === 'COMPLETED') {
                        await client.query(`
                            UPDATE opportunity_stages 
                            SET 
                                status = 'PENDING',
                                completed_date = NULL,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE opportunity_id = $1 AND stage_order = 1
                        `, [id]);
                    } else {
                        // Sinon, garder l'étape actuelle en cours
                        await client.query(`
                            UPDATE opportunity_stages 
                            SET 
                                status = 'IN_PROGRESS',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE opportunity_id = $1 AND status = 'PENDING'
                            ORDER BY stage_order ASC
                            LIMIT 1
                        `, [id]);
                    }
                }
            }

            // 3. Enregistrer l'action de réouverture
            await client.query(`
                INSERT INTO opportunity_actions (
                    opportunity_id, 
                    stage_id, 
                    action_type, 
                    action_description, 
                    performed_by, 
                    performed_at,
                    data
                ) VALUES (
                    $1, 
                    (SELECT id FROM opportunity_stages WHERE opportunity_id = $1 ORDER BY stage_order ASC LIMIT 1),
                    'reouverture_opportunite',
                    $2,
                    $3,
                    CURRENT_TIMESTAMP,
                    $4
                )
            `, [id, `Réouverture de l'opportunité - Raison: ${reason}`, userId, JSON.stringify({
                reason: reason,
                details: details,
                notify_team: notify_team,
                reactivate_stages: reactivate_stages,
                update_crm: update_crm
            })]);

            // 4. Si notification de l'équipe activée, créer une notification
            if (notify_team) {
                await client.query(`
                    INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        type,
                        data,
                        created_at
                    ) VALUES (
                        $1,
                        'Opportunité réouverte',
                        $2,
                        'opportunity_reopened',
                        $3,
                        CURRENT_TIMESTAMP
                    )
                `, [userId, `L'opportunité "${opportunity.nom}" a été réouverte. Raison: ${reason}`, JSON.stringify({
                    opportunity_id: id,
                    opportunity_name: opportunity.nom,
                    reason: reason,
                    details: details
                })]);
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Opportunité réouverte avec succès',
                data: {
                    opportunity_id: id,
                    new_status: 'EN_COURS',
                    reason: reason
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur lors de la réouverture de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la réouverture de l\'opportunité: ' + error.message
        });
    }
});

module.exports = router; 