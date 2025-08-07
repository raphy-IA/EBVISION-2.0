const { pool } = require('./src/utils/database');

async function verifierUtilisateurConnecte() {
    console.log('🔍 Vérification de l\'utilisateur connecté...');
    
    const client = await pool.connect();
    try {
        // Vérifier tous les utilisateurs et leurs rôles
        console.log('\n📋 Tous les utilisateurs:');
        const usersResult = await client.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            ORDER BY u.nom, u.prenom
        `);
        
        usersResult.rows.forEach(user => {
            console.log(`- ${user.prenom} ${user.nom} (${user.id}) - Collaborateur: ${user.collaborateur_id ? 'Oui' : 'Non'}`);
        });
        
        // Vérifier spécifiquement Raphaël Ngos
        console.log('\n🔍 Recherche de Raphaël Ngos:');
        const raphaelResult = await client.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                c.id as collaborateur_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.prenom ILIKE '%raphaël%' OR u.prenom ILIKE '%raphael%' OR u.nom ILIKE '%ngos%'
        `);
        
        console.log('Raphaël Ngos trouvé:', raphaelResult.rows);
        
        // Vérifier les relations superviseur-collaborateur
        console.log('\n📊 Relations superviseur-collaborateur:');
        const relationsResult = await client.query(`
            SELECT 
                tss.collaborateur_id,
                tss.supervisor_id,
                c1.prenom as collaborateur_prenom,
                c1.nom as collaborateur_nom,
                c1.user_id as collaborateur_user_id,
                c2.prenom as supervisor_prenom,
                c2.nom as supervisor_nom,
                c2.user_id as supervisor_user_id
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c1 ON tss.collaborateur_id = c1.id
            JOIN collaborateurs c2 ON tss.supervisor_id = c2.id
        `);
        
        relationsResult.rows.forEach(relation => {
            console.log(`- ${relation.collaborateur_prenom} ${relation.collaborateur_nom} (${relation.collaborateur_user_id}) -> ${relation.supervisor_prenom} ${relation.supervisor_nom} (${relation.supervisor_user_id})`);
        });
        
        // Identifier le vrai ID de Raphaël
        const vraiRaphaelId = relationsResult.rows.find(r => 
            r.supervisor_prenom.toLowerCase().includes('raphaël') || 
            r.supervisor_prenom.toLowerCase().includes('raphael')
        )?.supervisor_user_id;
        
        console.log('\n🎯 ID de Raphaël Ngos:', vraiRaphaelId);
        
        // Tester canSupervisorApprove avec le bon ID
        if (vraiRaphaelId) {
            const timeSheetId = 'f5db5871-8872-4862-81f8-5b47ed7d8ec9';
            console.log(`\n🔍 Test avec le bon ID de Raphaël (${vraiRaphaelId}):`);
            
            const canApproveResult = await client.query(`
                SELECT COUNT(*) as count
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                JOIN collaborateurs c ON u.id = c.user_id
                JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
                JOIN collaborateurs supervisor_c ON supervisor_c.user_id = $2
                WHERE ts.id = $1 
                AND tss.supervisor_id = supervisor_c.id
                AND ts.status = 'submitted'
            `, [timeSheetId, vraiRaphaelId]);
            
            console.log('Résultat:', canApproveResult.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

verifierUtilisateurConnecte().catch(console.error);
