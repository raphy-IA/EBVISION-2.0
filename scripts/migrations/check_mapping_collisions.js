require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

// Utilitaires de normalisation (Même logique que le script de migration)
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

async function checkCollisions() {
    console.log('Checking for Mapping Collisions...');
    const client = await pool.connect();

    try {
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const missionsRes = await client.query('SELECT id, nom, client_id FROM missions');
        const existingMissions = missionsRes.rows;

        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        const mappings = new Map(); // DB_Mission_ID -> [CSV Lines]

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            const missionName = cols[0];
            const clientName = cols[1];

            // 1. Resolve Client
            let dbClient = clients.find(c => normalize(c.nom) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.sigle) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.nom).includes(normalize(clientName)));

            if (!dbClient) continue;

            // 2. Resolve Mission
            const clientMissions = existingMissions.filter(m => m.client_id === dbClient.id);
            let targetMission = null;

            if (clientMissions.length === 1) {
                targetMission = clientMissions[0];
            } else if (clientMissions.length > 1) {
                targetMission = clientMissions.find(m => normalize(m.nom) === normalize(missionName));
                if (!targetMission) {
                    let bestDist = 999;
                    let bestMatch = null;
                    for (const m of clientMissions) {
                        const dist = levenshtein(normalize(m.nom), normalize(missionName));
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestMatch = m;
                        }
                    }
                    if (bestMatch) targetMission = bestMatch;
                }
            }

            if (targetMission) {
                if (!mappings.has(targetMission.id)) {
                    mappings.set(targetMission.id, []);
                }
                mappings.get(targetMission.id).push({
                    line: i + 1,
                    csvName: missionName,
                    dbName: targetMission.nom
                });
            }
        }

        console.log('\n--- COLLISION REPORT ---');
        let collisionCount = 0;
        mappings.forEach((sources, missionId) => {
            if (sources.length > 1) {
                console.log(`\nDB Mission ID ${missionId} matched by ${sources.length} CSV lines:`);
                sources.forEach(s => console.log(` - Line ${s.line}: "${s.csvName}" (Matched DB: "${s.dbName}")`));
                collisionCount++;
            }
        });

        if (collisionCount === 0) {
            console.log('No collisions found. 1-to-1 mapping verified.');
        } else {
            console.log(`\nFound ${collisionCount} DB missions targeted by multiple CSV lines.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkCollisions();
