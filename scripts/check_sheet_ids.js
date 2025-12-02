const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkTimeSheetIds() {
    try {
        const res = await pool.query(`
            SELECT id, time_sheet_id, heures, date_saisie 
            FROM time_entries 
            WHERE id IN ($1, $2)
        `, ['723e0b4a-9ac6-4e41-83f1-4cd8673a62cd', 'e54e6171-e32c-41b7-97fe-642c74eda080']);

        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTimeSheetIds();
