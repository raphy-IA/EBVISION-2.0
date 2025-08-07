const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function findRealTasks() {
    try {
        console.log('🔍 Recherche des vraies tâches en base de données...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer toutes les missions
        console.log('📋 Récupération de toutes les missions...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data;
        
        console.log(`✅ ${missions.length} missions trouvées\n`);
        
        // 2. Pour chaque mission, vérifier ses tâches et tester leur existence
        for (const mission of missions) {
            console.log(`🎯 MISSION: ${mission.nom} (ID: ${mission.id})`);
            
            try {
                const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${mission.id}/tasks`, { headers });
                const tasks = tasksResponse.data.data || tasksResponse.data;
                
                if (tasks.length === 0) {
                    console.log('   ⚠️ Aucune tâche trouvée pour cette mission');
                } else {
                    console.log(`   📋 ${tasks.length} tâche(s) trouvée(s) dans l'API:`);
                    
                    for (const task of tasks) {
                        console.log(`     - ID: ${task.id} | Description: ${task.description || task.task_libelle || 'Sans description'}`);
                        
                        // Tester si cette tâche existe réellement en base
                        try {
                            const { query } = require('./src/utils/database');
                            const taskResult = await query('SELECT id, description FROM tasks WHERE id = $1', [task.id]);
                            
                            if (taskResult.rows.length > 0) {
                                const realTask = taskResult.rows[0];
                                console.log(`       ✅ EXISTE en base: ${realTask.description || 'Sans description'}`);
                            } else {
                                console.log(`       ❌ N'EXISTE PAS en base de données`);
                            }
                        } catch (error) {
                            console.log(`       ❌ Erreur lors de la vérification: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
            }
            
            console.log('');
        }
        
        // 3. Lister toutes les tâches disponibles en base
        console.log('🔍 Toutes les tâches disponibles en base de données:');
        try {
            const { query } = require('./src/utils/database');
            const allTasksResult = await query('SELECT id, description, mission_id FROM tasks ORDER BY description');
            
            if (allTasksResult.rows.length > 0) {
                console.log(`✅ ${allTasksResult.rows.length} tâches trouvées en base:`);
                allTasksResult.rows.forEach((task, index) => {
                    console.log(`  ${index + 1}. ID: ${task.id} | Description: ${task.description || 'Sans description'} | Mission: ${task.mission_id}`);
                });
            } else {
                console.log('❌ Aucune tâche trouvée en base de données');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la récupération des tâches:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

findRealTasks(); 