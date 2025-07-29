const { pool } = require('../src/utils/database');

async function fixMigrations() {
    try {
        console.log('🔧 Correction des migrations...');
        
        // Supprimer les migrations problématiques
        await pool.query('DELETE FROM migrations WHERE filename IN ($1, $2)', [
            '021_create_opportunity_stages.sql',
            '022_fix_missing_columns.sql'
        ]);
        console.log('✅ Migrations problématiques supprimées');
        
        // Ajouter la colonne is_completed si elle n'existe pas
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'opportunity_stages' 
                    AND column_name = 'is_completed'
                ) THEN
                    ALTER TABLE opportunity_stages ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);
        console.log('✅ Colonne is_completed ajoutée');
        
        // Ajouter la colonne completed_at si elle n'existe pas
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'opportunity_stages' 
                    AND column_name = 'completed_at'
                ) THEN
                    ALTER TABLE opportunity_stages ADD COLUMN completed_at TIMESTAMP;
                END IF;
            END $$;
        `);
        console.log('✅ Colonne completed_at ajoutée');
        
        // Mettre à jour les données existantes
        await pool.query(`
            UPDATE opportunity_stages 
            SET is_completed = CASE 
                WHEN status = 'COMPLETED' THEN TRUE 
                ELSE FALSE 
            END,
            completed_at = CASE 
                WHEN status = 'COMPLETED' THEN completion_date 
                ELSE NULL 
            END
        `);
        console.log('✅ Données existantes mises à jour');
        
        // Marquer la migration de correction comme exécutée
        await pool.query(`
            INSERT INTO migrations (filename, executed_at) 
            VALUES ('023_fix_opportunity_stages_structure.sql', CURRENT_TIMESTAMP)
            ON CONFLICT (filename) DO NOTHING
        `);
        console.log('✅ Migration de correction marquée comme exécutée');
        
        console.log('🎉 Correction terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

fixMigrations(); 