const { pool } = require('./src/utils/database');

async function checkValidUUIDs() {
    try {
        console.log('🔍 Vérification des UUIDs valides dans les tables de référence...\n');
        
        // 1. Types de collaborateurs
        console.log('1️⃣ Types de collaborateurs:');
        const typesCollab = await pool.query(`
            SELECT id, nom, code
            FROM types_collaborateurs 
            LIMIT 5
        `);
        
        console.log(`📊 ${typesCollab.rows.length} types trouvés`);
        typesCollab.rows.forEach((type, index) => {
            console.log(`  ${index + 1}. ${type.nom} (${type.code}) - ID: ${type.id}`);
        });
        
        // 2. Postes
        console.log('\n2️⃣ Postes:');
        const postes = await pool.query(`
            SELECT id, nom, code
            FROM postes 
            LIMIT 5
        `);
        
        console.log(`📊 ${postes.rows.length} postes trouvés`);
        postes.rows.forEach((poste, index) => {
            console.log(`  ${index + 1}. ${poste.nom} (${poste.code}) - ID: ${poste.id}`);
        });
        
        // 3. Grades
        console.log('\n3️⃣ Grades:');
        const grades = await pool.query(`
            SELECT id, nom, code
            FROM grades 
            LIMIT 5
        `);
        
        console.log(`📊 ${grades.rows.length} grades trouvés`);
        grades.rows.forEach((grade, index) => {
            console.log(`  ${index + 1}. ${grade.nom} (${grade.code}) - ID: ${grade.id}`);
        });
        
        // 4. Business Units
        console.log('\n4️⃣ Business Units:');
        const businessUnits = await pool.query(`
            SELECT id, nom, code
            FROM business_units 
            LIMIT 5
        `);
        
        console.log(`📊 ${businessUnits.rows.length} business units trouvés`);
        businessUnits.rows.forEach((bu, index) => {
            console.log(`  ${index + 1}. ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
        });
        
        // 5. Divisions
        console.log('\n5️⃣ Divisions:');
        const divisions = await pool.query(`
            SELECT id, nom, code
            FROM divisions 
            LIMIT 5
        `);
        
        console.log(`📊 ${divisions.rows.length} divisions trouvées`);
        divisions.rows.forEach((division, index) => {
            console.log(`  ${index + 1}. ${division.nom} (${division.code}) - ID: ${division.id}`);
        });
        
        await pool.end();
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkValidUUIDs(); 