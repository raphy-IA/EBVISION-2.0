const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkStatus() {
    try {
        const missionId = '88df136e-3dac-402b-843a-94822a3dea67';
        console.log(`Checking status for mission: ${missionId}`);

        const res = await pool.query(`
            SELECT ts.status, COUNT(*) 
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE te.mission_id = $1
            GROUP BY ts.status
        `, [missionId]);

        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkStatus();
