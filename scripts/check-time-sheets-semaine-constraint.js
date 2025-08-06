const { query } = require('../src/utils/database');

async function checkTimeSheetsSemaineConstraint() {
    console.log('🔍 VÉRIFICATION DE LA CONTRAINTE TIME_SHEETS_SEMAINE_CHECK');
    console.log('==========================================================');

    try {
        // 1. Vérifier la contrainte semaine
        console.log('\n📋 1. CONTRAINTE SEMAINE');

        const semaineConstraint = await query(`
            SELECT
                conname,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conname = 'time_sheets_semaine_check'
        `);

        if (semaineConstraint.rows.length > 0) {
            console.log('Contrainte semaine trouvée:');
            console.log(`  - Nom: ${semaineConstraint.rows[0].conname}`);
            console.log(`  - Définition: ${semaineConstraint.rows[0].constraint_definition}`);
        } else {
            console.log('❌ Contrainte time_sheets_semaine_check non trouvée');
        }

        // 2. Vérifier toutes les contraintes de la table time_sheets
        console.log('\n📋 2. TOUTES LES CONTRAINTES DE TIME_SHEETS');

        const allConstraints = await query(`
            SELECT
                conname,
                contype,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conrelid = 'time_sheets'::regclass
            ORDER BY conname
        `);

        console.log('Contraintes de time_sheets:');
        allConstraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.conname} (${constraint.contype}): ${constraint.constraint_definition}`);
        });

        // 3. Tester l'insertion avec une semaine valide
        console.log('\n🧪 3. TEST D\'INSERTION AVEC SEMAINE VALIDE');

        const testCollaborateur = await query(`
            SELECT id FROM collaborateurs LIMIT 1
        `);

        if (testCollaborateur.rows.length > 0) {
            const collaborateurId = testCollaborateur.rows[0].id;

            // Tester avec semaine 1 (qui devrait être valide)
            try {
                await query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, semaine, annee, date_debut_semaine,
                        date_fin_semaine, statut, total_heures,
                        total_heures_chargeables, total_heures_non_chargeables
                    )
                    VALUES ($1, 1, 2025, '2025-01-06', '2025-01-12', 'draft', 0, 0, 0)
                    ON CONFLICT DO NOTHING
                `, [collaborateurId]);
                console.log('✅ Test avec semaine 1 réussi');

                // Nettoyer
                await query(`
                    DELETE FROM time_sheets
                    WHERE collaborateur_id = $1
                    AND semaine = 1
                    AND annee = 2025
                `, [collaborateurId]);
                console.log('✅ Données de test nettoyées');
            } catch (error) {
                console.log('❌ Test avec semaine 1 échoué:', error.message);
            }

            // Tester avec semaine 52 (qui devrait être valide)
            try {
                await query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, semaine, annee, date_debut_semaine,
                        date_fin_semaine, statut, total_heures,
                        total_heures_chargeables, total_heures_non_chargeables
                    )
                    VALUES ($1, 52, 2025, '2025-12-22', '2025-12-28', 'draft', 0, 0, 0)
                    ON CONFLICT DO NOTHING
                `, [collaborateurId]);
                console.log('✅ Test avec semaine 52 réussi');

                // Nettoyer
                await query(`
                    DELETE FROM time_sheets
                    WHERE collaborateur_id = $1
                    AND semaine = 52
                    AND annee = 2025
                `, [collaborateurId]);
                console.log('✅ Données de test nettoyées');
            } catch (error) {
                console.log('❌ Test avec semaine 52 échoué:', error.message);
            }
        } else {
            console.log('⚠️ Aucun collaborateur trouvé pour le test');
        }

        console.log('\n✅ Vérification terminée');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

checkTimeSheetsSemaineConstraint(); 