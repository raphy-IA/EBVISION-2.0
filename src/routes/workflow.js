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
    
    const data = templates.rows.map(t => {
      // Convertir les champs JSONB en format attendu par le frontend
      const requiredActions = (t.required_actions || []).map((action, index) => ({
        stage_template_id: t.id,
        action_type: action,
        is_mandatory: true,
        validation_order: index + 1
      }));
      
      const requiredDocuments = (t.required_documents || []).map(doc => ({
        stage_template_id: t.id,
        document_type: doc,
        is_mandatory: true
      }));
      
      return {
        template: t,
        requiredActions: requiredActions,
        requiredDocuments: requiredDocuments
      };
    });
    
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

// POST /api/workflow/validate-stage/:opportunityId - Valider l'étape actuelle d'une opportunité
router.post('/validate-stage/:opportunityId', authenticateToken, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    
    // Récupérer l'étape actuelle de l'opportunité
    const currentStageQuery = `
      SELECT os.*
      FROM opportunity_stages os
      WHERE os.opportunity_id = $1 AND os.status = 'IN_PROGRESS'
      ORDER BY os.stage_order ASC
      LIMIT 1
    `;
    
    const currentStageResult = await pool.query(currentStageQuery, [opportunityId]);
    
    if (currentStageResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Aucune étape en cours trouvée pour cette opportunité' 
      });
    }
    
    const currentStage = currentStageResult.rows[0];
    
    // Valider les exigences de l'étape
    const isValid = await OpportunityWorkflowService.validateStageRequirements(opportunityId, currentStage);
    
    if (!isValid) {
      // Récupérer les détails des exigences depuis le template d'étape
      const stageTemplateQuery = `
        SELECT required_actions, required_documents
        FROM opportunity_stage_templates
        WHERE id = $1
      `;
      
      const stageTemplateResult = await pool.query(stageTemplateQuery, [currentStage.stage_template_id]);
      
      if (stageTemplateResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Template d\'étape non trouvé'
        });
      }
      
      const stageTemplate = stageTemplateResult.rows[0];
      const requiredActions = stageTemplate.required_actions || [];
      const requiredDocs = stageTemplate.required_documents || [];
      
      // Vérifier ce qui a été fait
      const doneActionsQuery = `
        SELECT DISTINCT action_type
        FROM opportunity_actions
        WHERE opportunity_id = $1 AND (stage_id = $2 OR $2 IS NULL) AND is_validating = true
      `;
      const doneDocsQuery = `
        SELECT DISTINCT document_type
        FROM opportunity_documents
        WHERE opportunity_id = $1 AND (stage_id = $2 OR $2 IS NULL) AND validation_status = 'validated'
      `;
      
      const [doneActions, doneDocs] = await Promise.all([
        pool.query(doneActionsQuery, [opportunityId, currentStage.id]),
        pool.query(doneDocsQuery, [opportunityId, currentStage.id])
      ]);
      
      const doneActionsSet = new Set(doneActions.rows.map(r => r.action_type));
      const doneDocsSet = new Set(doneDocs.rows.map(r => r.document_type));
      
      const missingActions = requiredActions.filter(a => !doneActionsSet.has(a));
      const missingDocs = requiredDocs.filter(d => !doneDocsSet.has(d));
      
      let errorMessage = `Impossible de valider l'étape "${currentStage.stage_name}". `;
      
      if (missingActions.length > 0) {
        errorMessage += `Actions manquantes: ${missingActions.join(', ')}. `;
      }
      
      if (missingDocs.length > 0) {
        errorMessage += `Documents manquants: ${missingDocs.join(', ')}. `;
      }
      
      return res.json({
        success: true,
        data: {
          reason: 'requirements_not_met',
          message: errorMessage,
          details: {
            stage: currentStage.stage_name,
            missingActions,
            missingDocs,
            requiredActions,
            requiredDocs
          }
        }
      });
    }
    
    // Si tout est valide, marquer l'étape comme terminée
    const updateQuery = `
      UPDATE opportunity_stages 
      SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, validated_by = $1, validated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, [req.user.id, currentStage.id]);
    
    // Passer à l'étape suivante si elle existe
    const nextStageQuery = `
      SELECT os.*
      FROM opportunity_stages os
      WHERE os.opportunity_id = $1 AND os.status = 'PENDING'
      ORDER BY os.stage_order ASC
      LIMIT 1
    `;
    
    const nextStageResult = await pool.query(nextStageQuery, [opportunityId]);
    
    if (nextStageResult.rows.length > 0) {
      const nextStage = nextStageResult.rows[0];
      const startNextStageQuery = `
        UPDATE opportunity_stages 
        SET status = 'IN_PROGRESS', start_date = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await pool.query(startNextStageQuery, [nextStage.id]);
      
      res.json({
        success: true,
        data: {
          reason: 'transitioned',
          message: `Étape "${currentStage.stage_name}" validée. Passage à l'étape "${nextStage.stage_name}".`,
          completedStage: currentStage,
          nextStage: nextStage
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          reason: 'completed',
          message: `Étape "${currentStage.stage_name}" validée. Toutes les étapes sont terminées.`,
          completedStage: currentStage,
          nextStage: null
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur validation étape:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: `Erreur lors de la validation de l'étape: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;


