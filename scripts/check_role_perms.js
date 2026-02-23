const { pool } = require('../src/utils/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT p.code, p.name 
            FROM role_permissions rp 
            JOIN roles r ON rp.role_id = r.id 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE r.name = 'SENIOR_PARTNER'
            ORDER BY p.code
        `);
        console.log('PERMISSIONS FOR SENIOR_PARTNER:');
        res.rows.forEach(r => console.log(`- ${r.code}: ${r.name}`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

check();
