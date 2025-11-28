const { pool } = require('../src/utils/database');

async function fetchIds() {
    try {
        console.log('Fetching IDs...');

        const fyResult = await pool.query('SELECT id FROM fiscal_years LIMIT 1');
        const typeResult = await pool.query('SELECT id FROM objective_types LIMIT 1');

        console.log('Fiscal Year ID:', fyResult.rows[0]?.id);
        console.log('Objective Type ID:', typeResult.rows[0]?.id);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

fetchIds();
