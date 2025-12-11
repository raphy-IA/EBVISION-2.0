require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function findAndFixClient() {
    console.log('Finding and Fixing Client Name Encoding...\n');
    const client = await pool.connect();

    try {
        // Search for clients with potential encoding issues or containing 'Agricole' or 'Exploi'
        const res = await client.query(`
            SELECT id, nom, sigle 
            FROM clients 
            WHERE nom ILIKE '%agricole%' 
               OR nom ILIKE '%exploi%'
               OR nom ILIKE '%industri%'
        `);

        console.log('Found clients:');
        res.rows.forEach(r => {
            console.log(`  ID: ${r.id}`);
            console.log(`  Nom: ${r.nom}`);
            console.log(`  Sigle: ${r.sigle}`);
            console.log('');
        });

        // Also search for the exact problematic client ID from the error
        console.log('--- Checking the problem client 416b6aaf-e33a-414f-8507-d8b8dc19d3f8 ---');
        const problemClient = await client.query(
            'SELECT id, nom, sigle FROM clients WHERE id = $1',
            ['416b6aaf-e33a-414f-8507-d8b8dc19d3f8']
        );
        if (problemClient.rows.length > 0) {
            console.log('Problem client:', problemClient.rows[0]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

findAndFixClient();
