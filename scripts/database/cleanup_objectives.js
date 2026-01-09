const { pool } = require('../../src/utils/database');

async function cleanupObjectives() {
    console.log('🧹 Cleanup of duplicate OBJECTIVES_* permissions...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Identify permissions to remove (UPPERCASE ones with incorrect names)
        // We only target the ones that look like old/bad seeds
        const res = await client.query("SELECT id, code, name FROM permissions WHERE code LIKE 'OBJECTIVES_%'");
        console.log(`🔍 Found ${res.rows.length} duplicate OBJECTIVES permissions to remove.`);

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
            console.log('✅ No duplicates found.');
        }

        await client.query('COMMIT');
        console.log('🎉 Cleanup completed successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error during cleanup:', e);
    } finally {
        client.release();
        pool.end();
    }
}

if (require.main === module) {
    cleanupObjectives();
}

module.exports = cleanupObjectives;
