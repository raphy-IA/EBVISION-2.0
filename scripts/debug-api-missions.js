const fetch = require('node-fetch');

async function debugApiMissions() {
    try {
        console.log('🔍 Débogage de l\'API missions...');
        
        // Récupérer les missions via l'API
        const response = await fetch('http://localhost:3000/api/missions', {
            headers: { 'Authorization': 'Bearer test-token' }
        });
        
        const data = await response.json();
        console.log('📊 Structure de la réponse API:');
        console.log('  - Success:', data.success);
        console.log('  - Data length:', data.data ? data.data.length : 'N/A');
        
        // Afficher la première mission pour voir la structure
        if (data.data && data.data.length > 0) {
            const firstMission = data.data[0];
            console.log('\n📋 Première mission de l\'API:');
            console.log('  - Code:', firstMission.code);
            console.log('  - Nom:', firstMission.nom);
            console.log('  - Business Unit ID:', firstMission.business_unit_id);
            console.log('  - Business Unit Nom:', firstMission.business_unit_nom);
            console.log('  - Division ID:', firstMission.division_id);
            console.log('  - Division Nom:', firstMission.division_nom);
            console.log('  - Budget:', firstMission.budget_estime);
            console.log('  - Devise:', firstMission.devise);
            
            // Afficher toutes les propriétés de la mission
            console.log('\n🔍 Toutes les propriétés de la première mission:');
            Object.keys(firstMission).forEach(key => {
                console.log(`  - ${key}:`, firstMission[key]);
            });
        }
        
        // Chercher la mission spécifique MIS-20250804-553
        const targetMission = data.data.find(m => m.code === 'MIS-20250804-553');
        if (targetMission) {
            console.log('\n🎯 Mission MIS-20250804-553 dans l\'API:');
            console.log('  - Business Unit ID:', targetMission.business_unit_id);
            console.log('  - Business Unit Nom:', targetMission.business_unit_nom);
            console.log('  - Division ID:', targetMission.division_id);
            console.log('  - Division Nom:', targetMission.division_nom);
        } else {
            console.log('\n❌ Mission MIS-20250804-553 non trouvée dans l\'API');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

debugApiMissions(); 