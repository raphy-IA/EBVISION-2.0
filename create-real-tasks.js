const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function createRealTasks() {
    try {
        console.log('🔧 Création de vraies tâches en base de données...\n');
        
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // 1. Récupérer les missions
        console.log('📋 Récupération des missions...');
        const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
        const missions = missionsResponse.data.data || missionsResponse.data;
        
        console.log(`✅ ${missions.length} missions trouvées\n`);
        
        // 2. Créer des tâches pour les premières missions
        const tasksToCreate = [
            {
                missionId: missions[0].id,
                description: 'Audit des comptes',
                task_libelle: 'Audit des comptes'
            },
            {
                missionId: missions[0].id,
                description: 'Analyse des risques',
                task_libelle: 'Analyse des risques'
            },
            {
                missionId: missions[3].id, // Audit Financier Client Test 1
                description: 'Conseil en stratégie',
                task_libelle: 'Conseil en stratégie'
            },
            {
                missionId: missions[3].id,
                description: 'Validation comptes',
                task_libelle: 'Validation comptes'
            }
        ];
        
        console.log('📋 Création des tâches...');
        
        for (const taskData of tasksToCreate) {
            try {
                const { query } = require('./src/utils/database');
                
                // Vérifier si la tâche existe déjà
                const existingTask = await query('SELECT id FROM tasks WHERE description = $1 AND mission_id = $2', 
                    [taskData.description, taskData.missionId]);
                
                if (existingTask.rows.length > 0) {
                    console.log(`   ⚠️ Tâche "${taskData.description}" existe déjà pour la mission ${taskData.missionId}`);
                    continue;
                }
                
                // Créer la tâche
                const insertResult = await query(`
                    INSERT INTO tasks (id, description, task_libelle, mission_id, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                    RETURNING id, description
                `, [taskData.description, taskData.task_libelle, taskData.missionId]);
                
                const newTask = insertResult.rows[0];
                console.log(`   ✅ Tâche créée: ${newTask.description} (ID: ${newTask.id})`);
                
            } catch (error) {
                console.log(`   ❌ Erreur lors de la création de la tâche "${taskData.description}":`, error.message);
            }
        }
        
        // 3. Vérifier les tâches créées
        console.log('\n🔍 Vérification des tâches créées...');
        try {
            const { query } = require('./src/utils/database');
            const allTasksResult = await query('SELECT id, description, mission_id FROM tasks ORDER BY description');
            
            if (allTasksResult.rows.length > 0) {
                console.log(`✅ ${allTasksResult.rows.length} tâches trouvées en base:`);
                allTasksResult.rows.forEach((task, index) => {
                    console.log(`  ${index + 1}. ID: ${task.id} | Description: ${task.description} | Mission: ${task.mission_id}`);
                });
            } else {
                console.log('❌ Aucune tâche trouvée en base de données');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

createRealTasks(); 