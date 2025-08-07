const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkMissionTasks() {
    try {
        console.log('🔍 Vérification des tâches des missions...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer les deux missions conservées
        console.log('📋 Récupération des missions conservées...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data || [];
        
        console.log(`📊 ${missions.length} missions trouvées`);
        
        // 2. Vérifier les tâches pour chaque mission
        for (const mission of missions) {
            const codeMission = mission.code_mission || mission.code || '';
            console.log(`\n🔍 Mission: ${codeMission} (ID: ${mission.id})`);
            
            try {
                // Récupérer les tâches via l'API
                const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${mission.id}/tasks`, { headers });
                const apiTasks = tasksResponse.data.data || tasksResponse.data || [];
                
                console.log(`   📋 Tâches retournées par l'API: ${apiTasks.length}`);
                apiTasks.forEach((task, index) => {
                    console.log(`     ${index + 1}. ID: ${task.id} | Description: ${task.task_libelle || task.description || 'N/A'}`);
                });
                
                // Vérifier si ces tâches existent réellement en base
                console.log(`   🔍 Vérification en base de données...`);
                for (const apiTask of apiTasks) {
                    try {
                        // Vérifier si la tâche existe dans la table tasks
                        const { query } = require('./src/utils/database');
                        const dbResult = await query('SELECT id, description FROM tasks WHERE id = $1', [apiTask.id]);
                        
                        if (dbResult.rows.length > 0) {
                            const dbTask = dbResult.rows[0];
                            console.log(`     ✅ Tâche trouvée en base: ${dbTask.description} (ID: ${dbTask.id})`);
                        } else {
                            console.log(`     ❌ Tâche NON trouvée en base: ${apiTask.task_libelle || apiTask.description} (ID: ${apiTask.id})`);
                        }
                    } catch (error) {
                        console.log(`     ❌ Erreur lors de la vérification de la tâche ${apiTask.id}:`, error.message);
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
            }
        }
        
        // 3. Afficher toutes les tâches existantes en base
        console.log('\n📋 Toutes les tâches existantes en base de données:');
        try {
            const { query } = require('./src/utils/database');
            const allTasksResult = await query('SELECT id, description FROM tasks ORDER BY description');
            
            if (allTasksResult.rows.length > 0) {
                console.log(`   📊 ${allTasksResult.rows.length} tâches trouvées:`);
                allTasksResult.rows.forEach((task, index) => {
                    console.log(`     ${index + 1}. ${task.description} (ID: ${task.id})`);
                });
            } else {
                console.log('   ❌ Aucune tâche trouvée en base de données');
            }
        } catch (error) {
            console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

checkMissionTasks(); 