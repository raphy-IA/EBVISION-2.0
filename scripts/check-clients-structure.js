const { pool } = require('../src/utils/database');

async function checkClientsStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table clients...\n');
        
        // 1. Vérifier la structure actuelle
        console.log('1. Structure actuelle:');
        const structure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clients'
            ORDER BY ordinal_position;
        `);
        
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // 2. Vérifier quelques données
        console.log('\n2. Exemple de données:');
        const sampleData = await pool.query(`
            SELECT * FROM clients LIMIT 3;
        `);
        
        sampleData.rows.forEach((client, index) => {
            console.log(`  Client ${index + 1}:`, client);
        });
        
        // 3. Tester la requête API
        console.log('\n3. Test de la requête API:');
        const apiTest = await pool.query(`
            SELECT id, nom, raison_sociale, email 
            FROM clients 
            ORDER BY nom ASC
            LIMIT 5;
        `);
        
        console.log('Résultats API:');
        apiTest.rows.forEach(client => {
            console.log(`  - ${client.nom || client.raison_sociale} (${client.email})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkClientsStructure().catch(console.error); 