const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function diagnose() {
    try {
        const missionId = '88df136e-3dac-402b-843a-94822a3dea67';
        console.log(`--- ANALYSE POUR LA MISSION ${missionId} ---`);

        // 1. Récupérer les entrées pour cette mission
        const entriesRes = await pool.query(`
            SELECT 
                te.id, 
                te.date_saisie, 
                te.heures, 
                te.task_id, 
                ts.status as sheet_status,
                ts.id as sheet_id,
                ts.user_id
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.mission_id = $1
            ORDER BY te.created_at DESC
        `, [missionId]);

        const output = {
            entries: entriesRes.rows,
            analysis: []
        };

        console.log(`1. Entrées trouvées pour la mission (${entriesRes.rows.length})`);

        if (entriesRes.rows.length > 0) {
            const taskId = entriesRes.rows[0].task_id;
            const userId = entriesRes.rows[0].user_id;

            output.analysis.push(`Vérification du Task ID: ${taskId}`);

            const genericRes = await pool.query('SELECT id, libelle FROM tasks WHERE id = $1', [taskId]);
            const missionTaskRes = await pool.query('SELECT id FROM mission_tasks WHERE id = $1', [taskId]);

            if (genericRes.rows.length > 0) {
                output.analysis.push('✅ C\'est une TÂCHE GÉNÉRIQUE');
                output.analysis.push(genericRes.rows[0]);
            } else {
                output.analysis.push('❌ Ce n\'est PAS une tâche générique');
            }

            if (missionTaskRes.rows.length > 0) {
                output.analysis.push('✅ C\'est une TÂCHE DE MISSION');
            } else {
                output.analysis.push('❌ Ce n\'est PAS une tâche de mission');
            }

            // 3. Vérifier les feuilles de temps de l'utilisateur
            const sheetsRes = await pool.query(`
                SELECT id, start_date, end_date, status 
                FROM time_sheets 
                WHERE user_id = $1 
                ORDER BY start_date DESC
                LIMIT 5
            `, [userId]);

            output.user_sheets = sheetsRes.rows;
        }

        fs.writeFileSync('diagnose_output.json', JSON.stringify(output, null, 2));
        console.log('Résultat écrit dans diagnose_output.json');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
