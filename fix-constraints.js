require('dotenv').config();
const { pool } = require('./src/utils/database');

async function fixTimeEntriesConstraints() {
    console.log('🔧 Correction des contraintes time_entries...');
    
    try {
        // 1. Supprimer toutes les contraintes existantes
        console.log('🗑️ Suppression de toutes les contraintes existantes...');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_requires_mission');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_requires_task');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hnc_requires_internal_activity');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_mission_consistency');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_task_consistency');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hnc_activity_consistency');
        
        console.log('✅ Contraintes problématiques supprimées');
        
        // 2. Recréer des contraintes plus flexibles
        console.log('🔧 Création de contraintes plus flexibles...');
        
        // Contrainte pour les missions (HC peut avoir une mission, HNC ne peut pas)
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_hc_mission_consistency CHECK (
                (type_heures = 'HC' AND mission_id IS NOT NULL) OR 
                (type_heures = 'HNC' AND mission_id IS NULL)
            )
        `);
        
        // Contrainte pour les tâches (les deux types peuvent avoir task_id NULL)
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_task_consistency CHECK (
                (type_heures = 'HC' AND task_id IS NULL) OR 
                (type_heures = 'HNC' AND task_id IS NULL)
            )
        `);
        
        // Contrainte pour les activités internes (HNC peut avoir une activité, HC ne peut pas)
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT check_hnc_activity_consistency CHECK (
                (type_heures = 'HNC' AND internal_activity_id IS NULL) OR 
                (type_heures = 'HC' AND internal_activity_id IS NULL)
            )
        `);
        
        console.log('✅ Nouvelles contraintes créées');
        
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
        
        console.log('🎯 Correction des contraintes terminée avec succès !');
        console.log('✅ Les contraintes sont maintenant plus flexibles et permettent :');
        console.log('   - HC avec mission mais sans tâche');
        console.log('   - HNC sans activité interne');
        console.log('   - Sauvegarde de feuilles de temps avec un seul type d\'heures');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction des contraintes:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution du script
fixTimeEntriesConstraints().catch(console.error); 