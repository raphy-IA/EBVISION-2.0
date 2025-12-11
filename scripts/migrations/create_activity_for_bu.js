require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function createActivityAndLinkToBU() {
    console.log('Creating Missing Activity and Linking to BU...\n');
    const client = await pool.connect();

    try {
        // 1. Create "Formations et tutos recherches" activity
        const activityName = 'Formations et tutos recherches';

        // Check if exists
        const existingRes = await client.query('SELECT id FROM internal_activities WHERE name = $1', [activityName]);

        let activityId;
        if (existingRes.rows.length > 0) {
            activityId = existingRes.rows[0].id;
            console.log('Activity already exists: ' + activityName);
        } else {
            const insertRes = await client.query(`
                INSERT INTO internal_activities (name, code, description, is_active, created_at, updated_at)
                VALUES ($1, 'FTR', 'Formations et tutoriels de recherche', true, NOW(), NOW())
                RETURNING id
            `, [activityName]);
            activityId = insertRes.rows[0].id;
            console.log('Created activity: ' + activityName);
        }

        // 2. Get EB - AUDIT BU
        const buRes = await client.query("SELECT id FROM business_units WHERE nom = 'EB - AUDIT' OR code LIKE '%AUDIT%'");
        if (buRes.rows.length === 0) {
            console.log('ERROR: BU EB - AUDIT not found');
            return;
        }
        const buId = buRes.rows[0].id;
        console.log('Found BU EB - AUDIT: ' + buId);

        // 3. Link activity to BU via bu_internal_activities
        const linkRes = await client.query(`
            SELECT * FROM bu_internal_activities 
            WHERE business_unit_id = $1 AND internal_activity_id = $2
        `, [buId, activityId]);

        if (linkRes.rows.length === 0) {
            await client.query(`
                INSERT INTO bu_internal_activities (business_unit_id, internal_activity_id)
                VALUES ($1, $2)
            `, [buId, activityId]);
            console.log('Linked activity to BU EB - AUDIT');
        } else {
            console.log('Activity already linked to BU');
        }

        console.log('\nDone!');

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

createActivityAndLinkToBU();
