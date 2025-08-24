const { pool } = require('./src/utils/database');

async function checkCampaignStatus() {
    try {
        const campaignId = 'a6a9c770-3732-4cee-a454-b62e241bb8ed';
        
        console.log('🔍 Vérification de l\'état de la campagne:', campaignId);
        
        // Vérifier l'état de la campagne
        const campaign = await pool.query(`
            SELECT id, name, status, validation_statut, date_soumission, date_validation
            FROM prospecting_campaigns 
            WHERE id = $1
        `, [campaignId]);
        
        if (campaign.rows.length === 0) {
            console.log('❌ Campagne non trouvée');
            return;
        }
        
        console.log('📊 État de la campagne:', campaign.rows[0]);
        
        // Vérifier les validations
        const validations = await pool.query(`
            SELECT pcv.id, pcv.statut_validation, pcv.niveau_validation, pcv.created_at,
                   c.nom as validateur_nom, c.prenom as validateur_prenom
            FROM prospecting_campaign_validations pcv
            LEFT JOIN collaborateurs c ON pcv.validateur_id = c.id
            WHERE pcv.campaign_id = $1
            ORDER BY pcv.created_at DESC
        `, [campaignId]);
        
        console.log('📋 Validations trouvées:', validations.rows.length);
        validations.rows.forEach((validation, index) => {
            console.log(`  ${index + 1}. ${validation.validateur_prenom} ${validation.validateur_nom} - ${validation.statut_validation} (${validation.niveau_validation})`);
        });
        
        // Vérifier les validations par entreprise
        const companyValidations = await pool.query(`
            SELECT pcvc.validation, pcvc.note, pcvc.created_at,
                   c.name as company_name
            FROM prospecting_campaign_validation_companies pcvc
            JOIN companies c ON pcvc.company_id = c.id
            JOIN prospecting_campaign_validations pcv ON pcvc.validation_id = pcv.id
            WHERE pcv.campaign_id = $1
            ORDER BY pcvc.created_at DESC
        `, [campaignId]);
        
        console.log('🏢 Validations par entreprise:', companyValidations.rows.length);
        companyValidations.rows.forEach((validation, index) => {
            console.log(`  ${index + 1}. ${validation.company_name} - ${validation.validation} (${validation.note || 'Pas de note'})`);
        });
        
        // Vérifier les statuts des entreprises dans la campagne
        const companies = await pool.query(`
            SELECT c.name, pcc.validation_status, pcc.execution_status
            FROM prospecting_campaign_companies pcc
            JOIN companies c ON pcc.company_id = c.id
            WHERE pcc.campaign_id = $1
            ORDER BY c.name
        `, [campaignId]);
        
        console.log('🏢 Statuts des entreprises dans la campagne:');
        companies.rows.forEach((company, index) => {
            console.log(`  ${index + 1}. ${company.name} - Validation: ${company.validation_status}, Exécution: ${company.execution_status}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkCampaignStatus();
