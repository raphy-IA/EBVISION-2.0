require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const TIMESHEET_PREVIEW = path.join(__dirname, '../backups/Migration/preview_timesheets_v3.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractDbName(linkStr) {
    if (!linkStr) return null;
    if (linkStr.startsWith('LINK: ')) return linkStr.substring(6).trim();
    return linkStr.trim();
}

function getIsoWeek(dateStr) {
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

async function migrateTimesheets() {
    console.log('🚀 Starting Timesheet Migration...');
    const client = await pool.connect();

    try {
        console.log('   Loading Reference Maps...');

        // Users
        const userMap = new Map();
        const uRes = await client.query('SELECT id, user_id, nom, prenom FROM collaborateurs');
        uRes.rows.forEach(r => {
            if (r.user_id) {
                const n1 = cleanName(`${r.nom} ${r.prenom}`);
                const n2 = cleanName(`${r.prenom} ${r.nom}`);
                userMap.set(n1, r.user_id);
                userMap.set(n2, r.user_id);
            }
        });

        // Internal Activities
        const internalMap = new Map();
        const iRes = await client.query('SELECT id, name FROM internal_activities');
        iRes.rows.forEach(r => internalMap.set(cleanName(r.name), r.id));

        // Missions (nom)
        const missionMap = new Map();
        const mRes = await client.query('SELECT id, nom FROM missions');
        mRes.rows.forEach(r => missionMap.set(cleanName(r.nom), r.id));

        // Tasks (code -> id)
        const taskMap = new Map();
        const tRes = await client.query("SELECT id, code FROM tasks WHERE code LIKE 'MISSION_%'");
        tRes.rows.forEach(r => taskMap.set(r.code, r.id));

        console.log(`   Refs Loaded: ${userMap.size} users, ${internalMap.size} int, ${missionMap.size} missions, ${taskMap.size} tasks.`);

        // Process CSV
        const rows = [];
        await new Promise(resolve => {
            fs.createReadStream(TIMESHEET_PREVIEW)
                .pipe(csv())
                .on('data', r => rows.push(r))
                .on('end', resolve);
        });

        console.log(`   Processing ${rows.length} timesheet entries...`);

        await client.query('BEGIN');

        // Cache for created TimeSheets: UserID + WeekStart -> ID
        const timeSheetCache = new Map();

        let tsCreated = 0;
        let teCreated = 0;
        let skipped = 0;

        for (const row of rows) {
            const date = row.DATE;
            const userNameRaw = extractDbName(row.USER);
            const hours = parseFloat(row.HOURS);
            const type = row.TYPE;
            const activityName = row.ACTIVITY;
            const status = 'sauvegardé'; // Enforce lowercase for DB constraint

            if (!userNameRaw || !date || !hours) {
                skipped++;
                continue;
            }

            // Validate Date
            const dObj = new Date(date);
            if (isNaN(dObj.getTime()) || dObj.toISOString().slice(0, 10) !== date) {
                // Check for April 31st edge case specifically or generally invalid
                // e.g. 2025-04-31 becomes 2025-05-01 in JS
                // We strictly filtered by ISO string check above.
                console.log(`   ⚠️ Skipping invalid date: ${date}`);
                skipped++;
                continue;
            }

            // User ID
            const userId = userMap
                .get(cleanName(userNameRaw));
            if (!userId) {
                // console.log(`Warning: User not found ${userNameRaw}`);
                skipped++;
                continue;
            }

            // Week Range
            const { start, end } = getIsoWeek(date);
            const tsKey = `${userId}_${start}`;

            let timeSheetId = timeSheetCache.get(tsKey);

            if (!timeSheetId) {
                // Check DB
                const check = await client.query(
                    'SELECT id FROM time_sheets WHERE user_id = $1 AND week_start = $2',
                    [userId, start]
                );

                if (check.rows.length > 0) {
                    timeSheetId = check.rows[0].id;
                } else {
                    const ins = await client.query(
                        `INSERT INTO time_sheets (user_id, week_start, week_end, statut, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
                        [userId, start, end, status]
                    );
                    timeSheetId = ins.rows[0].id;
                    tsCreated++;
                }
                timeSheetCache.set(tsKey, timeSheetId);
            }

            // Activity / Mission ID / Task ID
            let missionId = null;
            let internalId = null;
            let taskId = null;
            let typeHeures = '';

            if (type === 'INTERNAL') {
                internalId = internalMap.get(cleanName(activityName));
                if (!internalId) {
                    skipped++;
                    continue;
                }
                typeHeures = 'HNC';
            } else if (type === 'MISSION') {
                let cleanAct = activityName;
                if (cleanAct.startsWith('MISSING MISSION: ')) {
                    cleanAct = cleanAct.substring(17).trim();
                }
                missionId = missionMap.get(cleanName(cleanAct));
                if (!missionId) {
                    skipped++;
                    continue;
                }
                typeHeures = 'HC';

                // Find Task
                taskId = taskMap.get(`MISSION_${missionId}`);
                if (!taskId) {
                    // console.log(`Warning: No task found for mission ${missionId}`);
                    skipped++;
                    continue;
                }
            }

            // CREATE ENTRY
            await client.query(`
                INSERT INTO time_entries (
                    time_sheet_id, user_id, date_saisie, heures, 
                    mission_id, internal_activity_id, task_id,
                    statut, type_heures, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [timeSheetId, userId, date, hours, missionId, internalId, taskId, status, typeHeures]);

            teCreated++;
        }

        await client.query('COMMIT');
        console.log(`✅ Migration Complete.`);
        console.log(`   TimeSheets Created: ${tsCreated}`);
        console.log(`   TimeEntries Created: ${teCreated}`);
        console.log(`   Rows Skipped: ${skipped}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', e.message);
        console.error('   Detail:', e.detail);
        console.error('   Constraint:', e.constraint);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateTimesheets();
