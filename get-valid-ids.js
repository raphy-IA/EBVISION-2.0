const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function getValidIds() {
    try {
        console.log('🔍 Récupération des IDs valides...\n');

        // 1. Récupérer une feuille de temps existante
        console.log('📋 1. Feuilles de temps existantes:');
        const timeSheetsResult = await pool.query(`
            SELECT id, week_start, week_end, status, user_id
            FROM time_sheets
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        console.log('Feuilles de temps:');
        timeSheetsResult.rows.forEach(sheet => {
            console.log(`  - ID: ${sheet.id}, Semaine: ${sheet.week_start} au ${sheet.week_end}, Status: ${sheet.status}, User: ${sheet.user_id}`);
        });

        // 2. Récupérer des missions existantes
        console.log('\n📋 2. Missions existantes:');
        const missionsResult = await pool.query(`
            SELECT id, nom, statut
            FROM missions
            WHERE statut = 'ACTIF'
            LIMIT 3
        `);
        
        console.log('Missions actives:');
        missionsResult.rows.forEach(mission => {
            console.log(`  - ID: ${mission.id}, Nom: ${mission.nom}, Statut: ${mission.statut}`);
        });

        // 3. Récupérer des tâches existantes
        console.log('\n📋 3. Tâches existantes:');
        const tasksResult = await pool.query(`
            SELECT id, description, mission_id
            FROM tasks
            LIMIT 3
        `);
        
        console.log('Tâches:');
        tasksResult.rows.forEach(task => {
            console.log(`  - ID: ${task.id}, Description: ${task.description}, Mission: ${task.mission_id}`);
        });

        // 4. Récupérer des activités internes existantes
        console.log('\n📋 4. Activités internes existantes:');
        const activitiesResult = await pool.query(`
            SELECT id, description, business_unit_id
            FROM internal_activities
            LIMIT 3
        `);
        
        console.log('Activités internes:');
        activitiesResult.rows.forEach(activity => {
            console.log(`  - ID: ${activity.id}, Description: ${activity.description}, Business Unit: ${activity.business_unit_id}`);
        });

        // 5. Générer un exemple de test avec des IDs valides
        if (timeSheetsResult.rows.length > 0 && missionsResult.rows.length > 0 && tasksResult.rows.length > 0) {
            console.log('\n📋 5. Exemple de test avec des IDs valides:');
            const timeSheet = timeSheetsResult.rows[0];
            const mission = missionsResult.rows[0];
            const task = tasksResult.rows[0];
            
            console.log('Test HC (Heures Chargeables):');
            console.log(`{
  time_sheet_id: '${timeSheet.id}',
  user_id: '${timeSheet.user_id}',
  date_saisie: '${timeSheet.week_start}',
  heures: 1.0,
  type_heures: 'HC',
  mission_id: '${mission.id}',
  task_id: '${task.id}',
  internal_activity_id: null
}`);

            if (activitiesResult.rows.length > 0) {
                const activity = activitiesResult.rows[0];
                console.log('\nTest HNC (Heures Non Chargeables):');
                console.log(`{
  time_sheet_id: '${timeSheet.id}',
  user_id: '${timeSheet.user_id}',
  date_saisie: '${timeSheet.week_start}',
  heures: 1.0,
  type_heures: 'HNC',
  mission_id: null,
  task_id: null,
  internal_activity_id: '${activity.id}'
}`);
            }
        }

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des IDs:', error);
    } finally {
        await pool.end();
    }
}

getValidIds();
