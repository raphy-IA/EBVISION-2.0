require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: process.env.DB_NAME || 'eb_vision',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function run() {
    try {
        const bu = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='business_units' ORDER BY ordinal_position");
        console.log('business_units:', bu.rows.map(x => x.column_name).join(', '));

        const buo = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='business_unit_objectives' ORDER BY ordinal_position");
        console.log('business_unit_objectives:', buo.rows.map(x => x.column_name).join(', '));
    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        await p.end();
    }
}
run();
