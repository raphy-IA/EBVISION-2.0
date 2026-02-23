const { pool } = require('../src/utils/database');
const fs = require('fs');

async function exhaustiveAudit() {
    try {
        console.log('--- AUDIT EXHAUSTIF ---');
        const res = await pool.query(`
            SELECT r.id as role_id, r.name as role_name, p.id as perm_id, p.code as perm_code, p.category
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            ORDER BY r.name, p.code
        `);

        let output = 'ROLE_NAME | ROLE_ID | PERM_CODE | PERM_ID | CATEGORY\n';
        output += '-'.repeat(100) + '\n';

        res.rows.forEach(r => {
            output += `${r.role_name} | ${r.role_id} | ${r.perm_code} | ${r.perm_id} | ${r.category}\n`;
        });

        fs.writeFileSync('exhaustive_perms_audit.txt', output);
        console.log(`Audit terminé. ${res.rows.length} entrées écrites dans exhaustive_perms_audit.txt`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

exhaustiveAudit();
