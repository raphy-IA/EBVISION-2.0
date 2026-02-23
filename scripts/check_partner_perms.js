const pool = require('../src/utils/database');

async function checkPartnerPermissions() {
    try {
        const res = await pool.query(`
            SELECT p.code 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            JOIN roles r ON rp.role_id = r.id 
            WHERE r.name = 'PARTNER'
        `);
        console.log('Permissions for PARTNER:', res.rows.map(p => p.code));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkPartnerPermissions();
