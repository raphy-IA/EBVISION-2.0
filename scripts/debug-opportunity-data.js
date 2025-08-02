const { pool } = require('../src/utils/database');

async function debugOpportunityData() {
    try {
        console.log('🔍 Débogage des données d\'opportunité...');
        
        // Vérifier les opportunités avec leurs clients
        const opportunitiesResult = await pool.query(`
            SELECT 
                o.id,
                o.titre,
                o.client_id,
                c.nom as client_nom,
                o.statut,
                o.montant_estime
            FROM opportunites o
            LEFT JOIN clients c ON o.client_id = c.id
            ORDER BY o.created_at DESC
        `);
        
        console.log('📋 Opportunités disponibles:');
        opportunitiesResult.rows.forEach(opp => {
            console.log(`   - ${opp.id}: ${opp.titre}`);
            console.log(`     Client: ${opp.client_id ? opp.client_nom : 'NULL'} (${opp.client_id})`);
            console.log(`     Statut: ${opp.statut}, Montant: ${opp.montant_estime}`);
            console.log('');
        });
        
        // Vérifier les opportunités gagnées (WIN)
        const wonOpportunitiesResult = await pool.query(`
            SELECT 
                o.id,
                o.titre,
                o.client_id,
                c.nom as client_nom
            FROM opportunites o
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.statut = 'WIN'
            ORDER BY o.created_at DESC
        `);
        
        console.log('🏆 Opportunités gagnées (WIN):');
        wonOpportunitiesResult.rows.forEach(opp => {
            console.log(`   - ${opp.id}: ${opp.titre} (Client: ${opp.client_nom || 'NULL'})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

debugOpportunityData(); 