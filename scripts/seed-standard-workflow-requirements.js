const { pool } = require('../src/utils/database');

// Spécifications 5 étapes (mapping sur templates existants "Vente standard")
const PIPELINE = [
  { name: 'Prospection', templateName: 'Identification', actions: ['premier_contact','qualification_besoin'], docs: ['fiche_prospect'] },
  { name: 'Qualification', templateName: 'Qualification', actions: ['rdv_planifie','rdv_realise'], docs: ['compte_rendu_rdv'] },
  { name: 'Proposition', templateName: 'Proposition', actions: ['analyse_besoin_approfondie','proposition_envoyee'], docs: ['proposition_commerciale','elements_techniques'] },
  { name: 'Négociation', templateName: 'Négociation', actions: ['negociation_menee','conditions_acceptees'], docs: ['conditions_finales','planning_mission'] },
  { name: 'Contractualisation', templateName: 'Décision', actions: ['contrat_prepare','contrat_signe'], docs: ['contrat_signe','bon_commande'] }
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Récupérer les templates par noms (multi-types si existants)
    const wanted = PIPELINE.map(s => s.templateName);
    const tplRes = await client.query(
      'SELECT id, stage_name FROM opportunity_stage_templates WHERE stage_name = ANY($1)',
      [wanted]
    );
    const nameToIds = new Map();
    tplRes.rows.forEach(r => {
      if (!nameToIds.has(r.stage_name)) nameToIds.set(r.stage_name, []);
      nameToIds.get(r.stage_name).push(r.id);
    });

    for (const stage of PIPELINE) {
      const tplIds = nameToIds.get(stage.templateName) || [];
      for (const tplId of tplIds) {
        // Insérer actions requises (éviter doublons)
        for (let i = 0; i < stage.actions.length; i++) {
          const a = stage.actions[i];
          await client.query(
            `INSERT INTO stage_required_actions(stage_template_id, action_type, is_mandatory, validation_order)
             SELECT $1, CAST($2 AS varchar), true, $3 WHERE NOT EXISTS (
               SELECT 1 FROM stage_required_actions WHERE stage_template_id=$1 AND action_type=CAST($2 AS varchar)
             )`,
            [tplId, a, i+1]
          );
        }
        // Insérer documents requis
        for (const d of stage.docs) {
          await client.query(
            `INSERT INTO stage_required_documents(stage_template_id, document_type, is_mandatory)
             SELECT $1, CAST($2 AS varchar), true WHERE NOT EXISTS (
               SELECT 1 FROM stage_required_documents WHERE stage_template_id=$1 AND document_type=CAST($2 AS varchar)
             )`,
            [tplId, d]
          );
        }
      }
    }
    await client.query('COMMIT');
    console.log('Seed workflow requirements OK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
  }
})();


