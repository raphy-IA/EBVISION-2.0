const { pool } = require('./src/utils/database');

async function fixTimeEntriesSchema() {
    try {
        console.log('=== Correction du schéma time_entries ===');
        
        // 1. Vérifier la structure actuelle
        console.log('\n1. Structure actuelle de type_heures:');
        const currentStructure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'type_heures'
        `);
        console.log(currentStructure.rows);
        
        // 2. Modifier la colonne type_heures
        console.log('\n2. Modification de type_heures en VARCHAR(20)...');
        await pool.query(`
            ALTER TABLE time_entries 
            ALTER COLUMN type_heures TYPE VARCHAR(20)
        `);
        console.log('✓ Colonne type_heures modifiée');
        
        // 3. Mettre à jour la contrainte CHECK
        console.log('\n3. Mise à jour de la contrainte CHECK...');
        await pool.query(`
            ALTER TABLE time_entries 
            DROP CONSTRAINT IF EXISTS time_entries_type_heures_check
        `);
        
        await pool.query(`
            ALTER TABLE time_entries 
            ADD CONSTRAINT time_entries_type_heures_check 
            CHECK (type_heures IN ('HC', 'HNC', 'chargeable', 'non_chargeable'))
        `);
        console.log('✓ Contrainte CHECK mise à jour');
        
        // 4. Vérifier la nouvelle structure
        console.log('\n4. Nouvelle structure:');
        const newStructure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'type_heures'
        `);
        console.log(newStructure.rows);
        
        console.log('\n✓ Correction terminée!');
        
    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        await pool.end();
    }
}

fixTimeEntriesSchema(); 