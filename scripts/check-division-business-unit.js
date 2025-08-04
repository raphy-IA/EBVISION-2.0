const { pool } = require('../src/utils/database');

async function checkDivisionBusinessUnit() {
    try {
        console.log('🔍 Vérification de la relation Division Finance - Business Unit...');
        
        // Vérifier la Division Finance
        const divisionQuery = `
            SELECT 
                d.id,
                d.nom,
                d.code,
                d.business_unit_id,
                bu.nom as business_unit_nom
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.id = '7f7b8afc-f8a2-4535-b922-82956f670f8b'
        `;
        const divisionResult = await pool.query(divisionQuery);
        
        if (divisionResult.rows.length > 0) {
            const division = divisionResult.rows[0];
            console.log('📂 Division Finance:');
            console.log('  - ID:', division.id);
            console.log('  - Nom:', division.nom);
            console.log('  - Code:', division.code);
            console.log('  - Business Unit ID:', division.business_unit_id);
            console.log('  - Business Unit Nom:', division.business_unit_nom);
            
            if (division.business_unit_id) {
                console.log('✅ Cette division est liée à une Business Unit');
            } else {
                console.log('❌ Cette division n\'est PAS liée à une Business Unit');
                console.log('💡 C\'est pourquoi la mission affiche "N/A" pour Business Unit');
            }
        }
        
        // Vérifier toutes les divisions et leurs Business Units
        console.log('\n📋 Toutes les divisions et leurs Business Units:');
        const allDivisionsQuery = `
            SELECT 
                d.nom as division_nom,
                d.business_unit_id,
                bu.nom as business_unit_nom
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            ORDER BY bu.nom, d.nom
        `;
        const allDivisionsResult = await pool.query(allDivisionsQuery);
        
        allDivisionsResult.rows.forEach((div, index) => {
            console.log(`  ${index + 1}. ${div.division_nom}`);
            console.log(`     - Business Unit: ${div.business_unit_nom || 'NON LIÉE'}`);
        });
        
        // Vérifier les Business Units disponibles
        console.log('\n🏢 Business Units disponibles:');
        const businessUnitsQuery = `
            SELECT id, nom, code
            FROM business_units
            ORDER BY nom
        `;
        const businessUnitsResult = await pool.query(businessUnitsQuery);
        
        businessUnitsResult.rows.forEach((bu, index) => {
            console.log(`  ${index + 1}. ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
        });
        
        // Solution : Lier la Division Finance à une Business Unit
        console.log('\n💡 SOLUTION:');
        console.log('Pour corriger le problème, il faut lier la Division Finance à une Business Unit.');
        console.log('Exemple de requête SQL:');
        console.log(`
UPDATE divisions 
SET business_unit_id = 'ID_DE_LA_BUSINESS_UNIT' 
WHERE id = '7f7b8afc-f8a2-4535-b922-82956f670f8b'
        `);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkDivisionBusinessUnit(); 