const { pool } = require('./src/utils/database');

async function debugOpportunityForeignKey() {
    try {
        console.log('🔍 Diagnostic du problème de clé étrangère...\n');
        
        // 1. Vérifier l'opportunité que nous essayons d'utiliser
        console.log('1️⃣ Vérification de l\'opportunité:');
        const opportunityId = '434a2f84-a39c-47ae-8831-59603d3e9e38';
        
        const opportunityResult = await pool.query(`
            SELECT id, nom, statut, client_id
            FROM opportunities 
            WHERE id = $1
        `, [opportunityId]);
        
        if (opportunityResult.rows.length > 0) {
            console.log('✅ Opportunité trouvée:', opportunityResult.rows[0]);
        } else {
            console.log('❌ Opportunité NON trouvée avec cet ID');
        }
        
        // 2. Vérifier toutes les opportunités disponibles
        console.log('\n2️⃣ Toutes les opportunités disponibles:');
        const allOpportunitiesResult = await pool.query(`
            SELECT id, nom, statut, client_id
            FROM opportunities 
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        allOpportunitiesResult.rows.forEach((opp, index) => {
            console.log(`  ${index + 1}. ID: ${opp.id}`);
            console.log(`     Nom: ${opp.nom}`);
            console.log(`     Statut: ${opp.statut}`);
            console.log(`     Client ID: ${opp.client_id}`);
            console.log('');
        });
        
        // 3. Vérifier les opportunités gagnées
        console.log('3️⃣ Opportunités gagnées:');
        const wonOpportunitiesResult = await pool.query(`
            SELECT id, nom, statut, client_id
            FROM opportunities 
            WHERE statut IN ('GAGNEE', 'WON')
            ORDER BY created_at DESC
        `);
        
        wonOpportunitiesResult.rows.forEach((opp, index) => {
            console.log(`  ${index + 1}. ID: ${opp.id}`);
            console.log(`     Nom: ${opp.nom}`);
            console.log(`     Statut: ${opp.statut}`);
            console.log(`     Client ID: ${opp.client_id}`);
            console.log('');
        });
        
        // 4. Vérifier les missions existantes
        console.log('4️⃣ Missions existantes:');
        const missionsResult = await pool.query(`
            SELECT id, nom, opportunity_id, client_id
            FROM missions 
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        missionsResult.rows.forEach((mission, index) => {
            console.log(`  ${index + 1}. ID: ${mission.id}`);
            console.log(`     Nom: ${mission.nom}`);
            console.log(`     Opportunity ID: ${mission.opportunity_id}`);
            console.log(`     Client ID: ${mission.client_id}`);
            console.log('');
        });
        
        // 5. Vérifier la contrainte de clé étrangère
        console.log('5️⃣ Contrainte de clé étrangère:');
        const constraintResult = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'missions'
                AND kcu.column_name = 'opportunity_id'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Contrainte trouvée:', constraintResult.rows[0]);
        } else {
            console.log('❌ Contrainte non trouvée');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

debugOpportunityForeignKey(); 