require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function undo() {
    console.log('Undoing Smart Fix Errors...');
    const client = await pool.connect();

    try {
        const corrections = [
            { from: 'Assistance àuridique', to: 'Assistance juridique' },
            { from: 'Assistance àiscale', to: 'Assistance fiscale' },
            { from: 'Assistance àomptable', to: 'Assistance comptable' },
            { from: 'Assistance àociale', to: 'Assistance sociale' },
            // Add others if needed
        ];

        for (const c of corrections) {
            const res = await client.query(`UPDATE missions SET nom = REPLACE(nom, $1, $2) WHERE nom LIKE '%' || $1 || '%'`, [c.from, c.to]);
            if (res.rowCount > 0) console.log(`Reverted ${res.rowCount} instances of "${c.from}"`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
undo();
