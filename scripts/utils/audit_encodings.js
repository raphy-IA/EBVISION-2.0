require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function audit() {
    try {
        console.log('Auditing Non-ASCII Missions (JS Filter)...');
        const res = await pool.query(`SELECT id, nom FROM missions ORDER BY nom`);

        let count = 0;
        res.rows.forEach(r => {
            // Check for non-ascii chars (> 127)
            const hasSpecial = r.nom.split('').some(c => c.charCodeAt(0) > 127);

            if (hasSpecial) {
                const specialChars = r.nom.split('').filter(c => c.charCodeAt(0) > 127);
                const hexes = specialChars.map(c => `0x${c.charCodeAt(0).toString(16)}`).join(' ');
                console.log(`[${r.id}] ${r.nom} (Hex: ${hexes})`);
                count++;
            }
        });

        console.log(`Found ${count} missions with special characters.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
audit();
