const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration: Pass arguments or edit these lines
const TARGET_EMAIL = process.argv[2];
const TARGET_MISSION_REF = process.argv[3]; // Code or Name part

if (!TARGET_EMAIL || !TARGET_MISSION_REF) {
    console.error(`
Usage: node scripts/diagnose_production_anomalies.js <email> <mission_code_or_name>

Example: node scripts/diagnose_production_anomalies.js "jean.dupont@example.com" "MIS-2023"
    `);
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function diagnose() {
    const client = await pool.connect();
    console.log(`\n🔍 DIAGNOSTIC STARTED for: User=${TARGET_EMAIL}, MissionRef=${TARGET_MISSION_REF}`);
    console.log('----------------------------------------------------------------');

    try {
        // 1. CHECK USER & COLLABORATOR
        console.log('\n1️⃣  CHECKING USER ACCOUNT...');
        const userRes = await client.query(`
            SELECT u.id as user_id, u.email, u.nom as user_nom, u.prenom as user_prenom, u.collaborateur_id,
                   c.id as col_id, c.nom as col_nom, c.prenom as col_prenom, c.email as col_email
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE u.email ILIKE $1
        `, [TARGET_EMAIL]);

        let collaborateurId = null;
        let userId = null;

        if (userRes.rows.length === 0) {
            console.error(`❌ User not found with email: ${TARGET_EMAIL}`);
            // Check if maybe it's just in collaborators
            const colOnlyRes = await client.query('SELECT * FROM collaborateurs WHERE email ILIKE $1', [TARGET_EMAIL]);
            if (colOnlyRes.rows.length > 0) {
                console.warn(`⚠️  Found in 'collaborateurs' table but NOT in 'users' table (or emails don't match).`);
                console.table(colOnlyRes.rows);
            }
            return;
        } else {
            const u = userRes.rows[0];
            userId = u.user_id;
            collaborateurId = u.col_id;
            console.log(`✅ User found: ID=${u.user_id} (${u.user_prenom} ${u.user_nom})`);

            if (!u.collaborateur_id) {
                console.error(`❌ ACTION REQUIRED: User has NO 'collaborateur_id' linked! This user cannot be assigned to missions.`);
            } else if (!u.col_id) {
                console.error(`❌ DATA INTEGRITY ERROR: User linked to collaborateur_id=${u.collaborateur_id} but that ID does not exist in 'collaborateurs' table.`);
            } else {
                console.log(`✅ Linked Collaborator: ID=${u.col_id} (${u.col_prenom} ${u.col_nom})`);
            }

            // Check for duplicates
            if (userRes.rows.length > 1) {
                console.error(`❌ CRITICAL: Found ${userRes.rows.length} users with this email! This will cause login/assignment confusion.`);
                console.table(userRes.rows);
            }
        }

        // 2. CHECK MISSION
        console.log('\n2️⃣  CHECKING TARGET MISSION...');
        const missionRes = await client.query(`
            SELECT id, nom, code, statut, created_at, client_id, 
                   collaborateur_id as resp_id, manager_id, associe_id
            FROM missions 
            WHERE code ILIKE $1 OR nom ILIKE $1
            LIMIT 5
        `, [`%${TARGET_MISSION_REF}%`]);

        let missionId = null;

        if (missionRes.rows.length === 0) {
            console.error(`❌ Mission not found matching: ${TARGET_MISSION_REF}`);
            return;
        } else if (missionRes.rows.length > 1) {
            console.warn(`⚠️  Found multiple missions. Using the first one (most recent?). Please be more specific if needed.`);
            console.table(missionRes.rows);
        }

        const mission = missionRes.rows[0];
        missionId = mission.id;
        console.log(`✅ Mission Identified: [${mission.code}] ${mission.nom}`);
        console.log(`   - ID: ${mission.id}`);
        console.log(`   - Status: ${mission.statut} ${['EN_COURS', 'PLANIFIEE'].includes(mission.statut) ? '✅ OK' : '❌ WARNING: Should be EN_COURS or PLANIFIEE'}`);

        // Check roles
        const isResp = mission.resp_id === collaborateurId;
        const isManager = mission.manager_id === collaborateurId;
        const isAssocie = mission.associe_id === collaborateurId;
        console.log(`   - User Roles on Mission: Responsible=${isResp}, Manager=${isManager}, Associe=${isAssocie}`);


        // 3. CHECK ASSIGNMENTS
        console.log('\n3️⃣  CHECKING ASSIGNMENTS (The "Why")...');

        // Tasks
        const tasksRes = await client.query(`
            SELECT id, task_id, statut as task_statut, duree_planifiee 
            FROM mission_tasks 
            WHERE mission_id = $1
        `, [missionId]);

        console.log(`   - Found ${tasksRes.rows.length} tasks configured for this mission.`);

        if (tasksRes.rows.length === 0) {
            console.warn(`⚠️  Mission has NO tasks. Assignments adhere to tasks. No tasks = No assignments possible.`);
        }

        // Assignments
        if (collaborateurId) {
            const assignsRes = await client.query(`
                SELECT ta.id, ta.mission_task_id, ta.heures_planifiees, ta.statut 
                FROM task_assignments ta
                JOIN mission_tasks mt ON ta.mission_task_id = mt.id
                WHERE mt.mission_id = $1 AND ta.collaborateur_id = $2
            `, [missionId, collaborateurId]);

            console.log(`   - Found ${assignsRes.rows.length} explicit assignments for this user on this mission.`);
            if (assignsRes.rows.length > 0) {
                console.table(assignsRes.rows);
            } else {
                console.error(`❌ User is NOT explicitly assigned to any task on this mission.`);
            }
        }

        // 4. SIMULATE API QUERY
        console.log('\n4️⃣  SIMULATING BACKEND QUERY (/api/missions/planned)...');
        // This is the logic currently in src/routes/missions.js
        const plannedQuery = `
            SELECT DISTINCT 
                m.id, m.nom, m.code, c.nom as client_nom
            FROM missions m
            JOIN mission_tasks mt ON m.id = mt.mission_id
            JOIN task_assignments ta ON mt.id = ta.mission_task_id
            JOIN collaborateurs col ON ta.collaborateur_id = col.id
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE col.user_id = $1
            AND m.statut IN ('EN_COURS', 'PLANIFIEE')
            AND m.id = $2
        `;

        const simRes = await client.query(plannedQuery, [userId, missionId]);

        if (simRes.rows.length > 0) {
            console.log(`✅ SUCCESS: The backend SHOULD return this mission. It matches all criteria.`);
        } else {
            console.log(`❌ FAILURE: The backend will NOT return this mission.`);
            console.log(`   Reasoning:`);
            if (mission.statut !== 'EN_COURS' && mission.statut !== 'PLANIFIEE') console.log(`   - Mission status is '${mission.statut}' (must be EN_COURS or PLANIFIEE).`);
            if (!collaborateurId) console.log(`   - User has no collaborator ID.`);
            if (tasksRes.rows.length === 0) console.log(`   - Mission has no tasks.`);
            else if (collaborateurId) {
                // Double check if assignment join failed
                const assignCheck = await client.query(`
                    SELECT 1 FROM task_assignments ta 
                    JOIN mission_tasks mt ON ta.mission_task_id = mt.id
                    WHERE mt.mission_id = $1 AND ta.collaborateur_id = $2
                 `, [missionId, collaborateurId]);
                if (assignCheck.rows.length === 0) console.log(`   - User is not present in 'task_assignments' for this mission.`);
            }
        }

    } catch (err) {
        console.error('❌ ERROR RUNNING SCRIPT:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
