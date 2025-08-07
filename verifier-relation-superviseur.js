require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierRelationSuperviseur() {
    console.log('🔍 Vérification de la relation superviseur-collaborateur');
    console.log('=' .repeat(60));
    
    try {
        // 1. Vérifier Raphaël Ngos (superviseur)
        console.log('\n1️⃣ Vérification de Raphaël Ngos:');
        const raphaelQuery = `
            SELECT id, prenom, nom, email, user_id
            FROM collaborateurs 
            WHERE prenom = 'Raphaël' AND nom = 'Ngos'
        `;
        const raphaelResult = await pool.query(raphaelQuery);
        
        if (raphaelResult.rows.length > 0) {
            const raphael = raphaelResult.rows[0];
            console.log('✅ Raphaël Ngos trouvé:', raphael);
        } else {
            console.log('❌ Raphaël Ngos non trouvé');
            return;
        }
        
        // 2. Vérifier Cyrille Djiki (collaborateur)
        console.log('\n2️⃣ Vérification de Cyrille Djiki:');
        const cyrilleQuery = `
            SELECT id, prenom, nom, email, user_id
            FROM collaborateurs 
            WHERE prenom = 'Cyrille' AND nom = 'Djiki'
        `;
        const cyrilleResult = await pool.query(cyrilleQuery);
        
        if (cyrilleResult.rows.length > 0) {
            const cyrille = cyrilleResult.rows[0];
            console.log('✅ Cyrille Djiki trouvé:', cyrille);
        } else {
            console.log('❌ Cyrille Djiki non trouvé');
            return;
        }
        
        // 3. Vérifier la relation superviseur-collaborateur
        console.log('\n3️⃣ Vérification de la relation superviseur-collaborateur:');
        const relationQuery = `
            SELECT 
                tss.collaborateur_id,
                tss.supervisor_id,
                c.prenom as collaborateur_prenom,
                c.nom as collaborateur_nom,
                s.prenom as supervisor_prenom,
                s.nom as supervisor_nom
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c ON tss.collaborateur_id = c.id
            JOIN collaborateurs s ON tss.supervisor_id = s.id
            WHERE (c.prenom = 'Cyrille' AND c.nom = 'Djiki')
            OR (s.prenom = 'Raphaël' AND s.nom = 'Ngos')
        `;
        const relationResult = await pool.query(relationQuery);
        
        console.log(`📊 Relations trouvées: ${relationResult.rows.length}`);
        relationResult.rows.forEach((relation, index) => {
            console.log(`${index + 1}. ${relation.collaborateur_prenom} ${relation.collaborateur_nom} -> ${relation.supervisor_prenom} ${relation.supervisor_nom}`);
        });
        
        // 4. Test de la requête exacte de l'API
        console.log('\n4️⃣ Test de la requête exacte de l\'API:');
        const raphael = raphaelResult.rows[0];
        const cyrille = cyrilleResult.rows[0];
        
        const testApiQuery = `
            SELECT 
                ts.id,
                ts.week_start,
                ts.week_end,
                ts.status,
                ts.created_at,
                ts.updated_at,
                u.nom as collaborateur_nom,
                u.prenom as collaborateur_prenom,
                u.email as collaborateur_email
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            JOIN collaborateurs c ON u.id = c.user_id
            JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
            JOIN collaborateurs supervisor_c ON supervisor_c.user_id = $1
            WHERE tss.supervisor_id = supervisor_c.id 
            AND ts.status = 'submitted'
            ORDER BY ts.week_start DESC, ts.created_at DESC
        `;
        
        console.log(`🔍 Test avec superviseur ID: ${raphael.user_id}`);
        const testResult = await pool.query(testApiQuery, [raphael.user_id]);
        console.log(`📊 Feuilles trouvées: ${testResult.rows.length}`);
        
        testResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. ${feuille.collaborateur_prenom} ${feuille.collaborateur_nom}`);
            console.log(`   Semaine: ${feuille.week_start} au ${feuille.week_end}`);
            console.log(`   Status: ${feuille.status}`);
        });
        
        // 5. Vérifier toutes les feuilles soumises de Cyrille
        console.log('\n5️⃣ Vérification de toutes les feuilles soumises de Cyrille:');
        const cyrilleSubmittedQuery = `
            SELECT 
                ts.id,
                ts.week_start,
                ts.week_end,
                ts.status,
                ts.created_at
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
            AND ts.status = 'submitted'
            ORDER BY ts.week_start DESC
        `;
        const cyrilleSubmittedResult = await pool.query(cyrilleSubmittedQuery);
        
        console.log(`📊 Feuilles soumises de Cyrille: ${cyrilleSubmittedResult.rows.length}`);
        cyrilleSubmittedResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. Semaine: ${feuille.week_start} au ${feuille.week_end}, Status: ${feuille.status}`);
        });
        
        // 6. Test de la relation directe
        console.log('\n6️⃣ Test de la relation directe:');
        const directRelationQuery = `
            SELECT COUNT(*) as count
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c ON tss.collaborateur_id = c.id
            JOIN collaborateurs s ON tss.supervisor_id = s.id
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
            AND s.prenom = 'Raphaël' AND s.nom = 'Ngos'
        `;
        const directRelationResult = await pool.query(directRelationQuery);
        const relationExists = parseInt(directRelationResult.rows[0].count) > 0;
        
        console.log(`🔗 Relation directe Cyrille -> Raphaël: ${relationExists ? '✅ Existe' : '❌ N\'existe pas'}`);
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierRelationSuperviseur();
