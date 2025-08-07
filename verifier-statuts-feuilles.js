require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierStatutsFeuilles() {
    console.log('🔍 Vérification des statuts de feuilles de temps');
    console.log('=' .repeat(50));
    
    try {
        // 1. Vérifier tous les statuts distincts dans time_sheets
        console.log('\n1️⃣ Statuts distincts dans time_sheets:');
        const statutsQuery = `
            SELECT DISTINCT statut, COUNT(*) as nombre
            FROM time_sheets
            GROUP BY statut
            ORDER BY nombre DESC
        `;
        const statutsResult = await pool.query(statutsQuery);
        
        console.log('📊 Statuts trouvés:');
        statutsResult.rows.forEach(row => {
            console.log(`   ${row.statut}: ${row.nombre} feuilles`);
        });
        
        // 2. Vérifier aussi la colonne status si elle existe
        console.log('\n2️⃣ Vérification de la colonne status:');
        const statusQuery = `
            SELECT DISTINCT status, COUNT(*) as nombre
            FROM time_sheets
            WHERE status IS NOT NULL
            GROUP BY status
            ORDER BY nombre DESC
        `;
        const statusResult = await pool.query(statusQuery);
        
        console.log('📊 Statuts dans colonne status:');
        statusResult.rows.forEach(row => {
            console.log(`   ${row.status}: ${row.nombre} feuilles`);
        });
        
        // 3. Vérifier les feuilles de Cyrille spécifiquement
        console.log('\n3️⃣ Feuilles de Cyrille Djiki:');
        const cyrilleQuery = `
            SELECT ts.id, ts.statut, ts.status, ts.week_start, ts.week_end
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
            ORDER BY ts.week_start DESC
        `;
        const cyrilleResult = await pool.query(cyrilleQuery);
        
        console.log('📋 Feuilles de Cyrille:');
        cyrilleResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. Semaine: ${feuille.week_start} au ${feuille.week_end}`);
            console.log(`   Statut (statut): ${feuille.statut}`);
            console.log(`   Statut (status): ${feuille.status}`);
        });
        
        // 4. Vérifier la logique de l'API - test de la requête exacte
        console.log('\n4️⃣ Test de la requête de l\'API getPendingApprovals:');
        const testPendingQuery = `
            SELECT 
                ts.id,
                ts.week_start,
                ts.week_end,
                ts.statut,
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
            AND (ts.status = 'submitted' OR ts.statut = 'soumis')
            ORDER BY ts.week_start DESC, ts.created_at DESC
        `;
        
        // Utiliser l'ID de Raphaël Ngos (superviseur)
        const raphaelQuery = `
            SELECT id FROM collaborateurs 
            WHERE prenom = 'Raphaël' AND nom = 'Ngos'
        `;
        const raphaelResult = await pool.query(raphaelQuery);
        
        if (raphaelResult.rows.length > 0) {
            const raphaelId = raphaelResult.rows[0].id;
            console.log(`🔍 Test avec superviseur ID: ${raphaelId}`);
            
            const testResult = await pool.query(testPendingQuery, [raphaelId]);
            console.log(`📊 Feuilles trouvées: ${testResult.rows.length}`);
            
            testResult.rows.forEach((feuille, index) => {
                console.log(`${index + 1}. ${feuille.collaborateur_prenom} ${feuille.collaborateur_nom}`);
                console.log(`   Semaine: ${feuille.week_start} au ${feuille.week_end}`);
                console.log(`   Statut (statut): ${feuille.statut}`);
                console.log(`   Statut (status): ${feuille.status}`);
            });
        } else {
            console.log('❌ Raphaël Ngos non trouvé');
        }
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierStatutsFeuilles();
