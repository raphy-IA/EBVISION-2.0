const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const MISSIONS_JSON = path.join(__dirname, 'migration_data/04_missions.json');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/preview_timesheets_v3.csv');

const normalize = (str) => str ? str.trim().toLowerCase() : '';

async function debug() {
    // Load Missions
    const missions = JSON.parse(fs.readFileSync(MISSIONS_JSON, 'utf8'));
    const missionNames = new Set(missions.map(m => normalize(m.nom)));

    console.log(`Loaded ${missions.length} Missions.`);
    console.log("Sample Normalized Mission Names:", Array.from(missionNames).slice(0, 5));

    // Read CSV
    const results = [];
    let processed = 0;
    let failed = 0;
    const failures = new Set();

    fs.createReadStream(TIMESHEETS_CSV)
        .pipe(csv())
        .on('data', (row) => {
            processed++;
            const type = (row.TYPE || '').toUpperCase();
            if (type.includes('INTERNAL')) return;

            const name = row.CLIENT || row.Client;
            if (!name) return;

            if (!missionNames.has(normalize(name))) {
                failed++;
                failures.add(name);
            }
        })
        .on('end', () => {
            console.log(`Processed ${processed} rows.`);
            console.log(`Failed Matches: ${failed}`);
            console.log("\nTop 20 Unique Failures:");
            console.log(Array.from(failures).slice(0, 20));
        });
}

debug();
