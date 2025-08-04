const { pool } = require('../src/utils/database');

async function checkTableStructure() {
    try {
        console.log('🔍 Vérification de la structure des tables...');
        
        // Vérifier la structure de business_units
        console.log('\n📋 Structure de la table business_units:');
        const buStructureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'business_units' 
            ORDER BY ordinal_position
        `;
        const buStructureResult = await pool.query(buStructureQuery);
        buStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // Vérifier la structure de divisions
        console.log('\n📋 Structure de la table divisions:');
        const divStructureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'divisions' 
            ORDER BY ordinal_position
        `;
        const divStructureResult = await pool.query(divStructureQuery);
        divStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // Vérifier les données dans business_units
        console.log('\n📊 Données dans business_units:');
        const buDataQuery = `
            SELECT id, nom, code
            FROM business_units
            LIMIT 5
        `;
        const buDataResult = await pool.query(buDataQuery);
        buDataResult.rows.forEach((bu, index) => {
            console.log(`  ${index + 1}. ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
        });
        
        // Vérifier les données dans divisions
        console.log('\n📊 Données dans divisions:');
        const divDataQuery = `
            SELECT id, nom, code, business_unit_id
            FROM divisions
            LIMIT 5
        `;
        const divDataResult = await pool.query(divDataQuery);
        divDataResult.rows.forEach((div, index) => {
            console.log(`  ${index + 1}. ${div.nom} (${div.code}) - ID: ${div.id} - BU ID: ${div.business_unit_id}`);
        });
        
        // Tester la requête exacte de l'API
        console.log('\n🔍 Test de la requête API:');
        const testQuery = `
            SELECT 
                m.id,
                m.code,
                m.nom,
                bu.nom as business_unit_nom,
                d.nom as division_nom
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            WHERE m.code = 'MIS-20250804-553'
        `;
        const testResult = await pool.query(testQuery);
        if (testResult.rows.length > 0) {
            const mission = testResult.rows[0];
            console.log('  - Code:', mission.code);
            console.log('  - Nom:', mission.nom);
            console.log('  - Business Unit Nom:', mission.business_unit_nom);
            console.log('  - Division Nom:', mission.division_nom);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure(); 