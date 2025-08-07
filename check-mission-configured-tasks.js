const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkMissionConfiguredTasks() {
    try {
        console.log('🔍 Vérification des tâches configurées dans les missions...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer les missions
        console.log('📋 Récupération des missions...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data || [];
        
        console.log(`📊 ${missions.length} missions trouvées`);
        
        // 2. Vérifier les tâches configurées pour chaque mission
        for (const mission of missions) {
            console.log(`\n🔍 Mission: ${mission.code_mission || 'N/A'} (ID: ${mission.id})`);
            console.log(`   - Type de mission ID: ${mission.mission_type_id}`);
            
            try {
                // Test de la route /tasks (tâches configurées)
                console.log('   📡 Test route /tasks (tâches configurées):');
                const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${mission.id}/tasks`, { headers });
                const tasks = tasksResponse.data.data || [];
                console.log(`     ✅ Tâches configurées: ${tasks.length}`);
                
                if (tasks.length > 0) {
                    tasks.forEach((task, index) => {
                        console.log(`       ${index + 1}. ${task.code} - ${task.task_libelle} (ID: ${task.id})`);
                    });
                } else {
                    console.log('       ❌ Aucune tâche configurée');
                }
                
            } catch (error) {
                console.log(`   ❌ Erreur lors du test:`, error.response?.data || error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

checkMissionConfiguredTasks(); 