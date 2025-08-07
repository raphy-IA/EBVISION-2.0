const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkTasks() {
    try {
        console.log('🔍 Vérification des tâches disponibles...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // Vérifier les missions disponibles
        console.log('🎯 MISSIONS DISPONIBLES:');
        try {
            const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
            const missions = missionsResponse.data.data || [];
            console.log(`✅ ${missions.length} missions trouvées:`);
            
            missions.slice(0, 5).forEach((mission, index) => {
                console.log(`  ${index + 1}. ${mission.nom} (ID: ${mission.id})`);
            });
            
            // Pour chaque mission, vérifier ses tâches
            for (const mission of missions.slice(0, 3)) {
                console.log(`\n📋 TÂCHES POUR LA MISSION: ${mission.nom}`);
                try {
                    const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${mission.id}/tasks`, { headers });
                    const tasks = tasksResponse.data.data || [];
                    console.log(`   ✅ ${tasks.length} tâches trouvées:`);
                    
                    tasks.forEach((task, index) => {
                        console.log(`     ${index + 1}. ${task.description} (ID: ${task.id})`);
                    });
                    
                    if (tasks.length === 0) {
                        console.log('   ⚠️ Aucune tâche trouvée pour cette mission');
                    }
                } catch (error) {
                    console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
                }
            }
            
        } catch (error) {
            console.log('❌ Erreur lors de la récupération des missions:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

checkTasks(); 