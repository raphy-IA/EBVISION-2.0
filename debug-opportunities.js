const { pool } = require('./src/utils/database');

async function debugOpportunities() {
    try {
        console.log('🔍 Débogage des opportunités...');
        
        // 1. Vérifier toutes les opportunités
        const allOpps = await pool.query('SELECT id, nom, statut FROM opportunities LIMIT 10');
        console.log('📋 Toutes les opportunités:', allOpps.rows);
        
        // 2. Vérifier les opportunités gagnées
        const wonOpps = await pool.query(`
            SELECT id, nom, statut 
            FROM opportunities 
            WHERE statut IN ('GAGNEE', 'WON')
        `);
        console.log('🏆 Opportunités gagnées:', wonOpps.rows);
        
        // 3. Vérifier les missions existantes
        const missions = await pool.query('SELECT id, opportunity_id FROM missions LIMIT 5');
        console.log('📋 Missions existantes:', missions.rows);
        
        // 4. Tester la requête complète
        const testQuery = `
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
        
        const result = await pool.query(testQuery);
        console.log('✅ Opportunités éligibles pour mission:', result.rows);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

debugOpportunities(); 