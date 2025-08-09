const { pool } = require('../src/utils/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const typeName = 'Vente standard';
    const typeDesc = 'Pipeline commercial standard (identification → décision)';

    let typeRes = await client.query('SELECT id FROM opportunity_types WHERE name = $1', [typeName]);
    let typeId;
    if (typeRes.rows.length === 0) {
      const ins = await client.query(
        'INSERT INTO opportunity_types (name, description, default_probability, default_duration_days, is_active) VALUES ($1,$2,$3,$4,TRUE) RETURNING id',
        [typeName, typeDesc, 10, 30]
      );
      typeId = ins.rows[0].id;
    } else {
      typeId = typeRes.rows[0].id;
    }

    await client.query('DELETE FROM opportunity_stage_templates WHERE opportunity_type_id = $1', [typeId]);

    const stages = [
      {
        name: 'Identification',
        order: 1,
        desc: "Opportunité détectée; enregistrement et qualification rapide",
        req_docs: ['Lead/Contact initial', 'Notes de détection'],
        req_actions: ["Créer la fiche opportunité", "Qualifier rapidement l'intérêt"],
        max: 7,
        min: 1,
        validation: true,
      },
      {
        name: 'Qualification',
        order: 2,
        desc: 'Valider besoin, budget, décideurs, timing (ex. BANT)',
        req_docs: ['Grille BANT', 'Liste des décideurs'],
        req_actions: ['Valider BANT', 'Identifier décideurs', 'Estimer budget'],
        max: 10,
        min: 3,
        validation: true,
      },
      {
        name: 'Discovery / Prise de contact',
        order: 3,
        desc: "Échanges approfondis, cadrage du périmètre et des enjeux",
        req_docs: ['Compte-rendu réunion', 'Points clés & risques'],
        req_actions: ['Réunion discovery', 'Cadrage périmètre', 'Planifier proposition'],
        max: 10,
        min: 3,
        validation: true,
      },
      {
        name: 'Proposition',
        order: 4,
        desc: "Production et envoi de l'offre (technique + financière)",
        req_docs: ['Proposition', 'Chiffrage', 'Conditions'],
        req_actions: ['Rédaction offre', 'Validation interne', 'Envoi au client'],
        max: 10,
        min: 3,
        validation: true,
      },
      {
        name: 'Négociation',
        order: 5,
        desc: 'Convergence sur prix, périmètre, délais et conditions',
        req_docs: ["Versions d'offre", 'Table des concessions'],
        req_actions: ['Négociation', 'Alignement interne', 'Validation client'],
        max: 15,
        min: 5,
        validation: false,
      },
      {
        name: 'Décision',
        order: 6,
        desc: "Issue finale (gagnée/perdue); si gagnée, préparer onboarding",
        req_docs: ['Bon pour accord/Contrat', 'Compte-rendu de décision'],
        req_actions: ["Clôturer opportunité", 'Préparer onboarding si gagnée'],
        max: 5,
        min: 1,
        validation: true,
      },
    ];

    for (const s of stages) {
      await client.query(
        'INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          typeId,
          s.name,
          s.order,
          s.desc,
          JSON.stringify(s.req_docs),
          JSON.stringify(s.req_actions),
          s.max,
          s.min,
          s.validation,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Vente standard créée/à jour, typeId = ' + typeId);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur script add-standard-sales-pipeline:', e);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();


