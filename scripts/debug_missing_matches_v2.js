require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const CLIENTS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');

// Helper: Normalize String
const normalize = (str) => str ? str.trim().toLowerCase() : '';

function readCSV(filePath, separator = ',') {
    return new Promise((resolve) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results));
    });
}

async function debug() {
    console.log("Analyzing Missed Matches...");

    // Load Reference Data
    const clientsRaw = await readCSV(CLIENTS_CSV, ',');
    const clientSigleMap = new Map();
    const clientMissionMap = new Map();
    const missionCodeMap = new Map();

    clientsRaw.forEach(c => {
        const name = c.Nom || c.Client || c.nom;
        if (name) {
            const n = normalize(name);
            const s = c.Sigle || c.sigle;
            if (s) clientSigleMap.set(normalize(s), n);
        }
    });

    const missionsRaw = await readCSV(MISSIONS_CSV, ';');
    missionsRaw.forEach(m => {
        const nom = m['Nom'] || m['Nom mission'];
        const client = m['Client'] || m.CLIENT;
        if (nom && client) {
            const key = `${normalize(client)}|${normalize(nom)}`;
            missionCodeMap.set(key, "EXISTS");

            const nClient = normalize(client);
            if (!clientMissionMap.has(nClient)) clientMissionMap.set(nClient, []);
            clientMissionMap.get(nClient).push(nom);
        }
    });

    const tsRaw = await readCSV(TIMESHEETS_CSV, ';');
    const failures = new Set();

    for (const row of tsRaw) {
        const typeHeure = (row['Type heure'] || '').toLowerCase();
        if (!typeHeure.includes('chargeable') || typeHeure.includes('non')) continue;

        const activityField = row['Activité'] || row.Activite || '';
        const parts = activityField.split(' - ');

        let clientName = '';
        let activityName = '';
        if (parts.length >= 3) {
            clientName = parts[0].trim();
            activityName = parts.slice(2).join(' - ').trim();
        } else {
            activityName = activityField;
        }

        const normClient = normalize(clientName);
        const normActivity = normalize(activityName);

        let resolvedClientNorm = normClient;

        if (normClient && !clientMissionMap.has(resolvedClientNorm)) {
            if (clientSigleMap.has(resolvedClientNorm)) {
                resolvedClientNorm = clientSigleMap.get(resolvedClientNorm);
            } else if (resolvedClientNorm.endsWith(" sa") || resolvedClientNorm.endsWith(" s.a")) {
                const short = resolvedClientNorm.replace(/ s\.?a\.?$/, "").trim();
                if (clientSigleMap.has(short)) {
                    resolvedClientNorm = clientSigleMap.get(short);
                }
            }
        }

        let mCode = missionCodeMap.get(`${resolvedClientNorm}|${normActivity}`);
        if (!mCode && resolvedClientNorm) {
            const codes = clientMissionMap.get(resolvedClientNorm);
            if (codes && codes.length > 0) mCode = "FALLBACK";
        }

        if (!mCode) {
            failures.add(`FAIL: [${clientName}] - [${activityName}] (Resolved Client: ${resolvedClientNorm})`);
        }
    }

    console.log(`Found ${failures.size} unique failure patterns.`);
    Array.from(failures).forEach(f => console.log(f));
}

debug();
