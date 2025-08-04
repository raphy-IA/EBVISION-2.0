const { pool } = require('../src/utils/database');

async function debugPaymentConditions() {
    console.log('🔍 Débogage des conditions de paiement...\n');

    try {
        // Récupérer une mission avec conditions de paiement
        const missionQuery = `
            SELECT 
                id, nom, code, 
                conditions_paiement
            FROM missions 
            WHERE conditions_paiement IS NOT NULL 
            AND conditions_paiement != ''
            AND conditions_paiement NOT LIKE '{"%'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        
        const missionResult = await pool.query(missionQuery);
        
        if (missionResult.rows.length === 0) {
            console.log('❌ Aucune mission avec conditions de paiement valides trouvée');
            return;
        }

        const mission = missionResult.rows[0];
        console.log(`✅ Mission: ${mission.nom} (${mission.code})`);
        console.log(`📋 Conditions de paiement brute: ${mission.conditions_paiement}`);
        
        // Parser et analyser la structure
        try {
            const conditions = JSON.parse(mission.conditions_paiement);
            console.log('\n🔍 Structure analysée:');
            console.log(`Type: ${typeof conditions}`);
            console.log(`Est un tableau: ${Array.isArray(conditions)}`);
            console.log(`Nombre d'éléments: ${conditions.length}`);
            
            if (Array.isArray(conditions) && conditions.length > 0) {
                console.log('\n📋 Premier élément:');
                const firstCondition = conditions[0];
                console.log(`Type: ${typeof firstCondition}`);
                console.log(`Clés disponibles: ${Object.keys(firstCondition).join(', ')}`);
                
                // Afficher toutes les propriétés
                Object.keys(firstCondition).forEach(key => {
                    console.log(`  ${key}: ${firstCondition[key]} (${typeof firstCondition[key]})`);
                });
                
                // Tester les différents noms de propriétés possibles
                console.log('\n🧪 Test des propriétés:');
                const testProps = [
                    'montantHonoraires', 'montant_honoraires', 'honoraires',
                    'montantDebours', 'montant_debours', 'debours',
                    'pourcentageHonoraires', 'pourcentage_honoraires',
                    'pourcentageDebours', 'pourcentage_debours',
                    'datePrevisionnelle', 'date_previsionnelle', 'date',
                    'details', 'detail', 'description'
                ];
                
                testProps.forEach(prop => {
                    if (firstCondition.hasOwnProperty(prop)) {
                        console.log(`  ✅ ${prop}: ${firstCondition[prop]}`);
                    }
                });
            }
            
        } catch (parseError) {
            console.error('❌ Erreur de parsing:', parseError.message);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le débogage
debugPaymentConditions(); 