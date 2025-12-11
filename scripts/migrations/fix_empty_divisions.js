require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function fixEmptyDivisions() {
    console.log('🧹 fixing Empty Divisions (Enforcing NULL)...');
    const client = await pool.connect();

    try {
        // 1. Load Data
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const missionsRes = await client.query('SELECT id, nom, client_id, division_id FROM missions');
        const existingMissions = missionsRes.rows;

        // 2. Read CSV
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        let updatesCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            const missionName = cols[0];
            const clientName = cols[1];
            // const buName = cols[2];
            const divName = cols[3]; // The source of truth for division

            // If CSV says "Division" is explicitly provided, we skip (handled by main migration)
            // We only care if CSV is EMPTY but DB is NOT
            if (divName && divName.length > 0) continue;

            // Resolve Client
            let dbClient = clients.find(c => normalize(c.nom) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.sigle) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.nom).includes(normalize(clientName)));
            if (!dbClient) continue;

            // Find Mission
            const dbMission = existingMissions.find(m =>
                m.client_id === dbClient.id &&
                normalize(m.nom) === normalize(missionName)
            );

            if (dbMission) {
                // BUG FIX: If CSV Div is empty, DB Div MUST be null
                if (dbMission.division_id !== null) {
                    console.log(`❌ Fix needed for: "${dbMission.nom}" (Client: ${clientName})`);
                    console.log(`   Has Division ID: ${dbMission.division_id} -> Shound be NULL`);

                    await client.query('UPDATE missions SET division_id = NULL WHERE id = $1', [dbMission.id]);
                    updatesCount++;
                }
            }
        }

        console.log(`\n✅ Fixed ${updatesCount} missions by clearing invalid Division links.`);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixEmptyDivisions();
