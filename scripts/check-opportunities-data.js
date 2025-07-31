const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trs_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkOpportunitiesData() {
    try {
        console.log('🔍 Vérification des opportunités avec valeurs manquantes...');
        
        // Vérifier les opportunités avec business_unit_id NULL
        const buQuery = 'SELECT id, nom, business_unit_id, collaborateur_id FROM opportunities WHERE business_unit_id IS NULL';
        const buResult = await pool.query(buQuery);
        
        console.log(`\n📊 Opportunités avec business_unit_id NULL: ${buResult.rows.length}`);
        if (buResult.rows.length > 0) {
            console.table(buResult.rows);
        }
        
        // Vérifier les opportunités avec collaborateur_id NULL
        const collabQuery = 'SELECT id, nom, business_unit_id, collaborateur_id FROM opportunities WHERE collaborateur_id IS NULL';
        const collabResult = await pool.query(collabQuery);
        
        console.log(`\n📊 Opportunités avec collaborateur_id NULL: ${collabResult.rows.length}`);
        if (collabResult.rows.length > 0) {
            console.table(collabResult.rows);
        }
        
        // Vérifier toutes les opportunités
        const allQuery = 'SELECT id, nom, business_unit_id, collaborateur_id, client_id FROM opportunities ORDER BY nom';
        const allResult = await pool.query(allQuery);
        
        console.log(`\n📊 Toutes les opportunités (${allResult.rows.length}):`);
        console.table(allResult.rows);
        
        // Vérifier les business units disponibles
        const buAvailableQuery = 'SELECT id, nom FROM business_units ORDER BY nom';
        const buAvailableResult = await pool.query(buAvailableQuery);
        
        console.log(`\n🏢 Business Units disponibles (${buAvailableResult.rows.length}):`);
        console.table(buAvailableResult.rows);
        
        // Vérifier les collaborateurs disponibles
        const collabAvailableQuery = 'SELECT id, nom, prenom FROM collaborateurs ORDER BY nom';
        const collabAvailableResult = await pool.query(collabAvailableQuery);
        
        console.log(`\n👥 Collaborateurs disponibles (${collabAvailableResult.rows.length}):`);
        console.table(collabAvailableResult.rows);
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkOpportunitiesData(); 