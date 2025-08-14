const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_2_0',
    password: 'password',
    port: 5432,
});

async function debugAlertsSQL() {
    try {
        console.log('🔍 Test des requêtes SQL de l\'endpoint /api/analytics/alerts...');
        
        // Test 1: Missions en retard
        console.log('\n1️⃣ Test requête missions en retard...');
        try {
            const missionsEnRetardQuery = `
                SELECT COUNT(*) as count
                FROM missions m
                WHERE m.statut = 'EN_COURS' 
                AND m.date_fin < CURRENT_DATE
            `;
            const missionsEnRetardResult = await pool.query(missionsEnRetardQuery);
            console.log('✅ Missions en retard:', missionsEnRetardResult.rows[0].count);
        } catch (error) {
            console.error('❌ Erreur missions en retard:', error.message);
        }
        
        // Test 2: Heures non validées
        console.log('\n2️⃣ Test requête heures non validées...');
        try {
            const heuresNonValideesQuery = `
                SELECT COUNT(*) as count
                FROM time_entries te
                WHERE te.status = 'submitted'
                AND te.created_at < CURRENT_DATE - INTERVAL '7 days'
            `;
            const heuresNonValideesResult = await pool.query(heuresNonValideesQuery);
            console.log('✅ Heures non validées:', heuresNonValideesResult.rows[0].count);
        } catch (error) {
            console.error('❌ Erreur heures non validées:', error.message);
        }
        
        // Test 3: Dépassement budget
        console.log('\n3️⃣ Test requête dépassement budget...');
        try {
            const budgetQuery = `
                SELECT 
                    SUM(COALESCE(m.montant_honoraires, 0)) as budget_estime,
                    SUM(COALESCE(te.heures * COALESCE(g.taux_horaire_default, 0), 0)) as cout_reel
                FROM missions m
                LEFT JOIN time_entries te ON m.id = te.mission_id
                LEFT JOIN users u ON te.user_id = u.id
                LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE m.statut = 'EN_COURS'
            `;
            const budgetResult = await pool.query(budgetQuery);
            console.log('✅ Budget:', budgetResult.rows[0]);
        } catch (error) {
            console.error('❌ Erreur budget:', error.message);
        }
        
        // Test 4: Anomalie de saisie
        console.log('\n4️⃣ Test requête anomalie de saisie...');
        try {
            const anomalieQuery = `
                SELECT COUNT(*) as count
                FROM time_entries te
                WHERE te.heures > 12
                AND te.created_at >= CURRENT_DATE - INTERVAL '1 day'
            `;
            const anomalieResult = await pool.query(anomalieQuery);
            console.log('✅ Anomalies:', anomalieResult.rows[0].count);
        } catch (error) {
            console.error('❌ Erreur anomalies:', error.message);
        }
        
        // Test 5: Performance faible
        console.log('\n5️⃣ Test requête performance faible...');
        try {
            const performanceQuery = `
                SELECT AVG(te.heures) as moyenne_heures
                FROM time_entries te
                WHERE te.created_at >= CURRENT_DATE - INTERVAL '7 days'
            `;
            const performanceResult = await pool.query(performanceQuery);
            console.log('✅ Performance:', performanceResult.rows[0].moyenne_heures);
        } catch (error) {
            console.error('❌ Erreur performance:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    } finally {
        await pool.end();
    }
}

debugAlertsSQL();
