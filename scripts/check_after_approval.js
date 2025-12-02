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

async function checkAfterApproval() {
    try {
        const sheetId = 'b2b2edb5-78b1-4a9a-867a-13bc279fc559';
        const missionId = '88df136e-3dac-402b-843a-94822a3dea67';

        console.log('--- VÉRIFICATION APRÈS VALIDATION ---');

        // 1. Vérifier le statut de la feuille
        const sheetRes = await pool.query(`
            SELECT id, status, week_start, week_end
            FROM time_sheets
            WHERE id = $1
        `, [sheetId]);

        console.log('\n1. Statut de la feuille de temps:');
        console.log(JSON.stringify(sheetRes.rows, null, 2));

        // 2. Vérifier les entrées liées à cette feuille
        const entriesRes = await pool.query(`
            SELECT te.id, te.heures, te.task_id, te.date_saisie, ts.status
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.time_sheet_id = $1 OR (
                te.user_id = (SELECT user_id FROM time_sheets WHERE id = $1)
                AND te.date_saisie BETWEEN (SELECT week_start FROM time_sheets WHERE id = $1) 
                AND (SELECT week_end FROM time_sheets WHERE id = $1)
            )
        `, [sheetId]);

        console.log('\n2. Entrées de temps pour cette feuille:');
        console.log(JSON.stringify(entriesRes.rows, null, 2));

        // 3. Tester la requête SQL exacte utilisée par l'API
        const apiQuery = `
            SELECT 
                mt.id as mission_task_id,
                t.libelle,
                -- Heures validées (approved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.status ILIKE 'approved'),
                    0
                ) as heures_validees,
                -- Heures saisies (submitted + saved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.status ILIKE 'submitted' OR ts.status ILIKE 'saved')),
                    0
                ) as heures_saisies
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
        `;

        const apiRes = await pool.query(apiQuery, [missionId]);

        console.log('\n3. Résultat de la requête API:');
        console.log(JSON.stringify(apiRes.rows, null, 2));

        const output = {
            sheet_status: sheetRes.rows[0],
            entries: entriesRes.rows,
            api_result: apiRes.rows
        };

        fs.writeFileSync('after_approval_diagnostic.json', JSON.stringify(output, null, 2));
        console.log('\nRésultat écrit dans after_approval_diagnostic.json');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

checkAfterApproval();
