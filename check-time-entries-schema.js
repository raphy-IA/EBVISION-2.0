const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function checkTimeEntriesSchema() {
    try {
        console.log('=== Vérification du schéma de la table time_entries ===');
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `;
        
        const structureResult = await pool.query(structureQuery);
        console.log('\nStructure de la table time_entries:');
        console.table(structureResult.rows);
        
        // Vérifier les contraintes
        const constraintsQuery = `
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'time_entries'::regclass
        `;
        
        const constraintsResult = await pool.query(constraintsQuery);
        console.log('\nContraintes de la table time_entries:');
        console.table(constraintsResult.rows);
        
        // Vérifier les valeurs actuelles pour type_heures et statut
        const valuesQuery = `
            SELECT DISTINCT type_heures, statut, COUNT(*) as count
            FROM time_entries 
            GROUP BY type_heures, statut
        `;
        
        const valuesResult = await pool.query(valuesQuery);
        console.log('\nValeurs actuelles dans time_entries:');
        console.table(valuesResult.rows);
        
    } catch (error) {
        console.error('Erreur lors de la vérification du schéma:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesSchema(); 