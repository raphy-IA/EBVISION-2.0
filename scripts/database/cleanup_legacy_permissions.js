const { pool } = require('../../src/utils/database');

async function cleanupLegacyPermissions() {
    console.log('🧹 Cleanup of legacy page.* permissions...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Identify permissions to remove
        const res = await client.query("SELECT id, code FROM permissions WHERE code LIKE 'page.%'");
        console.log(`🔍 Found ${res.rows.length} legacy permissions to remove.`);

        if (res.rows.length > 0) {
            const ids = res.rows.map(r => r.id);

            // 2. Remove references in role_permissions
            const delRoles = await client.query("DELETE FROM role_permissions WHERE permission_id = ANY($1)", [ids]);
            console.log(`   - Removed ${delRoles.rowCount} role_permission links.`);

            // 3. Remove references in user_permissions
            const delUsers = await client.query("DELETE FROM user_permissions WHERE permission_id = ANY($1)", [ids]);
            console.log(`   - Removed ${delUsers.rowCount} user_permission links.`);

            // 4. Remove the permissions themselves
            const delPerms = await client.query("DELETE FROM permissions WHERE id = ANY($1)", [ids]);
            console.log(`✅ Deleted ${delPerms.rowCount} permissions.`);
        } else {
            console.log('✅ No legacy permissions found.');
        }

        await client.query('COMMIT');
        console.log('🎉 Cleanup completed successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error during cleanup:', e);
    } finally {
        client.release();
    }
}

if (require.main === module) {
    cleanupLegacyPermissions().then(() => pool.end());
}

module.exports = cleanupLegacyPermissions;
