const { pool } = require('../src/utils/database');

async function checkConditions() {
    try {
        const result = await pool.query(`
            SELECT id, nom, conditions_paiement 
            FROM missions 
            WHERE conditions_paiement IS NOT NULL 
            LIMIT 5
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        pool.end();
    }
}

checkConditions();
