const { pool } = require('../src/utils/database');

async function checkOpportunitiesStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table opportunites...');
        
        // Vérifier la structure de la table opportunites
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunites' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Structure de la table opportunites:');
        result.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
        
        // Vérifier les opportunités existantes
        const opportunitiesResult = await pool.query(`
            SELECT 
                o.id,
                o.titre,
                o.client_id,
                c.nom as client_nom,
                o.statut
            FROM opportunites o
            LEFT JOIN clients c ON o.client_id = c.id
            LIMIT 5
        `);
        
        console.log('\n📋 Opportunités existantes:');
        opportunitiesResult.rows.forEach(opp => {
            console.log(`   - ${opp.id}: ${opp.titre}`);
            console.log(`     Client: ${opp.client_id ? opp.client_nom : 'NULL'} (${opp.client_id})`);
            console.log(`     Statut: ${opp.statut}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkOpportunitiesStructure(); 