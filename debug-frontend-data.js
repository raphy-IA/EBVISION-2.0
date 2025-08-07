const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function debugFrontendData() {
    try {
        console.log('🔍 Débogage des données du frontend...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer les missions comme le frontend
        console.log('📋 Récupération des missions (comme le frontend)...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data;
        
        console.log(`✅ ${missions.length} missions trouvées:`);
        missions.forEach((mission, index) => {
            console.log(`  ${index + 1}. ${mission.nom} (ID: ${mission.id})`);
        });
        
        // 2. Pour la première mission, récupérer ses tâches
        if (missions.length > 0) {
            const firstMission = missions[0];
            console.log(`\n📋 Récupération des tâches pour la mission: ${firstMission.nom}`);
            
            const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${firstMission.id}/tasks`, { headers });
            const tasks = tasksResponse.data.data || tasksResponse.data;
            
            console.log(`✅ ${tasks.length} tâches trouvées:`);
            tasks.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id} | Description: ${task.description || task.task_libelle || 'Sans description'}`);
            });
            
            // 3. Simuler ce que fait le frontend
            console.log('\n🧪 Simulation du comportement du frontend...');
            
            if (tasks.length > 0) {
                const selectedTask = tasks[0];
                console.log(`Tâche sélectionnée: ${selectedTask.description || selectedTask.task_libelle || 'Sans description'} (ID: ${selectedTask.id})`);
                
                // Simuler la création d'un objet task comme dans addChargeableRow
                const frontendTask = selectedTask.id ? { 
                    id: selectedTask.id, 
                    task_libelle: `Tâche ${selectedTask.id}` 
                } : null;
                
                console.log('Objet task créé par le frontend:', frontendTask);
                
                // 4. Tester l'enregistrement avec cette tâche
                console.log('\n💾 Test d\'enregistrement avec la tâche sélectionnée...');
                const timeEntryData = {
                    time_sheet_id: '0b07496c-c033-40fe-be71-a08b035455f6',
                    date_saisie: '2025-08-04',
                    heures: 4.5,
                    mission_id: firstMission.id,
                    task_id: selectedTask.id,
                    description: 'Test avec tâche sélectionnée',
                    type_heures: 'chargeable'
                };
                
                console.log('📤 Données envoyées:', JSON.stringify(timeEntryData, null, 2));
                
                try {
                    const createResponse = await axios.post(`${API_BASE_URL}/time-entries`, timeEntryData, { headers });
                    if (createResponse.data.success) {
                        console.log('✅ Heures chargeables enregistrées avec succès!');
                        console.log('📊 Réponse:', JSON.stringify(createResponse.data, null, 2));
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

debugFrontendData(); 