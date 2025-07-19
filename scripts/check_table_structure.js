const { pool } = require('../src/utils/database');

async function checkTableStructure() {
    try {
        console.log('🔍 Vérification de la structure des tables...\n');
        
        // Vérifier la table collaborateurs
        console.log('📋 Structure de la table collaborateurs:');
        const collaborateursStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            ORDER BY ordinal_position
        `);
        collaborateursStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        console.log('\n📋 Structure de la table missions:');
        const missionsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `);
        missionsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        console.log('\n📋 Structure de la table clients:');
        const clientsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position
        `);
        clientsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTableStructure(); 