const { pool } = require('../src/utils/database');

async function checkOpportunitiesTable() {
    try {
        console.log('🔍 Vérification de la structure de la table opportunities...\n');
        
        // Vérifier si la table existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'opportunities'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ La table opportunities n\'existe pas');
            return;
        }
        
        console.log('✅ La table opportunities existe');
        
        // Vérifier la structure de la table
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunities'
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Structure de la table opportunities:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
        });
        
        // Vérifier les contraintes
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'opportunities';
        `);
        
        console.log('\n🔒 Contraintes:');
        constraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkOpportunitiesTable(); 