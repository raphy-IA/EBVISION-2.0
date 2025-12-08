require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
const { Pool } = require('pg');

const MISSIONS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.xlsx');
const TIMESHEETS_FILE = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runGlobalAnalysis() {
    console.log('📊 Starting Comprehensive Migration Analysis...\n');
    let analysis = {
        missions: { status: 'UNKNOWN', count: 0, sample: null },
        timesheets: { status: 'UNKNOWN', userMatches: 0, userTotal: 0 }
    };

    // 1. Analyze Missions (XLSX)
    console.log('--- 1. Missions File Analysis ---');
    if (fs.existsSync(MISSIONS_FILE)) {
        try {
            const workbook = XLSX.readFile(MISSIONS_FILE);
            const sheetName = workbook.SheetNames[0];
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (data.length > 0) {
                console.log(`✅ Loaded Missions XLSX. Found ${data.length} rows.`);
                console.log('Sample Headers:', Object.keys(data[0]).join(', '));
                analysis.missions.status = 'READY';
                analysis.missions.count = data.length;
                analysis.missions.sample = data[0];
            } else {
                console.warn('⚠️  Missions File is empty.');
                analysis.missions.status = 'EMPTY';
            }
        } catch (e) {
            console.error('❌ Failed to read Missions XLSX:', e.message);
            analysis.missions.status = 'ERROR';
        }
    } else {
        console.error('❌ Missions File NOT FOUND.');
        analysis.missions.status = 'MISSING';
    }

    // 2. Analyze Timesheets (CSV Encoding & User Mapping)
    console.log('\n--- 2. Timesheets & User Mapping ---');
    if (fs.existsSync(TIMESHEETS_FILE)) {
        try {
            // Read with decoding
            const buffer = fs.readFileSync(TIMESHEETS_FILE);
            const decodedContent = iconv.decode(buffer, 'win1252'); // Try Windows-1252

            // Extract Names via simple split (quick check)
            const lines = decodedContent.split('\n');
            const csvNames = new Set();
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(';');
                if (parts[0]) csvNames.add(parts[0].trim());
            }

            // DB Check
            const client = await pool.connect();
            const dbNames = new Set();
            const res = await client.query('SELECT nom, prenom FROM collaborateurs');
            client.release();

            const dbUsers = res.rows.map(u => ({
                norm: `${u.nom} ${u.prenom}`.toLowerCase().replace(/\s+/g, ''),
                orig: `${u.nom} ${u.prenom}`
            }));
            // Also reverse
            res.rows.forEach(u => dbUsers.push({
                norm: `${u.prenom} ${u.nom}`.toLowerCase().replace(/\s+/g, ''),
                orig: `${u.nom} ${u.prenom}`
            }));

            let matches = 0;
            let failures = [];

            csvNames.forEach(name => {
                const cleanName = name.toLowerCase().replace(/\s+/g, '');
                if (cleanName.length < 2) return;

                const match = dbUsers.find(u => u.norm === cleanName);
                if (match) matches++;
                else failures.push(name);
            });

            console.log(`✅ Analyzed ${csvNames.size} unique CSV names.`);
            console.log(`   Matches: ${matches}`);
            console.log(`   Failures: ${failures.length}`);
            if (failures.length > 0) {
                console.log('   Sample Failures:', failures.slice(0, 5).join(', '));
            }

            analysis.timesheets.status = (failures.length === 0) ? 'READY' : 'PARTIAL_MATCH';
            analysis.timesheets.userMatches = matches;
            analysis.timesheets.userTotal = csvNames.size;

        } catch (e) {
            console.error('❌ Failed to process Timesheets:', e.message);
            analysis.timesheets.status = 'ERROR';
        }
    } else {
        console.error('❌ Timesheets File NOT FOUND.');
        analysis.timesheets.status = 'MISSING';
    }

    console.log('\n--- 🏁 FINAL VERDICT ---');
    console.log(JSON.stringify(analysis, null, 2));
    await pool.end();
}

runGlobalAnalysis();
