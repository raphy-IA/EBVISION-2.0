const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkMissionTypeTasks() {
    try {
        console.log('🔍 Vérification des associations types de mission - tâches...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer tous les types de mission
        console.log('📋 Récupération des types de mission...');
        const missionTypesResponse = await axios.get(`${API_BASE_URL}/mission-types`, { headers });
        const missionTypes = missionTypesResponse.data.data?.missionTypes || [];
        
        console.log(`📊 ${missionTypes.length} types de mission trouvés`);
        
        // 2. Vérifier les tâches pour chaque type de mission
        for (const missionType of missionTypes) {
            console.log(`\n🔍 Type de mission: ${missionType.codification} (ID: ${missionType.id})`);
            
            try {
                // Récupérer les tâches via l'API
                const tasksResponse = await axios.get(`${API_BASE_URL}/mission-types/${missionType.id}/tasks`, { headers });
                const tasksData = tasksResponse.data;
                
                if (tasksData.success) {
                    const tasks = tasksData.tasks || [];
                    console.log(`   📋 Tâches associées: ${tasks.length}`);
                    
                    if (tasks.length > 0) {
                        tasks.forEach((task, index) => {
                            console.log(`     ${index + 1}. ${task.code} - ${task.libelle} (Obligatoire: ${task.obligatoire ? 'Oui' : 'Non'})`);
                        });
                    } else {
                        console.log('     ❌ Aucune tâche associée');
                    }
                } else {
                    console.log(`   ❌ Erreur API: ${tasksData.error || 'Erreur inconnue'}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
            }
        }
        
        // 3. Vérifier les missions conservées
        console.log('\n📋 Vérification des missions conservées...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data || [];
        
        for (const mission of missions) {
            console.log(`\n🔍 Mission: ${mission.code_mission} (ID: ${mission.id})`);
            console.log(`   - Type de mission ID: ${mission.mission_type_id}`);
            
            if (mission.mission_type_id) {
                try {
                    const tasksResponse = await axios.get(`${API_BASE_URL}/mission-types/${mission.mission_type_id}/tasks`, { headers });
                    const tasksData = tasksResponse.data;
                    
                    if (tasksData.success) {
                        const tasks = tasksData.tasks || [];
                        console.log(`   📋 Tâches disponibles: ${tasks.length}`);
                        
                        if (tasks.length > 0) {
                            tasks.forEach((task, index) => {
                                console.log(`     ${index + 1}. ${task.code} - ${task.libelle}`);
                            });
                        } else {
                            console.log('     ❌ Aucune tâche disponible pour ce type de mission');
                        }
                    } else {
                        console.log(`   ❌ Erreur API: ${tasksData.error || 'Erreur inconnue'}`);
                    }
                } catch (error) {
                    console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
                }
            } else {
                console.log('   ❌ Aucun type de mission associé');
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

checkMissionTypeTasks(); 