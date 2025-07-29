const { pool } = require('../src/utils/database');

async function checkOpportunityStagesStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table opportunity_stages...');
        
        const query = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'opportunity_stages'
            ORDER BY ordinal_position
        `;
        
        const result = await pool.query(query);
        
        console.log('📊 Structure de la table opportunity_stages:');
        console.log('==========================================');
        
        result.rows.forEach((column, index) => {
            console.log(`${index + 1}. ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
        });
        
        // Vérifier aussi la table opportunity_stage_templates
        console.log('\n🔍 Vérification de la table opportunity_stage_templates...');
        
        const templateQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'opportunity_stage_templates'
            ORDER BY ordinal_position
        `;
        
        const templateResult = await pool.query(templateQuery);
        
        console.log('📊 Structure de la table opportunity_stage_templates:');
        console.log('==================================================');
        
        templateResult.rows.forEach((column, index) => {
            console.log(`${index + 1}. ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkOpportunityStagesStructure(); 