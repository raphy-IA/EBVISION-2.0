require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function testProfileQuery() {
    const client = await pool.connect();
    try {
        // Get a sample user
        const userRes = await client.query(`
            SELECT id, email FROM users WHERE email = 'gododi@eb-partnersgroup.cm' LIMIT 1
        `);
        
        if (userRes.rows.length === 0) {
            // Try another user
            const userRes2 = await client.query(`SELECT id, email FROM users LIMIT 1`);
            console.log('Using user:', userRes2.rows[0]);
            var userId = userRes2.rows[0].id;
        } else {
            console.log('Using user:', userRes.rows[0]);
            var userId = userRes.rows[0].id;
        }

        // Run THE EXACT same profile query from dashboard-analytics.js
        const profileQuery = `
            SELECT 
                COALESCE(c.nom, u.nom) as collaborateur_nom,
                COALESCE(c.prenom, u.prenom) as collaborateur_prenom,
                COALESCE(g.nom, 'Administrateur') as grade_nom,
                COALESCE(d.nom, 'N/A') as division_nom,
                COALESCE(bu.nom, 'N/A') as business_unit_nom
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            WHERE u.id = $1
        `;
        
        const result = await client.query(profileQuery, [userId]);
        console.log('\nProfile query result:');
        console.log(JSON.stringify(result.rows[0], null, 2));

        // Check what the API would return
        const profileData = result.rows[0] || {};
        console.log('\nFormatted response:');
        console.log({
            profil: {
                nom: profileData.collaborateur_nom || '',
                prenom: profileData.collaborateur_prenom || '',
                grade: profileData.grade_nom || '',
                division: profileData.division_nom || '',
                business_unit: profileData.business_unit_nom || ''
            }
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

testProfileQuery();
