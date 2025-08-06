const { query } = require('../src/utils/database');

async function fixTimeSheetsConstraintFinal() {
    console.log('🔧 CORRECTION FINALE DE LA CONTRAINTE TIME_SHEETS');
    console.log('================================================');

    try {
        // 1. Vérifier la contrainte actuelle
        console.log('\n📋 1. VÉRIFICATION DE LA CONTRAINTE ACTUELLE');

        const constraintCheck = await query(`
            SELECT
                conname,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conname = 'time_sheets_statut_check'
        `);

        if (constraintCheck.rows.length > 0) {
            console.log('Contrainte actuelle:');
            console.log(`  - Nom: ${constraintCheck.rows[0].conname}`);
            console.log(`  - Définition: ${constraintCheck.rows[0].constraint_definition}`);
        }

        // 2. Supprimer la contrainte existante
        console.log('\n🗑️ 2. SUPPRESSION DE LA CONTRAINTE EXISTANTE');

        try {
            await query(`
                ALTER TABLE time_sheets 
                DROP CONSTRAINT IF EXISTS time_sheets_statut_check
            `);
            console.log('✅ Contrainte supprimée');
        } catch (error) {
            console.log('⚠️ Erreur lors de la suppression:', error.message);
        }

        // 3. Recréer la contrainte avec les bonnes valeurs
        console.log('\n🔧 3. CRÉATION DE LA NOUVELLE CONTRAINTE');

        await query(`
            ALTER TABLE time_sheets 
            ADD CONSTRAINT time_sheets_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'))
        `);
        console.log('✅ Nouvelle contrainte créée');

        // 4. Vérifier la nouvelle contrainte
        console.log('\n✅ 4. VÉRIFICATION DE LA NOUVELLE CONTRAINTE');

        const newConstraintCheck = await query(`
            SELECT
                conname,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conname = 'time_sheets_statut_check'
        `);

        if (newConstraintCheck.rows.length > 0) {
            console.log('Nouvelle contrainte:');
            console.log(`  - Nom: ${newConstraintCheck.rows[0].conname}`);
            console.log(`  - Définition: ${newConstraintCheck.rows[0].constraint_definition}`);
        }

        // 5. Tester l'insertion avec 'draft'
        console.log('\n🧪 5. TEST D\'INSERTION AVEC "draft"');

        const testCollaborateur = await query(`
            SELECT id FROM collaborateurs LIMIT 1
        `);

        if (testCollaborateur.rows.length > 0) {
            const collaborateurId = testCollaborateur.rows[0].id;

            try {
                await query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, semaine, annee, date_debut_semaine,
                        date_fin_semaine, statut, total_heures,
                        total_heures_chargeables, total_heures_non_chargeables
                    )
                    VALUES ($1, 999, 2025, '2025-01-06', '2025-01-12', 'draft', 0, 0, 0)
                    ON CONFLICT DO NOTHING
                `, [collaborateurId]);
                console.log('✅ Test avec "draft" réussi');

                // Nettoyer
                await query(`
                    DELETE FROM time_sheets
                    WHERE collaborateur_id = $1
                    AND semaine = 999
                    AND annee = 2025
                `, [collaborateurId]);
                console.log('✅ Données de test nettoyées');
            } catch (error) {
                console.log('❌ Test avec "draft" échoué:', error.message);
            }
        } else {
            console.log('⚠️ Aucun collaborateur trouvé pour le test');
        }

        // 6. Tester toutes les valeurs possibles
        console.log('\n🧪 6. TEST DE TOUTES LES VALEURS');

        const testValues = ['draft', 'submitted', 'approved', 'rejected'];

        for (const testValue of testValues) {
            try {
                await query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, semaine, annee, date_debut_semaine,
                        date_fin_semaine, statut, total_heures,
                        total_heures_chargeables, total_heures_non_chargeables
                    )
                    VALUES ($1, 998, 2025, '2025-01-06', '2025-01-12', $2, 0, 0, 0)
                    ON CONFLICT DO NOTHING
                `, [collaborateurId, testValue]);
                console.log(`✅ Test avec '${testValue}' réussi`);

                // Nettoyer
                await query(`
                    DELETE FROM time_sheets
                    WHERE collaborateur_id = $1
                    AND semaine = 998
                    AND annee = 2025
                    AND statut = $2
                `, [collaborateurId, testValue]);
            } catch (error) {
                console.log(`❌ Test avec '${testValue}' échoué: ${error.message}`);
            }
        }

        console.log('\n✅ Correction terminée avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    }
}

fixTimeSheetsConstraintFinal(); 