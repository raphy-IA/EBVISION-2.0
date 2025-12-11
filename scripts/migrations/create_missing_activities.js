require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

// Missing internal activities from the analysis
const missingActivities = [
    { name: 'Fériés', code: 'FER', description: 'Jours fériés' },
    { name: 'Rédaction de Propositions', code: 'RDP', description: 'Rédaction de propositions commerciales' },
    { name: "Production d'assurances", code: 'PAS', description: "Production d'assurances" },
    { name: 'Cotation et négociation des offres', code: 'CNO', description: 'Cotation et négociation des offres' },
    { name: 'Prospection et développement du portefeuille', code: 'PDP', description: 'Prospection et développement commercial' },
    { name: 'Activités inter BU/GROUP', code: 'IBU', description: 'Activités transverses entre BU' },
];

async function createMissingActivities() {
    console.log('Creating Missing Internal Activities...\n');
    const client = await pool.connect();

    try {
        for (const act of missingActivities) {
            // Check if already exists
            const existing = await client.query('SELECT id FROM internal_activities WHERE name = $1', [act.name]);
            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO internal_activities (name, code, description, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, true, NOW(), NOW())
                `, [act.name, act.code, act.description]);
                console.log('  Created: ' + act.name);
            } else {
                console.log('  Already exists: ' + act.name);
            }
        }

        // Also check for the missing client and mission
        console.log('\n--- Creating Missing Client and Mission ---');

        // MAÎTRE CHEMOU
        const clientRes = await client.query("SELECT id FROM clients WHERE nom = 'MAÎTRE CHEMOU'");
        let clientId;
        if (clientRes.rows.length === 0) {
            const newClient = await client.query(`
                INSERT INTO clients (nom, sigle, created_at, updated_at)
                VALUES ('MAÎTRE CHEMOU', 'CHEMOU', NOW(), NOW())
                RETURNING id
            `);
            clientId = newClient.rows[0].id;
            console.log('  Created client: MAÎTRE CHEMOU');
        } else {
            clientId = clientRes.rows[0].id;
            console.log('  Client exists: MAÎTRE CHEMOU');
        }

        // Mission for loi de finances
        const missionCheck = await client.query(`
            SELECT id FROM missions 
            WHERE nom LIKE '%séminaire%loi de finances%2025%' AND client_id = $1
        `, [clientId]);

        if (missionCheck.rows.length === 0) {
            // Get a default BU
            const buRes = await client.query("SELECT id FROM business_units WHERE code LIKE '%TAX%' LIMIT 1");
            const buId = buRes.rows.length > 0 ? buRes.rows[0].id : null;

            await client.query(`
                INSERT INTO missions (
                    nom, client_id, business_unit_id, type_mission, statut, priorite,
                    date_debut, date_fin, created_at, updated_at
                ) VALUES (
                    'Participation au séminaire de la loi de finances 2025',
                    $1, $2, 'PREVIOUS ENGAGEMENT', 'EN_COURS', 'MOYENNE',
                    '2025-01-01', '2025-12-31', NOW(), NOW()
                )
            `, [clientId, buId]);
            console.log('  Created mission for MAÎTRE CHEMOU');
        } else {
            console.log('  Mission already exists');
        }

        console.log('\nDone!');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

createMissingActivities();
