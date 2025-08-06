const { pool } = require('./src/utils/database');

async function fixConstraints() {
    try {
        console.log('🔧 Correction des contraintes de base de données...');
        
        // 1. Supprimer les contraintes CHECK problématiques
        console.log('🗑️ Suppression des contraintes existantes...');
        await pool.query('ALTER TABLE time_sheets DROP CONSTRAINT IF EXISTS time_sheets_statut_check');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check');
        
        // 2. Recréer les contraintes CHECK avec les bonnes valeurs
        console.log('✅ Recréation des contraintes...');
        await pool.query(`
            ALTER TABLE time_sheets ADD CONSTRAINT time_sheets_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'))
        `);
        
        await pool.query(`
            ALTER TABLE time_entries ADD CONSTRAINT time_entries_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected', 'SAISIE'))
        `);
        
        // 3. Vérifier que les contraintes ont été créées
        console.log('🔍 Vérification des contraintes...');
        const constraints = await pool.query(`
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname LIKE '%time_sheets%' OR conname LIKE '%time_entries%'
            ORDER BY conname
        `);
        
        console.log('📋 Contraintes trouvées:');
        constraints.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
        });
        
        // 4. Test d'insertion pour vérifier que tout fonctionne
        console.log('🧪 Test d\'insertion...');
        
        // Test time_sheets
        const testTimeSheet = await pool.query(`
            INSERT INTO time_sheets (
                collaborateur_id, date_debut_semaine, date_fin_semaine, annee, semaine, statut
            ) VALUES (
                'f6a6567f-b51d-4dbc-872d-1005156bd187',
                '2025-08-04',
                '2025-08-10',
                2025,
                32,
                'draft'
            ) RETURNING id
        `);
        
        console.log('✅ Test time_sheets réussi, ID:', testTimeSheet.rows[0].id);
        
        // Nettoyer le test
        await pool.query('DELETE FROM time_sheets WHERE id = $1', [testTimeSheet.rows[0].id]);
        
        // Test time_entries
        const testTimeEntry = await pool.query(`
            INSERT INTO time_entries (
                user_id, date_saisie, heures, type_heures, mission_id, description, statut
            ) VALUES (
                'f6a6567f-b51d-4dbc-872d-1005156bd187',
                '2025-08-04',
                8.0,
                'chargeable',
                'f1b5a971-3a94-473d-af5b-7922348d8a1d',
                'Test entry',
                'draft'
            ) RETURNING id
        `);
        
        console.log('✅ Test time_entries réussi, ID:', testTimeEntry.rows[0].id);
        
        // Nettoyer le test
        await pool.query('DELETE FROM time_entries WHERE id = $1', [testTimeEntry.rows[0].id]);
        
        console.log('🎉 Toutes les corrections ont été appliquées avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction des contraintes:', error);
    } finally {
        await pool.end();
    }
}

fixConstraints(); 