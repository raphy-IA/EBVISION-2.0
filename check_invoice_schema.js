
const { pool } = require('./src/utils/database');

async function checkSchema() {
    try {
        console.log('--- INVOICES SCHEMA ---');
        const invoices = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'");
        console.log(JSON.stringify(invoices.rows, null, 2));

        console.log('--- INVOICE_ITEMS SCHEMA ---');
        const items = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoice_items'");
        console.log(JSON.stringify(items.rows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
