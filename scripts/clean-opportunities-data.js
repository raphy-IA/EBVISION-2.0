const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trs_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function cleanOpportunitiesData() {
    try {
        console.log('🧹 Nettoyage des opportunités avec valeurs manquantes...');
        
        // Récupérer les premières business unit et collaborateur disponibles
        const buResult = await pool.query('SELECT id FROM business_units ORDER BY nom LIMIT 1');
        const collabResult = await pool.query('SELECT id FROM collaborateurs ORDER BY nom LIMIT 1');
        
        if (buResult.rows.length === 0) {
            console.log('❌ Aucune Business Unit disponible');
            return;
        }
        
        if (collabResult.rows.length === 0) {
            console.log('❌ Aucun Collaborateur disponible');
            return;
        }
        
        const defaultBuId = buResult.rows[0].id;
        const defaultCollabId = collabResult.rows[0].id;
        
        console.log(`✅ Business Unit par défaut: ${defaultBuId}`);
        console.log(`✅ Collaborateur par défaut: ${defaultCollabId}`);
        
        // Mettre à jour les opportunités avec business_unit_id NULL
        const updateBuQuery = `
            UPDATE opportunities 
            SET business_unit_id = $1 
            WHERE business_unit_id IS NULL
        `;
        const buUpdateResult = await pool.query(updateBuQuery, [defaultBuId]);
        console.log(`✅ ${buUpdateResult.rowCount} opportunités mises à jour avec business_unit_id`);
        
        // Mettre à jour les opportunités avec collaborateur_id NULL
        const updateCollabQuery = `
            UPDATE opportunities 
            SET collaborateur_id = $1 
            WHERE collaborateur_id IS NULL
        `;
        const collabUpdateResult = await pool.query(updateCollabQuery, [defaultCollabId]);
        console.log(`✅ ${collabUpdateResult.rowCount} opportunités mises à jour avec collaborateur_id`);
        
        // Vérifier le résultat
        const checkQuery = `
            SELECT id, nom, business_unit_id, collaborateur_id 
            FROM opportunities 
            ORDER BY nom
        `;
        const checkResult = await pool.query(checkQuery);
        
        console.log('\n📊 Résultat après nettoyage:');
        console.table(checkResult.rows);
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await pool.end();
    }
}

cleanOpportunitiesData(); 