const pool = require('../src/utils/database');

async function simulateAuth(userId) {
    try {
        const buAccessResult = await pool.query(`
            SELECT business_unit_id FROM user_business_unit_access WHERE user_id = $1 AND granted = true
            UNION
            SELECT business_unit_id FROM collaborateurs WHERE user_id = $1 AND business_unit_id IS NOT NULL
        `, [userId]);

        const authorizedBuIds = buAccessResult.rows.map(r => r.business_unit_id);
        console.log('Resulting authorizedBuIds:', authorizedBuIds);

        // Check types
        authorizedBuIds.forEach(id => {
            console.log(`ID: ${id}, Type: ${typeof id}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

// User ID for aelang: 99112327-4439-4e1f-a47a-ff16ff0423ac
simulateAuth('99112327-4439-4e1f-a47a-ff16ff0423ac');
