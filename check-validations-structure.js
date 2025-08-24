const { pool } = require('./src/utils/database');

async function checkValidationsStructure() {
    try {
        console.log('🔍 VÉRIFICATION DE LA STRUCTURE DES VALIDATIONS');
        console.log('================================================\n');

        // 1. Vérifier la structure de la table prospecting_campaign_validations
        console.log('1️⃣ STRUCTURE DE LA TABLE PROSPECTING_CAMPAIGN_VALIDATIONS');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'prospecting_campaign_validations'
            ORDER BY ordinal_position
        `);
        
        console.log(`   - Colonnes trouvées: ${structure.rows.length}`);
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier les validations en cours
        console.log('\n2️⃣ VALIDATIONS EN COURS');
        const validations = await pool.query(`
            SELECT *
            FROM prospecting_campaign_validations
            ORDER BY created_at DESC
        `);
        
        console.log(`   - Total validations: ${validations.rows.length}`);
        validations.rows.forEach(validation => {
            console.log(`   - ID: ${validation.id}`);
            console.log(`     Campaign ID: ${validation.campaign_id}`);
            console.log(`     Niveau: ${validation.niveau_validation}`);
            console.log(`     Validateur ID: ${validation.validateur_id || 'N/A'}`);
            console.log(`     Statut: ${validation.statut || 'N/A'}`);
            console.log(`     Expire le: ${validation.expires_at}`);
            console.log('');
        });

        // 3. Vérifier la campagne en validation avec détails
        console.log('3️⃣ CAMPAGNE EN VALIDATION - DÉTAILS');
        const campaignInValidation = await pool.query(`
            SELECT 
                pc.id,
                pc.name,
                pc.validation_statut,
                pc.business_unit_id,
                pc.division_id,
                bu.nom as bu_name,
                bu.code as bu_code,
                d.nom as division_name,
                d.code as division_code,
                pc.created_at
            FROM prospecting_campaigns pc
            LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
            LEFT JOIN divisions d ON pc.division_id = d.id
            WHERE pc.validation_statut = 'EN_VALIDATION'
            ORDER BY pc.created_at DESC
        `);
        
        console.log(`   - Campagnes en validation: ${campaignInValidation.rows.length}`);
        campaignInValidation.rows.forEach(campaign => {
            console.log(`   - ID: ${campaign.id}`);
            console.log(`     Nom: ${campaign.name}`);
            console.log(`     Statut: ${campaign.validation_statut}`);
            console.log(`     BU: ${campaign.bu_name} (${campaign.bu_code})`);
            console.log(`     Division: ${campaign.division_name || 'N/A'} (${campaign.division_code || 'N/A'})`);
            console.log(`     BU ID: ${campaign.business_unit_id}`);
            console.log(`     Division ID: ${campaign.division_id || 'N/A'}`);
            console.log(`     Créée le: ${campaign.created_at}`);
            console.log('');
        });

        // 4. Vérifier les responsables de la BU et Division concernées
        if (campaignInValidation.rows.length > 0) {
            const campaign = campaignInValidation.rows[0];
            console.log('4️⃣ RESPONSABLES DE LA BU ET DIVISION CONCERNÉES');
            
            // Responsables de la BU
            if (campaign.business_unit_id) {
                console.log(`   📋 BU: ${campaign.bu_name} (${campaign.bu_code})`);
                const buManagers = await pool.query(`
                    SELECT 
                        principal.id as principal_id,
                        principal.nom as principal_nom,
                        principal.prenom as principal_prenom,
                        adjoint.id as adjoint_id,
                        adjoint.nom as adjoint_nom,
                        adjoint.prenom as adjoint_prenom
                    FROM business_units bu
                    LEFT JOIN collaborateurs principal ON bu.responsable_principal_id = principal.id
                    LEFT JOIN collaborateurs adjoint ON bu.responsable_adjoint_id = adjoint.id
                    WHERE bu.id = $1
                `, [campaign.business_unit_id]);
                
                const buManager = buManagers.rows[0];
                if (buManager) {
                    if (buManager.principal_id) {
                        console.log(`     👑 Principal: ${buManager.principal_prenom} ${buManager.principal_nom}`);
                    } else {
                        console.log(`     ❌ Aucun responsable principal`);
                    }
                    if (buManager.adjoint_id) {
                        console.log(`     👥 Adjoint: ${buManager.adjoint_prenom} ${buManager.adjoint_nom}`);
                    } else {
                        console.log(`     ❌ Aucun responsable adjoint`);
                    }
                }
            }
            
            // Responsables de la Division
            if (campaign.division_id) {
                console.log(`   📋 Division: ${campaign.division_name} (${campaign.division_code})`);
                const divManagers = await pool.query(`
                    SELECT 
                        principal.id as principal_id,
                        principal.nom as principal_nom,
                        principal.prenom as principal_prenom,
                        adjoint.id as adjoint_id,
                        adjoint.nom as adjoint_nom,
                        adjoint.prenom as adjoint_prenom
                    FROM divisions d
                    LEFT JOIN collaborateurs principal ON d.responsable_principal_id = principal.id
                    LEFT JOIN collaborateurs adjoint ON d.responsable_adjoint_id = adjoint.id
                    WHERE d.id = $1
                `, [campaign.division_id]);
                
                const divManager = divManagers.rows[0];
                if (divManager) {
                    if (divManager.principal_id) {
                        console.log(`     👑 Principal: ${divManager.principal_prenom} ${divManager.principal_nom}`);
                    } else {
                        console.log(`     ❌ Aucun responsable principal`);
                    }
                    if (divManager.adjoint_id) {
                        console.log(`     👥 Adjoint: ${divManager.adjoint_prenom} ${divManager.adjoint_nom}`);
                    } else {
                        console.log(`     ❌ Aucun responsable adjoint`);
                    }
                }
            }
        }

        console.log('\n✅ VÉRIFICATION TERMINÉE');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkValidationsStructure();
