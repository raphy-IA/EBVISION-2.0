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

async function checkApprovedHours() {
    try {
        const missionId = '88df136e-3dac-402b-843a-94822a3dea67';
        console.log(`--- VÉRIFICATION DES HEURES VALIDÉES POUR LA MISSION ${missionId} ---`);

        // 1. Vérifier toutes les feuilles de temps avec leurs entrées pour cette mission
        const res = await pool.query(`
            SELECT 
                ts.id as sheet_id,
                ts.status as sheet_status,
                ts.week_start,
                ts.week_end,
                te.id as entry_id,
                te.date_saisie,
                te.heures,
                te.task_id,
                t.libelle as task_name
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            LEFT JOIN tasks t ON te.task_id = t.id
            WHERE te.mission_id = $1
            ORDER BY ts.status, te.date_saisie
        `, [missionId]);

        const output = {
            mission_id: missionId,
            total_entries: res.rows.length,
            by_status: {},
            entries: res.rows
        };

        // Grouper par statut
        res.rows.forEach(row => {
            if (!output.by_status[row.sheet_status]) {
                output.by_status[row.sheet_status] = {
                    count: 0,
                    total_hours: 0
                };
            }
            output.by_status[row.sheet_status].count++;
            output.by_status[row.sheet_status].total_hours += parseFloat(row.heures);
        });

        console.log('\nRésumé par statut:');
        console.log(JSON.stringify(output.by_status, null, 2));

        // 2. Vérifier ce que retourne l'API /tasks
        console.log('\n--- Test de la requête SQL utilisée par l\'API ---');

        const apiTestQuery = `
            SELECT 
                mt.id as mission_task_id,
                t.libelle,
                -- Heures saisies (submitted + saved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.status ILIKE 'submitted' OR ts.status ILIKE 'saved')),
                    0
                ) as heures_saisies,
                -- Heures validées (approved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.status ILIKE 'approved'),
                    0
                ) as heures_validees
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
        `;

        const apiTest = await pool.query(apiTestQuery, [missionId]);
        output.api_result = apiTest.rows;

        console.log('\nRésultat de la requête API:');
        console.log(JSON.stringify(apiTest.rows, null, 2));

        fs.writeFileSync('approved_hours_diagnostic.json', JSON.stringify(output, null, 2));
        console.log('\nRésultat complet écrit dans approved_hours_diagnostic.json');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

checkApprovedHours();
