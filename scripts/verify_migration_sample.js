require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, 'migration_data');
const FILES = {
    CLIENTS: path.join(DATA_DIR, '01_clients.json'),
    TYPES: path.join(DATA_DIR, '02_mission_types.json'),
    ACTIVITIES: path.join(DATA_DIR, '03_internal_activities.json'),
    MISSIONS: path.join(DATA_DIR, '04_missions.json'),
    TASKS: path.join(DATA_DIR, '05_tasks.json'),
    TIMESHEETS: path.join(DATA_DIR, '06_timesheets.json'),
};

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log("🔍 STARTING DATA INTEGRITY CHECK (DRY RUN)...");
        console.log("   We will check Foreign Keys for a sample of data.");

        await client.query('BEGIN'); // Start Transaction

        // --- 0. PRE-LOAD DB DATA ---
        console.log("\n1️⃣  LOADING REFERENCE DATA...");
        const bus = (await client.query("SELECT id, nom FROM business_units")).rows;
        const buMap = new Map(bus.map(b => [b.nom.trim(), b.id]));
        console.log(`   ✅ Loaded ${bus.length} Business Units.`);

        const fyRes = await client.query("SELECT id FROM fiscal_years WHERE libelle = 'FY25'");
        if (fyRes.rowCount === 0) throw new Error("CRITICAL: FY25 not found in DB.");
        const fy25Id = fyRes.rows[0].id;
        console.log(`   ✅ FY25 ID: ${fy25Id}`);

        const users = (await client.query("SELECT id, nom, prenom, email FROM collaborateurs")).rows;
        const userMap = new Map();
        const emailMap = new Map();
        users.forEach(u => {
            const full1 = `${u.nom} ${u.prenom}`.toLowerCase();
            const full2 = `${u.prenom} ${u.nom}`.toLowerCase();
            userMap.set(full1, u.id);
            userMap.set(full2, u.id);
            if (u.nom) userMap.set(u.nom.toLowerCase(), u.id);
            if (u.email) emailMap.set(u.email.toLowerCase(), u.id);
        });
        console.log(`   ✅ Loaded ${users.length} Users.`);

        // --- 1. CLIENTS SAMPLE ---
        console.log("\n2️⃣  VERIFYING CLIENTS (Sample 5)...");
        const allClients = JSON.parse(fs.readFileSync(FILES.CLIENTS));
        const sampleClients = allClients.slice(0, 5);
        const clientNameMap = new Map();

        for (const c of sampleClients) {
            // Check mandatory fields
            if (!c.nom) console.error(`   ❌ Client missing Name: ${JSON.stringify(c)}`);

            // Simulate Insert
            console.log(`   🔹 Client: ${c.nom} (Sigle: ${c.sigle || 'N/A'}) - OK`);
            const res = await client.query("INSERT INTO clients (nom, sigle, secteur_activite, pays, statut) VALUES ($1, $2, $3, $4, 'ACTIF') RETURNING id",
                [c.nom, c.sigle, c.secteur_activite, c.pays]);
            clientNameMap.set(c.nom.toLowerCase(), res.rows[0].id);
        }

        // --- 2. MISSIONS SAMPLE ---
        console.log("\n3️⃣  VERIFYING MISSIONS (Sample 5)...");
        const allMissions = JSON.parse(fs.readFileSync(FILES.MISSIONS));

        // Filter first 5
        let checked = 0;
        for (const m of allMissions) {
            if (checked >= 5) break;

            // Map Client (Mock if not in sample, but warn if missing in full list)
            let clientId = clientNameMap.get(m.client_nom.toLowerCase());
            if (!clientId) {
                // If the client wasn't in our sample of 5, we can't link it in this transaction since it wasn't inserted.
                // But we should verify it exists in the FULL source.
                if (!allClients.find(c => c.nom.toLowerCase() === m.client_nom.toLowerCase())) {
                    console.error(`   ❌ Mission '${m.code}' refers to UNKNOWN Client: '${m.client_nom}'`);
                }
                continue;
            }
            checked++;

            // CHECK BUs
            let buId = buMap.get(m.bu_nom);
            if (!buId) {
                if (m.bu_nom === "Direction Générale") buId = buMap.get("Direction Générale");
                if (!buId) console.error(`   ❌ Mission '${m.code}' has INVALID Business Unit: '${m.bu_nom}'`);
            }

            // CHECK USERS
            const respId = userMap.get((m.responsable_nom || '').toLowerCase());
            const manId = userMap.get((m.manager_nom || '').toLowerCase());
            const assoId = userMap.get((m.associe_nom || '').toLowerCase());

            if (!respId) console.warn(`   ⚠️ Mission '${m.code}' - Responsable '${m.responsable_nom}' NOT FOUND in DB.`);
            if (m.manager_nom && !manId) console.warn(`   ⚠️ Mission '${m.code}' - Manager '${m.manager_nom}' NOT FOUND in DB.`);
            if (m.associe_nom && !assoId) console.warn(`   ⚠️ Mission '${m.code}' - Associe '${m.associe_nom}' NOT FOUND in DB.`);

            console.log(`   🔹 Mission: ${m.code} | Client: ${m.client_nom} | BU: ${m.bu_nom} | Resp: ${respId ? 'OK' : 'MISSING'}`);

            // Simulate Insert (only if critical deps exist)
            if (buId && fy25Id) {
                // We need a dummy Type ID from DB since we didn't insert types in this script
                // Or just insert one type now
                const typeRes = await client.query("SELECT id FROM mission_types LIMIT 1");
                let typeId = typeRes.rows[0]?.id;
                if (!typeId) {
                    // Insert temp type
                    const tIns = await client.query("INSERT INTO mission_types (libelle, actif) VALUES ('TEST', true) RETURNING id");
                    typeId = tIns.rows[0].id;
                }

                await client.query(
                    `INSERT INTO missions (code, nom, description, date_debut, date_fin, statut, client_id, business_unit_id, mission_type_id, fiscal_year_id, conditions_paiement) 
                     VALUES ($1, $2, 'Desc', '2025-01-01', '2025-12-31', 'EN_COURS', $3, $4, $5, $6, '{}') RETURNING id`,
                    [m.code, m.nom, clientId, buId, typeId, fy25Id]
                );
            }
        }

        // --- 3. TIMESHEETS SAMPLE ---
        console.log("\n4️⃣  VERIFYING TIMESHEETS (Sample 5)...");
        const allSheets = JSON.parse(fs.readFileSync(FILES.TIMESHEETS));
        const sampleSheets = allSheets.slice(0, 5);

        for (const s of sampleSheets) {
            const userId = emailMap.get(s.user_email.toLowerCase());
            if (!userId) {
                console.error(`   ❌ Timesheet User '${s.user_email}' NOT FOUND in DB.`);
                continue;
            }

            console.log(`   🔹 Sheet: ${s.user_email} (${s.date_debut}) - User OK. Checking entries...`);

            // Sim Sheet Insert
            const sRes = await client.query("INSERT INTO time_sheets (collaborateur_id, date_debut, date_fin, statut) VALUES ($1, $2, $3, $4) RETURNING id",
                [userId, s.date_debut, s.date_fin, s.statut]);

            // Check Entries
            for (const e of s.entries) {
                if (e.is_mission) {
                    if (!e.mission_code) console.error(`      ❌ Entry missing Mission Code`);
                } else {
                    if (!e.internal_code) console.error(`      ❌ Entry missing Internal Code`);
                }
            }
        }

        console.log("\n✅ VERIFICATION COMPLETE. Rolling back transaction (No changes made).");
        await client.query('ROLLBACK');

    } catch (e) {
        console.error("\n❌ VERIFICATION FAILED:", e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
