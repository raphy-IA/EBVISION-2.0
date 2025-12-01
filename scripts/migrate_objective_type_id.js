const { query } = require('../src/utils/database');

async function fixObjectiveTypeIdSchema() {
    console.log('🔧 Migration: Correction du type objective_type_id\n');

    try {
        // 1. Vider la table
        console.log('1. Vidage de objective_metric_sources...');
        await query('TRUNCATE TABLE objective_metric_sources CASCADE');
        console.log('   ✅ Table vidée\n');

        // 2. Modifier le type de colonne
        console.log('2. Modification du type de objective_type_id (UUID → INTEGER)...');
        await query(`
            ALTER TABLE objective_metric_sources 
            ALTER COLUMN objective_type_id TYPE INTEGER USING NULL
        `);
        console.log('   ✅ Type modifié\n');

        // 3. Supprimer l'ancienne FK si elle existe
        console.log('3. Gestion de la foreign key...');
        await query(`
            ALTER TABLE objective_metric_sources
            DROP CONSTRAINT IF EXISTS fk_objective_metric_sources_type
        `);

        // 4. Créer la nouvelle FK
        await query(`
            ALTER TABLE objective_metric_sources
            ADD CONSTRAINT fk_objective_metric_sources_type
            FOREIGN KEY (objective_type_id) 
            REFERENCES objective_types(id)
            ON DELETE SET NULL
        `);
        console.log('   ✅ Foreign key créée\n');

        // 5. Vérification
        console.log('4. Vérification finale...');
        const result = await query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'objective_metric_sources' 
            AND column_name IN ('objective_type_id', 'unit_id')
            ORDER BY column_name
        `);

        console.log('\n   Schema actuel:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n✅ MIGRATION TERMINÉE AVEC SUCCÈS !\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERREUR lors de la migration:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixObjectiveTypeIdSchema();
