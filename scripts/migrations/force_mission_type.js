require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function fix() {
    console.log('Forcing ALL missions to PREVIOUS ENGAGEMENT...');
    try {
        const res = await pool.query(`
            UPDATE missions 
            SET type_mission = 'PREVIOUS ENGAGEMENT' 
            WHERE type_mission IS NULL OR type_mission != 'PREVIOUS ENGAGEMENT'
        `);
        console.log('Updated:', res.rowCount);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
