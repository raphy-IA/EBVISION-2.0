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

async function analyzeRemainingErrors() {
    console.log('Analyzing Remaining Import Errors...\n');
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

        // Read CSV as UTF-8
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        const header = lines[0].split(';').map(h => h.trim());
        const colIdx = {
            nom: header.findIndex(h => h.toLowerCase() === 'nom'),
            email: header.findIndex(h => h.toLowerCase() === 'email'),
            activite: header.findIndex(h => h.toLowerCase().includes('mission') || h.toLowerCase().includes('activit')),
            client: header.findIndex(h => h.toLowerCase() === 'client'),
            typeHeure: header.findIndex(h => h.toLowerCase().includes('type'))
        };

        const missedMissions = new Map();
        const missedActivities = new Map();

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim());
            const email = cols[colIdx.email] || '';
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
                    if (!missedMissions.has(key)) {
                        missedMissions.set(key, { activite, client: clientName, emails: new Set() });
                    }
                    missedMissions.get(key).emails.add(email);
                }
            } else if (!isChargeable) {
                // Internal Activity
                const found = activities.find(a => normalize(a.name) === normalize(activite) || normalize(a.name).includes(normalize(activite).substring(0, 15)));
                if (!found) {
                    if (!missedActivities.has(activite)) {
                        missedActivities.set(activite, { emails: new Set() });
                    }
                    missedActivities.get(activite).emails.add(email);
                }
            }
        }

        console.log('=== MISSED MISSIONS ===');
        missedMissions.forEach((data, key) => {
            console.log('\n📋 Mission: ' + data.activite);
            console.log('   Client: ' + data.client);
            console.log('   Collaborateurs: ' + Array.from(data.emails).join(', '));
        });

        console.log('\n\n=== MISSED INTERNAL ACTIVITIES ===');
        missedActivities.forEach((data, name) => {
            console.log('\n📋 Activity: ' + name);
            console.log('   Collaborateurs: ' + Array.from(data.emails).join(', '));
        });

        // Get BU info for collaborators who use the missing activity
        console.log('\n\n=== COLLABORATOR BU INFO ===');
        for (const [actName, data] of missedActivities) {
            for (const email of data.emails) {
                const collabRes = await client.query(`
                    SELECT c.nom, c.prenom, c.email, bu.nom as bu_nom, bu.id as bu_id
                    FROM collaborateurs c
                    LEFT JOIN business_units bu ON c.business_unit_id = bu.id
                    WHERE c.email = $1
                `, [email]);
                if (collabRes.rows.length > 0) {
                    const c = collabRes.rows[0];
                    console.log(`  ${c.prenom} ${c.nom} (${c.email}) -> BU: ${c.bu_nom || 'N/A'}`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

analyzeRemainingErrors();
