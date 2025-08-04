const { pool } = require('../src/utils/database');

async function checkBusinessUnitsAndDivisions() {
    try {
        console.log('🔍 Vérification des Business Units et Divisions...');
        
        // Vérifier les Business Units
        console.log('\n📊 Business Units:');
        const buResult = await pool.query('SELECT id, nom, code FROM business_units ORDER BY nom');
        buResult.rows.forEach(bu => {
            console.log(`  - ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
        });
        
        // Vérifier les Divisions
        console.log('\n📂 Divisions:');
        const divResult = await pool.query(`
            SELECT d.id, d.nom, d.code, bu.nom as business_unit_nom 
            FROM divisions d 
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id 
            ORDER BY bu.nom, d.nom
        `);
        divResult.rows.forEach(div => {
            console.log(`  - ${div.nom} (${div.code}) - Business Unit: ${div.business_unit_nom || 'N/A'} - ID: ${div.id}`);
        });
        
        // Vérifier les types de mission
        console.log('\n🎯 Types de mission:');
        const mtResult = await pool.query(`
            SELECT mt.id, mt.libelle, d.nom as division_nom, bu.nom as business_unit_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            ORDER BY mt.libelle
        `);
        mtResult.rows.forEach(mt => {
            console.log(`  - ${mt.libelle} - Division: ${mt.division_nom || 'N/A'} - Business Unit: ${mt.business_unit_nom || 'N/A'} - ID: ${mt.id}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkBusinessUnitsAndDivisions(); 