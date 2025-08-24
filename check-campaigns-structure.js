const { pool } = require('./src/utils/database');

async function checkCampaignsStructure() {
    try {
        console.log('🔍 VÉRIFICATION DE LA STRUCTURE DES CAMPAGNES');
        console.log('==============================================\n');

        // 1. Vérifier la structure de la table prospecting_campaigns
        console.log('1️⃣ STRUCTURE DE LA TABLE PROSPECTING_CAMPAIGNS');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'prospecting_campaigns'
            ORDER BY ordinal_position
        `);
        
        console.log(`   - Colonnes trouvées: ${structure.rows.length}`);
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier les campagnes existantes
        console.log('\n2️⃣ CAMPAGNES EXISTANTES');
        const campaigns = await pool.query(`
            SELECT *
            FROM prospecting_campaigns
            ORDER BY created_at DESC
        `);
        
        console.log(`   - Total campagnes: ${campaigns.rows.length}`);
        campaigns.rows.forEach(campaign => {
            console.log(`   - ID: ${campaign.id}`);
            console.log(`     Nom: ${campaign.name || 'N/A'}`);
            console.log(`     Statut validation: ${campaign.validation_statut || 'N/A'}`);
            console.log(`     BU ID: ${campaign.business_unit_id || 'N/A'}`);
            console.log(`     Division ID: ${campaign.division_id || 'N/A'}`);
            console.log(`     Créée le: ${campaign.created_at}`);
            console.log('');
        });

        // 3. Vérifier les validations en cours
        console.log('3️⃣ VALIDATIONS EN COURS');
        const validations = await pool.query(`
            SELECT *
            FROM prospecting_campaign_validations
            WHERE statut = 'EN_ATTENTE'
            ORDER BY created_at DESC
        `);
        
        console.log(`   - Total validations en attente: ${validations.rows.length}`);
        validations.rows.forEach(validation => {
            console.log(`   - ID: ${validation.id}`);
            console.log(`     Campaign ID: ${validation.campaign_id}`);
            console.log(`     Niveau: ${validation.niveau_validation}`);
            console.log(`     Validateur ID: ${validation.validateur_id || 'N/A'}`);
            console.log(`     Expire le: ${validation.expires_at}`);
            console.log('');
        });

        console.log('✅ VÉRIFICATION TERMINÉE');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkCampaignsStructure();
