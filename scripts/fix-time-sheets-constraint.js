const { query } = require('../src/utils/database');

async function fixTimeSheetsConstraint() {
    console.log('🔧 CORRECTION DE LA CONTRAINTE TIME_SHEETS');
    console.log('==========================================');

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
            console.log('✅ Contrainte trouvée:', constraintCheck.rows[0].constraint_definition);
        } else {
            console.log('❌ Contrainte non trouvée');
        }

        // 2. Vérifier les valeurs possibles pour le statut
        console.log('\n📊 2. VÉRIFICATION DES VALEURS DE STATUT');
        
        const statusValues = await query(`
            SELECT DISTINCT statut 
            FROM time_sheets 
            WHERE statut IS NOT NULL
        `);

        console.log('Valeurs de statut existantes:', statusValues.rows.map(r => r.statut));

        // 3. Supprimer l'ancienne contrainte si elle existe
        console.log('\n🗑️ 3. SUPPRESSION DE L\'ANCIENNE CONTRAINTE');
        
        try {
            await query(`ALTER TABLE time_sheets DROP CONSTRAINT IF EXISTS time_sheets_statut_check`);
            console.log('✅ Ancienne contrainte supprimée');
        } catch (error) {
            console.log('⚠️ Erreur lors de la suppression:', error.message);
        }

        // 4. Créer la nouvelle contrainte avec les bonnes valeurs
        console.log('\n✅ 4. CRÉATION DE LA NOUVELLE CONTRAINTE');
        
        await query(`
            ALTER TABLE time_sheets 
            ADD CONSTRAINT time_sheets_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'))
        `);

        console.log('✅ Nouvelle contrainte créée');

        // 5. Vérifier que la contrainte fonctionne
        console.log('\n🧪 5. TEST DE LA NOUVELLE CONTRAINTE');
        
        // Récupérer un collaborateur de test
        const testCollaborateur = await query(`
            SELECT id FROM collaborateurs LIMIT 1
        `);

        if (testCollaborateur.rows.length > 0) {
            const collaborateurId = testCollaborateur.rows[0].id;
            
            // Tester avec une valeur valide
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
                console.log('✅ Test avec valeur valide réussi');
            } catch (error) {
                console.log('❌ Test avec valeur valide échoué:', error.message);
            }

            // 6. Nettoyer les données de test
            console.log('\n🧹 6. NETTOYAGE DES DONNÉES DE TEST');
            
            await query(`
                DELETE FROM time_sheets 
                WHERE collaborateur_id = $1 
                AND semaine = 1 
                AND annee = 2025
            `, [collaborateurId]);

            console.log('✅ Données de test nettoyées');
        } else {
            console.log('⚠️ Aucun collaborateur trouvé pour le test');
        }

        // 7. Vérifier la contrainte finale
        console.log('\n✅ 7. VÉRIFICATION FINALE');
        
        const finalCheck = await query(`
            SELECT 
                conname,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname = 'time_sheets_statut_check'
        `);

        if (finalCheck.rows.length > 0) {
            console.log('✅ Contrainte finale:', finalCheck.rows[0].constraint_definition);
        }

        console.log('\n✅ CORRECTION TERMINÉE AVEC SUCCÈS');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
        throw error;
    }
}

// Exécuter la correction
if (require.main === module) {
    fixTimeSheetsConstraint().then(() => {
        console.log('\n🎉 Correction terminée');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { fixTimeSheetsConstraint }; 