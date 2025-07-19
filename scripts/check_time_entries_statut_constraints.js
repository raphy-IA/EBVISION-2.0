const { pool } = require('../src/utils/database');

async function checkTimeEntriesStatutConstraints() {
    console.log('🔍 Vérification des contraintes de statut sur time_entries...');
    
    try {
        // Vérifier les contraintes de vérification
        const constraintsResult = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'time_entries'::regclass 
            AND contype = 'c'
        `);
        
        console.log('📋 Contraintes de vérification:');
        constraintsResult.rows.forEach(row => {
            console.log(`  - ${row.conname}: ${row.definition}`);
        });
        
        // Vérifier les valeurs actuelles dans la table
        const valuesResult = await pool.query(`
            SELECT DISTINCT statut, COUNT(*) as count
            FROM time_entries 
            GROUP BY statut
        `);
        
        console.log('📊 Valeurs actuelles de statut:');
        valuesResult.rows.forEach(row => {
            console.log(`  - ${row.statut}: ${row.count} entrées`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesStatutConstraints(); 