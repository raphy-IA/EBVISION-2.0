const { pool } = require('./src/utils/database');

async function checkBusinessUnits() {
    try {
        console.log('🔍 Diagnostic des Business Units...\n');

        // 1. Vérifier toutes les Business Units dans la base
        console.log('1️⃣ Toutes les Business Units en base:');
        const allBusQuery = `
            SELECT id, nom, code, description, statut, created_at, updated_at
            FROM business_units
            ORDER BY nom
        `;
        const allBusResult = await pool.query(allBusQuery);
        console.log(`   Total: ${allBusResult.rows.length} Business Units`);
        allBusResult.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code}) - Statut: ${bu.statut} - Créée: ${bu.created_at}`);
        });

        // 2. Vérifier les divisions pour chaque BU
        console.log('\n2️⃣ Divisions par Business Unit:');
        const divisionsQuery = `
            SELECT 
                bu.id as bu_id,
                bu.nom as bu_nom,
                bu.code as bu_code,
                COUNT(d.id) as divisions_count,
                STRING_AGG(d.nom, ', ') as divisions_names
            FROM business_units bu
            LEFT JOIN divisions d ON bu.id = d.business_unit_id
            GROUP BY bu.id, bu.nom, bu.code
            ORDER BY bu.nom
        `;
        const divisionsResult = await pool.query(divisionsQuery);
        divisionsResult.rows.forEach(row => {
            console.log(`   - ${row.bu_nom} (${row.bu_code}): ${row.divisions_count} divisions`);
            if (row.divisions_names) {
                console.log(`     Divisions: ${row.divisions_names}`);
            }
        });

        // 3. Vérifier la requête exacte utilisée par findAll
        console.log('\n3️⃣ Test de la requête findAll:');
        const findAllQuery = `
            SELECT 
                bu.id, 
                bu.nom, 
                bu.code, 
                bu.description, 
                bu.statut, 
                bu.created_at, 
                bu.updated_at,
                COUNT(d.id) as divisions_count
            FROM business_units bu
            LEFT JOIN divisions d ON bu.id = d.business_unit_id
            GROUP BY bu.id, bu.nom, bu.code, bu.description, bu.statut, bu.created_at, bu.updated_at
            ORDER BY bu.nom
        `;
        const findAllResult = await pool.query(findAllQuery);
        console.log(`   Résultat findAll: ${findAllResult.rows.length} Business Units`);
        findAllResult.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code}) - Divisions: ${bu.divisions_count}`);
        });

        // 4. Vérifier les Business Units récemment créées
        console.log('\n4️⃣ Business Units créées dans les dernières 24h:');
        const recentQuery = `
            SELECT id, nom, code, description, statut, created_at
            FROM business_units
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        `;
        const recentResult = await pool.query(recentQuery);
        console.log(`   Récentes: ${recentResult.rows.length} Business Units`);
        recentResult.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code}) - Créée: ${bu.created_at}`);
        });

        // 5. Vérifier les erreurs potentielles
        console.log('\n5️⃣ Vérification des erreurs potentielles:');
        
        // BU sans divisions
        const buWithoutDivisionsQuery = `
            SELECT bu.id, bu.nom, bu.code
            FROM business_units bu
            LEFT JOIN divisions d ON bu.id = d.business_unit_id
            WHERE d.id IS NULL
        `;
        const buWithoutDivisionsResult = await pool.query(buWithoutDivisionsQuery);
        console.log(`   BU sans divisions: ${buWithoutDivisionsResult.rows.length}`);
        buWithoutDivisionsResult.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code})`);
        });

        // Divisions orphelines
        const orphanDivisionsQuery = `
            SELECT d.id, d.nom, d.code, d.business_unit_id
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE bu.id IS NULL
        `;
        const orphanDivisionsResult = await pool.query(orphanDivisionsQuery);
        console.log(`   Divisions orphelines: ${orphanDivisionsResult.rows.length}`);
        orphanDivisionsResult.rows.forEach(div => {
            console.log(`   - ${div.nom} (${div.code}) - BU ID: ${div.business_unit_id}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        await pool.end();
    }
}

checkBusinessUnits();
