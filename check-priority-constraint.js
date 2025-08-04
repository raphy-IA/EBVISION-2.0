const { pool } = require('./src/utils/database');

async function checkPriorityConstraint() {
    try {
        console.log('🔍 Vérification de la contrainte de priorité...\n');
        
        // 1. Vérifier la contrainte check_priorite
        console.log('1️⃣ Contrainte check_priorite:');
        const constraintResult = await pool.query(`
            SELECT 
                conname,
                pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conname = 'check_priorite'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Contrainte trouvée:', constraintResult.rows[0]);
        } else {
            console.log('❌ Contrainte non trouvée');
        }
        
        // 2. Vérifier les valeurs de priorité existantes
        console.log('\n2️⃣ Valeurs de priorité existantes:');
        const priorityResult = await pool.query(`
            SELECT DISTINCT priorite, COUNT(*) as count
            FROM missions 
            WHERE priorite IS NOT NULL
            GROUP BY priorite
        `);
        
        priorityResult.rows.forEach(row => {
            console.log(`  - ${row.priorite}: ${row.count} missions`);
        });
        
        // 3. Vérifier les valeurs autorisées pour priorite
        console.log('\n3️⃣ Valeurs autorisées pour priorite:');
        const enumResult = await pool.query(`
            SELECT 
                t.typname,
                e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            WHERE t.typname = 'priorite_enum'
            ORDER BY e.enumsortorder
        `);
        
        if (enumResult.rows.length > 0) {
            console.log('✅ Valeurs autorisées:');
            enumResult.rows.forEach(row => {
                console.log(`  - ${row.enumlabel}`);
            });
        } else {
            console.log('❌ Pas de type enum trouvé');
        }
        
        // 4. Tester avec une valeur de priorité valide
        console.log('\n4️⃣ Test avec priorité valide...');
        const testMission = {
            opportunity_id: '434a2f84-a39c-47ae-8831-59603d3e9e38',
            mission_type_id: '8dc818c6-07ba-4f6d-877f-aa1a1c9e6a1b',
            nom: 'Mission de test avec priorité',
            description: 'Description de test avec priorité',
            date_debut: new Date().toISOString().split('T')[0],
            date_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            budget_estime: 10000,
            devise: 'XAF',
            statut: 'PLANIFIEE',
            priorite: 'NORMALE'
        };
        
        const insertResult = await pool.query(`
            INSERT INTO missions (
                opportunity_id, mission_type_id, nom, description, 
                date_debut, date_fin, budget_estime, devise, statut, priorite
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, nom, opportunity_id, priorite
        `, [
            testMission.opportunity_id,
            testMission.mission_type_id,
            testMission.nom,
            testMission.description,
            testMission.date_debut,
            testMission.date_fin,
            testMission.budget_estime,
            testMission.devise,
            testMission.statut,
            testMission.priorite
        ]);
        
        if (insertResult.rows.length > 0) {
            console.log('✅ Mission créée avec succès:', insertResult.rows[0]);
        } else {
            console.log('❌ Erreur lors de la création de la mission');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkPriorityConstraint(); 