const { pool } = require('./src/utils/database');

async function fixOpportunityForeignKey() {
    try {
        console.log('🔧 Correction de la contrainte de clé étrangère...\n');
        
        // 1. Supprimer l'ancienne contrainte
        console.log('1️⃣ Suppression de l\'ancienne contrainte...');
        await pool.query(`
            ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_opportunity_id_fkey
        `);
        console.log('✅ Ancienne contrainte supprimée');
        
        // 2. Créer la nouvelle contrainte pointant vers opportunities
        console.log('\n2️⃣ Création de la nouvelle contrainte...');
        await pool.query(`
            ALTER TABLE missions 
            ADD CONSTRAINT missions_opportunity_id_fkey 
            FOREIGN KEY (opportunity_id) 
            REFERENCES opportunities(id) 
            ON DELETE SET NULL
        `);
        console.log('✅ Nouvelle contrainte créée');
        
        // 3. Vérifier que la contrainte est correcte
        console.log('\n3️⃣ Vérification de la nouvelle contrainte...');
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
                AND tc.constraint_name = 'missions_opportunity_id_fkey'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Contrainte vérifiée:', constraintResult.rows[0]);
        } else {
            console.log('❌ Contrainte non trouvée');
        }
        
        // 4. Tester la création d'une mission
        console.log('\n4️⃣ Test de création de mission...');
        const testMission = {
            opportunity_id: '434a2f84-a39c-47ae-8831-59603d3e9e38',
            mission_type_id: '8dc818c6-07ba-4f6d-877f-aa1a1c9e6a1b',
            nom: 'Mission de test après correction',
            description: 'Description de test après correction',
            date_debut: new Date().toISOString().split('T')[0],
            date_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            budget_estime: 10000,
            devise: 'XAF',
            statut: 'PLANIFIEE'
        };
        
        const insertResult = await pool.query(`
            INSERT INTO missions (
                opportunity_id, mission_type_id, nom, description, 
                date_debut, date_fin, budget_estime, devise, statut
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, nom, opportunity_id
        `, [
            testMission.opportunity_id,
            testMission.mission_type_id,
            testMission.nom,
            testMission.description,
            testMission.date_debut,
            testMission.date_fin,
            testMission.budget_estime,
            testMission.devise,
            testMission.statut
        ]);
        
        if (insertResult.rows.length > 0) {
            console.log('✅ Mission créée avec succès:', insertResult.rows[0]);
        } else {
            console.log('❌ Erreur lors de la création de la mission');
        }
        
        await pool.end();
        console.log('\n✅ Correction terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

fixOpportunityForeignKey(); 