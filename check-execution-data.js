// Vérification directe des données d'exécution
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function checkExecutionData() {
    console.log('🔍 Vérification directe des données d\'exécution\n');
    
    try {
        // 1. Vérifier les campagnes validées
        console.log('1️⃣ Campagnes validées:');
        const campaigns = await pool.query(`
            SELECT id, name, validation_statut 
            FROM prospecting_campaigns 
            WHERE validation_statut = 'VALIDE'
        `);
        
        console.log(`   ✅ ${campaigns.rows.length} campagnes validées`);
        campaigns.rows.forEach(c => {
            console.log(`   📊 "${c.name}" (${c.id})`);
        });
        
        if (campaigns.rows.length === 0) {
            console.log('   ❌ Aucune campagne validée');
            return;
        }
        
        // 2. Vérifier les entreprises dans les campagnes validées
        console.log('\n2️⃣ Entreprises dans les campagnes validées:');
        const campaignId = campaigns.rows[0].id;
        
        const companies = await pool.query(`
            SELECT 
                c.name,
                pcc.validation_status,
                pcc.execution_status,
                pcc.converted_to_opportunity
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.campaign_id = $1
        `, [campaignId]);
        
        console.log(`   ✅ ${companies.rows.length} entreprises trouvées`);
        companies.rows.forEach((company, index) => {
            console.log(`   🏢 ${index + 1}: ${company.name}`);
            console.log(`      📋 Validation: ${company.validation_status}`);
            console.log(`      ⚡ Exécution: ${company.execution_status || 'pending_execution'}`);
            console.log(`      💼 Convertie: ${company.converted_to_opportunity ? 'Oui' : 'Non'}`);
        });
        
        // 3. Vérifier les entreprises approuvées
        console.log('\n3️⃣ Entreprises approuvées:');
        const approvedCompanies = await pool.query(`
            SELECT 
                c.name,
                pcc.execution_status,
                pcc.converted_to_opportunity
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.campaign_id = $1 
            AND pcc.validation_status = 'APPROVED'
        `, [campaignId]);
        
        console.log(`   ✅ ${approvedCompanies.rows.length} entreprises approuvées`);
        approvedCompanies.rows.forEach((company, index) => {
            console.log(`   🏢 ${index + 1}: ${company.name} - Exécution: ${company.execution_status || 'pending_execution'}`);
        });
        
        // 4. Tester une mise à jour directe
        if (approvedCompanies.rows.length > 0) {
            console.log('\n4️⃣ Test de mise à jour directe...');
            const testCompany = approvedCompanies.rows[0];
            
            console.log(`   🧪 Test avec: ${testCompany.name}`);
            
            const updateResult = await pool.query(`
                UPDATE prospecting_campaign_companies
                SET execution_status = 'deposed',
                    execution_date = NOW(),
                    execution_notes = 'Test direct'
                WHERE campaign_id = $1 
                AND company_id = (
                    SELECT id FROM companies WHERE name = $2
                )
                RETURNING execution_status, execution_date
            `, [campaignId, testCompany.name]);
            
            if (updateResult.rows.length > 0) {
                console.log(`   ✅ Mise à jour réussie !`);
                console.log(`   📊 Statut: ${updateResult.rows[0].execution_status}`);
                console.log(`   📅 Date: ${updateResult.rows[0].execution_date}`);
            } else {
                console.log(`   ❌ Échec de la mise à jour`);
            }
        }
        
        console.log('\n🎉 Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkExecutionData();
