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
const PREVIEW_ENTRIES = path.join(__dirname, '../backups/Migration/preview_timesheets_v1.csv');

// Helper to Clean
function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Helper to Parse Date (Month/Year from CSV)
// Assuming CSV has a "Mois" column like "01/01/2025" or similar
// Inspecting output: Header is likely "Mois"
function parseMonth(dateStr) {
    if (!dateStr) return { month: 0, year: 2025 }; // Fallback
    // Format usually DD/MM/YYYY or YYYY-MM-DD
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
        // Assume DD/MM/YYYY if first part < 32
        if (parts[0].length === 2 && parts[2].length === 4) {
            return { month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
        }
        // Assume YYYY-MM-DD
        if (parts[0].length === 4) {
            return { month: parseInt(parts[1], 10), year: parseInt(parts[0], 10) };
        }
    }
    return { month: 1, year: 2025 };
}

async function generateTimesheetPreview() {
    console.log('⏳ Generating Timesheet Preview (Status: DRAFT)...');

    // 1. Load Mappings
    const userMap = new Map(); // CleanName -> Info
    if (fs.existsSync(USER_MAPPING_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(USER_MAPPING_FILE)
                .pipe(csv())
                .on('data', row => {
                    // Map both Source Name and Aliases
                    const info = { action: row.ACTION, dbName: row.DB_MATCH };
                    userMap.set(cleanName(row.SOURCE_NAME), info);
                    if (row.ALIASES_FOUND) {
                        row.ALIASES_FOUND.split(' / ').forEach(a => userMap.set(cleanName(a), info));
                    }
                })
                .on('end', resolve);
        });
        console.log(`   Loaded User Map (${userMap.size} entries)`);
    }

    const missionMap = new Set(); // Clean Mission Name
    if (fs.existsSync(MISSION_PREVIEW_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(MISSION_PREVIEW_FILE)
                .pipe(csv())
                .on('data', row => {
                    if (row.MISSION_NAME) missionMap.add(cleanName(row.MISSION_NAME));
                })
                .on('end', resolve);
        });
        console.log(`   Loaded Mission List (${missionMap.size} entries)`);
    }

    const internalMap = new Set(); // Clean Activity Name
    if (fs.existsSync(INTERNAL_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(INTERNAL_FILE)
                .pipe(csv())
                .on('data', row => {
                    if (row.ACTIVITY_NAME) internalMap.add(cleanName(row.ACTIVITY_NAME));
                })
                .on('end', resolve);
        });
        console.log(`   Loaded Internal Activities (${internalMap.size} entries)`);
    }

    // 2. Scan Timesheets
    const entries = [];

    if (fs.existsSync(TIMESHEETS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(TIMESHEETS_FILE, { encoding: 'utf8' })
                .pipe(csv({ separator: ';' }))
                .on('data', (row) => {
                    const nom = row['Nom'];
                    const email = row['email'];
                    const type = row['Type heure']; // 'Heure chargeable' or 'Heure Non chargeable'
                    const code = row['Code Activité'] || row['Code ActvitÃ©'] || row['Activité'] || '';
                    const client = row['Client'] || '';
                    const mission = row['Mission'] || row['Activite'] || ''; // Mission Name usually here? Or derived?

                    // Actually, looking at the file structure from earlier:
                    // Nom;Initiales;BU;Grade;email;Type heure;Mois;1;2;3...

                    // Code Activité column seems to hold the Mission Name if Chargeable, or Internal Name if Non-Chargeable

                    // Resolve User
                    // Try Email first (strict map V7 based primarily on email)
                    let userInfo = null;
                    if (email) {
                        // We didn't key by email in userMap above effectively (mapped by name/alias).
                        // But V7 map was built FROM the deductions. 
                        // Let's rely on Names/Aliases since we cleaned them.
                        userInfo = userMap.get(cleanName(nom));
                    } else {
                        userInfo = userMap.get(cleanName(nom));
                    }

                    const userDisplay = userInfo ? `${userInfo.action === 'MATCH' ? 'LINK' : 'NEW'}: ${userInfo.dbName}` : `UNKNOWN: ${nom}`;

                    // Resolve Activity/Mission
                    let activityDisplay = 'UNKNOWN';
                    let activityType = 'UNKNOWN';

                    if (type && type.toLowerCase().includes('non chargeable')) {
                        activityType = 'INTERNAL';
                        const cleanAct = cleanName(code);
                        if (internalMap.has(cleanAct)) {
                            activityDisplay = code;
                        } else {
                            activityDisplay = `MISSING INTERNAL: ${code}`;
                        }
                    } else {
                        // Chargeable -> Mission
                        activityType = 'MISSION';
                        // In the CSV, Mission Name is likely in 'Code Activité' or similar
                        // Wait, previous inspections showed 'Code ActvitÃ©'
                        const cleanMis = cleanName(code);

                        // Check if in Mission Preview
                        if (missionMap.has(cleanMis)) {
                            activityDisplay = code;
                        } else {
                            // Fallback? Sometimes Client Name is used as Mission Name logic?
                            // For now mark as missing
                            activityDisplay = `MISSING MISSION: ${code}`;
                        }
                    }

                    // Parse Date
                    const dateInfo = parseMonth(row['Mois']);

                    // Iterate Days 1-31
                    for (let day = 1; day <= 31; day++) {
                        const hoursStr = row[day.toString()];
                        if (hoursStr && hoursStr.trim() !== '') {
                            const hours = parseFloat(hoursStr.replace(',', '.'));
                            if (!isNaN(hours) && hours > 0) {
                                // Construct Date
                                const dateStr = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                                entries.push({
                                    date: dateStr,
                                    user: userDisplay,
                                    type: activityType,
                                    activity: activityDisplay,
                                    hours: hours,
                                    status: 'DRAFT' // Requested Status
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
        const writer = createObjectCsvWriter({
            path: PREVIEW_ENTRIES,
            header: [
                { id: 'date', title: 'DATE' },
                { id: 'user', title: 'USER' },
                { id: 'type', title: 'TYPE' },
                { id: 'activity', title: 'ACTIVITY_MISSION' },
                { id: 'hours', title: 'HOURS' },
                { id: 'status', title: 'STATUS' }
            ]
        });
        await writer.writeRecords(entries);
        console.log(`✅ Timesheet Entries Preview: ${PREVIEW_ENTRIES} (${entries.length} rows)`);
    } else {
        console.log('⚠️ No timesheet entries found.');
    }
}

generateTimesheetPreview();
