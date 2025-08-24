const { pool } = require('./src/utils/database');
const Manager = require('./src/models/Manager');

async function checkManagersAssignments() {
    try {
        console.log('🔍 VÉRIFICATION DES ASSIGNATIONS DES RESPONSABLES');
        console.log('================================================\n');

        // 1. Vérifier tous les collaborateurs
        console.log('1️⃣ LISTE DES COLLABORATEURS');
        const collaborateurs = await pool.query(`
            SELECT id, nom, prenom, email, user_id
            FROM collaborateurs 
            ORDER BY nom, prenom
        `);
        
        console.log(`   - Total collaborateurs: ${collaborateurs.rows.length}`);
        collaborateurs.rows.forEach(collab => {
            console.log(`   - ${collab.prenom} ${collab.nom} (${collab.email})`);
        });

        // 2. Vérifier les Business Units et leurs responsables
        console.log('\n2️⃣ BUSINESS UNITS ET RESPONSABLES');
        const businessUnits = await pool.query(`
            SELECT 
                bu.id,
                bu.nom,
                bu.code,
                principal.id as principal_id,
                principal.nom as principal_nom,
                principal.prenom as principal_prenom,
                adjoint.id as adjoint_id,
                adjoint.nom as adjoint_nom,
                adjoint.prenom as adjoint_prenom
            FROM business_units bu
            LEFT JOIN collaborateurs principal ON bu.responsable_principal_id = principal.id
            LEFT JOIN collaborateurs adjoint ON bu.responsable_adjoint_id = adjoint.id
            ORDER BY bu.nom
        `);
        
        console.log(`   - Total Business Units: ${businessUnits.rows.length}`);
        businessUnits.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code})`);
            if (bu.principal_id) {
                console.log(`     👑 Principal: ${bu.principal_prenom} ${bu.principal_nom}`);
            } else {
                console.log(`     ❌ Aucun responsable principal`);
            }
            if (bu.adjoint_id) {
                console.log(`     👥 Adjoint: ${bu.adjoint_prenom} ${bu.adjoint_nom}`);
            } else {
                console.log(`     ❌ Aucun responsable adjoint`);
            }
        });

        // 3. Vérifier les Divisions et leurs responsables
        console.log('\n3️⃣ DIVISIONS ET RESPONSABLES');
        const divisions = await pool.query(`
            SELECT 
                d.id,
                d.nom,
                d.code,
                bu.nom as bu_name,
                principal.id as principal_id,
                principal.nom as principal_nom,
                principal.prenom as principal_prenom,
                adjoint.id as adjoint_id,
                adjoint.nom as adjoint_nom,
                adjoint.prenom as adjoint_prenom
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            LEFT JOIN collaborateurs principal ON d.responsable_principal_id = principal.id
            LEFT JOIN collaborateurs adjoint ON d.responsable_adjoint_id = adjoint.id
            ORDER BY bu.nom, d.nom
        `);
        
        console.log(`   - Total Divisions: ${divisions.rows.length}`);
        divisions.rows.forEach(div => {
            console.log(`   - ${div.nom} (${div.code}) - BU: ${div.bu_name}`);
            if (div.principal_id) {
                console.log(`     👑 Principal: ${div.principal_prenom} ${div.principal_nom}`);
            } else {
                console.log(`     ❌ Aucun responsable principal`);
            }
            if (div.adjoint_id) {
                console.log(`     👥 Adjoint: ${div.adjoint_prenom} ${div.adjoint_nom}`);
            } else {
                console.log(`     ❌ Aucun responsable adjoint`);
            }
        });

        // 4. Vérifier les campagnes de prospection
        console.log('\n4️⃣ CAMPAGNES DE PROSPECTION');
        const campaigns = await pool.query(`
            SELECT 
                pc.id,
                pc.nom,
                pc.validation_statut,
                pc.business_unit_id,
                pc.division_id,
                bu.nom as bu_name,
                d.nom as division_name,
                pc.created_at
            FROM prospecting_campaigns pc
            LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
            LEFT JOIN divisions d ON pc.division_id = d.id
            ORDER BY pc.created_at DESC
        `);
        
        console.log(`   - Total campagnes: ${campaigns.rows.length}`);
        campaigns.rows.forEach(campaign => {
            console.log(`   - ${campaign.nom}`);
            console.log(`     Statut: ${campaign.validation_statut}`);
            console.log(`     BU: ${campaign.bu_name || 'Non définie'}`);
            console.log(`     Division: ${campaign.division_name || 'Non définie'}`);
            console.log(`     Créée le: ${campaign.created_at}`);
        });

        // 5. Vérifier les validations en cours
        console.log('\n5️⃣ VALIDATIONS EN COURS');
        const validations = await pool.query(`
            SELECT 
                pcv.id,
                pcv.campaign_id,
                pcv.niveau_validation,
                pcv.statut,
                pcv.expires_at,
                pc.nom as campaign_name,
                c.nom as validator_nom,
                c.prenom as validator_prenom
            FROM prospecting_campaign_validations pcv
            LEFT JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            LEFT JOIN collaborateurs c ON pcv.validateur_id = c.id
            WHERE pcv.statut = 'EN_ATTENTE'
            ORDER BY pcv.created_at DESC
        `);
        
        console.log(`   - Total validations en attente: ${validations.rows.length}`);
        validations.rows.forEach(validation => {
            console.log(`   - Campagne: ${validation.campaign_name}`);
            console.log(`     Niveau: ${validation.niveau_validation}`);
            console.log(`     Validateur: ${validation.validator_prenom} ${validation.validator_nom}`);
            console.log(`     Expire le: ${validation.expires_at}`);
        });

        // 6. Test spécifique pour Alyssa Molom et Cyrille Djiki
        console.log('\n6️⃣ TEST SPÉCIFIQUE - ALYSSA MOLOM ET CYRILLE DJIKI');
        
        // Chercher Alyssa Molom
        const alyssa = collaborateurs.rows.find(c => c.nom === 'Molom' && c.prenom === 'Alyssa');
        if (alyssa) {
            console.log(`   ✅ Alyssa Molom trouvée (ID: ${alyssa.id})`);
            
            // Vérifier ses responsabilités BU
            const alyssaBU = businessUnits.rows.filter(bu => 
                bu.principal_id === alyssa.id || bu.adjoint_id === alyssa.id
            );
            console.log(`   - Responsabilités BU: ${alyssaBU.length}`);
            alyssaBU.forEach(bu => {
                const role = bu.principal_id === alyssa.id ? 'Principal' : 'Adjoint';
                console.log(`     * ${bu.nom} (${role})`);
            });
            
            // Vérifier ses responsabilités Division
            const alyssaDiv = divisions.rows.filter(div => 
                div.principal_id === alyssa.id || div.adjoint_id === alyssa.id
            );
            console.log(`   - Responsabilités Division: ${alyssaDiv.length}`);
            alyssaDiv.forEach(div => {
                const role = div.principal_id === alyssa.id ? 'Principal' : 'Adjoint';
                console.log(`     * ${div.nom} - BU: ${div.bu_name} (${role})`);
            });
        } else {
            console.log(`   ❌ Alyssa Molom non trouvée`);
        }
        
        // Chercher Cyrille Djiki
        const cyrille = collaborateurs.rows.find(c => c.nom === 'Djiki' && c.prenom === 'Cyrille');
        if (cyrille) {
            console.log(`   ✅ Cyrille Djiki trouvé (ID: ${cyrille.id})`);
            
            // Vérifier ses responsabilités BU
            const cyrilleBU = businessUnits.rows.filter(bu => 
                bu.principal_id === cyrille.id || bu.adjoint_id === cyrille.id
            );
            console.log(`   - Responsabilités BU: ${cyrilleBU.length}`);
            cyrilleBU.forEach(bu => {
                const role = bu.principal_id === cyrille.id ? 'Principal' : 'Adjoint';
                console.log(`     * ${bu.nom} (${role})`);
            });
            
            // Vérifier ses responsabilités Division
            const cyrilleDiv = divisions.rows.filter(div => 
                div.principal_id === cyrille.id || div.adjoint_id === cyrille.id
            );
            console.log(`   - Responsabilités Division: ${cyrilleDiv.length}`);
            cyrilleDiv.forEach(div => {
                const role = div.principal_id === cyrille.id ? 'Principal' : 'Adjoint';
                console.log(`     * ${div.nom} - BU: ${div.bu_name} (${role})`);
            });
        } else {
            console.log(`   ❌ Cyrille Djiki non trouvé`);
        }

        console.log('\n✅ VÉRIFICATION TERMINÉE');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkManagersAssignments();
