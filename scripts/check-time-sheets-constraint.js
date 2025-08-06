const { query } = require('../src/utils/database');

async function checkTimeSheetsConstraint() {
    console.log('🔍 VÉRIFICATION DE LA CONTRAINTE TIME_SHEETS_STATUT_CHECK');
    console.log('========================================================');

    try {
        // 1. Vérifier la contrainte actuelle
        console.log('\n📋 1. CONTRAINTE ACTUELLE');

        const constraintCheck = await query(`
            SELECT
                conname,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conname = 'time_sheets_statut_check'
        `);

        if (constraintCheck.rows.length > 0) {
            console.log('Contrainte trouvée:');
            console.log(`  - Nom: ${constraintCheck.rows[0].conname}`);
            console.log(`  - Définition: ${constraintCheck.rows[0].constraint_definition}`);
        } else {
            console.log('❌ Contrainte time_sheets_statut_check non trouvée');
        }

        // 2. Vérifier les valeurs possibles pour le statut
        console.log('\n📋 2. VALEURS POSSIBLES POUR LE STATUT');

        const enumValues = await query(`
            SELECT unnest(enum_range(NULL::time_sheets_statut_enum)) as value
        `);

        if (enumValues.rows.length > 0) {
            console.log('Valeurs enum possibles:');
            enumValues.rows.forEach(row => {
                console.log(`  - ${row.value}`);
            });
        } else {
            console.log('⚠️ Aucune valeur enum trouvée');
        }

        // 3. Vérifier la structure de la table
        console.log('\n📋 3. STRUCTURE DE LA TABLE TIME_SHEETS');

        const structure = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'time_sheets'
            AND column_name = 'statut'
        `);

        if (structure.rows.length > 0) {
            const statutCol = structure.rows[0];
            console.log('Colonne statut:');
            console.log(`  - Type: ${statutCol.data_type}`);
            console.log(`  - Nullable: ${statutCol.is_nullable}`);
            console.log(`  - Default: ${statutCol.column_default}`);
        }

        // 4. Tester l'insertion avec différentes valeurs
        console.log('\n🧪 4. TEST D\'INSERTION');

        const testValues = ['draft', 'submitted', 'approved', 'rejected', 'BROUILLON', 'EN_COURS', 'SOUMISE', 'VALIDEE', 'REJETEE'];

        for (const testValue of testValues) {
            try {
                // Récupérer un collaborateur de test
                const testCollaborateur = await query(`
                    SELECT id FROM collaborateurs LIMIT 1
                `);

                if (testCollaborateur.rows.length > 0) {
                    const collaborateurId = testCollaborateur.rows[0].id;

                    await query(`
                        INSERT INTO time_sheets (
                            collaborateur_id, semaine, annee, date_debut_semaine,
                            date_fin_semaine, statut, total_heures,
                            total_heures_chargeables, total_heures_non_chargeables
                        )
                        VALUES ($1, 999, 2025, '2025-01-06', '2025-01-12', $2, 0, 0, 0)
                        ON CONFLICT DO NOTHING
                    `, [collaborateurId, testValue]);

                    console.log(`✅ Test avec '${testValue}' réussi`);

                    // Nettoyer
                    await query(`
                        DELETE FROM time_sheets
                        WHERE collaborateur_id = $1
                        AND semaine = 999
                        AND annee = 2025
                    `, [collaborateurId]);
                }
            } catch (error) {
                console.log(`❌ Test avec '${testValue}' échoué: ${error.message}`);
            }
        }

        console.log('\n✅ Vérification terminée');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

checkTimeSheetsConstraint(); 