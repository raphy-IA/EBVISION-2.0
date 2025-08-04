const fetch = require('node-fetch');

async function checkNewMissionCorrect() {
    try {
        console.log('🔍 Vérification de la nouvelle mission avec Business Unit et Division...');
        
        const response = await fetch('http://localhost:3000/api/missions', {
            headers: { 'Authorization': 'Bearer test-token' }
        });
        
        const data = await response.json();
        console.log('📊 Missions dans l\'API:');
        
        data.data.forEach((mission, index) => {
            if (mission.code && mission.code.includes('TEST-MISSION-CORRECT')) {
                console.log(`${index + 1}. ${mission.code} - ${mission.nom}`);
                console.log(`   Business Unit: ${mission.business_unit_nom || 'N/A'}`);
                console.log(`   Division: ${mission.division_nom || 'N/A'}`);
                console.log(`   Budget: ${mission.budget_estime} ${mission.devise}`);
                console.log(`   Date création: ${mission.created_at}`);
                console.log('   ---');
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkNewMissionCorrect(); 