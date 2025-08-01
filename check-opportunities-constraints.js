const { pool } = require('./src/utils/database');

async function checkConstraints() {
    try {
        console.log('🔍 Vérification des contraintes...');
        
        // Vérifier la structure de la colonne statut
        const statutInfo = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'opportunities' AND column_name = 'statut'
        `);
        console.log('📋 Info colonne statut:', statutInfo.rows);
        
        // Vérifier les contraintes de la table
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type, check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name = 'opportunities'
        `);
        console.log('📋 Contraintes:', constraints.rows);
        
        // Vérifier les valeurs existantes dans statut
        const existingStats = await pool.query(`
            SELECT DISTINCT statut FROM opportunities
        `);
        console.log('📋 Statuts existants:', existingStats.rows);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkConstraints(); 