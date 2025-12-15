const { pool } = require('../../src/utils/database');
const { analyzeMissionTypes } = require('./analyze_mission_types_bu');

/**
 * Script de migration pour ajouter business_unit_id aux types de mission
 * et dupliquer les types partagés entre plusieurs BU
 */

async function migrateMissionTypes() {
    const client = await pool.connect();

    try {
        console.log('🚀 Début de la migration des types de mission\n');

        // Étape 0: Analyse préalable
        console.log('📊 Étape 0: Analyse des données...\n');
        const analysis = await analyzeMissionTypes();

        await client.query('BEGIN');

        // Étape 1: Ajouter la colonne business_unit_id (nullable temporairement)
        console.log('\n📝 Étape 1: Ajout de la colonne business_unit_id...');
        await client.query(`
            ALTER TABLE mission_types 
            ADD COLUMN IF NOT EXISTS business_unit_id UUID;
        `);
        console.log('   ✅ Colonne ajoutée\n');

        // Étape 2: Peupler business_unit_id pour les types avec division
        console.log('📝 Étape 2: Peuplement des BU via divisions...');
        const updateFromDivision = await client.query(`
            UPDATE mission_types mt
            SET business_unit_id = d.business_unit_id
            FROM divisions d
            WHERE mt.division_id = d.id
            AND mt.business_unit_id IS NULL
            RETURNING mt.id, mt.codification;
        `);
        console.log(`   ✅ ${updateFromDivision.rowCount} types mis à jour via division\n`);

        // Étape 3: Dupliquer les types partagés
        console.log('📝 Étape 3: Duplication des types partagés...\n');

        for (const sharedType of analysis.sharedTypes) {
            console.log(`   🔸 Traitement de: ${sharedType.codification} - ${sharedType.libelle}`);

            // Récupérer les BU distinctes utilisant ce type
            const buQuery = await client.query(`
                SELECT DISTINCT 
                    m.business_unit_id,
                    bu.nom as bu_nom,
                    bu.code as bu_code,
                    COUNT(m.id) as mission_count
                FROM missions m
                JOIN business_units bu ON m.business_unit_id = bu.id
                WHERE m.mission_type_id = $1
                GROUP BY m.business_unit_id, bu.nom, bu.code
                ORDER BY mission_count DESC;
            `, [sharedType.id]);

            const businessUnits = buQuery.rows;
            console.log(`      Utilisé par ${businessUnits.length} BU`);

            // La première BU garde le type original
            const [firstBU, ...otherBUs] = businessUnits;

            // Assigner la BU au type original
            await client.query(`
                UPDATE mission_types
                SET business_unit_id = $1
                WHERE id = $2;
            `, [firstBU.business_unit_id, sharedType.id]);

            console.log(`      ✓ Type original assigné à: ${firstBU.bu_nom}`);

            // Créer des copies pour les autres BU
            for (const bu of otherBUs) {
                const newCodification = `${sharedType.codification}-${bu.bu_code}`;
                const newLibelle = `${sharedType.libelle} (${bu.bu_nom})`;

                // Créer le nouveau type
                const newTypeResult = await client.query(`
                    INSERT INTO mission_types (
                        codification, libelle, description, division_id, 
                        business_unit_id, actif, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id;
                `, [
                    newCodification,
                    newLibelle,
                    sharedType.description,
                    sharedType.division_id,
                    bu.business_unit_id,
                    true
                ]);

                const newTypeId = newTypeResult.rows[0].id;

                // Mettre à jour les missions de cette BU
                const updateResult = await client.query(`
                    UPDATE missions
                    SET mission_type_id = $1
                    WHERE mission_type_id = $2
                    AND business_unit_id = $3;
                `, [newTypeId, sharedType.id, bu.business_unit_id]);

                console.log(`      ✓ Créé: ${newCodification} pour ${bu.bu_nom} (${updateResult.rowCount} missions)`);
            }
            console.log('');
        }

        // Étape 4: Gérer les types sans division ni mission
        console.log('📝 Étape 4: Traitement des types non utilisés...');

        if (analysis.unusedTypes.length > 0) {
            console.log(`   ⚠️  ${analysis.unusedTypes.length} types sans missions détectés`);
            console.log('   ℹ️  Ces types nécessitent une BU par défaut\n');

            // Récupérer la première BU comme défaut
            const defaultBuResult = await client.query(`
                SELECT id, nom FROM business_units ORDER BY created_at LIMIT 1;
            `);

            if (defaultBuResult.rows.length > 0) {
                const defaultBu = defaultBuResult.rows[0];

                for (const unusedType of analysis.unusedTypes) {
                    await client.query(`
                        UPDATE mission_types
                        SET business_unit_id = $1
                        WHERE id = $2 AND business_unit_id IS NULL;
                    `, [defaultBu.id, unusedType.id]);
                }

                console.log(`   ✅ ${analysis.unusedTypes.length} types assignés à la BU par défaut: ${defaultBu.nom}\n`);
            }
        } else {
            console.log('   ✅ Aucun type non utilisé\n');
        }

        // Étape 5: Vérifier qu'aucun type n'a business_unit_id NULL
        const nullCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM mission_types
            WHERE business_unit_id IS NULL;
        `);

        if (parseInt(nullCheck.rows[0].count) > 0) {
            throw new Error(`❌ ${nullCheck.rows[0].count} types ont encore business_unit_id NULL`);
        }

        console.log('📝 Étape 5: Vérification...');
        console.log('   ✅ Tous les types ont une business_unit_id\n');

        // Étape 6: Rendre la colonne obligatoire
        console.log('📝 Étape 6: Ajout des contraintes...');
        await client.query(`
            ALTER TABLE mission_types 
            ALTER COLUMN business_unit_id SET NOT NULL;
        `);
        console.log('   ✅ Colonne business_unit_id rendue obligatoire');

        await client.query(`
            ALTER TABLE mission_types
            ADD CONSTRAINT mission_types_business_unit_id_fkey 
            FOREIGN KEY (business_unit_id) REFERENCES business_units(id);
        `);
        console.log('   ✅ Contrainte FK ajoutée');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_mission_types_business_unit 
            ON mission_types(business_unit_id);
        `);
        console.log('   ✅ Index créé\n');

        // Commit de la transaction
        await client.query('COMMIT');

        // Statistiques finales
        console.log('📊 STATISTIQUES FINALES:\n');

        const finalStats = await client.query(`
            SELECT 
                COUNT(*) as total_types,
                COUNT(DISTINCT business_unit_id) as distinct_bus
            FROM mission_types;
        `);

        const buStats = await client.query(`
            SELECT 
                bu.nom as bu_nom,
                COUNT(mt.id) as type_count
            FROM business_units bu
            LEFT JOIN mission_types mt ON mt.business_unit_id = bu.id
            GROUP BY bu.id, bu.nom
            ORDER BY type_count DESC;
        `);

        console.log(`   Total de types de mission: ${finalStats.rows[0].total_types}`);
        console.log(`   Business Units avec types: ${finalStats.rows[0].distinct_bus}\n`);

        console.log('   Répartition par BU:');
        buStats.rows.forEach(row => {
            console.log(`      - ${row.bu_nom}: ${row.type_count} types`);
        });

        console.log('\n✅ Migration terminée avec succès!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erreur lors de la migration:', error);
        console.error('   Transaction annulée (ROLLBACK)\n');
        throw error;
    } finally {
        client.release();
    }
}

// Exécution
if (require.main === module) {
    migrateMissionTypes()
        .then(() => {
            console.log('✅ Script terminé');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
}

module.exports = { migrateMissionTypes };
