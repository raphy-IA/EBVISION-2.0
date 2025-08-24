const { pool } = require('./src/utils/database');

async function checkValidationPermissions() {
    try {
        console.log('🔍 VÉRIFICATION DES PERMISSIONS DE VALIDATION');
        console.log('==============================================\n');

        // 1. Vérifier les utilisateurs d'Alyssa Molom et Cyrille Djiki
        console.log('1️⃣ UTILISATEURS ALYSSA MOLOM ET CYRILLE DJIKI');
        
        const alyssaUser = await pool.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.login, u.statut, u.collaborateur_id
            FROM users u
            WHERE u.email = 'amolom@eb-partnersgroup.cm'
        `);
        
        const cyrilleUser = await pool.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.login, u.statut, u.collaborateur_id
            FROM users u
            WHERE u.email = 'cdjiki@eb-partnersgroup.cm'
        `);
        
        if (alyssaUser.rows.length > 0) {
            const user = alyssaUser.rows[0];
            console.log(`   👤 Alyssa Molom:`);
            console.log(`      - ID: ${user.id}`);
            console.log(`      - Email: ${user.email}`);
            console.log(`      - Login: ${user.login}`);
            console.log(`      - Statut: ${user.statut}`);
            console.log(`      - Collaborateur ID: ${user.collaborateur_id}`);
        } else {
            console.log(`   ❌ Alyssa Molom - Utilisateur non trouvé`);
        }
        
        if (cyrilleUser.rows.length > 0) {
            const user = cyrilleUser.rows[0];
            console.log(`   👤 Cyrille Djiki:`);
            console.log(`      - ID: ${user.id}`);
            console.log(`      - Email: ${user.email}`);
            console.log(`      - Login: ${user.login}`);
            console.log(`      - Statut: ${user.statut}`);
            console.log(`      - Collaborateur ID: ${user.collaborateur_id}`);
        } else {
            console.log(`   ❌ Cyrille Djiki - Utilisateur non trouvé`);
        }

        // 2. Vérifier les collaborateurs
        console.log('\n2️⃣ COLLABORATEURS');
        
        const alyssaCollab = await pool.query(`
            SELECT id, nom, prenom, email, user_id
            FROM collaborateurs
            WHERE email = 'amolom@eb-partnersgroup.cm'
        `);
        
        const cyrilleCollab = await pool.query(`
            SELECT id, nom, prenom, email, user_id
            FROM collaborateurs
            WHERE email = 'cdjiki@eb-partnersgroup.cm'
        `);
        
        if (alyssaCollab.rows.length > 0) {
            const collab = alyssaCollab.rows[0];
            console.log(`   👤 Alyssa Molom (Collaborateur):`);
            console.log(`      - ID: ${collab.id}`);
            console.log(`      - Email: ${collab.email}`);
            console.log(`      - User ID: ${collab.user_id}`);
        }
        
        if (cyrilleCollab.rows.length > 0) {
            const collab = cyrilleCollab.rows[0];
            console.log(`   👤 Cyrille Djiki (Collaborateur):`);
            console.log(`      - ID: ${collab.id}`);
            console.log(`      - Email: ${collab.email}`);
            console.log(`      - User ID: ${collab.user_id}`);
        }

        // 3. Vérifier les validations qui devraient être visibles
        console.log('\n3️⃣ VALIDATIONS QUI DEVRAIENT ÊTRE VISIBLES');
        
        // Pour Alyssa Molom (responsable principal BU EB-AUDIT)
        if (alyssaCollab.rows.length > 0) {
            const alyssaId = alyssaCollab.rows[0].id;
            console.log(`   📋 Validations pour Alyssa Molom (ID: ${alyssaId}):`);
            
            const alyssaValidations = await pool.query(`
                SELECT 
                    pcv.id,
                    pcv.campaign_id,
                    pcv.niveau_validation,
                    pcv.statut_validation,
                    pcv.validateur_id,
                    pc.name as campaign_name,
                    pc.validation_statut,
                    bu.nom as bu_name,
                    d.nom as division_name
                FROM prospecting_campaign_validations pcv
                LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN divisions d ON pc.division_id = d.id
                WHERE pcv.validateur_id = $1
                ORDER BY pcv.created_at DESC
            `, [alyssaId]);
            
            console.log(`      - Total validations: ${alyssaValidations.rows.length}`);
            alyssaValidations.rows.forEach(validation => {
                console.log(`      - Campagne: ${validation.campaign_name}`);
                console.log(`        Niveau: ${validation.niveau_validation}`);
                console.log(`        Statut: ${validation.statut_validation}`);
                console.log(`        BU: ${validation.bu_name}`);
                console.log(`        Division: ${validation.division_name || 'N/A'}`);
            });
        }
        
        // Pour Cyrille Djiki (responsable adjoint BU EB-AUDIT)
        if (cyrilleCollab.rows.length > 0) {
            const cyrilleId = cyrilleCollab.rows[0].id;
            console.log(`   📋 Validations pour Cyrille Djiki (ID: ${cyrilleId}):`);
            
            const cyrilleValidations = await pool.query(`
                SELECT 
                    pcv.id,
                    pcv.campaign_id,
                    pcv.niveau_validation,
                    pcv.statut_validation,
                    pcv.validateur_id,
                    pc.name as campaign_name,
                    pc.validation_statut,
                    bu.nom as bu_name,
                    d.nom as division_name
                FROM prospecting_campaign_validations pcv
                LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN divisions d ON pc.division_id = d.id
                WHERE pcv.validateur_id = $1
                ORDER BY pcv.created_at DESC
            `, [cyrilleId]);
            
            console.log(`      - Total validations: ${cyrilleValidations.rows.length}`);
            cyrilleValidations.rows.forEach(validation => {
                console.log(`      - Campagne: ${validation.campaign_name}`);
                console.log(`        Niveau: ${validation.niveau_validation}`);
                console.log(`        Statut: ${validation.statut_validation}`);
                console.log(`        BU: ${validation.bu_name}`);
                console.log(`        Division: ${validation.division_name || 'N/A'}`);
            });
        }

        // 4. Vérifier toutes les validations en attente pour la BU EB-AUDIT
        console.log('\n4️⃣ TOUTES LES VALIDATIONS EN ATTENTE POUR BU EB-AUDIT');
        
        const allValidations = await pool.query(`
            SELECT 
                pcv.id,
                pcv.campaign_id,
                pcv.niveau_validation,
                pcv.statut_validation,
                pcv.validateur_id,
                pc.name as campaign_name,
                pc.validation_statut,
                bu.nom as bu_name,
                bu.id as bu_id,
                d.nom as division_name,
                c.nom as validator_nom,
                c.prenom as validator_prenom
            FROM prospecting_campaign_validations pcv
            LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
            LEFT JOIN divisions d ON pc.division_id = d.id
            LEFT JOIN collaborateurs c ON pcv.validateur_id = c.id
            WHERE bu.nom = 'EB-AUDIT' AND pc.validation_statut = 'EN_VALIDATION'
            ORDER BY pcv.created_at DESC
        `);
        
        console.log(`   - Total validations EB-AUDIT: ${allValidations.rows.length}`);
        allValidations.rows.forEach(validation => {
            console.log(`   - Campagne: ${validation.campaign_name}`);
            console.log(`     Niveau: ${validation.niveau_validation}`);
            console.log(`     Validateur: ${validation.validator_prenom} ${validation.validator_nom} (${validation.validateur_id})`);
            console.log(`     Statut validation: ${validation.statut_validation}`);
        });

        // 5. Analyser le problème
        console.log('\n5️⃣ ANALYSE DU PROBLÈME');
        
        if (alyssaUser.rows.length > 0 && alyssaUser.rows[0].statut === 'INACTIF') {
            console.log(`   ❌ PROBLÈME IDENTIFIÉ: Alyssa Molom a un compte INACTIF`);
            console.log(`      - Elle ne peut pas se connecter pour voir les validations`);
            console.log(`      - Solution: Activer son compte utilisateur`);
        }
        
        if (allValidations.rows.length === 0) {
            console.log(`   ❌ PROBLÈME: Aucune validation trouvée pour la BU EB-AUDIT`);
        } else {
            console.log(`   ✅ Validations trouvées pour la BU EB-AUDIT`);
            console.log(`   📋 Prochaines étapes:`);
            console.log(`      1. Activer le compte d'Alyssa Molom si nécessaire`);
            console.log(`      2. Vérifier que Cyrille Djiki peut se connecter`);
            console.log(`      3. Tester la page de validation`);
        }

        console.log('\n✅ VÉRIFICATION TERMINÉE');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkValidationPermissions();
