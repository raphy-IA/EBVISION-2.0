const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');
const OpportunityWorkflowService = require('../services/opportunityWorkflowService');

// GET /api/workflow/stages - liste des templates d'étapes avec requirements
router.get('/stages', authenticateToken, async (req, res) => {
  try {
    const { typeId } = req.query;
    let query = `
      SELECT ost.* FROM opportunity_stage_templates ost 
    `;
    let params = [];
    
    if (typeId) {
      query += ` WHERE ost.opportunity_type_id = $1`;
      params.push(typeId);
    }
    
    query += ` ORDER BY ost.stage_order ASC`;
    
    const templates = await pool.query(query, params);
    const templateIds = templates.rows.map(t => t.id);
    let reqActions = { rows: [] }, reqDocs = { rows: [] };
    
    if (templateIds.length > 0) {
      reqActions = await pool.query(
        `SELECT stage_template_id, action_type, is_mandatory, validation_order
         FROM stage_required_actions WHERE stage_template_id = ANY($1::uuid[])`, [templateIds]
      );
      reqDocs = await pool.query(
        `SELECT stage_template_id, document_type, is_mandatory
         FROM stage_required_documents WHERE stage_template_id = ANY($1::uuid[])`, [templateIds]
      );
    }
    
    // Grouper par template
    const actionsByT = new Map();
    const docsByT = new Map();
    reqActions.rows.forEach(r => {
      if (!actionsByT.has(r.stage_template_id)) actionsByT.set(r.stage_template_id, []);
      actionsByT.get(r.stage_template_id).push(r);
    });
    reqDocs.rows.forEach(r => {
      if (!docsByT.has(r.stage_template_id)) docsByT.set(r.stage_template_id, []);
      docsByT.get(r.stage_template_id).push(r);
    });
    
    const data = templates.rows.map(t => ({
      template: t,
      requiredActions: actionsByT.get(t.id) || [],
      requiredDocuments: docsByT.get(t.id) || []
    }));
    
    res.json({ success: true, data });
  } catch (e) {
    console.error('Erreur workflow/stages:', e);
    res.status(500).json({ success: false, error: 'Erreur récupération workflow stages' });
  }
});

// GET /api/workflow/requirements - récupérer les exigences pour un type d'opportunité
router.get('/requirements', authenticateToken, async (req, res) => {
  try {
    const { typeId } = req.query;
    
    if (!typeId) {
      return res.status(400).json({ success: false, error: 'typeId requis' });
    }

    // Récupérer toutes les actions et documents requis pour ce type
    const actionsQuery = `
      SELECT sra.*, ost.stage_name, ost.stage_order
      FROM stage_required_actions sra
      JOIN opportunity_stage_templates ost ON sra.stage_template_id = ost.id
      WHERE ost.opportunity_type_id = $1
      ORDER BY ost.stage_order, sra.validation_order
    `;
    
    const documentsQuery = `
      SELECT srd.*, ost.stage_name, ost.stage_order
      FROM stage_required_documents srd
      JOIN opportunity_stage_templates ost ON srd.stage_template_id = ost.id
      WHERE ost.opportunity_type_id = $1
      ORDER BY ost.stage_order
    `;

    const [actions, documents] = await Promise.all([
      pool.query(actionsQuery, [typeId]),
      pool.query(documentsQuery, [typeId])
    ]);

    res.json({
      success: true,
      data: {
        actions: actions.rows,
        documents: documents.rows
      }
    });
  } catch (e) {
    console.error('Erreur workflow/requirements:', e);
    res.status(500).json({ success: false, error: 'Erreur récupération exigences' });
  }
});

