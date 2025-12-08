require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const CLIENTS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/preview_timesheets_v3.csv');

const normalize = (str) => str ? str.trim().toLowerCase() : '';

async function debug() {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'migration_data/06_timesheets.json'))).map(s => s.user_email);
    // Wait, I can't check skipped users from the generated file because they are skipped!
    // I need to read the CSV and Check against DB users.

    // Quick DB User Load
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    const uRes = await pool.query("SELECT nom, prenom, email FROM collaborateurs");
    const dbUsers = uRes.rows;
    await pool.end();

    const userMap = new Map();
    dbUsers.forEach(u => {
        userMap.set(normalize(`${u.nom} ${u.prenom}`), u.email);
        userMap.set(normalize(`${u.prenom} ${u.nom}`), u.email);
        if (u.nom) userMap.set(normalize(u.nom), u.email);
    });

    // Identify Skipped Users
    const unmatchedUsers = new Set();
    fs.createReadStream(TIMESHEETS_CSV)
        .pipe(csv())
        .on('data', (row) => {
            let uName = row.USER || row.Consultant;
            if (uName && uName.startsWith('LINK: ')) uName = uName.replace('LINK: ', '');
            if (!uName) return;

            if (!userMap.has(normalize(uName))) {
                unmatchedUsers.add(uName);
            }
        })
        .on('end', () => {
            console.log("=== UNMATCHED USERS ===");
            console.log(Array.from(unmatchedUsers).sort().join('\n'));
        });
}

debug();
