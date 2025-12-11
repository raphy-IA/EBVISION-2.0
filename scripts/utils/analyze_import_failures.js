require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/time_entries_1.csv');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function analyzeFailures() {
    console.log('Analyzing Time Entry Import Failures...\n');
    const client = await pool.connect();

    try {
        // Load reference data
        const missionsRes = await client.query(`
            SELECT m.nom, c.nom as client_nom, c.sigle 
            FROM missions m 
            LEFT JOIN clients c ON m.client_id = c.id
        `);
        const missions = missionsRes.rows;

        const iaRes = await client.query('SELECT name FROM internal_activities');
        const activities = iaRes.rows;

        // Read CSV
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        const header = lines[0].split(';').map(h => h.trim());
        const colIdx = {
            activite: header.findIndex(h => h.toLowerCase().includes('mission') || h.toLowerCase().includes('activit')),
            client: header.findIndex(h => h.toLowerCase() === 'client'),
            typeHeure: header.findIndex(h => h.toLowerCase().includes('type'))
        };

        const missedMissions = new Map();
        const missedActivities = new Map();

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim());
            const activite = cols[colIdx.activite] || '';
            const clientName = cols[colIdx.client] || '';
            const typeHeure = cols[colIdx.typeHeure] || '';

            const isChargeable = typeHeure.toLowerCase().includes('chargeable') && !typeHeure.toLowerCase().includes('non');

            if (isChargeable && clientName) {
                // Mission
                const found = missions.find(m =>
                    (normalize(m.nom) === normalize(activite) || normalize(m.nom).includes(normalize(activite).substring(0, 20))) &&
                    (normalize(m.client_nom) === normalize(clientName) || (m.sigle && normalize(m.sigle) === normalize(clientName)))
                );
                if (!found) {
                    const key = activite + ' | ' + clientName;
                    missedMissions.set(key, (missedMissions.get(key) || 0) + 1);
                }
            } else {
                // Internal Activity
                const found = activities.find(a => normalize(a.name) === normalize(activite) || normalize(a.name).includes(normalize(activite).substring(0, 15)));
                if (!found) {
                    missedActivities.set(activite, (missedActivities.get(activite) || 0) + 1);
                }
            }
        }

        console.log('=== MISSED MISSIONS (' + missedMissions.size + ') ===');
        Array.from(missedMissions.entries()).slice(0, 20).forEach(([key, count]) => {
            console.log('  [' + count + 'x] ' + key);
        });

        console.log('\n=== MISSED INTERNAL ACTIVITIES (' + missedActivities.size + ') ===');
        Array.from(missedActivities.entries()).forEach(([name, count]) => {
            console.log('  [' + count + 'x] ' + name);
        });

        // Show what activities exist in DB
        console.log('\n=== EXISTING INTERNAL ACTIVITIES IN DB ===');
        activities.forEach(a => console.log('  - ' + a.name));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

analyzeFailures();
