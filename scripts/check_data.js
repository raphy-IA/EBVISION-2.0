const { pool } = require('../src/utils/database');

async function checkData() {
    try {
        console.log('🔍 Vérification des données existantes...\n');
        
        // Vérifier les grades
        const grades = await pool.query('SELECT id, nom, code FROM grades ORDER BY niveau');
        console.log('📋 Grades existants:');
        grades.rows.forEach(grade => {
            console.log(`  - ${grade.nom} (${grade.code}): ${grade.id}`);
        });
        
        console.log('\n📋 Divisions existantes:');
        const divisions = await pool.query('SELECT id, nom, code FROM divisions ORDER BY nom');
        divisions.rows.forEach(division => {
            console.log(`  - ${division.nom} (${division.code}): ${division.id}`);
        });
        
        console.log('\n📋 Taux horaires existants:');
        const tauxHoraires = await pool.query(`
            SELECT 
                th.id,
                th.taux_horaire,
                th.salaire_base,
                g.nom as grade,
                d.nom as division
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            ORDER BY d.nom, g.niveau
        `);
        
        if (tauxHoraires.rows.length === 0) {
            console.log('  Aucun taux horaire trouvé');
        } else {
            tauxHoraires.rows.forEach(th => {
                console.log(`  - ${th.grade} - ${th.division}: ${th.taux_horaire}€/h, ${th.salaire_base}€/mois`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkData(); 