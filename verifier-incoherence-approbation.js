require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierIncoherenceApprobation() {
    console.log('🔍 Vérification de l\'incohérence d\'approbation');
    console.log('=' .repeat(60));
    
    try {
        // 1. Vérifier la feuille de Cyrille
        console.log('\n1️⃣ Vérification de la feuille de Cyrille Djiki...');
        const feuilleCyrilleQuery = `
            SELECT ts.*, c.prenom, c.nom, c.email
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
            AND ts.week_start = '2025-08-04'
        `;
        const feuilleCyrilleResult = await pool.query(feuilleCyrilleQuery);
        
        if (feuilleCyrilleResult.rows.length > 0) {
            const feuille = feuilleCyrilleResult.rows[0];
            console.log('📋 Feuille de Cyrille:');
            console.log(`   ID: ${feuille.id}`);
            console.log(`   Statut: ${feuille.statut}`);
            console.log(`   Semaine: ${feuille.week_start} au ${feuille.week_end}`);
            console.log(`   Collaborateur: ${feuille.prenom} ${feuille.nom}`);
        }
        
        // 2. Vérifier l'API d'approbation - ce qu'elle retourne
        console.log('\n2️⃣ Vérification de l\'API d\'approbation...');
        const apiApprovalQuery = `
            SELECT 
                ts.id,
                ts.statut,
                ts.week_start,
                ts.week_end,
                c.prenom as collaborateur_prenom,
                c.nom as collaborateur_nom,
                c.email as collaborateur_email,
                ts.created_at
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE ts.statut IN ('soumis', 'submitted')
            ORDER BY ts.created_at DESC
            LIMIT 10
        `;
        const apiApprovalResult = await pool.query(apiApprovalQuery);
        
        console.log(`📊 Feuilles avec statut 'soumis'/'submitted': ${apiApprovalResult.rows.length}`);
        apiApprovalResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. ${feuille.collaborateur_prenom} ${feuille.collaborateur_nom} - ${feuille.statut} - ${feuille.week_start} au ${feuille.week_end}`);
        });
        
        // 3. Vérifier toutes les feuilles de temps récentes
        console.log('\n3️⃣ Vérification de toutes les feuilles récentes...');
        const toutesFeuillesQuery = `
            SELECT 
                ts.id,
                ts.statut,
                ts.week_start,
                ts.week_end,
                c.prenom as collaborateur_prenom,
                c.nom as collaborateur_nom,
                c.email as collaborateur_email,
                ts.created_at
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            ORDER BY ts.created_at DESC
            LIMIT 15
        `;
        const toutesFeuillesResult = await pool.query(toutesFeuillesQuery);
        
        console.log(`📊 Toutes les feuilles récentes (${toutesFeuillesResult.rows.length}):`);
        toutesFeuillesResult.rows.forEach((feuille, index) => {
            const isCyrille = feuille.collaborateur_prenom === 'Cyrille' && feuille.collaborateur_nom === 'Djiki';
            const marker = isCyrille ? '🎯' : '  ';
            console.log(`${marker}${index + 1}. ${feuille.collaborateur_prenom} ${feuille.collaborateur_nom} - ${feuille.statut} - ${feuille.week_start} au ${feuille.week_end}`);
        });
        
        // 4. Vérifier le code de l'API d'approbation
        console.log('\n4️⃣ Vérification du code de l\'API d\'approbation...');
        console.log('🔍 Recherche dans src/routes/time-sheet-approvals.js...');
        
        // 5. Vérifier s'il y a des entrées dans time_sheet_approvals
        console.log('\n5️⃣ Vérification de la table time_sheet_approvals...');
        const approvalsQuery = `
            SELECT 
                tsa.*,
                ts.statut as time_sheet_statut,
                c.prenom as collaborateur_prenom,
                c.nom as collaborateur_nom,
                u.prenom as approver_prenom,
                u.nom as approver_nom
            FROM time_sheet_approvals tsa
            JOIN time_sheets ts ON tsa.time_sheet_id = ts.id
            JOIN collaborateurs c ON ts.user_id = c.user_id
            LEFT JOIN users u ON tsa.approver_id = u.id
            ORDER BY tsa.created_at DESC
            LIMIT 10
        `;
        const approvalsResult = await pool.query(approvalsQuery);
        
        console.log(`📋 Entrées dans time_sheet_approvals: ${approvalsResult.rows.length}`);
        approvalsResult.rows.forEach((approval, index) => {
            console.log(`${index + 1}. ${approval.collaborateur_prenom} ${approval.collaborateur_nom} - ${approval.action} par ${approval.approver_prenom} ${approval.approver_nom} - Statut feuille: ${approval.time_sheet_statut}`);
        });
        
        // 6. Vérifier la logique de l'API pending
        console.log('\n6️⃣ Vérification de la logique de l\'API pending...');
        console.log('🔍 Le problème pourrait venir de la requête dans l\'API...');
        
        // Test de la requête exacte de l'API
        const testPendingQuery = `
            SELECT 
                ts.id,
                ts.statut,
                ts.week_start,
                ts.week_end,
                c.prenom as collaborateur_prenom,
                c.nom as collaborateur_nom,
                c.email as collaborateur_email,
                ts.created_at
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE ts.statut = 'soumis'
            ORDER BY ts.created_at DESC
        `;
        const testPendingResult = await pool.query(testPendingQuery);
        
        console.log(`📊 Feuilles avec statut exact 'soumis': ${testPendingResult.rows.length}`);
        testPendingResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. ${feuille.collaborateur_prenom} ${feuille.collaborateur_nom} - ${feuille.statut} - ${feuille.week_start} au ${feuille.week_end}`);
        });
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierIncoherenceApprobation();
