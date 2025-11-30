const { query } = require('./src/utils/database');

async function seedObjectiveUnitsAndMetrics() {
    console.log('🌱 Seed: Unités et Métriques d\'Objectifs');

    try {
        // 1. Vérifier si les unités existent déjà
        const existingUnits = await query(`SELECT COUNT(*) as count FROM objective_units`);

        if (existingUnits.rows[0].count > 0) {
            console.log('ℹ️  Unités déjà présentes, passage aux métriques...');
        } else {
            console.log('1️⃣ Insertion des unités de mesure...');

            await query(`INSERT INTO objective_units (code, label, symbol, type) VALUES ('COUNT', 'Nombre', '', 'count')`);
            console.log(`   ✅ Nombre`);

            await query(`INSERT INTO objective_units (code, label, symbol, type) VALUES ('CURRENCY', 'Montant', '', 'currency')`);
            console.log(`   ✅ Montant`);

            await query(`INSERT INTO objective_units (code, label, symbol, type) VALUES ('PERCENTAGE', 'Pourcentage', '%', 'percentage')`);
            console.log(`   ✅ Pourcentage`);

            await query(`INSERT INTO objective_units (code, label, symbol, type) VALUES ('DAYS', 'Jours', 'j', 'duration')`);
            console.log(`   ✅ Jours`);
        }

        // 2. Récupérer les IDs des unités
        const currencyUnit = await query(`SELECT id FROM objective_units WHERE code = 'CURRENCY'`);
        const countUnit = await query(`SELECT id FROM objective_units WHERE code = 'COUNT'`);
        const percentageUnit = await query(`SELECT id FROM objective_units WHERE code = 'PERCENTAGE'`);

        const currencyId = currencyUnit.rows[0].id;
        const countId = countUnit.rows[0].id;
        const percentageId = percentageUnit.rows[0].id;

        console.log(`   📊 IDs récupérés: Currency=${currencyId}, Count=${countId}, Percentage=${percentageId}`);

        // 3. Vérifier si les métriques existent déjà
        const existingMetrics = await query(`SELECT COUNT(*) as count FROM objective_metrics`);

        if (existingMetrics.rows[0].count > 0) {
            console.log('ℹ️  Métriques déjà présentes');
        } else {
            console.log('2️⃣ Insertion des métriques par défaut...');

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['CA_TOTAL', 'Chiffre d\'Affaires Total', 'Somme du CA de toutes les opportunités gagnées et missions signées', 'SUM', currencyId]);
            console.log(`   ✅ CA Total`);

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['NB_CLIENTS', 'Nombre de Clients', 'Nombre total de clients actifs', 'COUNT', countId]);
            console.log(`   ✅ Nombre de Clients`);

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['NB_OPPORTUNITES', 'Nombre d\'Opportunités', 'Nombre total d\'opportunités créées', 'COUNT', countId]);
            console.log(`   ✅ Nombre d\'Opportunités`);

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['TAUX_CONVERSION', 'Taux de Conversion', 'Pourcentage d\'opportunités gagnées', 'PERCENTAGE', percentageId]);
            console.log(`   ✅ Taux de Conversion`);

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['NB_MISSIONS', 'Nombre de Missions', 'Nombre total de missions signées', 'COUNT', countId]);
            console.log(`   ✅ Nombre de Missions`);

            await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
                VALUES ($1, $2, $3, $4, $5)
            `, ['MARGE_BRUTE', 'Marge Brute', 'Marge brute totale (CA - Coûts)', 'SUM', currencyId]);
            console.log(`   ✅ Marge Brute`);
        }

        console.log('✅ Seed terminé avec succès');
        console.log('ℹ️  Configuration des sources de métriques à faire manuellement via l\'interface admin');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors du seed:', error);
        console.error('Détails:', error.message);
        process.exit(1);
    }
}

seedObjectiveUnitsAndMetrics();
