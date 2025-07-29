const { pool } = require('../src/utils/database');

async function checkOpportunityStagesStructure() {
    try {
        console.log('🔍 Vérification de la structure de opportunity_stages...');
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunity_stages' 
            ORDER BY ordinal_position;
        `;
        
        const structureResult = await pool.query(structureQuery);
        console.log('\n📊 Structure de la table opportunity_stages:');
        structureResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Vérifier les contraintes
        const constraintsQuery = `
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'opportunity_stages'::regclass;
        `;
        
        const constraintsResult = await pool.query(constraintsQuery);
        console.log('\n🔒 Contraintes de la table:');
        constraintsResult.rows.forEach(row => {
            console.log(`   - ${row.conname} (${row.contype}): ${row.definition}`);
        });
        
        // Vérifier le trigger
        const triggerQuery = `
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'opportunity_stages';
        `;
        
        const triggerResult = await pool.query(triggerQuery);
        console.log('\n⚡ Triggers sur opportunity_stages:');
        triggerResult.rows.forEach(row => {
            console.log(`   - ${row.trigger_name}: ${row.event_manipulation}`);
            console.log(`     ${row.action_statement}`);
        });
        
        // Vérifier la fonction du trigger
        const functionQuery = `
            SELECT proname, prosrc
            FROM pg_proc 
            WHERE proname = 'create_opportunity_stages';
        `;
        
        const functionResult = await pool.query(functionQuery);
        console.log('\n🔧 Fonction create_opportunity_stages:');
        if (functionResult.rows.length > 0) {
            console.log(functionResult.rows[0].prosrc);
        } else {
            console.log('   - Fonction non trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkOpportunityStagesStructure(); 