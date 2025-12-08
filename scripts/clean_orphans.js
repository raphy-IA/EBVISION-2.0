require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function cleanOrphans() {
    const client = await pool.connect();
    try {
        console.log("🧹 Cleaning orphaned records...");

        // 1. Clean role_permissions where permission_id doesn't exist
        const res1 = await client.query(`
            DELETE FROM role_permissions 
            WHERE permission_id NOT IN (SELECT id FROM permissions)
        `);
        console.log(`   - Deleted ${res1.rowCount} orphaned role_permissions.`);

        // 2. Clean user_permissions where permission_id doesn't exist
        const res2 = await client.query(`
            DELETE FROM user_permissions 
            WHERE permission_id NOT IN (SELECT id FROM permissions)
        `);
        console.log(`   - Deleted ${res2.rowCount} orphaned user_permissions.`);

        // 3. Clean user_permissions where user_id doesn't exist
        const res3 = await client.query(`
            DELETE FROM user_permissions 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`   - Deleted ${res3.rowCount} orphaned user_permissions (invalid user).`);

        // 4. Clean user_roles where user_id doesn't exist
        const res4 = await client.query(`
            DELETE FROM user_roles 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`   - Deleted ${res4.rowCount} orphaned user_roles.`);

        console.log("✅ Cleanup complete.");

    } catch (e) {
        console.error("❌ Cleanup failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanOrphans();
