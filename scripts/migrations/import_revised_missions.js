require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission_export_min.csv');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function importRevised() {
    console.log('🚀 Importing Revised Mission Data...');
    const client = await pool.connect();

    try {
        // 1. Load Reference Data
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const buRes = await client.query('SELECT id, nom, code FROM business_units');
        const bus = buRes.rows;

        const divRes = await client.query('SELECT id, nom, code, business_unit_id FROM divisions');
        const divs = divRes.rows;

        const collabRes = await client.query('SELECT id, nom, prenom FROM collaborateurs');
        const collaborateurs = collabRes.rows;

        const missionsRes = await client.query('SELECT id, nom, client_id, description, business_unit_id, division_id, collaborateur_id, manager_id, associe_id, date_debut, date_fin FROM missions');
        const existingMissions = missionsRes.rows;

        // 2. Read CSV
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        console.log(`📂 Processing ${lines.length - 1} entries from revised CSV...`);

        let stats = { updated: 0, skipped: 0, errors: 0, datesFixed: 0 };

        // Helper: Find collaborateur by "Prenom Nom" string
        const findCollab = (fullName) => {
            if (!fullName || fullName.trim().length === 0) return null;
            const parts = fullName.trim().split(/\s+/);
            if (parts.length < 2) {
                // Try matching on nom only
                return collaborateurs.find(c => normalize(c.nom) === normalize(fullName));
            }
            const prenom = parts[0];
            const nom = parts.slice(1).join(' ');
            // Try exact match
            let match = collaborateurs.find(c =>
                normalize(c.prenom) === normalize(prenom) &&
                normalize(c.nom) === normalize(nom)
            );
            // If not found, try reversed
            if (!match) {
                match = collaborateurs.find(c =>
                    normalize(c.nom) === normalize(prenom) &&
                    normalize(c.prenom) === normalize(nom)
                );
            }
            return match;
        };

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 7) {
                console.warn(`⚠️ Line ${i + 1}: Not enough columns. Skipping.`);
                stats.errors++;
                continue;
            }

            const missionName = cols[0];
            const clientName = cols[1];
            const buName = cols[2];
            const divName = cols[3];
            const description = cols[4];
            // const typeMission = cols[5]; // Already forced to PREVIOUS ENGAGEMENT
            const responsableName = cols[6];
            const managerName = cols[7];
            const associeName = cols[8];

            // Resolve Client
            let dbClient = clients.find(c => normalize(c.nom) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.sigle) === normalize(clientName));
            if (!dbClient) {
                console.error(`❌ Line ${i + 1}: Client '${clientName}' not found.`);
                stats.errors++;
                continue;
            }

            // Find Mission
            const dbMission = existingMissions.find(m =>
                m.client_id === dbClient.id &&
                normalize(m.nom) === normalize(missionName)
            );

            if (!dbMission) {
                console.warn(`⚠️ Line ${i + 1}: Mission '${missionName}' for client '${clientName}' not found in DB. Skipping.`);
                stats.skipped++;
                continue;
            }

            // Resolve entities
            let newBuId = null;
            if (buName) {
                const bu = bus.find(b => normalize(b.nom) === normalize(buName) || normalize(b.code) === normalize(buName));
                if (bu) newBuId = bu.id;
            }

            let newDivId = null;
            if (divName) {
                const div = divs.find(d => normalize(d.nom) === normalize(divName) || normalize(d.code) === normalize(divName));
                if (div) newDivId = div.id;
            } else {
                newDivId = null; // Explicitly set to null if CSV is empty
            }

            const respCollab = findCollab(responsableName);
            const manCollab = findCollab(managerName);
            const assocCollab = findCollab(associeName);

            // Build update query
            let updates = [];
            let values = [];
            let paramIndex = 1;

            // Description
            if (description && description !== dbMission.description) {
                updates.push(`description = $${paramIndex++}`);
                values.push(description);
            }

            // BU
            if (newBuId !== dbMission.business_unit_id) {
                updates.push(`business_unit_id = $${paramIndex++}`);
                values.push(newBuId);
            }

            // Division
            if (newDivId !== dbMission.division_id) {
                updates.push(`division_id = $${paramIndex++}`);
                values.push(newDivId);
            }

            // Responsable
            const respId = respCollab ? respCollab.id : null;
            if (respId !== dbMission.collaborateur_id) {
                updates.push(`collaborateur_id = $${paramIndex++}`);
                values.push(respId);
            }

            // Manager
            const manId = manCollab ? manCollab.id : null;
            if (manId !== dbMission.manager_id) {
                updates.push(`manager_id = $${paramIndex++}`);
                values.push(manId);
            }

            // Associé
            const assocId = assocCollab ? assocCollab.id : null;
            if (assocId !== dbMission.associe_id) {
                updates.push(`associe_id = $${paramIndex++}`);
                values.push(assocId);
            }

            // Dates (if null, set to 2025)
            if (!dbMission.date_debut) {
                updates.push(`date_debut = $${paramIndex++}`);
                values.push('2025-01-01');
                stats.datesFixed++;
            }
            if (!dbMission.date_fin) {
                updates.push(`date_fin = $${paramIndex++}`);
                values.push('2025-12-31');
            }

            if (updates.length > 0) {
                updates.push(`updated_at = NOW()`);
                values.push(dbMission.id);
                const query = `UPDATE missions SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
                await client.query(query, values);
                stats.updated++;
            } else {
                stats.skipped++;
            }
        }

        console.log('\n--- IMPORT RESULTS ---');
        console.log(`Updated: ${stats.updated}`);
        console.log(`Skipped (No Changes): ${stats.skipped}`);
        console.log(`Errors: ${stats.errors}`);
        console.log(`Dates Fixed (Set to 2025): ${stats.datesFixed}`);
        console.log('----------------------');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

importRevised();
