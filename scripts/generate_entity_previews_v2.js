require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { createObjectCsvWriter } = require('csv-writer');

// Files
const CLIENTS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const User_MAPPING_V7 = path.join(__dirname, '../backups/Migration/preview_user_mapping_v7.csv');
const BU_MAPPING_FILE = path.join(__dirname, '../backups/Migration/match_BU_DIV.csv');

// Outputs
const PREVIEW_CLIENTS = path.join(__dirname, '../backups/Migration/preview_clients_filtered_v2.csv');
const PREVIEW_MISSIONS = path.join(__dirname, '../backups/Migration/preview_missions_v2_with_bu.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function generateEntityPreviewsV2() {
    console.log('🔍 Generating Client (Filtered) and Mission (BU Mapped) Previews V2...');
    const client = await pool.connect();

    // ---------------------------------------------------------
    // 0. Load Prerequisites
    // ---------------------------------------------------------

    // A. DB Companies
    const dbCompanies = new Map();
    try {
        const res = await client.query('SELECT id, name FROM companies');
        res.rows.forEach(r => dbCompanies.set(cleanName(r.name), r.id));
    } catch (e) { console.error('Error loading DB companies:', e); }

    // B. DB BUs and Divisions
    const dbBUs = new Map(); // CleanName -> {id, name}
    const dbDivisions = new Map(); // CleanName -> {id, name}
    try {
        const r1 = await client.query('SELECT id, name FROM business_units');
        r1.rows.forEach(r => dbBUs.set(cleanName(r.name), r));
        const r2 = await client.query('SELECT id, name FROM divisions');
        r2.rows.forEach(r => dbDivisions.set(cleanName(r.name), r));
        console.log(`   Loaded ${dbBUs.size} BUs and ${dbDivisions.size} Divisions from DB.`);
    } catch (e) { console.error('Error loading BU/Divs:', e); }

    // C. User Mapping V7
    const userMap = new Map();
    if (fs.existsSync(User_MAPPING_V7)) {
        await new Promise((resolve) => {
            fs.createReadStream(User_MAPPING_V7)
                .pipe(csv())
                .on('data', (row) => {
                    const action = row['ACTION'];
                    const finalName = row['DB_MATCH'] || row['SOURCE_NAME'];
                    const aliases = (row['ALIASES_FOUND'] || row['SOURCE_NAME']).split(' / ');
                    aliases.forEach(a => {
                        userMap.set(cleanName(a), { action, finalName });
                    });
                })
                .on('end', resolve);
        });
    }

    // D. BU Mapping File
    const buFileMap = new Map(); // Old BU Clean -> { newBU, newDiv }
    if (fs.existsSync(BU_MAPPING_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(BU_MAPPING_FILE)
                .pipe(csv({ separator: ';' })) // Check separator!
                .on('data', (row) => {
                    // BU OLD;DIVISION OLD;BU NEW;Division NEW
                    const oldBu = row['BU OLD'];
                    const newBu = row['BU NEW'];
                    const newDiv = row['Division NEW'];
                    if (oldBu) {
                        buFileMap.set(cleanName(oldBu), {
                            newBu: newBu ? newBu.trim() : '',
                            newDiv: newDiv ? newDiv.trim() : ''
                        });
                    }
                })
                .on('end', resolve);
        });
        console.log(`   Loaded BU Mapping (${buFileMap.size} rules).`);
    }

    // ---------------------------------------------------------
    // 1. Scan MISSIONS First (Collect Used Clients)
    // ---------------------------------------------------------
    console.log('🚀 Scanning Missions to identify necessary Clients...');
    const usedClients = new Set();
    const missionData = []; // Buffer to process later

    if (fs.existsSync(MISSIONS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(MISSIONS_FILE)
                .pipe(csv({ separator: ';' }))
                .on('data', (row) => {
                    // Collect Client
                    const cName = row['Client'];
                    if (cName) usedClients.add(cleanName(cName));

                    // Parse User
                    const manager = row['Manager'];
                    const associe = row['Associé'];
                    const incharge = row['Incharge'] || row['Responsable'];

                    // BU Mapping
                    const sourceBu = row['B.U'];
                    let targetBu = 'UNKNOWN';
                    let targetDiv = 'UNKNOWN';
                    let buStatus = 'MISSING MAPPING';

                    if (sourceBu) {
                        const map = buFileMap.get(cleanName(sourceBu));
                        if (map) {
                            targetBu = map.newBu || '(None)';
                            targetDiv = map.newDiv || '(None)';

                            // Check DB Existence
                            const buExists = dbBUs.has(cleanName(targetBu));
                            // Div check optional if empty
                            const divExists = !map.newDiv || dbDivisions.has(cleanName(targetDiv));

                            buStatus = (buExists && divExists) ? 'OK' : 'DB MISSING';
                        }
                    }

                    // Resolve User Display
                    const resolveUser = (u) => {
                        if (!u) return '';
                        const info = userMap.get(cleanName(u));
                        return info ? `${info.action === 'MATCH' ? 'LINK' : 'NEW'}: ${info.finalName}` : `UNKNOWN: ${u}`;
                    };

                    missionData.push({
                        name: row['Nom'] || 'Untitled',
                        client: cName || 'Unknown',
                        manager: resolveUser(manager),
                        associe: resolveUser(associe),
                        incharge: resolveUser(incharge),
                        source_bu: sourceBu || '',
                        target_bu: targetBu,
                        target_div: targetDiv,
                        bu_status: buStatus
                    });
                })
                .on('end', resolve);
        });
    }

    // ---------------------------------------------------------
    // 2. Process CLIENTS (Filter by Used)
    // ---------------------------------------------------------
    console.log(`🏗️ Processing Clients (Used count: ${usedClients.size})...`);
    const clientRows = [];

    if (fs.existsSync(CLIENTS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(CLIENTS_FILE)
                .pipe(csv({ separator: ',' }))
                .on('data', (row) => {
                    const nom = row['Nom'];
                    if (!nom) return;

                    const clean = cleanName(nom);

                    // FILTER: Only if in usedClients
                    if (!usedClients.has(clean)) return;

                    const exists = dbCompanies.has(clean);

                    clientRows.push({
                        action: exists ? 'SKIP (EXISTS)' : 'CREATE',
                        name: nom,
                        db_match: exists ? 'YES' : 'NO',
                        admin: row['Administrateur'] || '',
                        sector: row['Secteur'] || '',
                        country: row['Pays'] || ''
                    });
                })
                .on('end', resolve);
        });
    }

    // Write Client Preview
    if (clientRows.length > 0) {
        const writer = createObjectCsvWriter({
            path: PREVIEW_CLIENTS,
            header: [
                { id: 'action', title: 'ACTION' },
                { id: 'name', title: 'CLIENT_NAME' },
                { id: 'db_match', title: 'IN_DB?' },
                { id: 'admin', title: 'ADMIN' },
                { id: 'sector', title: 'SECTOR' },
                { id: 'country', title: 'COUNTRY' },
            ]
        });
        await writer.writeRecords(clientRows);
        console.log(`✅ Filtered Client Preview: ${PREVIEW_CLIENTS} (${clientRows.length} rows)`);
    }

    // Write Mission Preview (from buffer)
    if (missionData.length > 0) {
        // Enrich mission data with client status found in step 2?
        // Actually step 1 checked client name against used set, but step 2 checked DB existence.
        // We can just rely on missionData we built.

        const writer = createObjectCsvWriter({
            path: PREVIEW_MISSIONS,
            header: [
                { id: 'name', title: 'MISSION_NAME' },
                { id: 'client', title: 'CLIENT' },
                { id: 'source_bu', title: 'SOURCE_BU' },
                { id: 'target_bu', title: 'Mapped BU' },
                { id: 'target_div', title: 'Mapped Division' },
                { id: 'bu_status', title: 'BU_STATUS' },
                { id: 'manager', title: 'MANAGER' },
                { id: 'associe', title: 'ASSOCIE' },
                { id: 'incharge', title: 'INCHARGE' }
            ]
        });
        await writer.writeRecords(missionData);
        console.log(`✅ Mission Preview with BU: ${PREVIEW_MISSIONS} (${missionData.length} rows)`);
    }

    client.release();
    await pool.end();
}

generateEntityPreviewsV2();
