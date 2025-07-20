const { pool } = require('../src/utils/database');

async function createTauxHoraires() {
    try {
        console.log('💰 Création des taux horaires et salaires de base...\n');
        
        // Récupérer les IDs des grades et divisions existants
        const grades = await pool.query('SELECT id, nom, code FROM grades ORDER BY niveau');
        const divisions = await pool.query('SELECT id, nom, code FROM divisions ORDER BY nom');
        
        console.log('📋 Grades trouvés:');
        grades.rows.forEach(grade => {
            console.log(`  - ${grade.nom} (${grade.code}): ${grade.id}`);
        });
        
        console.log('\n📋 Divisions trouvées:');
        divisions.rows.forEach(division => {
            console.log(`  - ${division.nom} (${division.code}): ${division.id}`);
        });
        
        // Définir les taux horaires et salaires par grade et division
        const tauxHoraires = [
            // Direction Générale (DG)
            { grade_code: 'ASSISTANT', division_code: 'DG', taux: 40.00, salaire: 3200.00 },
            { grade_code: 'ADMIN', division_code: 'DG', taux: 50.00, salaire: 4000.00 },
            { grade_code: 'MANAGER', division_code: 'DG', taux: 70.00, salaire: 5600.00 },
            { grade_code: 'DIRECTOR', division_code: 'DG', taux: 90.00, salaire: 7200.00 },
            
            // Finance (FIN)
            { grade_code: 'ASSISTANT', division_code: 'FIN', taux: 35.00, salaire: 2800.00 },
            { grade_code: 'ADMIN', division_code: 'FIN', taux: 45.00, salaire: 3600.00 },
            { grade_code: 'MANAGER', division_code: 'FIN', taux: 60.00, salaire: 4800.00 },
            { grade_code: 'DIRECTOR', division_code: 'FIN', taux: 80.00, salaire: 6400.00 },
            
            // Informatique (IT)
            { grade_code: 'ASSISTANT', division_code: 'IT', taux: 45.00, salaire: 3600.00 },
            { grade_code: 'ADMIN', division_code: 'IT', taux: 55.00, salaire: 4400.00 },
            { grade_code: 'MANAGER', division_code: 'IT', taux: 75.00, salaire: 6000.00 },
            { grade_code: 'DIRECTOR', division_code: 'IT', taux: 100.00, salaire: 8000.00 },
            
            // Ajouter aussi pour les autres grades existants
            { grade_code: 'SENIOR_ASSISTANT', division_code: 'DG', taux: 55.00, salaire: 4400.00 },
            { grade_code: 'SENIOR_ASSISTANT', division_code: 'FIN', taux: 50.00, salaire: 4000.00 },
            { grade_code: 'SENIOR_ASSISTANT', division_code: 'IT', taux: 60.00, salaire: 4800.00 },
            
            { grade_code: 'SENIOR_MANAGER', division_code: 'DG', taux: 85.00, salaire: 6800.00 },
            { grade_code: 'SENIOR_MANAGER', division_code: 'FIN', taux: 75.00, salaire: 6000.00 },
            { grade_code: 'SENIOR_MANAGER', division_code: 'IT', taux: 90.00, salaire: 7200.00 },
        ];
        
        let inserted = 0;
        
        for (const taux of tauxHoraires) {
            const grade = grades.rows.find(g => g.code === taux.grade_code);
            const division = divisions.rows.find(d => d.code === taux.division_code);
            
            if (grade && division) {
                try {
                    await pool.query(`
                        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet, statut)
                        VALUES ($1, $2, $3, $4, CURRENT_DATE, 'ACTIF')
                        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING
                    `, [grade.id, division.id, taux.taux, taux.salaire]);
                    
                    console.log(`✅ ${grade.nom} - ${division.nom}: ${taux.taux}€/h, ${taux.salaire}€/mois`);
                    inserted++;
                } catch (error) {
                    console.log(`❌ Erreur pour ${grade.nom} - ${division.nom}: ${error.message}`);
                }
            } else {
                console.log(`⚠️  Grade ou division non trouvé: ${taux.grade_code} - ${taux.division_code}`);
            }
        }
        
        console.log(`\n🎉 ${inserted} taux horaires créés avec succès !`);
        
        // Vérifier le résultat
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                AVG(taux_horaire) as taux_moyen,
                AVG(salaire_base) as salaire_moyen
            FROM taux_horaires
        `);
        
        const stats = result.rows[0];
        console.log(`\n📊 Statistiques finales:`);
        console.log(`  - Total: ${stats.total} taux horaires`);
        console.log(`  - Taux moyen: ${parseFloat(stats.taux_moyen).toFixed(2)}€/h`);
        console.log(`  - Salaire moyen: ${parseFloat(stats.salaire_moyen).toFixed(2)}€/mois`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

createTauxHoraires(); 