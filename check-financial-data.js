const { pool } = require('./src/utils/database');

async function checkFinancialData() {
    try {
        console.log('🔍 Vérification des données financières...');
        
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        
        // 1. Données de base de la mission
        const missionResult = await pool.query(`
            SELECT 
                budget_estime,
                budget_reel,
                montant_honoraires,
                montant_debours,
                devise
            FROM missions 
            WHERE id = $1
        `, [missionId]);
        
        console.log('📋 Données financières de base:', JSON.stringify(missionResult.rows[0], null, 2));
        
        // 2. Calculer le total honoraires + débours
        const mission = missionResult.rows[0];
        const totalHonoraires = parseFloat(mission.montant_honoraires || 0);
        const totalDebours = parseFloat(mission.montant_debours || 0);
        const budgetMission = totalHonoraires + totalDebours;
        
        console.log('💰 Calculs:');
        console.log('  - Total honoraires:', totalHonoraires);
        console.log('  - Total débours:', totalDebours);
        console.log('  - Budget de la mission (honoraires + débours):', budgetMission);
        
        // 3. Vérifier s'il y a des collaborateurs assignés avec leurs taux horaires
        const collaborateursResult = await pool.query(`
            SELECT 
                c.nom,
                c.prenom,
                g.taux_horaire
            FROM missions m
            LEFT JOIN collaborateurs c ON m.collaborateur_id = c.id OR m.associe_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            WHERE m.id = $1 AND c.id IS NOT NULL
        `, [missionId]);
        
        console.log('👥 Collaborateurs avec taux horaires:', JSON.stringify(collaborateursResult.rows, null, 2));
        
        // 4. Calculer la moyenne des taux horaires
        const tauxHoraires = collaborateursResult.rows.map(c => parseFloat(c.taux_horaire || 0)).filter(t => t > 0);
        const moyenneTauxHoraire = tauxHoraires.length > 0 ? tauxHoraires.reduce((a, b) => a + b, 0) / tauxHoraires.length : 0;
        
        console.log('📊 Taux horaires:');
        console.log('  - Taux individuels:', tauxHoraires);
        console.log('  - Moyenne des taux horaires:', moyenneTauxHoraire);
        
        // 5. Calculer le budget d'exécution (total honoraires des collaborateurs planifiés)
        const budgetExecution = totalHonoraires; // Pour l'instant, on utilise les honoraires
        
        // 6. Calculer la marge
        const marge = totalHonoraires - budgetExecution;
        
        console.log('📈 Résumé financier:');
        console.log('  - Budget de la mission:', budgetMission);
        console.log('  - Budget d\'exécution:', budgetExecution);
        console.log('  - Marge:', marge);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkFinancialData(); 