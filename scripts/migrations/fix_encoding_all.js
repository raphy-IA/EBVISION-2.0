require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

// Common encoding fixes for UTF-8 read as Latin1
const encodingFixes = [
    ['\u00c3\u00a9', 'é'],
    ['\u00c3\u00a8', 'è'],
    ['\u00c3\u00a0', 'à'],
    ['\u00c3\u00aa', 'ê'],
    ['\u00c3\u00ae', 'î'],
    ['\u00c3\u00b4', 'ô'],
    ['\u00c3\u00bb', 'û'],
    ['\u00c3\u00a7', 'ç'],
    ['\u00c3\u00a2', 'â'],
    ['\u00c3\u00af', 'ï'],
    ['\u00c3\u00bc', 'ü'],
    ['\u00c3\u00ab', 'ë'],
    ['\u00e2\u0080\u0099', "'"],
    ['\u00c2', ''],
];

function fixEncoding(str) {
    if (!str) return str;
    let fixed = str;
    for (const [bad, good] of encodingFixes) {
        fixed = fixed.split(bad).join(good);
    }
    return fixed;
}

async function fixAllEncoding() {
    console.log('Fixing Encoding Issues in Database...\n');
    const client = await pool.connect();

    try {
        // 1. Fix Missions
        console.log('--- Fixing Missions ---');
        const missionsRes = await client.query('SELECT id, nom FROM missions');
        let missionFixed = 0;

        for (const m of missionsRes.rows) {
            const fixed = fixEncoding(m.nom);
            if (fixed !== m.nom) {
                console.log('  ' + m.nom.substring(0, 40) + ' -> ' + fixed.substring(0, 40));
                await client.query('UPDATE missions SET nom = $1 WHERE id = $2', [fixed, m.id]);
                missionFixed++;
            }
        }
        console.log('Missions fixed: ' + missionFixed);

        // 2. Fix Internal Activities
        console.log('\n--- Fixing Internal Activities ---');
        const iaRes = await client.query('SELECT id, name FROM internal_activities');
        let iaFixed = 0;

        for (const ia of iaRes.rows) {
            const fixed = fixEncoding(ia.name);
            if (fixed !== ia.name) {
                console.log('  ' + ia.name + ' -> ' + fixed);
                await client.query('UPDATE internal_activities SET name = $1 WHERE id = $2', [fixed, ia.id]);
                iaFixed++;
            }
        }
        console.log('Internal Activities fixed: ' + iaFixed);

        // 3. Fix Clients
        console.log('\n--- Fixing Clients ---');
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        let clientsFixed = 0;

        for (const c of clientsRes.rows) {
            const fixedNom = fixEncoding(c.nom);
            const fixedSigle = c.sigle ? fixEncoding(c.sigle) : c.sigle;
            if (fixedNom !== c.nom || fixedSigle !== c.sigle) {
                console.log('  ' + c.nom.substring(0, 40) + ' -> ' + fixedNom.substring(0, 40));
                await client.query('UPDATE clients SET nom = $1, sigle = $2 WHERE id = $3', [fixedNom, fixedSigle, c.id]);
                clientsFixed++;
            }
        }
        console.log('Clients fixed: ' + clientsFixed);

        console.log('\nDone!');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixAllEncoding();
