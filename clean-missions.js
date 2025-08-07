const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function cleanMissions() {
    try {
        console.log('🧹 Nettoyage des missions...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer toutes les missions
        console.log('📋 Récupération de toutes les missions...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data || [];
        
        console.log(`📊 ${missions.length} missions trouvées`);
        
        // 2. Identifier les missions à conserver
        const missionsToKeep = [
            'MIS-20250804-553',
            'MIS-20250804-534'
        ];
        
        console.log('\n📋 Missions à conserver:', missionsToKeep);
        
        // 3. Supprimer les missions non désirées
        console.log('\n🗑️ Suppression des missions non désirées...');
        let deletedCount = 0;
        
        for (const mission of missions) {
            const codeMission = mission.code_mission || mission.code || '';
            console.log(`   🔍 Mission: ${codeMission} (ID: ${mission.id})`);
            
            if (!missionsToKeep.includes(codeMission)) {
                try {
                    await axios.delete(`${API_BASE_URL}/missions/${mission.id}`, { headers });
                    console.log(`   ✅ Mission supprimée: ${codeMission}`);
                    deletedCount++;
                } catch (error) {
                    console.log(`   ❌ Erreur lors de la suppression de ${codeMission}:`, error.response?.data || error.message);
                }
            } else {
                console.log(`   ✅ Mission conservée: ${codeMission}`);
            }
        }
        
        // 4. Vérifier le résultat
        console.log('\n🔍 Vérification du nettoyage...');
        const verifyResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const remainingMissions = verifyResponse.data.data || verifyResponse.data || [];
        
        console.log(`📊 Missions restantes: ${remainingMissions.length}`);
        remainingMissions.forEach(mission => {
            const codeMission = mission.code_mission || mission.code || '';
            console.log(`   ✅ ${codeMission} (ID: ${mission.id})`);
        });
        
        console.log(`\n✅ Nettoyage terminé: ${deletedCount} missions supprimées`);
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.response?.data || error.message);
    }
}

cleanMissions(); 