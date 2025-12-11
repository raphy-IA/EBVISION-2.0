require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/time_entries_1.csv');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function importSEIACTimeEntries() {
    console.log('Importing Time Entries for SEIAC Mission...\n');
    const client = await pool.connect();

    try {
        // 1. Find the client (now corrected)
        const clientRes = await client.query(`
            SELECT id, nom FROM clients 
            WHERE nom ILIKE '%Exploitation%Industrielle%Agricole%'
               OR sigle = 'SEIAC'
        `);

        if (clientRes.rows.length === 0) {
            console.log('ERROR: Client SEIAC not found!');
            return;
        }

        const seiacClient = clientRes.rows[0];
        console.log('Found client:', seiacClient.nom);

        // 2. Find or create the mission
        let missionRes = await client.query(`
            SELECT id, nom FROM missions 
            WHERE client_id = $1 
              AND nom ILIKE '%financement%'
        `, [seiacClient.id]);

        let missionId;
        if (missionRes.rows.length === 0) {
            // Get EXFIN EOLIS BU
            const buRes = await client.query("SELECT id FROM business_units WHERE nom ILIKE '%EXFIN%' OR code ILIKE '%EXFIN%' OR nom ILIKE '%EOLIS%'");
            const buId = buRes.rows.length > 0 ? buRes.rows[0].id : null;

            // Create mission
            const createRes = await client.query(`
                INSERT INTO missions (
                    nom, client_id, business_unit_id, type_mission, statut, priorite,
                    date_debut, date_fin, created_at, updated_at
                ) VALUES (
                    'Assistance à recherche de financement',
                    $1, $2, 'PREVIOUS ENGAGEMENT', 'EN_COURS', 'MOYENNE',
                    '2025-01-01', '2025-12-31', NOW(), NOW()
                ) RETURNING id, nom
            `, [seiacClient.id, buId]);
            missionId = createRes.rows[0].id;
            console.log('Created mission:', createRes.rows[0].nom);

            // Create GT task for mission
            const gtTask = await client.query("SELECT id FROM tasks WHERE code = 'GT' LIMIT 1");
            if (gtTask.rows.length > 0) {
                await client.query(`
                    INSERT INTO mission_tasks (mission_id, task_id, statut, created_at)
                    VALUES ($1, $2, 'EN_COURS', NOW())
                `, [missionId, gtTask.rows[0].id]);
                console.log('Linked GT task to mission');
            }
        } else {
            missionId = missionRes.rows[0].id;
            console.log('Found mission:', missionRes.rows[0].nom);
        }

        // 3. Find collaborators
        const collaborators = ['ltchako@eb-partnersgroup.cm', 'sngomsu@eb-partnersgroup.cm'];
        const collabData = [];

        for (const email of collaborators) {
            const res = await client.query(`
                SELECT c.id, c.nom, c.prenom, c.user_id
                FROM collaborateurs c
                WHERE c.email = $1
            `, [email]);
            if (res.rows.length > 0) {
                collabData.push(res.rows[0]);
                console.log('Found collaborator:', res.rows[0].prenom, res.rows[0].nom);
            }
        }

        // 4. Add to equipes_mission
        for (const collab of collabData) {
            const existing = await client.query(`
                SELECT id FROM equipes_mission 
                WHERE mission_id = $1 AND collaborateur_id = $2
            `, [missionId, collab.id]);

            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO equipes_mission (mission_id, collaborateur_id, role, pourcentage_charge, date_creation)
                    VALUES ($1, $2, 'Membre', 100, NOW())
                `, [missionId, collab.id]);
                console.log('Added', collab.prenom, collab.nom, 'to mission team');
            } else {
                console.log(collab.prenom, collab.nom, 'already in team');
            }
        }

        // 5. Get GT task_id for this mission
        const taskRes = await client.query(`
            SELECT mt.task_id FROM mission_tasks mt
            JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1 AND t.code = 'GT'
        `, [missionId]);
        const taskId = taskRes.rows.length > 0 ? taskRes.rows[0].task_id : null;

        // 6. Read CSV and import time entries
        console.log('\n--- Importing Time Entries from CSV ---');
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        const header = lines[0].split(';').map(h => h.trim());
        const colIdx = {
            email: header.findIndex(h => h.toLowerCase() === 'email'),
            activite: header.findIndex(h => h.toLowerCase().includes('mission') || h.toLowerCase().includes('activit')),
            client: header.findIndex(h => h.toLowerCase() === 'client'),
            mois: header.findIndex(h => h.toLowerCase() === 'mois'),
            dayStart: header.findIndex(h => h === '1')
        };

        // Get timesheets
        const tsRes = await client.query('SELECT id, user_id, week_start, week_end FROM time_sheets');
        let timesheets = tsRes.rows;

        let entriesInserted = 0;

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim());
            const email = cols[colIdx.email];
            const activite = cols[colIdx.activite];
            const clientName = cols[colIdx.client];
            const moisStr = cols[colIdx.mois];

            // Only process SEIAC entries for our collaborators
            if (!collaborators.includes(email)) continue;
            if (!normalize(clientName).includes('agricole') && !normalize(clientName).includes('seiac')) continue;
            if (!normalize(activite).includes('financement')) continue;

            // Parse month
            const moisParts = moisStr.split('/');
            if (moisParts.length < 3) continue;
            const mois = parseInt(moisParts[1]);
            const annee = parseInt(moisParts[2]);

            const collab = collabData.find(c =>
                collaborators.includes(email) &&
                (c.prenom.toLowerCase().includes('leopold') || c.prenom.toLowerCase().includes('salome'))
            ) || collabData.find(c => {
                const cEmail = collaborators.find(e => e.includes(c.nom.toLowerCase().substring(0, 5)));
                return cEmail === email;
            });

            if (!collab || !collab.user_id) continue;

            // Process each day
            for (let day = 1; day <= 31; day++) {
                const dayColIdx = colIdx.dayStart + (day - 1);
                if (dayColIdx >= cols.length) break;

                const heuresStr = cols[dayColIdx];
                if (!heuresStr || heuresStr.trim() === '') continue;

                const heures = parseFloat(heuresStr.replace(',', '.'));
                if (isNaN(heures) || heures <= 0) continue;

                const dateSaisie = new Date(annee, mois - 1, day);
                if (dateSaisie.getMonth() !== mois - 1) continue;

                // Get/Create Timesheet
                const weekStart = new Date(dateSaisie);
                weekStart.setDate(dateSaisie.getDate() - dateSaisie.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const weekStartStr = weekStart.toISOString().split('T')[0];
                const weekEndStr = weekEnd.toISOString().split('T')[0];

                let timesheet = timesheets.find(ts =>
                    ts.user_id === collab.user_id &&
                    ts.week_start && new Date(ts.week_start).toISOString().split('T')[0] === weekStartStr
                );

                if (!timesheet) {
                    const tsInsert = await client.query(`
                        INSERT INTO time_sheets (user_id, week_start, week_end, statut, created_at, updated_at)
                        VALUES ($1, $2, $3, 'sauvegardé', NOW(), NOW())
                        RETURNING id, user_id, week_start, week_end
                    `, [collab.user_id, weekStartStr, weekEndStr]);
                    timesheet = tsInsert.rows[0];
                    timesheets.push(timesheet);
                }

                // Check if entry already exists
                const existingEntry = await client.query(`
                    SELECT id FROM time_entries 
                    WHERE user_id = $1 AND date_saisie = $2 AND mission_id = $3
                `, [collab.user_id, dateSaisie.toISOString().split('T')[0], missionId]);

                if (existingEntry.rows.length === 0) {
                    await client.query(`
                        INSERT INTO time_entries (
                            time_sheet_id, user_id, date_saisie, heures, type_heures, statut,
                            mission_id, task_id, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, 'HC', 'sauvegardé', $5, $6, NOW(), NOW())
                    `, [
                        timesheet.id,
                        collab.user_id,
                        dateSaisie.toISOString().split('T')[0],
                        heures,
                        missionId,
                        taskId
                    ]);
                    entriesInserted++;
                }
            }
        }

        console.log('\n✅ Done! Entries inserted:', entriesInserted);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

importSEIACTimeEntries();
