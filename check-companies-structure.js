// Script pour vérifier la structure de la table companies
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function checkCompaniesStructure() {
    console.log('🔍 Vérification de la structure de la table companies\n');
    
    try {
        // 1. Vérifier les colonnes de companies
        console.log('1️⃣ Structure de companies...');
        const companyColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);
        console.log(`   ✅ ${companyColumns.rows.length} colonnes trouvées`);
        companyColumns.rows.forEach(col => {
            console.log(`   📋 ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 2. Vérifier quelques exemples de données
        console.log('\n2️⃣ Exemples de données companies...');
        const companies = await pool.query('SELECT * FROM companies LIMIT 3');
        console.log(`   ✅ ${companies.rows.length} entreprises trouvées`);
        companies.rows.forEach((company, index) => {
            console.log(`   🏢 ${index + 1}: ${company.name}`);
            console.log(`      📋 Colonnes disponibles: ${Object.keys(company).join(', ')}`);
        });
        
        // 3. Vérifier les entreprises dans les campagnes
        console.log('\n3️⃣ Entreprises dans les campagnes...');
        const campaignCompanies = await pool.query(`
            SELECT 
                c.name,
                pcc.validation_status,
                pcc.execution_status
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.campaign_id = '606d5ef3-a93a-4238-a629-df8c0661457e'
            LIMIT 5
        `);
        console.log(`   ✅ ${campaignCompanies.rows.length} entreprises dans la campagne de test`);
        campaignCompanies.rows.forEach((company, index) => {
            console.log(`   🏢 ${index + 1}: ${company.name} - Validation: ${company.validation_status}, Exécution: ${company.execution_status}`);
        });
        
        console.log('\n🎉 Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkCompaniesStructure();

