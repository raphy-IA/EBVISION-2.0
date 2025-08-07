const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function verifyTaskExists() {
    try {
        console.log('🔍 Vérification de l\'existence de la tâche...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        const taskId = 'd7100266-4f72-4f8f-b950-f87578a4d419';
        console.log(`📋 Vérification de la tâche: ${taskId}`);
        
        // 1. Vérifier via l'API des tâches d'une mission
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        console.log(`\n📋 Récupération des tâches de la mission: ${missionId}`);
        
        const tasksResponse = await axios.get(`${API_BASE_URL}/missions/${missionId}/tasks`, { headers });
        const tasks = tasksResponse.data.data || tasksResponse.data;
        
        console.log(`✅ ${tasks.length} tâches trouvées:`);
        tasks.forEach((task, index) => {
            console.log(`  ${index + 1}. ID: ${task.id} | Description: ${task.description || task.task_libelle || 'Sans description'}`);
        });
        
        // 2. Vérifier si notre tâche est dans la liste
        const targetTask = tasks.find(task => task.id === taskId);
        if (targetTask) {
            console.log(`\n✅ Tâche trouvée dans l'API: ${targetTask.description || targetTask.task_libelle || 'Sans description'}`);
        } else {
            console.log(`\n❌ Tâche ${taskId} non trouvée dans l'API`);
        }
        
        // 3. Tester une requête directe à la base de données via une API
        console.log('\n📋 Test de requête directe...');
        try {
            // Créer une route temporaire pour tester
            const testResponse = await axios.get(`${API_BASE_URL}/tasks/${taskId}`, { headers });
            console.log('✅ Tâche trouvée via requête directe:', testResponse.data);
        } catch (error) {
            console.log('❌ Erreur lors de la requête directe:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

verifyTaskExists(); 