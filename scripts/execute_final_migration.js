require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const DATA_DIR = path.join(__dirname, 'migration_data');
const FILES = {
    CLIENTS: path.join(DATA_DIR, '01_clients.json'),
    TYPES: path.join(DATA_DIR, '02_mission_types.json'),
    ACTIVITIES: path.join(DATA_DIR, '03_internal_activities.json'),
    MISSIONS: path.join(DATA_DIR, '04_missions.json'),
    TASKS: path.join(DATA_DIR, '05_tasks.json'),
    TIMESHEETS: path.join(DATA_DIR, '06_timesheets.json'),
};

function isValidDate(dateString) {
    if (!dateString) return false;
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;
    const d = new Date(dateString);
    const dNum = d.getTime();
    if (!dNum && dNum !== 0) return false;
    return d.toISOString().slice(0, 10) === dateString;
}

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting Final Migration...");
        await client.query('BEGIN');

        console.log("   Cleaning existing data...");
        await client.query("TRUNCATE time_entries, time_sheets, mission_tasks, tasks, missions, internal_activities, bu_internal_activities, mission_types, clients CASCADE");


        // 1. Clients
        const clientsData = JSON.parse(fs.readFileSync(FILES.CLIENTS));
        const clientNameMap = new Map();
        for (const c of clientsData) {
            const res = await client.query("SELECT id FROM clients WHERE nom = $1", [c.nom]);
            let id = res.rows[0]?.id;
            if (!id) {
                const ins = await client.query(
                    "INSERT INTO clients (nom, sigle, secteur_activite, pays, statut) VALUES ($1, $2, $3, $4, 'ACTIF') RETURNING id",
                    [c.nom, c.sigle, c.secteur_activite, c.pays]
                );
                id = ins.rows[0].id;
            }
            clientNameMap.set(c.nom.toLowerCase(), id);
        }

        // 2. Types
        const typesData = JSON.parse(fs.readFileSync(FILES.TYPES));
        for (const t of typesData) {
            const res = await client.query("SELECT id FROM mission_types WHERE libelle = $1", [t.libelle]);
            if (res.rowCount === 0) {
                await client.query("INSERT INTO mission_types (libelle, description, actif, codification) VALUES ($1, $2, $3, 'PE')", [t.libelle, t.description, t.actif]);
            }
        }
        const typeRes = await client.query("SELECT id FROM mission_types WHERE libelle = 'PREVIOUS ENGAGEMENT'");
        const missionTypeId = typeRes.rows[0].id;

        // 3. Activities
        const actsData = JSON.parse(fs.readFileSync(FILES.ACTIVITIES));
        const activityMap = new Map();
        const buRes = await client.query("SELECT id FROM business_units");
        const buIds = buRes.rows.map(r => r.id);
        for (const a of actsData) {
            const res = await client.query("SELECT id FROM internal_activities WHERE code = $1", [a.code]);
            let id = res.rows[0]?.id;
            if (!id) {
                const ins = await client.query("INSERT INTO internal_activities (name, description, code, is_active) VALUES ($1, $2, $3, $4) RETURNING id", [a.libelle, a.description, a.code, a.actif]);
                id = ins.rows[0].id;
            }
            activityMap.set(a.code, id);
            for (const buId of buIds) {
                const linkRes = await client.query("SELECT 1 FROM bu_internal_activities WHERE business_unit_id = $1 AND internal_activity_id = $2", [buId, id]);
                if (linkRes.rowCount === 0) {
                    await client.query("INSERT INTO bu_internal_activities (business_unit_id, internal_activity_id) VALUES ($1, $2)", [buId, id]);
                }
            }
        }

        // 4. Missions
        const missionsData = JSON.parse(fs.readFileSync(FILES.MISSIONS));
        const missionIdMap = new Map();
        const buNameMap = new Map();
        (await client.query("SELECT id, nom FROM business_units")).rows.forEach(r => buNameMap.set(r.nom.trim(), r.id));
        const userMap = new Map();
        (await client.query("SELECT id, nom, prenom FROM collaborateurs")).rows.forEach(r => {
            userMap.set(`${r.nom} ${r.prenom}`.toLowerCase(), r.id);
            userMap.set(`${r.prenom} ${r.nom}`.toLowerCase(), r.id);
            if (r.nom) userMap.set(r.nom.toLowerCase(), r.id);
        });

        for (const m of missionsData) {
            const clientId = clientNameMap.get(m.client_nom.toLowerCase());
            const buId = buNameMap.get(m.bu_nom.trim()) || buNameMap.get("Direction Générale");
            const respId = userMap.get((m.responsable_nom || '').toLowerCase());
            const managerId = userMap.get((m.manager_nom || '').toLowerCase());
            const associeId = userMap.get((m.associe_nom || '').toLowerCase());

            const ins = await client.query(
                `INSERT INTO missions (code, nom, description, date_debut, date_fin, statut, client_id, business_unit_id, mission_type_id, fiscal_year_id, collaborateur_id, manager_id, associe_id, conditions_paiement) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
                [m.code, m.nom, m.description, m.date_debut, m.date_fin, m.statut, clientId, buId, missionTypeId, m.fiscal_year_id, respId, managerId, associeId, m.conditions_paiement]
            );
            missionIdMap.set(m.code, ins.rows[0].id);
        }

        // 5. Tasks
        const tasksData = JSON.parse(fs.readFileSync(FILES.TASKS));
        const taskIdMap = new Map();
        let genericTaskId;
        const taskRes = await client.query("SELECT id FROM tasks WHERE code = 'GT'");
        if (taskRes.rowCount > 0) {
            genericTaskId = taskRes.rows[0].id;
            console.log("Using Generic Task: GT");
        } else {
            console.log("Creating Generic Task 'GT'...");
            const ins = await client.query("INSERT INTO tasks (code, libelle, description, actif) VALUES ('GT', 'Task', 'Def', true) RETURNING id");
            genericTaskId = ins.rows[0].id;
        }

        for (const t of tasksData) {
            const mId = missionIdMap.get(t.mission_code);
            if (!mId) continue;
            // Link mission to Generic Task
            const checkLink = await client.query("SELECT id FROM mission_tasks WHERE mission_id = $1 AND task_id = $2", [mId, genericTaskId]);
            if (checkLink.rowCount === 0) {
                await client.query("INSERT INTO mission_tasks (mission_id, task_id, statut) VALUES ($1, $2, $3)", [mId, genericTaskId, t.statut]);
            }
        }

        // 6. Timesheets
        console.log("   Importing Timesheets...");
        const sheetsData = JSON.parse(fs.readFileSync(FILES.TIMESHEETS));
        const emailMap = new Map();
        (await client.query("SELECT email, user_id FROM collaborateurs WHERE user_id IS NOT NULL")).rows.forEach(r => emailMap.set(r.email.toLowerCase(), r.user_id));

        for (const s of sheetsData) {
            const userId = emailMap.get(s.user_email.toLowerCase());
            if (!userId) continue;
            if (!isValidDate(s.date_debut) || !isValidDate(s.date_fin)) {
                console.warn(`Skipping Sheet for ${s.user_email}: Invalid Date`);
                continue;
            }

            const sheetIns = await client.query("INSERT INTO time_sheets (user_id, week_start, week_end, statut) VALUES ($1, $2, $3, $4) RETURNING id", [userId, s.date_debut, s.date_fin, s.statut]);
            const sheetId = sheetIns.rows[0].id;

            for (const e of s.entries) {
                if (!isValidDate(e.date)) {
                    console.warn(`Skipping Entry: Invalid Date ${e.date}`);
                    continue;
                }

                // Filter zero or empty hours as requested
                if (!e.heures || parseFloat(e.heures) === 0) {
                    continue;
                }

                if (e.is_mission) {
                    const missionId = missionIdMap.get(e.mission_code);
                    if (missionId) {
                        // External: HC, MissionID required, TaskID = GenericTaskID (Catalog)
                        await client.query(
                            "INSERT INTO time_entries (time_sheet_id, date_saisie, heures, task_id, mission_id, user_id, type_heures) VALUES ($1, $2, $3, $4, $5, $6, 'HC')",
                            [sheetId, e.date, e.heures, genericTaskId, missionId, userId]
                        );
                    }
                } else {
                    const intActId = activityMap.get(e.internal_code);
                    if (intActId) {
                        // Internal: HNC, MissionID NULL, TaskID NULL
                        await client.query(
                            "INSERT INTO time_entries (time_sheet_id, date_saisie, heures, internal_activity_id, user_id, type_heures) VALUES ($1, $2, $3, $4, $5, 'HNC')",
                            [sheetId, e.date, e.heures, intActId, userId]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log("✅ MIGRATION COMPLETE & COMMITTED!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ MIGRATION FAILED:", e);
    } finally {
        client.release();
        pool.end();
    }
}
migrate();
