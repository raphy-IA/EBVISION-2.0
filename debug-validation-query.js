const { pool } = require('./src/utils/database');

async function debugValidationQuery() {
    try {
        console.log('🔍 DÉBOGAGE DE LA REQUÊTE DE VALIDATION');
        console.log('========================================\n');

        // 1. Vérifier l'ID du collaborateur Alyssa Molom
        console.log('1️⃣ ID DU COLLABORATEUR ALYSSA MOLOM');
        const alyssaCollab = await pool.query(`
            SELECT id, nom, prenom, email, user_id
            FROM collaborateurs
            WHERE email = 'amolom@eb-partnersgroup.cm'
        `);
        
        if (alyssaCollab.rows.length === 0) {
            console.log('❌ Collaborateur Alyssa Molom non trouvé');
            return;
        }
        
        const alyssaId = alyssaCollab.rows[0].id;
        console.log(`   - ID: ${alyssaId}`);
        console.log(`   - Nom: ${alyssaCollab.rows[0].prenom} ${alyssaCollab.rows[0].nom}`);

        // 2. Vérifier toutes les validations existantes
        console.log('\n2️⃣ TOUTES LES VALIDATIONS EXISTANTES');
        const allValidations = await pool.query(`
            SELECT 
                pcv.id,
                pcv.campaign_id,
                pcv.validateur_id,
                pcv.niveau_validation,
                pcv.statut_validation,
                pc.name as campaign_name,
                c.nom as validator_nom,
                c.prenom as validator_prenom
            FROM prospecting_campaign_validations pcv
            LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            LEFT JOIN collaborateurs c ON pcv.validateur_id = c.id
            ORDER BY pcv.created_at DESC
        `);
        
        console.log(`   - Total validations: ${allValidations.rows.length}`);
        allValidations.rows.forEach((validation, index) => {
            console.log(`   ${index + 1}. ID: ${validation.id}`);
            console.log(`      - Campaign: ${validation.campaign_name}`);
            console.log(`      - Validateur ID: ${validation.validateur_id}`);
            console.log(`      - Validateur: ${validation.validator_prenom} ${validation.validator_nom}`);
            console.log(`      - Niveau: ${validation.niveau_validation}`);
            console.log(`      - Statut: ${validation.statut_validation}`);
        });

        // 3. Vérifier les validations pour Alyssa Molom spécifiquement
        console.log('\n3️⃣ VALIDATIONS POUR ALYSSA MOLOM (validateur_id)');
        const alyssaValidations = await pool.query(`
            SELECT 
                pcv.id,
                pcv.campaign_id,
                pcv.validateur_id,
                pcv.niveau_validation,
                pcv.statut_validation,
                pc.name as campaign_name
            FROM prospecting_campaign_validations pcv
            LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            WHERE pcv.validateur_id = $1
        `, [alyssaId]);
        
        console.log(`   - Validations pour Alyssa (validateur_id): ${alyssaValidations.rows.length}`);
        alyssaValidations.rows.forEach((validation, index) => {
            console.log(`   ${index + 1}. ID: ${validation.id}`);
            console.log(`      - Campaign: ${validation.campaign_name}`);
            console.log(`      - Niveau: ${validation.niveau_validation}`);
            console.log(`      - Statut: ${validation.statut_validation}`);
        });

        // 4. Tester la requête corrigée
        console.log('\n4️⃣ TEST DE LA REQUÊTE CORRIGÉE');
        const correctedQuery = `
            SELECT pcv.*,
                   pc.name as campaign_name,
                   pc.channel as campaign_channel,
                   pc.created_at as campaign_created_at,
                   pc.date_soumission,
                   pc.date_validation,
                   pc.validation_statut as campaign_status,
                   d.nom as demandeur_nom,
                   d.prenom as demandeur_prenom,
                   d.email as demandeur_email,
                   v.nom as validateur_nom,
                   v.prenom as validateur_prenom,
                   v.email as validateur_email,
                   bu.nom as business_unit_nom,
                   div.nom as division_nom
            FROM prospecting_campaign_validations pcv
            JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            JOIN collaborateurs d ON pcv.demandeur_id = d.id
            LEFT JOIN collaborateurs v ON pcv.validateur_id = v.id
            LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
            LEFT JOIN divisions div ON pc.division_id = div.id
            WHERE pcv.validateur_id = $1
            ORDER BY pcv.created_at DESC
        `;
        
        const correctedResult = await pool.query(correctedQuery, [alyssaId]);
        console.log(`   - Résultat requête corrigée: ${correctedResult.rows.length} validations`);
        correctedResult.rows.forEach((validation, index) => {
            console.log(`   ${index + 1}. Campaign: ${validation.campaign_name}`);
            console.log(`      - Validateur: ${validation.validateur_prenom} ${validation.validateur_nom}`);
            console.log(`      - Statut: ${validation.statut_validation}`);
        });

        // 5. Vérifier les responsabilités d'Alyssa Molom
        console.log('\n5️⃣ RESPONSABILITÉS D\'ALYSSA MOLOM');
        
        // Responsabilités BU
        const buResponsibilities = await pool.query(`
            SELECT bu.id, bu.nom, bu.code
            FROM business_units bu
            WHERE bu.responsable_principal_id = $1 OR bu.responsable_adjoint_id = $1
        `, [alyssaId]);
        
        console.log(`   - Responsabilités BU: ${buResponsibilities.rows.length}`);
        buResponsibilities.rows.forEach(bu => {
            console.log(`     * ${bu.nom} (${bu.code})`);
        });
        
        // Responsabilités Division
        const divResponsibilities = await pool.query(`
            SELECT d.id, d.nom, d.code, bu.nom as bu_name
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.responsable_principal_id = $1 OR d.responsable_adjoint_id = $1
        `, [alyssaId]);
        
        console.log(`   - Responsabilités Division: ${divResponsibilities.rows.length}`);
        divResponsibilities.rows.forEach(div => {
            console.log(`     * ${div.nom} (${div.code}) - BU: ${div.bu_name}`);
        });

        console.log('\n✅ DÉBOGAGE TERMINÉ');

    } catch (error) {
        console.error('❌ Erreur lors du débogage:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
debugValidationQuery();
