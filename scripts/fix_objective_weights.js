/**
 * Script de correction des poids d'objectifs
 * Règle: au sein d'une même entité (BU, Division, Individu), tous les objectifs
 * ont un poids égal = 100 / nombre d'objectifs dans cette entité.
 * 
 * Usage: node scripts/fix_objective_weights.js
 */
const { query } = require('../src/utils/database');

async function rebalanceEntity(childTable, entityColumn, label) {
    console.log(`\n🔄 ${label}`);

    // Récupérer toutes les entités distinctes (BU, Division, ou Individu)
    const entitiesSql = `SELECT DISTINCT ${entityColumn} as entity_id, COUNT(*) as count FROM ${childTable} GROUP BY ${entityColumn}`;
    const entitiesResult = await query(entitiesSql);

    console.log(`   ${entitiesResult.rows.length} entité(s) trouvée(s)`);

    let totalUpdated = 0;
    for (const { entity_id, count } of entitiesResult.rows) {
        const n = parseInt(count);
        if (n === 0) continue;

        const equalWeight = Math.round((100 / n) * 100) / 100;
        await query(
            `UPDATE ${childTable} SET weight = $1, updated_at = NOW() WHERE ${entityColumn} = $2`,
            [equalWeight, entity_id]
        );
        totalUpdated += n;
        console.log(`   Entité ${entity_id}: ${n} objectif(s) → poids = ${equalWeight}%`);
    }

    console.log(`   ✅ ${totalUpdated} objectif(s) mis à jour`);
}

async function run() {
    console.log('====================================================');
    console.log('  Rééquilibrage des poids d\'objectifs (par entité)');
    console.log('====================================================');

    try {
        // 1. Objectifs BU → groupés par business_unit_id
        await rebalanceEntity('business_unit_objectives', 'business_unit_id', 'Objectifs BU (par BU)');

        // 2. Objectifs Division → groupés par division_id
        await rebalanceEntity('division_objectives', 'division_id', 'Objectifs Division (par Division)');

        // 3. Objectifs Individuels → groupés par collaborator_id
        await rebalanceEntity('individual_objectives', 'collaborator_id', 'Objectifs Individuels (par Collaborateur)');

        console.log('\n====================================================');
        console.log('  ✅ Rééquilibrage terminé avec succès');
        console.log('====================================================');
    } catch (error) {
        console.error('\n❌ Erreur lors du rééquilibrage:', error);
    } finally {
        process.exit();
    }
}

run();
