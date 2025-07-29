const db = require('../src/utils/database');

async function checkOpportunityStages() {
    try {
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'opportunity_stages'
        `);
        
        console.log('Table opportunity_stages existe:', result.rows.length > 0);
        
        if (result.rows.length > 0) {
            // Vérifier la structure de la table
            const structure = await db.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'opportunity_stages'
                ORDER BY ordinal_position
            `);
            
            console.log('Structure de la table:');
            structure.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Erreur:', err);
        process.exit(1);
    }
}

checkOpportunityStages(); 