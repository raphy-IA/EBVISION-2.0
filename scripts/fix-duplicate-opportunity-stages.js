const { pool } = require('../src/utils/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Trouver les doublons par (opportunity_id, stage_order)
    const dupQuery = `
      SELECT opportunity_id, stage_order, 
             ARRAY_AGG(id ORDER BY created_at ASC) AS ids
      FROM opportunity_stages
      GROUP BY opportunity_id, stage_order
      HAVING COUNT(*) > 1
    `;
    const { rows } = await client.query(dupQuery);

    let totalDeleted = 0;
    for (const row of rows) {
      const ids = row.ids;
      // Conserver le premier (le plus ancien), supprimer le reste
      const toDelete = ids.slice(1);
      if (toDelete.length > 0) {
        const del = await client.query(
          'DELETE FROM opportunity_stages WHERE id = ANY($1::uuid[])',
          [toDelete]
        );
        totalDeleted += del.rowCount;
      }
    }

    // 2) Créer un index unique pour empêcher la duplication future
    await client.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uniq_opportunity_stages_opp_order ON opportunity_stages(opportunity_id, stage_order)'
    );

    await client.query('COMMIT');
    console.log('✅ Nettoyage des doublons terminé. Lignes supprimées =', totalDeleted);
    console.log('✅ Index unique appliqué: uniq_opportunity_stages_opp_order');
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur fix-duplicate-opportunity-stages:', e);
    process.exit(1);
  } finally {
    client.release();
  }
})();


