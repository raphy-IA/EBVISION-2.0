const { pool } = require('./src/utils/database');

async function checkGenerated() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_generated, generation_expression
            FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND is_generated = 'ALWAYS';
        `);
        console.log('Colonnes générées dans invoices:');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkGenerated();
