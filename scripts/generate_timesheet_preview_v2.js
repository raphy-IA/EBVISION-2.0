require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Files
const TIMESHEETS_FILE = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');
const USER_MAPPING_FILE = path.join(__dirname, '../backups/Migration/preview_user_mapping_v7.csv');
const MISSION_PREVIEW_FILE = path.join(__dirname, '../backups/Migration/preview_missions_v2_with_bu.csv');
const INTERNAL_FILE = path.join(__dirname, '../backups/Migration/preview_internal_v7.csv');

// Output
const PREVIEW_ENTRIES = path.join(__dirname, '../backups/Migration/preview_timesheets_v2.csv');

function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Robust Month Finder
function findMonthColumn(row) {
    const keys = Object.keys(row);
    // Look for key that contains 'Mois' (case insensitive)
    const key = keys.find(k => k.toLowerCase().includes('mois'));
    return key ? key : 'Mois';
}

function parseMonth(dateStr) {
    if (!dateStr) return { month: 1, year: 2025 }; // Default
    // Expected: 01/01/2025
    const parts = dateStr.trim().split(/[/-]/);

    // DD/MM/YYYY
    if (parts.length === 3) {
        // Validation for Year
        if (parts[2].length === 4) {
            return {
                month: parseInt(parts[1], 10),
                year: parseInt(parts[2], 10)
            };
        }
        // YYYY-MM-DD
        if (parts[0].length === 4) {
            return {
                month: parseInt(parts[1], 10),
                year: parseInt(parts[0], 10)
            };
        }
    }
    return { month: 1, year: 2025 };
}

async function generateTimesheetPreviewV2() {
    console.log('⏳ Generating Timesheet Preview V2 (Status: SAISIE)...');

    // 1. Load Mappings
    const userMap = new Map();
    if (fs.existsSync(USER_MAPPING_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(USER_MAPPING_FILE)
                .pipe(csv())
                .on('data', row => {
                    const info = { action: row.ACTION, dbName: row.DB_MATCH };
                    userMap.set(cleanName(row.SOURCE_NAME), info);
                    if (row.ALIASES_FOUND) {
                        row.ALIASES_FOUND.split(' / ').forEach(a => userMap.set(cleanName(a), info));
                    }
                })
                .on('end', resolve);
        });
    }

    const missionMap = new Set();
    const missionClientMap = new Map(); // Mission -> Client Name
    if (fs.existsSync(MISSION_PREVIEW_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(MISSION_PREVIEW_FILE)
                .pipe(csv())
                .on('data', row => {
                    const name = row.MISSION_NAME;
                    if (name) {
                        const clean = cleanName(name);
                        missionMap.add(clean);
                        missionClientMap.set(clean, row.CLIENT);
                    }
                })
                .on('end', resolve);
        });
    }

    const internalMap = new Set();
    if (fs.existsSync(INTERNAL_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(INTERNAL_FILE)
                .pipe(csv())
                .on('data', row => {
                    if (row.ACTIVITY_NAME) internalMap.add(cleanName(row.ACTIVITY_NAME));
                })
                .on('end', resolve);
        });
    }

    // 2. Scan & Process
    const entries = [];
    const dbStatus = 'SAISIE';

    if (fs.existsSync(TIMESHEETS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(TIMESHEETS_FILE, { encoding: 'utf8' })
                .pipe(csv({ separator: ';' }))
                .on('data', (row) => {
                    const nom = row['Nom'];
                    const moisCol = findMonthColumn(row);
                    const moisVal = row[moisCol];
                    const dateInfo = parseMonth(moisVal);

                    const email = row['email'];

                    // User Resolution
                    let userInfo = userMap.get(cleanName(nom));
                    const userDisplay = userInfo ?
                        `${userInfo.action === 'MATCH' ? 'LINK' : 'NEW'}: ${userInfo.dbName}` :
                        `UNKNOWN: ${nom}`;

                    // Activity Resolution
                    const type = row['Type heure'];
                    const code = row['Code Activité'] || row['Code ActvitÃ©'] || row['Activité'] || '';
                    const cleanCode = cleanName(code);

                    let activityType = 'UNKNOWN';
                    let activityDisplay = 'UNKNOWN';
                    let clientDisplay = '';

                    if (type && type.toLowerCase().includes('non chargeable')) {
                        activityType = 'INTERNAL';
                        if (internalMap.has(cleanCode)) {
                            activityDisplay = code;
                        } else {
                            activityDisplay = `MISSING INTERNAL: ${code}`;
                        }
                    } else {
                        activityType = 'MISSION';
                        if (missionMap.has(cleanCode)) {
                            activityDisplay = code;
                            clientDisplay = missionClientMap.get(cleanCode) || '';
                        } else {
                            activityDisplay = `MISSING MISSION: ${code}`;
                        }
                    }

                    // Timesheet Concept: User + Month
                    const timesheetLabel = `${userInfo ? userInfo.dbName : nom} - ${String(dateInfo.month).padStart(2, '0')}/${dateInfo.year}`;

                    // Days 1-31
                    for (let day = 1; day <= 31; day++) {
                        const hoursStr = row[day.toString()];
                        if (hoursStr && hoursStr.trim() !== '') {
                            const hours = parseFloat(hoursStr.replace(',', '.'));

                            // STRICT Filter: Must be > 0 (User Request)
                            if (!isNaN(hours) && hours > 0) {
                                const dateStr = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                                entries.push({
                                    timesheet: timesheetLabel,
                                    date: dateStr,
                                    user: userDisplay,
                                    type: activityType,
                                    client: clientDisplay,
                                    activity: activityDisplay,
                                    hours: hours,
                                    status: dbStatus
                                });
                            }
                        }
                    }
                })
                .on('end', resolve);
        });
    }

    // 3. Write Output
    if (entries.length > 0) {
        // Sort by User, then Date
        entries.sort((a, b) => {
            if (a.user !== b.user) return a.user.localeCompare(b.user);
            return a.date.localeCompare(b.date);
        });

        const writer = createObjectCsvWriter({
            path: PREVIEW_ENTRIES,
            header: [
                { id: 'timesheet', title: 'TIMESHEET_ROOT' },
                { id: 'date', title: 'DATE' },
                { id: 'user', title: 'USER' },
                { id: 'type', title: 'TYPE' },
                { id: 'client', title: 'CLIENT' },
                { id: 'activity', title: 'ACTIVITY' },
                { id: 'hours', title: 'HOURS' },
                { id: 'status', title: 'STATUS' }
            ]
        });
        await writer.writeRecords(entries);
        console.log(`✅ Timesheet Entries Preview V2: ${PREVIEW_ENTRIES} (${entries.length} rows)`);
    } else {
        console.log('⚠️ No timesheet entries found.');
    }
}

generateTimesheetPreviewV2();
