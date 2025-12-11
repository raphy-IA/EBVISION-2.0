require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/time_entries_1.csv');
const BACKUP_PATH = path.resolve(__dirname, '../../backups/time_entries_backup.json');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function importTimeEntries() {
    console.log('🚀 Time Entries Migration Started...\n');
    const client = await pool.connect();

    try {
        // ========== PHASE 1: BACKUP ==========
        console.log('📦 Phase 1: Backing up existing time entries...');
        const existingEntries = await client.query('SELECT * FROM time_entries');
        fs.writeFileSync(BACKUP_PATH, JSON.stringify(existingEntries.rows, null, 2));
        console.log(`   Backed up ${existingEntries.rows.length} entries to ${BACKUP_PATH}`);

        // ========== PHASE 2: PURGE ==========
        console.log('\n🗑️ Phase 2: Purging existing time entries...');
        await client.query('DELETE FROM time_entries');
        console.log('   Purged all time_entries.');

        // ========== PHASE 3: LOAD REFERENCE DATA ==========
        console.log('\n📚 Phase 3: Loading reference data...');

        // Collaborateurs (with user_id for linking)
        const collabRes = await client.query('SELECT id, nom, prenom, email, user_id FROM collaborateurs');
        const collaborateurs = collabRes.rows;
        console.log(`   ${collaborateurs.length} collaborateurs loaded.`);

        // Users
        const usersRes = await client.query('SELECT id, email FROM users');
        const users = usersRes.rows;

        // Missions with clients
        const missionsRes = await client.query(`
            SELECT m.id, m.nom, c.nom as client_nom, c.sigle as client_sigle
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
        `);
        const missions = missionsRes.rows;
        console.log(`   ${missions.length} missions loaded.`);

        // Mission Tasks (GT)
        const missionTasksRes = await client.query(`
            SELECT mt.id as mission_task_id, mt.mission_id, mt.task_id, t.code
            FROM mission_tasks mt
            JOIN tasks t ON mt.task_id = t.id
            WHERE t.code = 'GT'
        `);
        const missionTasks = missionTasksRes.rows;
        console.log(`   ${missionTasks.length} mission tasks (GT) loaded.`);

        // Internal Activities
        const iaRes = await client.query('SELECT id, name FROM internal_activities');
        const internalActivities = iaRes.rows;
        console.log(`   ${internalActivities.length} internal activities loaded.`);

        // Timesheets (weekly structure)
        const tsRes = await client.query('SELECT id, user_id, week_start, week_end FROM time_sheets');
        let timesheets = tsRes.rows;

        // Equipes Mission (Planning)
        const eqRes = await client.query('SELECT id, mission_id, collaborateur_id FROM equipes_mission');
        let equipesDb = eqRes.rows;

        // ========== PHASE 4: READ CSV ==========
        console.log('\n📂 Phase 4: Reading CSV file...');
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8'); // Read as UTF-8
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        const header = lines[0].split(';').map(h => h.trim());
        console.log(`   Header: ${header.slice(0, 10).join(', ')}...`);
        console.log(`   ${lines.length - 1} data rows to process.`);

        // Find column indices
        const colIdx = {
            nom: header.findIndex(h => normalize(h) === 'nom'),
            email: header.findIndex(h => normalize(h) === 'email'),
            typeHeure: header.findIndex(h => normalize(h).includes('typeheure')),
            activite: header.findIndex(h => normalize(h).includes('activite') || normalize(h).includes('mission')),
            client: header.findIndex(h => normalize(h) === 'client'),
            mois: header.findIndex(h => normalize(h) === 'mois'),
            dayStart: header.findIndex(h => h === '1') // First day column
        };
        console.log(`   Column indices: nom=${colIdx.nom}, email=${colIdx.email}, typeHeure=${colIdx.typeHeure}, activite=${colIdx.activite}, client=${colIdx.client}, mois=${colIdx.mois}, dayStart=${colIdx.dayStart}`);

        // ========== PHASE 5: PROCESS & INSERT ==========
        console.log('\n⚡ Phase 5: Processing and inserting time entries...');

        let stats = {
            entriesInserted: 0,
            planningsCreated: 0,
            timesheetsCreated: 0,
            errors: 0,
            skippedRows: 0
        };

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim());

            const email = cols[colIdx.email] || '';
            const typeHeure = cols[colIdx.typeHeure] || '';
            const activiteNom = cols[colIdx.activite] || '';
            const clientNom = cols[colIdx.client] || '';
            const moisStr = cols[colIdx.mois] || '';

            if (!email || !moisStr) {
                stats.skippedRows++;
                continue;
            }

            // Parse month: "01/06/2025" -> { mois: 6, annee: 2025 }
            const moisParts = moisStr.split('/');
            if (moisParts.length < 3) {
                stats.skippedRows++;
                continue;
            }
            const mois = parseInt(moisParts[1]);
            const annee = parseInt(moisParts[2]);

            // --- Resolve Collaborateur ---
            let collab = collaborateurs.find(c => c.email && normalize(c.email) === normalize(email));
            if (!collab) {
                // Try users table
                const user = users.find(u => u.email && normalize(u.email) === normalize(email));
                if (user) {
                    collab = collaborateurs.find(c => c.user_id === user.id);
                }
            }
            if (!collab) {
                console.log(`   ⚠️ Row ${i}: Collaborator not found: ${email}`);
                stats.errors++;
                continue;
            }

            // --- Determine Type: Mission or Internal Activity ---
            const isChargeable = normalize(typeHeure).includes('chargeable') && !normalize(typeHeure).includes('non');

            let missionId = null;
            let taskId = null;
            let internalActivityId = null;

            if (isChargeable && clientNom) {
                // This is a mission
                const mission = missions.find(m =>
                    (normalize(m.nom) === normalize(activiteNom) || normalize(m.nom).includes(normalize(activiteNom).substring(0, 20))) &&
                    (normalize(m.client_nom) === normalize(clientNom) || (m.client_sigle && normalize(m.client_sigle) === normalize(clientNom)))
                );

                if (!mission) {
                    console.log(`   ⚠️ Row ${i}: Mission not found: "${activiteNom}" / ${clientNom}`);
                    stats.errors++;
                    continue;
                }

                missionId = mission.id;

                // Get GT task for this mission
                const mt = missionTasks.find(t => t.mission_id === missionId);
                if (mt) {
                    taskId = mt.task_id;
                }

                // --- Check/Create Planning ---
                const isPlanned = equipesDb.some(eq => eq.mission_id === missionId && eq.collaborateur_id === collab.id);
                if (!isPlanned) {
                    await client.query(`
                        INSERT INTO equipes_mission (mission_id, collaborateur_id, role, pourcentage_charge, date_creation)
                        VALUES ($1, $2, 'Membre', 100, NOW())
                    `, [missionId, collab.id]);
                    equipesDb.push({ mission_id: missionId, collaborateur_id: collab.id });
                    stats.planningsCreated++;
                }
            } else {
                // Internal Activity
                const ia = internalActivities.find(a => normalize(a.name) === normalize(activiteNom) || normalize(a.name).includes(normalize(activiteNom).substring(0, 15)));
                if (ia) {
                    internalActivityId = ia.id;
                } else {
                    console.log(`   ⚠️ Row ${i}: Internal activity not found: "${activiteNom}"`);
                    stats.errors++;
                    continue;
                }
            }

            // --- Insert Time Entries for each day ---
            for (let day = 1; day <= 31; day++) {
                const dayColIdx = colIdx.dayStart + (day - 1);
                if (dayColIdx >= cols.length) break;

                const heuresStr = cols[dayColIdx];
                if (!heuresStr || heuresStr.trim() === '') continue;

                const heures = parseFloat(heuresStr.replace(',', '.'));
                if (isNaN(heures) || heures <= 0) continue;

                // Calculate date
                const dateSaisie = new Date(annee, mois - 1, day);
                if (dateSaisie.getMonth() !== mois - 1) continue; // Invalid date for this month

                // Get/Create Timesheet for this week
                const weekStart = new Date(dateSaisie);
                weekStart.setDate(dateSaisie.getDate() - dateSaisie.getDay()); // Start of week (Sunday)
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

                const weekStartStr = weekStart.toISOString().split('T')[0];
                const weekEndStr = weekEnd.toISOString().split('T')[0];

                let timesheet = timesheets.find(ts =>
                    ts.user_id === collab.user_id &&
                    ts.week_start && new Date(ts.week_start).toISOString().split('T')[0] === weekStartStr
                );

                if (!timesheet && collab.user_id) {
                    const tsInsert = await client.query(`
                        INSERT INTO time_sheets (user_id, week_start, week_end, statut, created_at, updated_at)
                        VALUES ($1, $2, $3, 'sauvegardé', NOW(), NOW())
                        RETURNING id, user_id, week_start, week_end
                    `, [collab.user_id, weekStartStr, weekEndStr]);
                    timesheet = tsInsert.rows[0];
                    timesheets.push(timesheet);
                    stats.timesheetsCreated++;
                }

                if (!timesheet) continue;

                // HC requires task_id - skip if missing
                if (isChargeable && !taskId) {
                    console.log(`   ⚠️ Skipping HC entry without task for mission`);
                    continue;
                }

                await client.query(`
                    INSERT INTO time_entries (
                        time_sheet_id, user_id, date_saisie, heures, type_heures, statut,
                        mission_id, task_id, internal_activity_id, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, 'sauvegardé', $6, $7, $8, NOW(), NOW())
                `, [
                    timesheet.id,
                    collab.user_id,
                    dateSaisie.toISOString().split('T')[0],
                    heures,
                    isChargeable ? 'HC' : 'HNC',
                    missionId,
                    taskId,
                    internalActivityId
                ]);
                stats.entriesInserted++;
            }

            if (i % 100 === 0) {
                console.log(`   Processed ${i}/${lines.length - 1} rows...`);
            }
        }

        // ========== RESULTS ==========
        console.log('\n✅ Migration Complete!');
        console.log('========================');
        console.log(`Time Entries Inserted: ${stats.entriesInserted}`);
        console.log(`Plannings Created: ${stats.planningsCreated}`);
        console.log(`Timesheets Created: ${stats.timesheetsCreated}`);
        console.log(`Rows Skipped: ${stats.skippedRows}`);
        console.log(`Errors: ${stats.errors}`);
        console.log('========================');

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

importTimeEntries();
