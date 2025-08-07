const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function fixTimeEntriesTypeColumn() {
    try {
        console.log('=== Correction de la colonne type_heures dans time_entries ===');
        
        // 1. Vérifier la structure actuelle
        console.log('\n1. Structure actuelle de la colonne type_heures:');
        const currentStructure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'type_heures'
        `);
        console.table(currentStructure.rows);
        
        // 2. Vérifier les valeurs actuelles
        console.log('\n2. Valeurs actuelles dans type_heures:');
        const currentValues = await pool.query(`
            SELECT DISTINCT type_heures, COUNT(*) as count
            FROM time_entries 
            GROUP BY type_heures
        `);
        console.table(currentValues.rows);
        
        // 3. Modifier la colonne pour accepter des valeurs plus longues
        console.log('\n3. Modification de la colonne type_heures...');
        await pool.query(`
            ALTER TABLE time_entries 
            ALTER COLUMN type_heures TYPE VARCHAR(20)
        `);
        console.log('✓ Colonne type_heures modifiée en VARCHAR(20)');
        
        // 4. Mettre à jour la contrainte CHECK pour accepter les nouvelles valeurs
        console.log('\n4. Mise à jour de la contrainte CHECK...');
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
        
        // 5. Vérifier la nouvelle structure
        console.log('\n5. Nouvelle structure de la colonne type_heures:');
        const newStructure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'type_heures'
        `);
        console.table(newStructure.rows);
        
        // 6. Vérifier les contraintes
        console.log('\n6. Contraintes actuelles sur type_heures:');
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'time_entries'::regclass 
            AND conname LIKE '%type_heures%'
        `);
        console.table(constraints.rows);
        
        console.log('\n✓ Correction terminée avec succès!');
        
    } catch (error) {
        console.error('Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

fixTimeEntriesTypeColumn(); 