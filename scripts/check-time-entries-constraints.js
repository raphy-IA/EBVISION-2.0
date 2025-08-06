const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function checkTimeEntriesConstraints() {
    try {
        console.log('🔍 Vérification des contraintes de la table time_entries...\n');

        // 1. Vérifier la structure de la table
        console.log('1. Structure de la table time_entries:');
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position;
        `);
        
        console.table(structureResult.rows);

        // 2. Vérifier les contraintes
        console.log('\n2. Contraintes de la table time_entries:');
        const constraintsResult = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                cc.check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.check_constraints cc 
                ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name = 'time_entries';
        `);
        
        constraintsResult.rows.forEach(row => {
            console.log(`- ${row.constraint_name} (${row.constraint_type})`);
            if (row.check_clause) {
                console.log(`  Condition: ${row.check_clause}`);
            }
        });

        // 3. Vérifier spécifiquement la contrainte statut
        console.log('\n3. Contrainte time_entries_statut_check:');
        const statutConstraintResult = await pool.query(`
            SELECT check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'time_entries_statut_check';
        `);
        
        if (statutConstraintResult.rows.length > 0) {
            console.log('Condition actuelle:', statutConstraintResult.rows[0].check_clause);
        } else {
            console.log('❌ Contrainte time_entries_statut_check non trouvée');
        }

        // 4. Tester les valeurs valides
        console.log('\n4. Test des valeurs de statut:');
        const testValues = ['draft', 'submitted', 'approved', 'rejected', 'invalid_value'];
        
        for (const value of testValues) {
            try {
                const testResult = await pool.query(`
                    INSERT INTO time_entries (user_id, date_saisie, heures, mission_id, description, type_heures, statut)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT DO NOTHING;
                `, ['8eb54916-a0b3-4f9e-acd1-75830271feab', '2024-01-15', 8.0, 'f1b5a971-3a94-473d-af5b-7922348d8a1d', 'Test', 'chargeable', value]);
                
                console.log(`✅ "${value}" - Accepté`);
                
                // Nettoyer le test
                await pool.query(`
                    DELETE FROM time_entries 
                    WHERE user_id = $1 AND date_saisie = $2 AND description = $3;
                `, ['8eb54916-a0b3-4f9e-acd1-75830271feab', '2024-01-15', 'Test']);
                
            } catch (error) {
                console.log(`❌ "${value}" - Rejeté: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesConstraints(); 