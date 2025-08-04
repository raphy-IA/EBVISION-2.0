const { pool } = require('./src/utils/database');

async function fixMissionsData() {
    try {
        console.log('🔧 Correction des données des missions...\n');
        
        // 1. Vérifier les missions avec des opportunity_id invalides
        console.log('1️⃣ Vérification des missions avec opportunity_id invalides...');
        const invalidMissions = await pool.query(`
            SELECT m.id, m.nom, m.opportunity_id, o.id as opportunity_exists
            FROM missions m
            LEFT JOIN opportunities o ON m.opportunity_id = o.id
            WHERE m.opportunity_id IS NOT NULL AND o.id IS NULL
        `);
        
        console.log(`📊 ${invalidMissions.rows.length} missions avec opportunity_id invalides`);
        invalidMissions.rows.forEach((mission, index) => {
            console.log(`  ${index + 1}. Mission: ${mission.nom} (ID: ${mission.id})`);
            console.log(`     Opportunity ID invalide: ${mission.opportunity_id}`);
            console.log('');
        });
        
        // 2. Nettoyer les opportunity_id invalides
        console.log('2️⃣ Nettoyage des opportunity_id invalides...');
        const cleanResult = await pool.query(`
            UPDATE missions 
            SET opportunity_id = NULL 
            WHERE opportunity_id IS NOT NULL 
            AND opportunity_id NOT IN (SELECT id FROM opportunities)
        `);
        
        console.log(`✅ ${cleanResult.rowCount} missions nettoyées`);
        
        // 3. Supprimer l'ancienne contrainte
        console.log('\n3️⃣ Suppression de l\'ancienne contrainte...');
        await pool.query(`
            ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_opportunity_id_fkey
        `);
        console.log('✅ Ancienne contrainte supprimée');
        
        // 4. Créer la nouvelle contrainte
        console.log('\n4️⃣ Création de la nouvelle contrainte...');
        await pool.query(`
            ALTER TABLE missions 
            ADD CONSTRAINT missions_opportunity_id_fkey 
            FOREIGN KEY (opportunity_id) 
            REFERENCES opportunities(id) 
            ON DELETE SET NULL
        `);
        console.log('✅ Nouvelle contrainte créée');
        
        // 5. Vérifier la contrainte
        console.log('\n5️⃣ Vérification de la nouvelle contrainte...');
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
        
        // 6. Tester la création d'une mission
        console.log('\n6️⃣ Test de création de mission...');
        const testMission = {
            opportunity_id: '434a2f84-a39c-47ae-8831-59603d3e9e38',
            mission_type_id: '8dc818c6-07ba-4f6d-877f-aa1a1c9e6a1b',
            nom: 'Mission de test après correction complète',
            description: 'Description de test après correction complète',
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
        console.log('\n✅ Correction complète terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

fixMissionsData(); 