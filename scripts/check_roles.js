const { pool } = require('../src/utils/database');

async function check() {
    try {
        console.log('--- RECHERCHE DE RÔLES SENIOR_PARTNER ---');
        const res = await pool.query("SELECT * FROM roles WHERE name = 'SENIOR_PARTNER'");
        console.log(`Nombre de rôles trouvés avec ce nom: ${res.rows.length}`);
        res.rows.forEach(r => {
            console.log(`ID: ${r.id} | Name: ${r.name} | Description: ${r.description}`);
        });

        console.log('\n--- RECHERCHE DE RÔLES AVEC PARTNER DANS LE NOM ---');
        const res2 = await pool.query("SELECT * FROM roles WHERE name ILIKE '%PARTNER%'");
        res2.rows.forEach(r => {
            console.log(`ID: ${r.id} | Name: ${r.name}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

check();
