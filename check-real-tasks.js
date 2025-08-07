const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkRealTasks() {
    try {
        console.log('🔍 Vérification des vraies tâches en base de données...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // Récupérer toutes les missions
        console.log('📋 Récupération de toutes les missions...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || [];
        
        console.log(`✅ ${missions.length} missions trouvées\n`);
        
        // Pour chaque mission, vérifier ses tâches
        for (const mission of missions) {
            console.log(`🎯 MISSION: ${mission.nom} (ID: ${mission.id})`);
            
            try {
                const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${mission.id}/tasks`, { headers });
                const tasks = tasksResponse.data.data || [];
                
                if (tasks.length === 0) {
                    console.log('   ⚠️ Aucune tâche trouvée pour cette mission');
                } else {
                    console.log(`   ✅ ${tasks.length} tâche(s) trouvée(s):`);
                    tasks.forEach((task, index) => {
                        console.log(`     ${index + 1}. ID: ${task.id} | Description: ${task.description || 'Sans description'}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Erreur lors de la récupération des tâches:`, error.response?.data || error.message);
            }
            
            console.log('');
        }
        
        // Test avec une tâche valide si elle existe
        if (missions.length > 0) {
            const firstMission = missions[0];
            const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${firstMission.id}/tasks`, { headers });
            const tasks = tasksResponse.data.data || [];
            
            if (tasks.length > 0) {
                const validTask = tasks[0];
                console.log('🧪 Test avec une tâche valide...');
                console.log(`Tâche valide: ${validTask.description || 'Sans description'} (ID: ${validTask.id})`);
                
                // Test d'enregistrement avec cette tâche valide
                const timeEntryData = {
                    time_sheet_id: '0b07496c-c033-40fe-be71-a08b035455f6',
                    date_saisie: '2025-08-04',
                    heures: 4.5,
                    mission_id: firstMission.id,
                    task_id: validTask.id,
                    description: 'Test avec tâche valide',
                    type_heures: 'chargeable'
                };
                
                try {
                    const createResponse = await axios.post(`${API_BASE_URL}/time-entries`, timeEntryData, { headers });
                    if (createResponse.data.success) {
                        console.log('✅ Heures chargeables enregistrées avec succès avec une tâche valide!');
                    } else {
                        console.log('❌ Erreur:', createResponse.data);
                    }
                } catch (error) {
                    console.log('❌ Erreur lors du test:', error.response?.data || error.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

checkRealTasks(); 