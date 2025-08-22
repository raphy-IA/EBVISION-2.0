// Vérification rapide des conversions
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function quickCheck() {
    console.log('🔍 Vérification rapide des conversions\n');
    
    try {
        // Vérifier les entreprises converties
        const converted = await pool.query(`
            SELECT 
                c.name,
                pcc.execution_status,
                pcc.converted_to_opportunity,
                pcc.opportunity_id
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.converted_to_opportunity = TRUE
            LIMIT 5
        `);
        
        console.log(`✅ ${converted.rows.length} entreprises converties trouvées`);
        converted.rows.forEach((company, index) => {
            console.log(`   ${index + 1}: ${company.name} - ${company.execution_status} - ID: ${company.opportunity_id}`);
        });
        
        // Vérifier les entreprises prêtes pour conversion
        const readyForConversion = await pool.query(`
            SELECT 
                c.name,
                pcc.execution_status,
                pcc.converted_to_opportunity
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.validation_status = 'APPROVED'
            AND pcc.execution_status IN ('deposed', 'sent')
            AND pcc.converted_to_opportunity = FALSE
            LIMIT 5
        `);
        
        console.log(`\n📋 ${readyForConversion.rows.length} entreprises prêtes pour conversion`);
        readyForConversion.rows.forEach((company, index) => {
            console.log(`   ${index + 1}: ${company.name} - ${company.execution_status}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

quickCheck();
