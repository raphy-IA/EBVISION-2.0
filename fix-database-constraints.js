const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'postgres'
});

async function diagnoseAndFixDatabase() {
    try {
        console.log('🔍 Diagnostic des problèmes de base de données...\n');

        // 1. Vérifier la structure de la table time_sheets
        console.log('1️⃣ Vérification de la table time_sheets...');
        const timeSheetsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets'
            ORDER BY ordinal_position
        `);
        
        console.log('Structure de time_sheets:');
        timeSheetsStructure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier les contraintes CHECK
        console.log('\n2️⃣ Vérification des contraintes CHECK...');
        const checkConstraints = await pool.query(`
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name LIKE '%time_sheets%' OR constraint_name LIKE '%time_entries%'
        `);
        
        console.log('Contraintes CHECK trouvées:');
        checkConstraints.rows.forEach(constraint => {
            console.log(`   ${constraint.constraint_name}: ${constraint.check_clause}`);
        });

        // 3. Vérifier la structure de la table time_entries
        console.log('\n3️⃣ Vérification de la table time_entries...');
        const timeEntriesStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position
        `);
        
        console.log('Structure de time_entries:');
        timeEntriesStructure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 4. Tester l'insertion d'une feuille de temps
        console.log('\n4️⃣ Test d\'insertion d\'une feuille de temps...');
        try {
            const testTimeSheet = await pool.query(`
                INSERT INTO time_sheets (
                    collaborateur_id, date_debut_semaine, date_fin_semaine, annee, semaine, statut
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, statut
            `, [
                'f6a6567f-b51d-4dbc-872d-1005156bd187', // collaborateur_id
                '2025-08-04', // date_debut_semaine
                '2025-08-10', // date_fin_semaine
                2025, // annee
                32, // semaine
                'draft' // statut
            ]);
            console.log('✅ Insertion time_sheets réussie:', testTimeSheet.rows[0]);
            
            // Nettoyer le test
            await pool.query('DELETE FROM time_sheets WHERE id = $1', [testTimeSheet.rows[0].id]);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion time_sheets:', error.message);
        }

        // 5. Tester l'insertion d'une entrée de temps
        console.log('\n5️⃣ Test d\'insertion d\'une entrée de temps...');
        try {
            const testTimeEntry = await pool.query(`
                INSERT INTO time_entries (
                    user_id, date_saisie, heures, type_heures, mission_id, description, statut
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, statut
            `, [
                'f6a6567f-b51d-4dbc-872d-1005156bd187', // user_id
                '2025-08-04', // date_saisie
                8.0, // heures
                'chargeable', // type_heures
                'f1b5a971-3a94-473d-af5b-7922348d8a1d', // mission_id
                'Test entry', // description
                'draft' // statut
            ]);
            console.log('✅ Insertion time_entries réussie:', testTimeEntry.rows[0]);
            
            // Nettoyer le test
            await pool.query('DELETE FROM time_entries WHERE id = $1', [testTimeEntry.rows[0].id]);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion time_entries:', error.message);
        }

        // 6. Vérifier les valeurs possibles pour statut
        console.log('\n6️⃣ Vérification des valeurs possibles pour statut...');
        const statusValues = await pool.query(`
            SELECT DISTINCT statut FROM time_sheets
        `);
        console.log('Valeurs statut dans time_sheets:', statusValues.rows.map(r => r.statut));

        const statusValuesEntries = await pool.query(`
            SELECT DISTINCT statut FROM time_entries
        `);
        console.log('Valeurs statut dans time_entries:', statusValuesEntries.rows.map(r => r.statut));

        console.log('\n🎯 Diagnostic terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        await pool.end();
    }
}

diagnoseAndFixDatabase(); 