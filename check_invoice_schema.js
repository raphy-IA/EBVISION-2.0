
const { pool } = require('./src/utils/database');

async function checkInvoiceSchema() {
    try {
        console.log('Checking invoices table schema...');
        const result = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name IN ('numero_facture', 'statut', 'workflow_status')
        `);
        console.log(result.rows);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

checkInvoiceSchema();
