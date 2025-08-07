const { Pool } = require('pg');

// Configuration de la base de données (sans mot de passe)
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: ''
});

async function checkDatabaseContent() {
    try {
        console.log('🔍 Vérification du contenu de la base de données...\n');
        
        // Vérifier les feuilles de temps
        console.log('📋 FEUILLES DE TEMPS:');
        const timeSheetsQuery = `
            SELECT 
                id,
                user_id,
                week_start,
                week_end,
                statut,
                created_at,
                updated_at
            FROM time_sheets 
            ORDER BY week_start DESC 
            LIMIT 10
        `;
        const timeSheetsResult = await pool.query(timeSheetsQuery);
        console.log(`✅ ${timeSheetsResult.rows.length} feuilles de temps trouvées:`);
        timeSheetsResult.rows.forEach((sheet, index) => {
            console.log(`  ${index + 1}. ID: ${sheet.id}`);
            console.log(`     User: ${sheet.user_id}`);
            console.log(`     Semaine: ${sheet.week_start} à ${sheet.week_end}`);
            console.log(`     Statut: ${sheet.statut}`);
            console.log(`     Créé: ${sheet.created_at}`);
            console.log('');
        });
        
        // Vérifier les entrées de temps
        console.log('⏰ ENTREES DE TEMPS:');
        const timeEntriesQuery = `
            SELECT 
                te.id,
                te.time_sheet_id,
                te.user_id,
                te.date_saisie,
                te.heures,
                te.type_heures,
                te.mission_id,
                te.task_id,
                te.internal_activity_id,
                te.description,
                te.created_at,
                m.nom as mission_nom,
                t.description as task_nom,
                ia.description as activity_nom
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            ORDER BY te.date_saisie DESC, te.created_at DESC
            LIMIT 20
        `;
        const timeEntriesResult = await pool.query(timeEntriesQuery);
        console.log(`✅ ${timeEntriesResult.rows.length} entrées de temps trouvées:`);
        timeEntriesResult.rows.forEach((entry, index) => {
            console.log(`  ${index + 1}. ID: ${entry.id}`);
            console.log(`     Time Sheet: ${entry.time_sheet_id}`);
            console.log(`     User: ${entry.user_id}`);
            console.log(`     Date: ${entry.date_saisie}`);
            console.log(`     Heures: ${entry.heures}`);
            console.log(`     Type: ${entry.type_heures}`);
            console.log(`     Mission: ${entry.mission_nom || entry.mission_id || 'N/A'}`);
            console.log(`     Tâche: ${entry.task_nom || entry.task_id || 'N/A'}`);
            console.log(`     Activité: ${entry.activity_nom || entry.internal_activity_id || 'N/A'}`);
            console.log(`     Description: ${entry.description}`);
            console.log(`     Créé: ${entry.created_at}`);
            console.log('');
        });
        
        // Vérifier les missions disponibles
        console.log('🎯 MISSIONS DISPONIBLES:');
        const missionsQuery = `SELECT id, nom FROM missions LIMIT 5`;
        const missionsResult = await pool.query(missionsQuery);
        console.log(`✅ ${missionsResult.rows.length} missions trouvées:`);
        missionsResult.rows.forEach((mission, index) => {
            console.log(`  ${index + 1}. ${mission.nom} (ID: ${mission.id})`);
        });
        console.log('');
        
        // Vérifier les activités internes disponibles
        console.log('🏢 ACTIVITES INTERNES DISPONIBLES:');
        const activitiesQuery = `SELECT id, description FROM internal_activities LIMIT 5`;
        const activitiesResult = await pool.query(activitiesQuery);
        console.log(`✅ ${activitiesResult.rows.length} activités internes trouvées:`);
        activitiesResult.rows.forEach((activity, index) => {
            console.log(`  ${index + 1}. ${activity.description} (ID: ${activity.id})`);
        });
        console.log('');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification de la base de données:', error);
    } finally {
        await pool.end();
    }
}

checkDatabaseContent(); 