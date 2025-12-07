require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Configuration
// TODO: User must provide this file
const CSV_FILE_PATH = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Mapping Dictionaries (to be populated)
const clientsMap = new Map();
const usersMap = new Map();
const buMap = new Map();

async function loadDependencies(client) {
    console.log('🔄 Loading dependencies...');

    // Load Companies
    const companiesRes = await client.query('SELECT id, name, sigle FROM companies');
    companiesRes.rows.forEach(r => {
        clientsMap.set(r.name.trim().toLowerCase(), r.id);
        if (r.sigle) clientsMap.set(r.sigle.trim().toLowerCase(), r.id);
    });

    // Load Users (Collaborateurs)
    const usersRes = await client.query('SELECT id, nom, prenom FROM collaborateurs');
    usersRes.rows.forEach(r => {
        // Map "Last First" and "First Last"
        const fullName1 = `${r.prenom} ${r.nom}`.trim().toLowerCase();
        const fullName2 = `${r.nom} ${r.prenom}`.trim().toLowerCase();
        usersMap.set(fullName1, r.id);
        usersMap.set(fullName2, r.id);
    });

    // Load BUs
    const buRes = await client.query('SELECT id, nom FROM business_units');
    buRes.rows.forEach(r => {
        buMap.set(r.nom.trim().toLowerCase(), r.id);
    });

    console.log(`✅ Loaded ${clientsMap.size} client keys, ${usersMap.size} user keys, ${buMap.size} BU keys.`);
}

async function importMissions() {
    console.log('🚀 Starting Missions Import...');

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ Error: File not found at ${CSV_FILE_PATH}`);
        console.error('👉 Please convert "EbVision - Mes missions.xlsx" to CSV and save it as "EbVision - Mes missions.csv"');
        process.exit(1);
    }

    const client = await pool.connect();

    try {
        await loadDependencies(client);
        await client.query('BEGIN');

        let rowsProcessed = 0;
        let rowsImported = 0;
        let errors = 0;

        const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv({ separator: ',' })); // Verify separator!

        for await (const row of stream) {
            rowsProcessed++;

            // TODO: Update these keys based on actual CSV Headers
            const missionName = row['Nom Mission'] || row['Libelle'];
            const clientName = row['Client'];
            const managerName = row['Manager']; // if exists
            const associeName = row['Associe'];
            const responsableName = row['Responsable'];

            if (!missionName) {
                // console.warn('Skipping empty row');
                continue;
            }

            // Resolve Foreign Keys
            const clientId = clientsMap.get(clientName?.trim().toLowerCase());
            // TODO: Robust mapping logic for Users (Manager, Associe, Responsable)

            // ... Logic pending actual file structure ...

            // Temporary log to debug first run
            if (rowsProcessed <= 5) {
                console.log('Row preview:', JSON.stringify(row));
            }
        }

        // await client.query('COMMIT'); // Uncomment when ready
        await client.query('ROLLBACK'); // Safety first
        console.log('⚠️  Rolled back (Dry Run). check logs.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

importMissions();
