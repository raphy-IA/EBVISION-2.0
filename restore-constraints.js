require('dotenv').config();
const { pool } = require('./src/utils/database');

async function restoreOriginalConstraints() {
    console.log('🔧 Restauration des contraintes originales...');
    
    try {
        // 1. Supprimer les contraintes flexibles que j'ai créées par erreur
        console.log('🗑️ Suppression des contraintes flexibles incorrectes...');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_mission_consistency');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_task_consistency');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hnc_activity_consistency');
        
        console.log('✅ Contraintes flexibles supprimées');
        
        // 2. Restaurer les contraintes originales correctes
        console.log('🔧 Restauration des contraintes originales...');
        
        // HC doit avoir une mission
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_hc_requires_mission CHECK (
                (type_heures = 'HC' AND mission_id IS NOT NULL) OR 
                (type_heures = 'HNC' AND mission_id IS NULL)
            )
        `);
        
        // HC doit avoir une tâche
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_hc_requires_task CHECK (
                (type_heures = 'HC' AND task_id IS NOT NULL) OR 
                (type_heures = 'HNC' AND task_id IS NULL)
            )
        `);
        
        // HNC doit avoir une activité interne
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_hnc_requires_internal_activity CHECK (
                (type_heures = 'HNC' AND internal_activity_id IS NOT NULL) OR 
                (type_heures = 'HC' AND internal_activity_id IS NULL)
            )
        `);
        
        console.log('✅ Contraintes originales restaurées');
        
        // 3. Vérifier les contraintes
        console.log('📋 Vérification des contraintes...');
        const constraints = await pool.query(`
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'time_entries'::regclass
            AND contype = 'c'
            ORDER BY conname
        `);
        
        console.log('📊 Contraintes actuelles:');
        constraints.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
        });
        
        console.log('🎯 Restauration terminée avec succès !');
        console.log('✅ Les contraintes originales sont maintenant restaurées :');
        console.log('   - HC doit avoir une mission ET une tâche');
        console.log('   - HNC doit avoir une activité interne');
        console.log('   - Les références sont maintenant obligatoires');
        
    } catch (error) {
        console.error('❌ Erreur lors de la restauration des contraintes:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution du script
restoreOriginalConstraints().catch(console.error);
