require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission_export_min.csv');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

async function importRevised() {
    console.log('🚀 Importing Revised Mission Data (v2 - Encoding Fix)...');
    const client = await pool.connect();

    try {
        // Try reading with different encodings
        let fileContent;
        try {
            // Try UTF-8 first
            fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
            // Check for mojibake (UTF-8 read as Latin1)
            if (fileContent.includes('�') || fileContent.includes('Ã©') || fileContent.includes('Ã ')) {
                console.log('⚠️ UTF-8 failed, trying Latin1...');
                fileContent = fs.readFileSync(CSV_PATH, 'latin1');
            }
        } catch (e) {
            console.log('⚠️ Falling back to Latin1...');
            fileContent = fs.readFileSync(CSV_PATH, 'latin1');
        }

        // 1. Load Reference Data
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        const clientsDb = clientsRes.rows;

        const buRes = await client.query('SELECT id, nom, code FROM business_units');
        const busDb = buRes.rows;

        const divRes = await client.query('SELECT id, nom, code, business_unit_id FROM divisions');
        const divsDb = divRes.rows;

        const collabRes = await client.query('SELECT id, nom, prenom FROM collaborateurs');
        const collaborateurs = collabRes.rows;

        const missionsRes = await client.query('SELECT id, nom, client_id, description, business_unit_id, division_id, collaborateur_id, manager_id, associe_id, date_debut, date_fin FROM missions');
        const existingMissions = missionsRes.rows;

        // 2. Parse CSV
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
        const header = lines[0].split(';').map(h => h.trim());

        console.log('📋 Header columns:', header);

        // Find column indices
        const colIdx = {
            mission: header.findIndex(h => normalize(h) === 'mission'),
            client: header.findIndex(h => normalize(h) === 'client'),
            bu: header.findIndex(h => normalize(h).includes('business')),
            div: header.findIndex(h => normalize(h) === 'division'),
            desc: header.findIndex(h => normalize(h) === 'description'),
            type: header.findIndex(h => normalize(h).includes('type')),
            resp: header.findIndex(h => normalize(h) === 'responsable'),
            man: header.findIndex(h => normalize(h) === 'manager'),
            assoc: header.findIndex(h => normalize(h) === 'associe'),
            modif: header.findIndex(h => normalize(h) === 'action')
        };

        console.log('📊 Column indices:', colIdx);

        let stats = { updated: 0, skipped: 0, notFound: 0, datesFixed: 0, modifiedRows: 0 };

        // Helper: Find collaborateur by "Prenom Nom" string
        const findCollab = (fullName) => {
            if (!fullName || fullName.trim().length === 0) return null;
            const nameParts = fullName.trim().split(/\s+/);

            // Try multiple matching strategies
            for (const collab of collaborateurs) {
                const collabFull = normalize(collab.prenom + collab.nom);
                const inputFull = normalize(fullName);

                // Exact match on normalized full name
                if (collabFull === inputFull) return collab;

                // Match on prenom + nom
                if (nameParts.length >= 2) {
                    const inputPrenom = normalize(nameParts[0]);
                    const inputNom = normalize(nameParts.slice(1).join(''));

                    if (normalize(collab.prenom) === inputPrenom && normalize(collab.nom) === inputNom) return collab;
                    if (normalize(collab.nom) === inputPrenom && normalize(collab.prenom) === inputNom) return collab;
                }

                // Partial match (contains)
                if (collabFull.includes(inputFull) || inputFull.includes(collabFull)) return collab;
            }

            console.log(`   ⚠️ Collab not found: "${fullName}"`);
            return null;
        };

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));

            const missionName = cols[colIdx.mission] || '';
            const clientName = cols[colIdx.client] || '';
            const buName = cols[colIdx.bu] || '';
            const divName = cols[colIdx.div] || '';
            const description = cols[colIdx.desc] || '';
            const responsableName = cols[colIdx.resp] || '';
            const managerName = cols[colIdx.man] || '';
            const associeName = cols[colIdx.assoc] || '';
            const modifie = cols[colIdx.modif] || '';

            // Only process rows marked as modified (Action column contains 'Modifié')
            if (!modifie || !normalize(modifie).includes('modif')) {
                stats.skipped++;
                continue;
            }

            stats.modifiedRows++;
            console.log(`\n[${i}] Processing: ${missionName.substring(0, 50)}... (${modifie})`);

            // Resolve Client
            let dbClient = clientsDb.find(c => normalize(c.nom) === normalize(clientName));
            if (!dbClient) dbClient = clientsDb.find(c => c.sigle && normalize(c.sigle) === normalize(clientName));
            if (!dbClient) dbClient = clientsDb.find(c => normalize(c.nom).includes(normalize(clientName)) || normalize(clientName).includes(normalize(c.nom)));

            if (!dbClient) {
                console.log(`   ❌ Client not found: "${clientName}"`);
                stats.notFound++;
                continue;
            }

            // Find Mission (fuzzy match)
            let dbMission = existingMissions.find(m =>
                m.client_id === dbClient.id &&
                normalize(m.nom) === normalize(missionName)
            );

            // Try partial match if exact fails
            if (!dbMission) {
                const clientMissions = existingMissions.filter(m => m.client_id === dbClient.id);
                dbMission = clientMissions.find(m =>
                    normalize(m.nom).includes(normalize(missionName).substring(0, 20)) ||
                    normalize(missionName).includes(normalize(m.nom).substring(0, 20))
                );
            }

            if (!dbMission) {
                console.log(`   ❌ Mission not found for client ${clientName}`);
                stats.notFound++;
                continue;
            }

            // Resolve BU
            let newBuId = dbMission.business_unit_id;
            if (buName) {
                const bu = busDb.find(b => normalize(b.nom) === normalize(buName) || normalize(b.code) === normalize(buName));
                if (bu) {
                    newBuId = bu.id;
                } else {
                    console.log(`   ⚠️ BU not found: "${buName}"`);
                }
            }

            // Resolve Division
            let newDivId = divName ? null : null; // Default to null if empty
            if (divName && divName.trim().length > 0) {
                const div = divsDb.find(d => normalize(d.nom) === normalize(divName) || normalize(d.code) === normalize(divName));
                if (div) {
                    newDivId = div.id;
                } else {
                    console.log(`   ⚠️ Division not found: "${divName}"`);
                }
            }

            // Resolve Personnel
            const respCollab = findCollab(responsableName);
            const manCollab = findCollab(managerName);
            const assocCollab = findCollab(associeName);

            // Build and execute update
            const updateQuery = `
                UPDATE missions SET
                    description = $1,
                    business_unit_id = $2,
                    division_id = $3,
                    collaborateur_id = $4,
                    manager_id = $5,
                    associe_id = $6,
                    date_debut = COALESCE(date_debut, $7),
                    date_fin = COALESCE(date_fin, $8),
                    updated_at = NOW()
                WHERE id = $9
            `;

            const values = [
                description || dbMission.description,
                newBuId,
                newDivId,
                respCollab ? respCollab.id : dbMission.collaborateur_id,
                manCollab ? manCollab.id : dbMission.manager_id,
                assocCollab ? assocCollab.id : dbMission.associe_id,
                '2025-01-01',
                '2025-12-31',
                dbMission.id
            ];

            await client.query(updateQuery, values);
            console.log(`   ✅ Updated: BU=${buName}, Div=${divName || 'NULL'}, Resp=${responsableName}, Man=${managerName}, Assoc=${associeName}`);
            stats.updated++;
        }

        console.log('\n--- IMPORT RESULTS (v2) ---');
        console.log(`Rows Marked as Modified: ${stats.modifiedRows}`);
        console.log(`Updated: ${stats.updated}`);
        console.log(`Skipped (Not Modified): ${stats.skipped}`);
        console.log(`Not Found: ${stats.notFound}`);
        console.log('---------------------------');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

importRevised();
