const { pool } = require('./src/utils/database');

async function debugDashboardError() {
    console.log('🔍 Debug de l\'erreur dashboard...\n');

    const client = await pool.connect();
    
    try {
        // Test de la requête exacte de l'API
        console.log('1️⃣ Test de la requête exacte de l\'API...');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        
        const params = [startDate.toISOString(), endDate.toISOString()];
        
        const hoursQuery = `
            SELECT 
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                SUM(CASE WHEN te.status = 'submitted' THEN te.heures ELSE 0 END) as heures_soumises,
                SUM(CASE WHEN te.status = 'draft' THEN te.heures ELSE 0 END) as heures_saisie,
                COUNT(DISTINCT te.user_id) as collaborateurs_actifs,
                SUM(COALESCE(m.montant_honoraires, 0)) as chiffre_affaires,
                SUM(COALESCE(te.heures * COALESCE(g.taux_horaire_default, 0), 0)) as cout_total,
                COUNT(DISTINCT c.id) * 8 * 30 as heures_disponibles
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            LEFT JOIN missions m ON te.mission_id = m.id
            WHERE te.date_saisie >= $1 AND te.date_saisie <= $2
        `;
        
        console.log('   Exécution de la requête...');
        const hoursResult = await client.query(hoursQuery, params);
        console.log('   ✅ Requête exécutée avec succès');
        console.log('   📊 Résultats:', hoursResult.rows[0]);
        
        // Test de la requête missions
        console.log('\n2️⃣ Test de la requête missions...');
        const missionsQuery = `
            SELECT 
                COUNT(*) as total_missions,
                COUNT(CASE WHEN m.statut = 'EN_COURS' THEN 1 END) as missions_actives,
                COUNT(CASE WHEN m.statut = 'TERMINEE' THEN 1 END) as missions_terminees,
                0 as progression_moyenne
            FROM missions m
            WHERE m.created_at >= $1
        `;
        
        const missionsResult = await client.query(missionsQuery, [startDate.toISOString()]);
        console.log('   ✅ Requête missions exécutée');
        console.log('   📊 Résultats:', missionsResult.rows[0]);
        
        // Test de la requête encours
        console.log('\n3️⃣ Test de la requête encours...');
        const encoursQuery = `
            SELECT 
                SUM(m.montant_honoraires) as encours_facturation
            FROM missions m
            WHERE m.statut = 'EN_COURS' 
            AND m.date_fin < CURRENT_DATE
        `;
        
        const encoursResult = await client.query(encoursQuery);
        console.log('   ✅ Requête encours exécutée');
        console.log('   📊 Résultats:', encoursResult.rows[0]);
        
        // Test de la requête tendances
        console.log('\n4️⃣ Test de la requête tendances...');
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        
        const previousHoursQuery = `
            SELECT 
                SUM(te.heures) as total_heures,
                SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            WHERE te.created_at >= $1 AND te.created_at < $2
        `;
        
        const previousHoursResult = await client.query(previousHoursQuery, [previousStartDate.toISOString(), startDate.toISOString()]);
        console.log('   ✅ Requête tendances exécutée');
        console.log('   📊 Résultats:', previousHoursResult.rows[0]);
        
        // Test de construction des données finales
        console.log('\n5️⃣ Test de construction des données finales...');
        
        const hoursData = hoursResult.rows[0];
        const missionsData = missionsResult.rows[0];
        const encoursData = encoursResult.rows[0];
        const previousHoursData = previousHoursResult.rows[0];
        
        const tauxRentabilite = hoursData.heures_validees > 0 ? 
            (hoursData.heures_validees / hoursData.total_heures) * 100 : 0;
        
        const heuresTrend = previousHoursData.total_heures > 0 ? 
            ((hoursData.total_heures - previousHoursData.total_heures) / previousHoursData.total_heures) * 100 : 0;
        
        const valideesTrend = previousHoursData.heures_validees > 0 ? 
            ((hoursData.heures_validees - previousHoursData.heures_validees) / previousHoursData.heures_validees) * 100 : 0;
        
        const kpisData = {
            total_heures: hoursData.total_heures || 0,
            heures_validees: hoursData.heures_validees || 0,
            heures_en_attente: hoursData.heures_soumises || 0,
            missions_actives: missionsData.missions_actives || 0,
            taux_rentabilite: Math.round(tauxRentabilite * 100) / 100,
            encours_facturation: encoursData.encours_facturation || 0,
            heures_trend: Math.round(heuresTrend * 10) / 10,
            validees_trend: Math.round(valideesTrend * 10) / 10,
            attente_trend: -5.2,
            missions_trend: 3.7,
            rentabilite_trend: 2.1,
            encours_trend: 15.8
        };
        
        console.log('   ✅ Données construites avec succès');
        console.log('   📊 KPIs finaux:', kpisData);
        
    } catch (error) {
        console.error('❌ Erreur détaillée:', error);
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        console.error('   Detail:', error.detail);
        console.error('   Hint:', error.hint);
    } finally {
        client.release();
        await pool.end();
    }
}

debugDashboardError();
