require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

async function compare() {
    try {
        console.log('Comparing CSV vs DB Per Client...');

        // 1. Load DB Data
        const clientsRes = await pool.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const missionsRes = await pool.query('SELECT m.id, m.nom, m.client_id, bu.nom as bu_nom FROM missions m LEFT JOIN business_units bu ON m.business_unit_id = bu.id');
        const dbMissions = missionsRes.rows;

        // 2. Read CSV
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        // Group CSV by Client
        const csvByClient = {}; // Normalized Client Name -> [Mission Names]

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;
            const mission = cols[0];
            const clientName = cols[1];

            // Normalize client name for grouping
            let client = clients.find(c => c.nom.toLowerCase() === clientName.toLowerCase() || (c.sigle && c.sigle.toLowerCase() === clientName.toLowerCase()));
            if (!client) {
                // Try fuzzy find again or just key by raw name if not found
                // (Assume previous analysis confirmed clients exist, so strict/semi-strict match should work for most)
                // For now, key by lower case raw name
            }
            const key = client ? client.nom : `UNK: ${clientName}`;

            if (!csvByClient[key]) csvByClient[key] = [];
            csvByClient[key].push({ mission, bu: cols[2] });
        }

        // Compare
        console.log('---------------------------------------------------');
        for (const clientName of Object.keys(csvByClient).sort()) {
            console.log(`CLIENT: ${clientName}`);

            const csvList = csvByClient[clientName];
            // Find DB missions for this client
            const dbList = dbMissions.filter(m => {
                const c = clients.find(cl => cl.nom === clientName);
                return c && m.client_id === c.id;
            });

            // print side by side
            const max = Math.max(csvList.length, dbList.length);
            for (let i = 0; i < max; i++) {
                const csvItem = csvList[i] || { mission: '', bu: '' };
                const dbItem = dbList[i] || { nom: '', bu_nom: '' };

                const csvStr = csvItem.mission ? `[CSV] ${csvItem.mission.padEnd(50).substring(0, 50)} (${csvItem.bu})` : '';
                const dbStr = dbItem.nom ? `[DB] ${dbItem.nom} (${dbItem.bu_nom || 'No BU'})` : '';

                console.log(`  ${csvStr}  ||  ${dbStr}`);
            }
            console.log('---------------------------------------------------');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
compare();
