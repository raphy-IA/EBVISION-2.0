require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const CSV_FILE_PATH = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function analyzeUserMapping() {
    console.log('🔍 Analyzing User Mapping (CSV vs DB)...');

    // 1. Fetch DB Users
    const client = await pool.connect();
    const dbUsers = [];
    try {
        const res = await client.query('SELECT id, nom, prenom FROM collaborateurs');
        res.rows.forEach(u => {
            dbUsers.push({
                id: u.id,
                fullName1: `${u.nom} ${u.prenom}`.toLowerCase().trim(),
                fullName2: `${u.prenom} ${u.nom}`.toLowerCase().trim(), // Handle reverse order
                original: `${u.nom} ${u.prenom}`
            });
        });
    } finally {
        client.release();
    }
    console.log(`📚 Loaded ${dbUsers.length} users from Database.`);

    // 2. Read CSV Users
    const csvNames = new Set();
    const stream = fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv({ separator: ';' })); // Using semicolon as detected

    for await (const row of stream) {
        if (row['Nom']) {
            csvNames.add(row['Nom'].trim());
        }
    }
    console.log(`📄 Found ${csvNames.size} unique names in CSV.`);

    // 3. Match
    const matches = [];
    const missing = [];

    csvNames.forEach(csvName => {
        const lowerName = csvName.toLowerCase();
        // Try strict match first
        let match = dbUsers.find(u => u.fullName1 === lowerName || u.fullName2 === lowerName);

        // Simple fuzzy fallback (contains) - could be risky but helpful for report
        if (!match) {
            match = dbUsers.find(u => u.fullName1.includes(lowerName) || lowerName.includes(u.fullName1) || u.fullName2.includes(lowerName));
        }

        if (match) {
            matches.push({ csv: csvName, db: match.original });
        } else {
            missing.push(csvName);
        }
    });

    // 4. Report
    console.log('\n✅ MATCHED USERS:');
    matches.forEach(m => console.log(`  "${m.csv}"  ->  "${m.db}"`));

    console.log('\n❌ UNMATCHED USERS (Action Required):');
    if (missing.length === 0) console.log('  (None - Perfect Match!)');
    else missing.forEach(m => console.log(`  "${m}"`));

    console.log('\n--- End of Analysis ---');
    await pool.end();
}

analyzeUserMapping();
