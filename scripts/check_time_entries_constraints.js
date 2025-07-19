const { pool } = require('../src/utils/database');

async function checkTimeEntriesConstraints() {
    try {
        console.log('🔍 Vérification des contraintes de time_entries...\n');
        
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
        
        // Vérifier les types d'énumération si ils existent
        const enumResult = await pool.query(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            WHERE t.typname LIKE '%heure%' OR t.typname LIKE '%type%'
            ORDER BY t.typname, e.enumsortorder
        `);
        
        if (enumResult.rows.length > 0) {
            console.log('\n📋 Types d\'énumération:');
            enumResult.rows.forEach(row => {
                console.log(`  - ${row.typname}: ${row.enumlabel}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesConstraints(); 