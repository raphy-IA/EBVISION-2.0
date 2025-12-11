require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE conname = 'check_type_mission' OR conname = 'check_mission_type'
        `);
        if (res.rows.length > 0) {
            console.log('Constraint Definition:', res.rows[0].def);
        } else {
            console.log('Constraint check_priorite not found.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