// POST /api/workflow/stages - créer une nouvelle étape
router.post('/stages', authenticateToken, async (req, res) => {
  try {
    const {
      opportunity_type_id,
      stage_name,
      stage_order,
      description,
      min_duration_days,
      max_duration_days,
      is_mandatory,
      validation_required
    } = req.body;

    if (!opportunity_type_id || !stage_name) {
      return res.status(400).json({ success: false, error: 'opportunity_type_id et stage_name requis' });
    }

    const query = `
      INSERT INTO opportunity_stage_templates (
        opportunity_type_id, stage_name, stage_order, description,
        min_duration_days, max_duration_days, is_mandatory, validation_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      opportunity_type_id,
      stage_name,
      stage_order || 1,
      description || '',
      min_duration_days || 1,
      max_duration_days || 10,
      is_mandatory !== false,
      validation_required === true
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Erreur création étape:', e);
    res.status(500).json({ success: false, error: 'Erreur création étape' });
  }
});

// PUT /api/workflow/stages/:id - modifier une étape
router.put('/stages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stage_name,
      description,
      min_duration_days,
      max_duration_days,
      is_mandatory,
      validation_required
    } = req.body;

    const query = `
      UPDATE opportunity_stage_templates 
      SET stage_name = $1, description = $2, min_duration_days = $3, 
          max_duration_days = $4, is_mandatory = $5, validation_required = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(query, [
      stage_name,
      description,
      min_duration_days,
      max_duration_days,
      is_mandatory,
      validation_required,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Étape non trouvée' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Erreur modification étape:', e);
    res.status(500).json({ success: false, error: 'Erreur modification étape' });
  }
});

// DELETE /api/workflow/stages/:id - supprimer une étape
router.delete('/stages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier qu'aucune opportunité n'utilise cette étape
    const checkQuery = `
      SELECT COUNT(*) as count FROM opportunity_stages 
      WHERE stage_template_id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Impossible de supprimer cette étape car elle est utilisée par des opportunités existantes' 
      });
    }

    const query = `DELETE FROM opportunity_stage_templates WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Étape non trouvée' });
    }

    res.json({ success: true, message: 'Étape supprimée' });
  } catch (e) {
    console.error('Erreur suppression étape:', e);
    res.status(500).json({ success: false, error: 'Erreur suppression étape' });
  }
});

// PUT /api/workflow/stages/reorder - réorganiser l'ordre des étapes
router.put('/stages/reorder', authenticateToken, async (req, res) => {
  try {
    const { stages } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ success: false, error: 'stages doit être un tableau' });
    }

    await pool.query('BEGIN');

    for (const stage of stages) {
      await pool.query(
        'UPDATE opportunity_stage_templates SET stage_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [stage.order, stage.id]
      );
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Ordre des étapes mis à jour' });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('Erreur réorganisation étapes:', e);
    res.status(500).json({ success: false, error: 'Erreur réorganisation étapes' });
  }
});

// POST /api/workflow/stages/:id/actions - ajouter une action requise
router.post('/stages/:id/actions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action_type, is_mandatory, validation_order } = req.body;

    if (!action_type) {
      return res.status(400).json({ success: false, error: 'action_type requis' });
    }

    const query = `
      INSERT INTO stage_required_actions (stage_template_id, action_type, is_mandatory, validation_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      action_type,
      is_mandatory !== false,
      validation_order || null
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Erreur ajout action:', e);
    res.status(500).json({ success: false, error: 'Erreur ajout action' });
  }
});

// DELETE /api/workflow/stages/actions/:id - supprimer une action requise
router.delete('/stages/actions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM stage_required_actions WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Action non trouvée' });
    }

    res.json({ success: true, message: 'Action supprimée' });
  } catch (e) {
    console.error('Erreur suppression action:', e);
    res.status(500).json({ success: false, error: 'Erreur suppression action' });
  }
});

// POST /api/workflow/stages/:id/documents - ajouter un document requis
router.post('/stages/:id/documents', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, is_mandatory } = req.body;

    if (!document_type) {
      return res.status(400).json({ success: false, error: 'document_type requis' });
    }

    const query = `
      INSERT INTO stage_required_documents (stage_template_id, document_type, is_mandatory)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      document_type,
      is_mandatory !== false
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Erreur ajout document:', e);
    res.status(500).json({ success: false, error: 'Erreur ajout document' });
  }
});

// DELETE /api/workflow/stages/documents/:id - supprimer un document requis
router.delete('/stages/documents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM stage_required_documents WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    res.json({ success: true, message: 'Document supprimé' });
  } catch (e) {
    console.error('Erreur suppression document:', e);
    res.status(500).json({ success: false, error: 'Erreur suppression document' });
  }
});

module.exports = router;


