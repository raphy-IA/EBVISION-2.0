require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

// Aggressive normalization: lowercase, remove non-alphanumeric, accents
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, ""); // Keep only alphanumeric
};

async function analyze() {
    try {
        console.log('Starting NORMALIZED analysis...');

        // 1. Load Reference Data
        const clientsRes = await pool.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const buRes = await pool.query('SELECT id, nom, code FROM business_units');
        const bus = buRes.rows;

        const divRes = await pool.query('SELECT id, nom, code, business_unit_id FROM divisions');
        const divs = divRes.rows;

        const missionsRes = await pool.query('SELECT m.id, m.nom, m.client_id, m.business_unit_id, m.division_id, c.nom as client_nom FROM missions m LEFT JOIN clients c ON m.client_id = c.id');
        const existingMissions = missionsRes.rows;

        // 2. Read CSV
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        console.log(`Analyzing ${lines.length - 1} rows from CSV...`);

        const report = {
            total_csv: lines.length - 1,
            matched: 0,
            updates_needed: [],
            new_missions: [],
            missing_clients: new Set(),
            missing_bus: new Set()
        };

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            const missionName = cols[0];
            const clientName = cols[1];
            const buName = cols[2];
            const divName = cols[3];

            const normClientName = normalize(clientName);
            const normMissionName = normalize(missionName);
            const normBuName = normalize(buName);
            const normDivName = normalize(divName);

            // 1. Resolve Client
            let client = clients.find(c => normalize(c.nom) === normClientName);
            if (!client) client = clients.find(c => normalize(c.sigle) === normClientName); // Try sigle

            if (!client) {
                // Try finding by SUBSTRING match if strict fails (for very long names)
                client = clients.find(c => normalize(c.nom).includes(normClientName) || normClientName.includes(normalize(c.nom)));
            }

            if (!client) {
                report.missing_clients.add(clientName);
                // console.log(`Missing Client: ${clientName} (Norm: ${normClientName})`);
                continue;
            }

            // 2. Resolve BU
            let bu = bus.find(b => normalize(b.nom) === normBuName || normalize(b.code) === normBuName);
            if (!bu && buName) report.missing_bus.add(buName);

            // 3. Resolve Div
            let div = null;
            if (divName) {
                div = divs.find(d => normalize(d.nom) === normDivName || normalize(d.code) === normDivName);
            }

            // 4. Find Mission (Normalized check)
            const existing = existingMissions.find(m => m.client_id === client.id && normalize(m.nom) === normMissionName);

            if (existing) {
                const updates = [];
                // Check BU
                if (bu) {
                    if (existing.business_unit_id !== bu.id) {
                        const currentBuName = bus.find(b => b.id === existing.business_unit_id)?.nom || 'NULL';
                        updates.push(`BU: '${currentBuName}' -> '${bu.nom}'`);
                    }
                }

                // Check Div
                if (div) {
                    if (existing.division_id !== div.id) {
                        const currentDivName = divs.find(d => d.id === existing.division_id)?.nom || 'NULL';
                        updates.push(`Div: '${currentDivName}' -> '${div.nom}'`);
                    }
                }

                if (updates.length > 0) {
                    report.updates_needed.push({
                        mission: missionName,
                        client: client.nom,
                        updates: updates
                    });
                } else {
                    report.matched++;
                }

            } else {
                // Check if mission exists for THIS client but with SLIGHTLY different name?
                // Levenshtein check effectively
                report.new_missions.push({
                    mission: missionName,
                    client: client.nom
                });
            }
        }

        console.log('\n--- NORMALIZED ANALYSIS REPORT ---');
        console.log(`Total CSV: ${report.total_csv}`);
        console.log(`Matched: ${report.matched}`);
        console.log(`Updates Needed: ${report.updates_needed.length}`);
        if (report.updates_needed.length > 0) {
            console.log('Sample updates:');
            report.updates_needed.slice(0, 5).forEach(u => console.log(`  - ${u.mission} (${u.client}): ${u.updates.join(', ')}`));
        }

        console.log(`New Missions (No Match Found): ${report.new_missions.length}`);
        if (report.new_missions.length > 0) {
            console.log('Sample New Missions:');
            report.new_missions.slice(0, 5).forEach(n => console.log(`  - ${n.mission} (${n.client})`));
        }

        console.log(`Missing Clients: ${report.missing_clients.size} (${Array.from(report.missing_clients).join(', ')})`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
analyze();
