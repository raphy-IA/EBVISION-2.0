const { query } = require('./src/utils/database');

async function migrateObjectiveMetricsSystem() {
    console.log('🔄 Migration: Système d\'Objectifs Métriques et Types');

    try {
        // Les tables objective_units, objective_metrics, objective_metric_sources existent déjà
        console.log('ℹ️  Tables de base déjà existantes, passage aux modifications...');

        // 1. Modifier table objective_types
        console.log('1️⃣ Modification table objective_types...');
        await query(`
            ALTER TABLE objective_types 
                ADD COLUMN IF NOT EXISTS default_unit_id UUID,
                ADD COLUMN IF NOT EXISTS supports_multiple_units BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS data_source_table VARCHAR(100),
                ADD COLUMN IF NOT EXISTS data_source_value_column VARCHAR(100)
        `);
        console.log('   ✅ Table objective_types modifiée');

        // 2. Ajouter colonnes aux tables d'objectifs existantes
        console.log('2️⃣ Ajout colonnes mode aux tables d\'objectifs...');

        const objectiveTables = [
            'global_objectives',
            'business_unit_objectives',
            'division_objectives',
            'individual_objectives'
        ];

        for (const table of objectiveTables) {
            await query(`
                ALTER TABLE ${table}
                    ADD COLUMN IF NOT EXISTS objective_mode VARCHAR(20) DEFAULT 'METRIC',
                    ADD COLUMN IF NOT EXISTS metric_id UUID,
                    ADD COLUMN IF NOT EXISTS unit_id UUID
            `);
            console.log(`   ✅ ${table} modifiée`);
        }

        // 3. Créer index
        console.log('3️⃣ Création des index...');
        await query(`CREATE INDEX IF NOT EXISTS idx_metric_sources_metric ON objective_metric_sources(metric_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_metric_sources_type ON objective_metric_sources(objective_type_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_objectives_mode ON global_objectives(objective_mode)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_objectives_metric ON global_objectives(metric_id)`);
        console.log('   ✅ Index créés');

        console.log('✅ Migration terminée avec succès');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

migrateObjectiveMetricsSystem();
