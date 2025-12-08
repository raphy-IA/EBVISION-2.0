require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CLIENTS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/preview_timesheets_v3.csv');
const BU_MAPPING_CSV = path.join(__dirname, '../backups/Migration/match_BU_DIV.csv');

const normalize = (str) => str ? str.trim().toLowerCase() : '';

// Helper: Read CSV
function readCSV(filePath, separator = ',') {
    return new Promise((resolve) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({ separator }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results));
    });
}

function generateMissionCode(buName, index) {
    let acro = "MIS";
    if (buName) acro = buName.substring(0, 3).toUpperCase();
    const seq = String(index + 1).padStart(3, '0');
    return `${acro}-25-${seq}`;
}

async function debug() {
    // 1. Load Missions to build Maps
    const missionsRaw = await readCSV(MISSIONS_CSV, ';');
    const missionCodeMap = new Map();
    const clientMissionMap = new Map();
    const buMappingRaw = await readCSV(BU_MAPPING_CSV, ';');

    // Build BU Map just to generate codes consistent with build script
    // (Simplified for debug - we just need unique codes to identify missions)
    const buMap = new Map();
    buMappingRaw.forEach(r => buMap.set(normalize(r['BU OLD']), r['BU NEW']));

    let seq = 0;
    missionsRaw.forEach(m => {
        const nom = m['Nom'] || m['Nom mission'] || m.Mission || m.nom;
        if (!nom) return;

        const rawBu = m['B.U'] || m['BU'];
        const buName = buMap.get(normalize(rawBu)) || "Direction Générale";
        const code = generateMissionCode(buName, seq++);

        // Populate Maps
        missionCodeMap.set(normalize(nom), { code, name: nom });

        const clientName = normalize(m['Client'] || m.CLIENT);
        if (!clientMissionMap.has(clientName)) {
            clientMissionMap.set(clientName, []);
        }
        clientMissionMap.get(clientName).push({ code, name: nom });
    });

    // 2. Scan Timesheets
    const tsRaw = await readCSV(TIMESHEETS_CSV);
    const distinctPairs = new Map(); // Key: "Client|Activity" -> { count, mappedTo, method }

    tsRaw.forEach(row => {
        const type = (row.TYPE || '').toUpperCase();
        const activity = row.ACTIVITY ? row.ACTIVITY.trim() : '';
        const client = row.CLIENT ? row.CLIENT.trim() : '';

        // Skip internal
        const internalMap = ["fériés", "congés", "formation", "maladie", "bureau", "administratif"];
        if (type.includes('INTERNAL') || internalMap.includes(normalize(activity))) return;
        if (!client && !activity) return;

        const key = `${client} | ${activity}`;
        if (!distinctPairs.has(key)) {
            let result = { code: null, name: null, method: 'NONE' };

            // Logic Simulation
            let match = missionCodeMap.get(normalize(activity));
            if (match) {
                result = { code: match.code, name: match.name, method: 'ACTIVITY_MATCH' };
            } else {
                match = missionCodeMap.get(normalize(client));
                if (match) {
                    result = { code: match.code, name: match.name, method: 'CLIENT_AS_MISSION' };
                } else {
                    const candidates = clientMissionMap.get(normalize(client));
                    if (candidates && candidates.length > 0) {
                        result = { code: candidates[0].code, name: candidates[0].name, method: `FALLBACK_FIRST_OF_${candidates.length}` };
                    }
                }
            }
            distinctPairs.set(key, result);
        }
    });

    console.log("=== MATCHING RESULT ANALYSIS ===");
    console.log("format: [Client] | [Activity] => [Mapped Mission Name] (Method)");
    console.log("---------------------------------------------------------------");

    const sorted = Array.from(distinctPairs.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let collisionCount = 0;
    let fallbackCount = 0;
    const missionUsage = new Map(); // MissionCode -> Set of SourceKeys

    sorted.forEach(([key, res]) => {
        console.log(`"${key}" => ${res.name ? `"${res.name}"` : 'NULL'} (${res.method})`);

        if (res.code) {
            if (!missionUsage.has(res.code)) missionUsage.set(res.code, new Set());
            missionUsage.get(res.code).add(key);
        }
        if (res.method.startsWith('FALLBACK')) fallbackCount++;
    });

    console.log("\n=== COLLISIONS (Missions fed by multiple distinct CSV sources) ===");
    missionUsage.forEach((sources, mCode) => {
        if (sources.size > 1) {
            console.log(`Mission ${mCode} is fed by ${sources.size} sources:`);
            sources.forEach(s => console.log(`   - ${s}`));
        }
    });

    console.log(`\nTotal Distinct Source Pairs: ${distinctPairs.size}`);
    console.log(`Unique Missions Mapped: ${missionUsage.size}`);
    console.log(`Fallback Matches (Risk of Collapse): ${fallbackCount}`);
}

debug();
