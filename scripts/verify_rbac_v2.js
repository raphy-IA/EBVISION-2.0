const { query } = require('../src/utils/database');
const Objective = require('../src/models/Objective');

async function testMultiBuRbac() {
    console.log('--- TEST RBAC MULTI-BU (UUID SAFE) ---');

    // 1. Récupérer une année fiscale valide
    const fyResult = await query('SELECT id FROM fiscal_years LIMIT 1');
    if (fyResult.rows.length === 0) {
        console.log('Aucune année fiscale trouvée');
        process.exit(0);
    }
    const fiscalYearId = fyResult.rows[0].id;
    console.log('Using Fiscal Year:', fiscalYearId);

    // 2. Simuler un admin (authorizedBuIds = null)
    console.log('\nCASE 1: Admin Access (No filter)');
    const adminObjectives = await Objective.getAllObjectives(fiscalYearId, null);
    const scopes = [...new Set(adminObjectives.map(o => o.scope))];
    console.log('Scopes vus par admin:', scopes);
    console.log('Total objectifs:', adminObjectives.length);

    // 3. Simuler un user avec des BUs spécifiques
    const buResult = await query('SELECT id FROM business_units LIMIT 2');
    if (buResult.rows.length === 0) {
        console.log('Aucune BU trouvée');
        process.exit(0);
    }
    const buIds = buResult.rows.map(r => r.id);
    console.log('\nCASE 2: Restricted access with BU IDs:', buIds);

    const restrictedObjectives = await Objective.getAllObjectives(fiscalYearId, buIds);
    const restrictedScopes = [...new Set(restrictedObjectives.map(o => o.scope))];
    console.log('Scopes vus par restreint:', restrictedScopes);
    console.log('Total objectifs:', restrictedObjectives.length);

    const buIdsInResults = [...new Set(restrictedObjectives.filter(o => o.scope === 'BU').map(o => o.business_unit_id))];
    console.log('BUs présentes dans les résultats:', buIdsInResults);

    const isFilteredCorrectly = buIdsInResults.every(id => buIds.includes(id));
    console.log('Filtrage correct ?', isFilteredCorrectly ? 'OUI ✅' : 'NON ❌');

    // Vérifier l'absence de GLOBAL (car authorizedBuIds est passé)
    const hasGlobal = restrictedObjectives.some(o => o.scope === 'GLOBAL');
    console.log('Absence de GLOBAL ?', !hasGlobal ? 'OUI ✅' : 'NON ❌');

    process.exit(0);
}

testMultiBuRbac().catch(err => {
    console.error(err);
    process.exit(1);
});
