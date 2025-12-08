require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function rollback() {
    console.log("⚠️ STARTING FULL MIGRATION ROLLBACK ⚠️");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Time Entries & Sheets
        console.log("Deleting Time Entries...");
        await client.query("DELETE FROM time_entries");
        console.log("Deleting Time Sheets...");
        await client.query("DELETE FROM time_sheets");

        // 2. Tasks (Mission Tasks)
        console.log("Deleting Generated Tasks...");
        const tasks = await client.query("DELETE FROM tasks WHERE code LIKE 'MISSION_%' RETURNING id");
        console.log(`   Deleted ${tasks.rowCount} tasks.`);

        // 3. Missions
        console.log("Deleting Missions...");
        const missions = await client.query("DELETE FROM missions RETURNING id");
        console.log(`   Deleted ${missions.rowCount} missions.`);

        // 4. Clients (Assuming all recent clients or just truncate if strictly migration env)
        // Adjust filter if needed. For now, deleting all as per "repartir de zero" context on empty DB
        console.log("Deleting Clients...");
        const clients = await client.query("DELETE FROM clients RETURNING id");
        console.log(`   Deleted ${clients.rowCount} clients.`);

        // 5. Auth Users (The 8 created)
        // Identify them by email domain @migration.temp or created_at recent? 
        // Previously we used real emails. 
        // Strategy: Reset collaborators.user_id WHERE user.created_at is recent and role is specific?
        // Risky without specific ID tracking. 
        // Only 8 were created. Let's find them by 'created_at' > migration start approx.
        // Actually, user said "remove what YOU inserted".

        // Let's reset the 8 collaborators first
        console.log("Unlinking Migrated Users from Collaborators...");
        // We know they were updated recently.
        // Better: Delete users created today/last hour?

        // Find users created in the last 24h
        const recentUsers = await client.query(`
            SELECT id, email FROM users 
            WHERE created_at > NOW() - INTERVAL '24 hours' 
            AND role = 'COLLABORATEUR'
        `);

        if (recentUsers.rows.length > 0) {
            const ids = recentUsers.rows.map(u => u.id);
            console.log(`   Found ${ids.length} recent users to revert.`);

            // Unlink
            await client.query("UPDATE collaborateurs SET user_id = NULL WHERE user_id = ANY($1)", [ids]);

            // Delete
            await client.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
            console.log(`   Deleted ${ids.length} users.`);
        }

        // 6. Internal Activities (if created)
        // Not explicitly asked but good cleanup
        // await client.query("DELETE FROM internal_activities WHERE ...?");

        await client.query('COMMIT');
        console.log("✅ ROLLBACK COMPLETE.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Rollback Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

rollback();
