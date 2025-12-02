require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'eb_vision',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

async function dumpMenuPermissions() {
    const client = await pool.connect();
    try {
        console.log('🔍 Analyse des permissions de menu...');

        const res = await client.query(`
            SELECT id, code, name, category 
            FROM permissions 
            WHERE category = 'menu' 
            ORDER BY code
        `);

        console.log(`Total permissions menu: ${res.rows.length}`);

        // Grouper par code pour voir les doublons exacts
        const codeMap = {};
        res.rows.forEach(p => {
            if (!codeMap[p.code]) codeMap[p.code] = [];
            codeMap[p.code].push(p);
        });

        console.log('\n--- Doublons de CODE ---');
        let duplicatesFound = false;
        for (const [code, perms] of Object.entries(codeMap)) {
            if (perms.length > 1) {
                duplicatesFound = true;
                console.log(`CODE: ${code} (${perms.length} occurrences)`);
                perms.forEach(p => console.log(`   - ID: ${p.id}, Name: ${p.name}`));
            }
        }
        if (!duplicatesFound) console.log('Aucun doublon de code exact trouvé.');

        // Grouper par nom pour voir les doublons de nom (codes différents)
        const nameMap = {};
        res.rows.forEach(p => {
            if (!nameMap[p.name]) nameMap[p.name] = [];
            nameMap[p.name].push(p);
        });

        console.log('\n--- Doublons de NOM (Codes différents) ---');
        let nameDuplicatesFound = false;
        for (const [name, perms] of Object.entries(nameMap)) {
            if (perms.length > 1) {
                nameDuplicatesFound = true;
                console.log(`NOM: "${name}" (${perms.length} occurrences)`);
                perms.forEach(p => console.log(`   - Code: ${p.code}, ID: ${p.id}`));
            }
        }
        if (!nameDuplicatesFound) console.log('Aucun doublon de nom trouvé.');

        // Afficher toutes les permissions pour inspection visuelle
        console.log('\n--- Liste complète ---');
        res.rows.forEach(p => {
            console.log(`${p.code.padEnd(60)} | ${p.name}`);
        });

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        client.release();
        pool.end();
    }
}

const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream('permissions_dump.txt', { flags: 'w' });
const logStdout = process.stdout;

console.log = function (d) { //
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

dumpMenuPermissions();
