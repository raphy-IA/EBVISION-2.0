require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { createObjectCsvWriter } = require('csv-writer');

// Files
const CLIENTS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const USER_MAPPING_FILE = path.join(__dirname, '../backups/Migration/preview_user_mapping_v7.csv');

// Outputs
const PREVIEW_CLIENTS = path.join(__dirname, '../backups/Migration/preview_clients_v1.csv');
const PREVIEW_MISSIONS = path.join(__dirname, '../backups/Migration/preview_missions_v1.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Helper to clean names for matching
function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function generateEntityPreviews() {
    console.log('🔍 Generating Client and Mission Previews...');
    const client = await pool.connect();

    // ---------------------------------------------------------
    // 0. Load Prerequisites (DB Companies, User Mapping)
    // ---------------------------------------------------------

    // A. Load Existing DB Companies
    const dbCompanies = new Map();
    try {
        const res = await client.query('SELECT id, name FROM companies');
        res.rows.forEach(r => dbCompanies.set(cleanName(r.name), r.id));
        console.log(`   Loaded ${dbCompanies.size} existing companies from DB.`);
    } catch (e) {
        console.error('Error loading DB companies:', e);
    }

    // B. Load User Mapping (V7) - To resolve names to emails/intentions
    // We map Source Name -> (Action, DB Match / Email)
    const userMap = new Map(); // Key: Clean Source Name
    if (fs.existsSync(USER_MAPPING_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(USER_MAPPING_FILE)
                .pipe(csv())
                .on('data', (row) => {
                    // row: ACTION, SOURCE_NAME, ALIASES_FOUND...
                    // We need to support looking up by "Source Name" OR any "Alias" found?
                    // The verified mapping V7 has "aliases" column "Robert Songo / Robert Songo Songo"
                    // We should map EACH alias to the final status

                    const action = row['ACTION']; // MATCH or CREATE_NEW
                    const finalName = row['DB_MATCH'] || row['SOURCE_NAME']; // The name we will use

                    const aliases = (row['ALIASES_FOUND'] || row['SOURCE_NAME']).split(' / ');
                    aliases.forEach(a => {
                        userMap.set(cleanName(a), {
                            action: action,
                            finalName: finalName
                        });
                    });
                })
                .on('end', resolve);
        });
        console.log(`   Loaded User Mapping (${userMap.size} aliases mapped).`);
    } else {
        console.warn('⚠️ User Mapping V7 not found. User matching in missions will be raw.');
    }

    // ---------------------------------------------------------
    // 1. Process CLIENTS
    // ---------------------------------------------------------
    console.log('🏗️ Processing Clients...');
    const clientRows = [];
    const clientSourceMap = new Map(); // CleanName -> OriginalName (for Mission match)

    if (fs.existsSync(CLIENTS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(CLIENTS_FILE)
                .pipe(csv({ separator: ',' })) // Previous check showed comma
                .on('data', (row) => {
                    // Headers: #, Nom, Sigle, Secteur, Pays, Administrateur
                    const nom = row['Nom'];
                    if (!nom) return;

                    const clean = cleanName(nom);
                    clientSourceMap.set(clean, nom); // Record existence in CSV

                    const exists = dbCompanies.has(clean);

                    clientRows.push({
                        action: exists ? 'SKIP (EXISTS)' : 'CREATE',
                        name: nom,
                        admin: row['Administrateur'] || '',
                        sector: row['Secteur'] || '',
                        country: row['Pays'] || ''
                    });
                })
                .on('end', resolve);
        });
    }

    if (clientRows.length > 0) {
        const writer = createObjectCsvWriter({
            path: PREVIEW_CLIENTS,
            header: [
                { id: 'action', title: 'ACTION' },
                { id: 'name', title: 'CLIENT_NAME' },
                { id: 'admin', title: 'ADMIN' },
                { id: 'sector', title: 'SECTOR' },
                { id: 'country', title: 'COUNTRY' },
            ]
        });
        await writer.writeRecords(clientRows);
        console.log(`✅ Client Preview: ${PREVIEW_CLIENTS} (${clientRows.length} rows)`);
    }

    // ---------------------------------------------------------
    // 2. Process MISSIONS
    // ---------------------------------------------------------
    console.log('🚀 Processing Missions...');
    const missionRows = [];

    if (fs.existsSync(MISSIONS_FILE)) {
        await new Promise((resolve) => {
            fs.createReadStream(MISSIONS_FILE)
                .pipe(csv({ separator: ';' })) // Missions use semicolon
                .on('data', (row) => {
                    const missionName = row['Nom'] || 'Untitled Mission';
                    const clientName = row['Client'];
                    const manager = row['Manager'];
                    const associe = row['Associé'];
                    const incharge = row['Incharge'] || row['Responsable'];

                    // Resolve Client
                    let clientStatus = 'UNKNOWN';
                    const cClean = cleanName(clientName);
                    if (dbCompanies.has(cClean)) {
                        clientStatus = 'LINK TO DB';
                    } else if (clientSourceMap.has(cClean)) {
                        clientStatus = 'LINK TO NEW';
                    } else {
                        clientStatus = 'MISSING CLIENT';
                    }

                    // Resolve Users
                    // Function to format user result
                    const resolveUser = (uName) => {
                        if (!uName) return '';
                        const info = userMap.get(cleanName(uName));
                        if (info) {
                            return `${info.action === 'MATCH' ? 'LINK' : 'NEW'}: ${info.finalName}`;
                        }
                        return `UNKNOWN: ${uName}`;
                    };

                    missionRows.push({
                        action: 'CREATE', // Always creating missions
                        name: missionName,
                        client_status: `${clientName} (${clientStatus})`,
                        manager_match: resolveUser(manager),
                        associe_match: resolveUser(associe),
                        incharge_match: resolveUser(incharge)
                    });
                })
                .on('end', resolve);
        });
    }

    if (missionRows.length > 0) {
        const writer = createObjectCsvWriter({
            path: PREVIEW_MISSIONS,
            header: [
                { id: 'action', title: 'ACTION' },
                { id: 'name', title: 'MISSION_NAME' },
                { id: 'client_status', title: 'CLIENT_MATCH' },
                { id: 'manager_match', title: 'MANAGER' },
                { id: 'associe_match', title: 'ASSOCIE' },
                { id: 'incharge_match', title: 'INCHARGE' }
            ]
        });
        await writer.writeRecords(missionRows);
        console.log(`✅ Mission Preview: ${PREVIEW_MISSIONS} (${missionRows.length} rows)`);
    }

    client.release();
    await pool.end();
}

generateEntityPreviews();
