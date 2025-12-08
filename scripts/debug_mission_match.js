require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const TIMESHEETS_FILE = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');
const MISSION_PREVIEW_FILE = path.join(__dirname, '../backups/Migration/preview_missions_v2_with_bu.csv');

function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function levenshtein(a, b) {
    if (!a) return b ? b.length : 0;
    if (!b) return a ? a.length : 0;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

async function debugMissionMatch() {
    console.log('🐞 Debugging Mission Matching...');

    // 1. Load Missions
    const missions = [];
    await new Promise((resolve) => {
        fs.createReadStream(MISSION_PREVIEW_FILE)
            .pipe(csv())
            .on('data', row => {
                if (row.MISSION_NAME) {
                    missions.push(cleanName(row.MISSION_NAME));
                }
            })
            .on('end', resolve);
    });
    console.log(`   Loaded ${missions.length} missions.`);

    // 2. Scan Timesheets and track failures
    const failures = new Map(); // Code -> count

    await new Promise((resolve) => {
        fs.createReadStream(TIMESHEETS_FILE, { encoding: 'utf8' })
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                const type = row['Type heure'];
                const code = row['Code Activité'] || row['Code ActvitÃ©'] || row['Activité'] || '';

                if (type && !type.toLowerCase().includes('non chargeable') && code) {
                    const cleanCode = cleanName(code);

                    // Logic from V3
                    let match = missions.find(m => cleanCode.endsWith(m) || cleanCode === m);

                    if (!match) {
                        match = missions.find(m => cleanCode.includes(m));
                    }

                    if (!match) {
                        failures.set(code, (failures.get(code) || 0) + 1);
                    }
                }
            })
            .on('end', resolve);
    });

    console.log(`   Found ${failures.size} Unique Failing Codes.`);

    // 3. Analyze Top Failures
    const sortedFailures = Array.from(failures.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    for (const [code, count] of sortedFailures) {
        console.log(`\n❌ Unmatched: "${code}" (x${count})`);
        // Find closest missions
        const candidates = missions.map(m => ({ m, dist: levenshtein(cleanName(code), m) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);

        console.log(`   Closest Candidates:`);
        candidates.forEach(c => console.log(`      - "${c.m}" (Dist: ${c.dist})`));
    }
}

debugMissionMatch();
